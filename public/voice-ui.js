// Presentation only: no microphone access, audio analysis or network requests.
(() => {
  function paint(button, { recording = false, busy = false, language = 'zh' } = {}) {
    const zh = language === 'zh';
    const state = recording ? 'recording' : busy ? 'processing' : 'ready';
    const label = recording
      ? zh ? '点击停止' : 'Tap to stop'
      : busy ? zh ? '请稍候' : 'Please wait'
      : zh ? '开始说话' : 'Start speaking';
    button.querySelector('[data-mic-label]').textContent = label;
    button.setAttribute('aria-label', recording
      ? zh ? '停止录音' : 'Stop recording'
      : busy ? zh ? '正在处理，请稍候' : 'Processing, please wait'
      : zh ? '开始录音，说说此刻的你' : 'Start recording. Tell us how you feel');
    button.dataset.state = state;
    button.closest('.record-row').dataset.state = state;
  }
  window.FCVoiceUI = { paint };
})();
