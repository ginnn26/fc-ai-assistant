(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const supported = !!(navigator.mediaDevices?.getUserMedia && AudioContextClass && window.AudioWorkletNode);
  let enabled = false, allowed = false, lang = 'zh', phase = 'idle', status = '', epoch = 0;
  let stream, context, node, source, timer, stopTimer, chunks = [], rate = 16000, clip, clipUrl, started = 0, request;
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
    review: ['先回听，再选择转成文字。录音尚未上传。', 'Listen back, then choose to convert. The recording has not been uploaded.'],
    consent: ['请先勾选下方的处理同意，再转成文字。', 'Please tick the processing consent below before converting.'],
    converted: ['文字已放进输入框。请核对症状、数字和药名，再按发送。', 'Your transcript is in the draft. Check symptoms, numbers and medicine names before sending.'],
    speech_not_clear: ['没有听清楚，请重录或直接打字。识别已开始时仍可能使用一次额度。', 'We could not hear clear speech. Try recording again or type. A conversion that began may still use one allowance unit.'],
    please_shorten: ['内容较长，请分成短一点的留言。', 'Please split this into a shorter voice note.'],
    monthly_allowance_reached: ['可用次数已用完。请查看下方的额度说明。', 'Your allowance has been used. Check the allowance information below.'],
    failed: ['未能取得文字，请稍后再试或打字。不会自动重试，已开始的识别可能使用一次额度。', 'We could not retrieve a transcript. Try later or type. We will not retry automatically; a conversion that began may use one allowance unit.'],
    invalid_voice_audio: ['这段录音格式无法读取，请重新录音。这次没有进行识别。', 'We could not read this recording format. Record again. No transcription was started.'],
    voice_duration_invalid: ['录音需在半秒至 60 秒之间，请重新录音。这次没有进行识别。', 'Record between half a second and 60 seconds. No transcription was started.'],
    member_budget_unavailable: ['暂时无法确认额度，这次没有继续进行识别。请稍后再试。', 'We could not confirm your allowance, so transcription did not proceed. Please try later.'],
    voice_input_not_ready: ['录音转文字暂未开放，请先用打字聊天。', 'Voice conversion is not open yet. Please type for now.'],
  };
  function paint() {
    $('voice-panel').hidden = !enabled;
    $('voice-wave').classList.toggle('is-recording', phase === 'recording');
    $('voice-title').textContent = t('不想打字？轻轻说一说。', 'Prefer to speak? Take your time.');
    $('voice-hint').textContent = t('最多 60 秒 · 先转文字，再确认发送', 'Up to 60 seconds · Convert, review, then send');
    $('voice-cost').textContent = t('录音和回听不扣次数。按「转成文字」使用 1 次，确认发送再使用 1 次，与打字共用额度。', 'Recording and playback use no allowance. Conversion uses 1 unit; sending the reviewed text uses another. Both share your chat allowance.');
    $('record-voice-label').textContent = phase === 'recording' ? t('结束录音', 'Stop recording') : phase === 'starting' ? t('准备麦克风…', 'Preparing microphone…') : t('录音说一说', 'Record a voice note');
    $('record-voice').disabled = !supported || (phase !== 'recording' && (!allowed || phase !== 'idle'));
    $('record-voice').classList.toggle('recording', phase === 'recording');
    $('convert-voice').textContent = phase === 'converting' ? t('正在转文字…', 'Converting…') : t('转成文字（用 1 次）', 'Convert to text (1 unit)');
    $('convert-voice').hidden = !clip; $('convert-voice').disabled = !allowed || phase !== 'review';
    $('discard-voice').textContent = t('放弃这段录音', 'Discard recording');
    $('discard-voice').hidden = phase === 'idle';
    $('voice-preview').hidden = !clip;
    $('voice-status').textContent = !supported ? t(...messages.unavailable) : phase === 'recording'
      ? t(`正在录音 ${Math.min(60, Math.floor((Date.now() - started) / 1000))} / 60 秒`, `Recording ${Math.min(60, Math.floor((Date.now() - started) / 1000))} / 60 seconds`)
      : status ? t(...(messages[status] || messages.failed)) : '';
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
    $('voice-preview').pause(); $('voice-preview').removeAttribute('src');
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    clipUrl = null; clip = null;
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
        if (event.data.done) {
          const result = wav(); stopDevices(); chunks = [];
          if (result.seconds < 0.5) { phase = 'idle'; status = 'short'; notify(); return; }
          clip = result.blob; clipUrl = URL.createObjectURL(clip); $('voice-preview').src = clipUrl;
          phase = 'review'; status = 'review'; notify();
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
  $('convert-voice').onclick = async () => {
    if (phase !== 'review' || !clip || !allowed) return;
    if (!$('consent').checked) { status = 'consent'; paint(); $('consent').focus(); return; }
    const before = epoch, abort = request = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 35000);
    phase = 'converting'; status = ''; notify();
    try {
      const headers = await window.FCCareAuth.headers();
      if (before !== epoch) return;
      const body = new FormData(); body.append('audio', clip, 'fc-voice.wav'); body.append('consent', 'true');
      const response = await fetch('/chat/voice-draft', { method: 'POST', headers, body, signal: abort.signal });
      const data = await response.json();
      if (before !== epoch) return;
      if (data.allowance) window.dispatchEvent(new CustomEvent('fc-care-voice-allowance', { detail: data.allowance }));
      if (!response.ok) throw Error(data.error);
      if (typeof data.transcript !== 'string' || !data.transcript.trim() || data.transcript.length > 1200) throw Error('failed');
      clearClip(); phase = 'idle'; status = 'converted';
      window.dispatchEvent(new CustomEvent('fc-care-voice-transcript', { detail: data.transcript }));
    } catch (error) {
      if (before !== epoch) return;
      clearClip(); phase = 'idle'; status = messages[error.message] ? error.message : 'failed';
      if (error.message === 'member_login_required') window.FCCareAuth.requireSignIn();
    } finally {
      clearTimeout(timeout);
      if (before === epoch) { request = null; notify(); window.dispatchEvent(new Event('fc-care-voice-refresh')); }
    }
  };
  window.FCCareVoice = { configure(value) { enabled = value.enabled; allowed = value.allowed; lang = value.language; paint(); },
    active: () => phase !== 'idle', reset };
  window.addEventListener('fc-care-auth-changed', reset);
  window.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  drawWave(); paint();
})();
