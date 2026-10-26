(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const supported = !!(navigator.mediaDevices?.getUserMedia && AudioContextClass && window.AudioWorkletNode);
  let remainingUnits = null;
  let enabled = false, allowed = false, lang = 'zh', phase = 'idle', status = '', epoch = 0;
  let stream, context, node, source, timer, stopTimer, chunks = [], rate = 16000, clip, started = 0, request;
  const levels = Array(33).fill(0);
  function drawWave(samples) {
    let energy = 0;
    if (samples?.length) for (const n of samples) energy += n * n;
    // Actual local microphone energy, never a decorative simulated frequency.
    const level = samples?.length ? Math.min(1, Math.sqrt(energy / samples.length) * 6) : 0;
    if (samples) { levels.shift(); levels.push(level); } else levels.fill(0);
    levels.forEach((value, i) => $('voice-bar-' + i).style.setProperty('--height', (4 + value * 48) + 'px'));
    $('record-voice').style.setProperty('--voice-glow', (level * 14) + 'px');
  }
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const messages = {
    unavailable: ['这个浏览器暂时无法录音。你仍可直接打字聊天。', 'Recording is unavailable in this browser. You can still type.'],
    permission: ['未能使用麦克风。请检查浏览器或页面的麦克风权限，也可以直接打字。', 'The microphone is unavailable. Check browser/page permission, or continue by typing.'],
    draft: ['请先发送或清空当前文字，再开始录音。', 'Send or clear your current draft before recording.'],
    short: ['录音太短，请再说一小段。还没有上传。', 'That recording was too short. Try a little longer. Nothing was uploaded.'],
    capture: ['录音中断，麦克风已关闭。还没有上传，你可以重录或打字。', 'Recording was interrupted and the microphone is off. Nothing was uploaded. You can record again or type.'],
    review: ['录音已结束，正在发送。', 'Recording finished. Sending your voice note.'],
    consent: ['请先勾选聊天处理同意，再开始录音。', 'Please tick the chat processing consent before recording.'],
    converted: ['文字已放进输入框。请核对症状、数字和药名，再按发送。', 'Your transcript is in the draft. Check symptoms, numbers and medicine names before sending.'],
    speech_not_clear: ['没有听清楚，请重录或直接打字。识别已开始时仍可能使用一次额度。', 'We could not hear clear speech. Try recording again or type. A conversion that began may still use one allowance unit.'],
    please_shorten: ['内容较长，请分成短一点的留言。', 'Please split this into a shorter voice note.'],
    monthly_allowance_reached: ['可用次数已用完。请查看额度说明。', 'Your allowance has been used. Check the allowance information.'],
    failed: ['未能处理录音，请稍后再试或打字。不会自动重试，已开始的识别可能使用一次额度。', 'We could not process your voice note. Try later or type. We will not retry automatically; processing that began may use one allowance unit.'],
    invalid_voice_audio: ['这段录音格式无法读取，请重新录音。这次没有进行识别。', 'We could not read this recording format. Record again. No transcription was started.'],
    voice_duration_invalid: ['录音需在半秒至 60 秒之间，请重新录音。这次没有进行识别。', 'Record between half a second and 60 seconds. No transcription was started.'],
    member_not_eligible: ['这个账户暂未获得暖心聊聊使用资格。每月附送额度仅限有效付费会员，请联系 FC 核对。', 'Care Chat access is not enabled for this account. Monthly included allowance is for active paid members only. Contact FC to check access.'],
    member_budget_unavailable: ['暂时无法确认额度，这次没有继续进行识别。请稍后再试。', 'We could not confirm your allowance, so transcription did not proceed. Please try later.'],
    voice_input_not_ready: ['录音转文字暂未开放，请先用打字聊天。', 'Voice conversion is not open yet. Please type for now.'],
  };
  function paint() {
    $('voice-panel').hidden = !enabled || phase === 'idle' && !status;
    $('record-voice').hidden = !enabled;
    $('voice-wave').classList.toggle('is-recording', phase === 'recording');
    $('voice-title').textContent = t('不想打字？轻轻说一说。', 'Prefer to speak? Take your time.');
    $('voice-hint').textContent = remainingUnits === 1 && phase === 'idle'
      ? t('还剩 1 次额度，可以直接打字发送。录音转文字再发送需要 2 次额度。', 'You have 1 unit left and can send a typed message. Converting and sending a voice note needs 2 units.')
      : t('再点一次结束并发送 · 最长 60 秒，到时自动发送', 'Tap again to finish and send · Sends automatically at 60 seconds');
    $('voice-cost').textContent = t('录音本身不扣次数。结束并发送合共用 2 次：自动转文字 1 次，发送聊天 1 次。无需查看或确认文字。', 'Recording itself uses no allowance. Finish and send uses 2 units: 1 for transcription and 1 for chat. No text review or confirmation is needed.');
    $('record-voice-label').textContent = phase === 'recording' ? t('结束并发送', 'Finish & send') : phase === 'starting' ? t('准备麦克风…', 'Preparing microphone…') : t('录音说一说', 'Record a voice note');
    $('record-voice').title = $('record-voice-label').textContent;
    $('record-voice').disabled = !supported || (phase !== 'recording' && (!allowed || phase !== 'idle'));
    $('record-voice').classList.toggle('recording', phase === 'recording');
    $('discard-voice').textContent = t('取消录音', 'Cancel recording');
    $('discard-voice').hidden = phase === 'idle';
    $('voice-status').textContent = !supported ? t(...messages.unavailable) : phase === 'recording'
      ? t(`正在录音 ${Math.min(60, Math.floor((Date.now() - started) / 1000))} / 60 秒`, `Recording ${Math.min(60, Math.floor((Date.now() - started) / 1000))} / 60 seconds`)
      : phase === 'converting' ? t('正在处理录音，请稍候…', 'Processing your voice note…') : status ? t(...(messages[status] || messages.failed)) : '';
  }
  function notify() { paint(); window.dispatchEvent(new Event('fc-care-voice-state')); }
  function stopDevices() {
    drawWave();
    clearInterval(timer); timer = null;
    clearTimeout(stopTimer); stopTimer = null;
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    source?.disconnect(); node?.disconnect(); source = node = null;
    if (context) context.close().catch(() => {}); context = null;
  }
  function clearClip() {
    clip = null;
  }
  function reset() {
    epoch++; request?.abort(); request = null; stopDevices(); clearClip(); chunks = [];
    phase = 'idle'; status = ''; notify();
  }
  function wav() {
    const count = chunks.reduce((n, chunk) => n + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
    const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, count * 2, true);
    let offset = 44;
    for (const chunk of chunks) for (const sample of chunk) { const n = Math.max(-1, Math.min(1, sample || 0)); view.setInt16(offset, n < 0 ? n * 32768 : n * 32767, true); offset += 2; }
    return { blob: new Blob([buffer], { type: 'audio/wav' }), seconds: count / rate };
  }
  async function start() {
    if (!enabled || !allowed || !supported || phase !== 'idle') return;
    if (!$('consent').checked) { status = 'consent'; paint(); $('consent').focus(); return; }
    if ($('message').value.trim()) { status = 'draft'; paint(); return; }
    const before = ++epoch; phase = 'starting'; status = ''; notify();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      if (before !== epoch) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired; context = new AudioContextClass({ sampleRate: 16000 }); rate = context.sampleRate;
      await context.audioWorklet.addModule('/care-chat-capture.js');
      if (before !== epoch) return;
      node = new window.AudioWorkletNode(context, 'fc-care-capture', { channelCount: 1, channelCountMode: 'explicit' });
      node.onprocessorerror = () => { if (before === epoch) { stopDevices(); chunks = []; phase = 'idle'; status = 'capture'; notify(); } };
      source = context.createMediaStreamSource(stream); chunks = [];
      node.port.onmessage = event => {
        if (before !== epoch) return;
        if (event.data.samples) { chunks.push(event.data.samples); if (phase === 'recording') drawWave(event.data.samples); }
        if (event.data.done && (phase === 'recording' || phase === 'stopping')) {
          const result = wav(); stopDevices(); chunks = [];
          if (result.seconds < 0.5) { phase = 'idle'; status = 'short'; notify(); return; }
          clip = result.blob;
          phase = 'review'; status = 'review'; notify();
          // The recording control says Finish & send, and the 60-second limit
          // discloses automatic sending. No conversion/review confirmation UI.
          window.dispatchEvent(new Event('fc-care-voice-submit'));
        }
      };
      source.connect(node); node.connect(context.destination); await context.resume();
      if (before !== epoch) return;
      phase = 'recording'; started = Date.now();
      timer = setInterval(() => { if (Date.now() - started >= 60000) finish(); else paint(); }, 250);
      notify();
    } catch { if (before === epoch) { stopDevices(); phase = 'idle'; status = 'permission'; notify(); } }
  }
  function finish() {
    if (phase !== 'recording') return;
    phase = 'stopping'; drawWave();
    // Release the physical microphone immediately, even if the worklet fails
    // to acknowledge its final buffer. No background capture while stopping.
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    node?.port.postMessage('finish');
    const before = epoch;
    stopTimer = setTimeout(() => { if (before === epoch && phase === 'stopping') {
      stopDevices(); chunks = []; phase = 'idle'; status = 'capture'; notify();
    } }, 2000);
    notify();
  }
  $('record-voice').onclick = () => phase === 'recording' ? finish() : start();
  $('discard-voice').onclick = reset;
  async function convert() {
    if (phase !== 'review' || !clip || !allowed) return false;
    if (!$('consent').checked) { status = 'consent'; paint(); $('consent').focus(); return false; }
    const before = epoch, abort = request = new AbortController();
    let converted = false;
    const timeout = setTimeout(() => abort.abort(), 35000);
    phase = 'converting'; status = ''; notify();
    try {
      const headers = await window.FCCareAuth.headers();
      if (before !== epoch) return false;
      const body = new FormData(); body.append('audio', clip, 'fc-voice.wav'); body.append('consent', 'true');
      const response = await fetch('/chat/voice-draft', { method: 'POST', headers, body, signal: abort.signal });
      const data = await response.json();
      if (before !== epoch) return false;
      if (data.allowance) window.dispatchEvent(new CustomEvent('fc-care-voice-allowance', { detail: data.allowance }));
      if (!response.ok) throw Error(data.error);
      if (typeof data.transcript !== 'string' || !data.transcript.trim() || data.transcript.length > 1200) throw Error('failed');
      clearClip(); phase = 'idle'; status = ''; converted = true;
      window.dispatchEvent(new CustomEvent('fc-care-voice-send-draft', { detail: data.transcript }));
      return true;
    } catch (error) {
      if (before !== epoch) return false;
      clearClip(); phase = 'idle'; status = messages[error.message] ? error.message : 'failed';
      if (error.message === 'member_login_required') window.FCCareAuth.requireSignIn();
      return false;
    } finally {
      clearTimeout(timeout);
      if (before === epoch) {
        request = null; notify();
        // Direct send continues to conversation immediately. Do not race it with
        // a balance lookup; that would block the send after spending on conversion.
        if (!converted) window.dispatchEvent(new Event('fc-care-voice-refresh'));
      }
    }
  }
  window.FCCareVoice = { configure(value) { enabled = value.enabled; allowed = value.allowed; lang = value.language; remainingUnits = value.remainingUnits ?? null; paint(); },
    active: () => phase !== 'idle', readyToSend: () => phase === 'review' && !!clip, convertForSend: convert, reset };
  window.addEventListener('fc-care-auth-changed', reset);
  window.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  drawWave(); paint();
})();
