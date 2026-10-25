const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const vm = require('node:vm');
const { inspectVoiceWav } = require('../services/care-chat-audio');
const { createMemberMonthlyBudget } = require('../services/member-monthly-budget');
const { createChatRouter } = require('../routes/chat');

function wav(seconds = 1, silent = false) {
  const frames = Math.floor(16000 * seconds), b = Buffer.alloc(44 + frames * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(frames * 2, 40);
  if (!silent) for (let i = 0; i < frames; i++) b.writeInt16LE(Math.round(Math.sin(i * .1) * 3000), 44 + i * 2);
  return b;
}
test('voice duration is derived from PCM samples and tampered containers fail closed', () => {
  assert.equal(inspectVoiceWav(wav(60)).durationSeconds, 60);
  assert.throws(() => inspectVoiceWav(wav(60.1)), /voice_duration_invalid/);
  assert.throws(() => inspectVoiceWav(wav(.4)), /voice_duration_invalid/);
  assert.throws(() => inspectVoiceWav(wav(1, true)), /speech_not_clear/);
  for (const offset of [4, 16, 20, 22, 24, 28, 32, 34, 40]) {
    const invalid = wav(); invalid[offset] ^= 1;
    assert.throws(() => inspectVoiceWav(invalid), /invalid_voice_audio/);
  }
  assert.throws(() => inspectVoiceWav(Buffer.concat([wav(), Buffer.from('hidden trailing data')])), /invalid_voice_audio/);
});

test('mixed voice conversions and text calls share the same RM7 member cap', async () => {
  let used = 0;
  const budget = createMemberMonthlyBudget({ hashSecret: 'x'.repeat(32), verifyMember: async () => ({ subject: 'fixture' }),
    store: { durable: true, reserve: async ({ amountSen }) => {
      if (used + amountSen > 700) return { accepted: false };
      used += amountSen; return { accepted: true, usedSen: used, paidRemainingSen: 0 };
    } } });
  const results = await Promise.allSettled(Array.from({ length: 160 }, (_, i) => i % 2 ? budget.reserveVoice({}) : budget.reserveText({})));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 140); assert.equal(used, 700);
});

test('voice endpoint validates before spending, reserves before transcription and never sends chat', async () => {
  let reservations = 0, provider = 0, chat = 0, denied = false;
  const app = express(); app.use(express.json());
  app.use('/chat', createChatRouter({ careVoiceEnabled: true, memberBudget: { ready: true,
    reserveVoice: async () => { if (denied) throw Error('monthly_allowance_reached'); reservations++;
      return { remainingTextAttempts: 98, includedTextAttempts: 98, purchasedTextAttempts: 0 }; } },
    transcribeVoice: async () => { assert.equal(reservations, 1); provider++; return 'Fixture editable transcript'; },
    converse: async () => { chat++; } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (buffer, consent = 'true', origin = base) => {
    const body = new FormData(); body.append('audio', new Blob([buffer]), 'fixture.wav'); body.append('consent', consent);
    return fetch(base + '/chat/voice-draft', { method: 'POST', headers: { Origin: origin }, body });
  };
  try {
    assert.equal((await post(wav(), 'false')).status, 422);
    assert.equal((await post(wav(61))).status, 422);
    assert.equal((await post(wav(1, true))).status, 422);
    assert.equal((await post(wav(), 'true', 'https://foreign.test')).status, 403);
    assert.equal(reservations, 0); assert.equal(provider, 0);
    const response = await post(wav()); const data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.transcript, 'Fixture editable transcript');
    assert.equal(data.allowance.remainingTextAttempts, 98); assert.equal(chat, 0);
    denied = true; assert.equal((await post(wav())).status, 429); assert.equal(provider, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('voice remains closed by default and a failed paid transcription is not retried', async () => {
  let reserves = 0, calls = 0;
  const app = express(); app.use(express.json());
  const memberBudget = { ready: true, reserveVoice: async () => { reserves++; return { remainingTextAttempts: 99 }; } };
  app.use('/closed', createChatRouter({ memberBudget }));
  app.use('/open', createChatRouter({ memberBudget, careVoiceEnabled: true,
    transcribeVoice: async () => { calls++; throw Error('PRIVATE_PROVIDER_ERROR'); } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = path => { const body = new FormData(); body.append('audio', new Blob([wav()]), 'fixture.wav'); body.append('consent', 'true');
    return fetch(base + path + '/voice-draft', { method: 'POST', headers: { Origin: base }, body }); };
  try {
    assert.equal((await post('/closed')).status, 503); assert.equal(reserves, 0); assert.equal(calls, 0);
    const response = await post('/open'); assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'temporarily_unavailable' });
    assert.equal(reserves, 1); assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('capture worklet emits no more than sixty seconds and flushes once on stop', () => {
  let Processor;
  class Base { constructor() { this.messages = []; this.port = { postMessage: value => this.messages.push(value) }; } }
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/care-chat-capture.js'), 'utf8'), {
    AudioWorkletProcessor: Base, sampleRate: 10, Float32Array, registerProcessor: (_, value) => { Processor = value; },
  });
  const capture = new Processor(); capture.process([[new Float32Array(700).fill(.1)]]);
  capture.port.onmessage({ data: 'finish' });
  assert.equal(capture.messages.filter(m => m.done).length, 1);
  assert.equal(capture.messages.filter(m => m.samples).reduce((n, m) => n + m.samples.length, 0), 600);
});

test('browser recording stays local until explicit consented conversion and never auto-sends chat', async () => {
  const elements = new Map(), events = [], listeners = new Map(); let capture, stopped = 0, calls = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { style: { setProperty(key, value) { this[key] = value; } }, value: '', checked: false, classList: { toggle() {} }, focus() {}, pause() {}, removeAttribute() {} });
    return elements.get(id);
  };
  class Context { constructor() { this.sampleRate = 16000; this.audioWorklet = { addModule: async () => {} }; this.destination = {}; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; } async resume() {} async close() {} }
  class Worklet { constructor() { capture = this; this.port = { postMessage() {} }; } connect() {} disconnect() {} }
  const window = { AudioContext: Context, AudioWorkletNode: Worklet, FCCareAuth: { headers: async () => ({ Authorization: 'Bearer fictional' }) },
    addEventListener: (name, fn) => listeners.set(name, fn), dispatchEvent: event => { events.push(event); listeners.get(event.type)?.(event); } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/care-chat-voice.js'), 'utf8'), {
    window, navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped++ }] }) } },
    document: { getElementById: element, addEventListener() {} },
    fetch: async (url, options) => { calls++; assert.equal(url, '/chat/voice-draft'); assert.equal(options.body.get('consent'), 'true');
      assert.equal(inspectVoiceWav(Buffer.from(await options.body.get('audio').arrayBuffer())).durationSeconds, 1);
      return Response.json({ transcript: 'Check this fictional transcript', allowance: { remainingTextAttempts: 98 } }); },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
    Blob, FormData, AbortController, Event, CustomEvent, Float32Array, ArrayBuffer, DataView, Date,
    setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {},
  });
  window.FCCareVoice.configure({ enabled: true, allowed: true, language: 'zh' });
  await element('record-voice').onclick();
  capture.port.onmessage({ data: { samples: new Float32Array(16000).fill(.1) } });
  assert.ok(parseFloat(element('voice-bar-32').style['--height']) > 4);
  capture.port.onmessage({ data: { samples: new Float32Array(0) } });
  assert.equal(element('voice-bar-32').style['--height'], '4px');
  await element('record-voice').onclick();
  assert.equal(element('voice-bar-31').style['--height'], '4px');
  assert.equal(stopped, 1); // Physical microphone closes before worklet flush.
  capture.port.onmessage({ data: { done: true } });
  assert.equal(calls, 0); assert.equal(stopped, 1); assert.equal(element('voice-preview').hidden, false);
  await element('convert-voice').onclick(); assert.equal(calls, 0);
  element('consent').checked = true; await element('convert-voice').onclick();
  assert.equal(calls, 1); assert.equal(window.FCCareVoice.active(), false);
  assert.equal(events.find(event => event.type === 'fc-care-voice-transcript').detail, 'Check this fictional transcript');
  await element('record-voice').onclick();
  const oldCapture = capture;
  window.dispatchEvent(new Event('fc-care-auth-changed'));
  oldCapture.port.onmessage({ data: { samples: new Float32Array(16000).fill(.1) } });
  oldCapture.port.onmessage({ data: { done: true } });
  assert.equal(stopped, 2); assert.equal(window.FCCareVoice.active(), false);
  assert.equal(element('voice-preview').hidden, true);
  assert.equal(events.filter(event => event.type === 'fc-care-voice-transcript').length, 1);
  await element('record-voice').onclick(); capture.onprocessorerror();
  assert.equal(stopped, 3); assert.equal(window.FCCareVoice.active(), false); assert.equal(calls, 1);
});
