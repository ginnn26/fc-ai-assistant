(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  let ready = false, busy = false, turns = [], allowance = null, includedSends = null, exhausted = false, errorCode = '', controller;
  let supportsStatus = false, allowanceReady = false, checkingAllowance = false, allowanceError = false, allowanceController;
  let voiceEnabled = false;
  const t = (zh, en) => lang === 'zh' ? zh : en;
  function paint() {
    window.FCCareAuth.language(lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = $('title').textContent = t('FC 暖心聊聊', 'FC Care Chat');
    $('language').textContent = t('English', '中文');
    $('intro').textContent = t('不用急着说清楚。从今天的感受开始，一起聊一聊。', 'There is no rush. Start with how today feels.');
    $('message-label').textContent = t('今天的你，感觉怎么样？', 'How are you feeling today?');
    $('consent-copy').textContent = voiceEnabled
      ? t('我同意将本次聊天文字及选择转写的录音交由 OpenAI 处理。我会避免姓名、电话等个人资料。', 'I agree to OpenAI processing my chat text and recordings I choose to convert. I will leave out names, phone numbers and identifying details.')
      : t('我同意将本次聊天文字交由 OpenAI 处理。不包含姓名、电话等个人资料。', 'I agree to OpenAI processing this conversation. I will leave out names, phone numbers and identifying details.');
    $('clear').textContent = t('清空聊天', 'Clear chat');
    $('send').textContent = busy ? t('正在回复…', 'Replying…') : t('发送 ↗', 'Send ↗');
    $('boundary').textContent = t('提供日常身心支持，不作诊断或医疗建议。紧急不适请先就医。', 'Everyday wellbeing support, not diagnosis or medical advice. Seek care first for urgent symptoms.');
    $('starter-title').textContent = t('今天，想从哪里开始？', 'Where would you like to begin?');
    $('starter-hint').textContent = t('选一个开头，也可以直接写。选完不会自动发送。', 'Pick a starting point, or write your own. Nothing is sent until you choose Send.');
    $('starter-tired').textContent = t('有点疲倦', 'Feeling tired');
    $('starter-tense').textContent = t('心里很绷', 'Feeling tense');
    $('starter-talk').textContent = t('想说说心事', 'Need to talk');
    $('starters').hidden = !ready || !window.FCCareAuth.signedIn() || turns.length > 0;
    $('allowance').textContent = !ready
      ? t('聊天暂未开放。会员验证和每月额度保护接通后，即可使用。', 'Chat is not open yet. Member verification and monthly allowance protection must be connected first.')
      : exhausted ? t('这份聊天额度已用完。下个月的新额度会自动开放。', 'Your available chat allowance has been used. A new monthly allowance opens next month.')
      : allowance ? voiceEnabled ? t(`还剩 ${allowance.remainingTextAttempts} 次可用额度。`, `${allowance.remainingTextAttempts} allowance units remain.`)
        : t(`还可发送 ${allowance.remainingTextAttempts} 次文字消息。`, `${allowance.remainingTextAttempts} text sends remain.`)
      : includedSends && voiceEnabled ? t(`每月包含 ${includedSends} 次可用额度。转文字用 1 次，确认发送再用 1 次；每月 1 日按马来西亚时间更新。`, `${includedSends} allowance units are included each month. Conversion uses 1; sending the reviewed text uses 1 more. Renews on the 1st in Malaysia time.`)
      : includedSends ? t(`每月免费 ${includedSends} 次文字发送。你发一条算一次，AI 回复不另计；每月 1 日按马来西亚时间更新。`, `${includedSends} text sends are included free each month. Each message you send counts once; the AI reply does not count separately. Renews on the 1st in Malaysia time.`)
      : t('每月包含一份聊天额度，用完后可等下月再来。', 'A chat allowance is included each month. Once used, you can return next month.');
    const waitingForAllowance = supportsStatus && (!allowanceReady || checkingAllowance);
    const voiceActive = window.FCCareVoice?.active() === true;
    window.FCCareVoice?.configure({ enabled: voiceEnabled,
      allowed: ready && !busy && !exhausted && !waitingForAllowance && window.FCCareAuth.signedIn() &&
        (!allowance || allowance.remainingTextAttempts >= 2), language: lang });
    $('message').disabled = !ready || busy || exhausted || waitingForAllowance || voiceActive || !window.FCCareAuth.signedIn();
    $('send').disabled = !ready || busy || exhausted || waitingForAllowance || voiceActive || !window.FCCareAuth.signedIn();
    $('refresh-allowance').hidden = !ready || !supportsStatus || !window.FCCareAuth.signedIn();
    $('refresh-allowance').disabled = busy || checkingAllowance || voiceActive;
    $('refresh-allowance').textContent = checkingAllowance ? t('正在查看…', 'Checking…') : t('刷新次数', 'Refresh allowance');
    $('allowance-status').textContent = allowanceError
      ? t('暂时未能查到剩余次数，请点「刷新次数」。查询不会扣次数。', 'We could not check your remaining sends. Select “Refresh allowance”. Checking uses no sends.')
      : checkingAllowance ? t('正在查看你的剩余次数，不会扣次数。', 'Checking your remaining sends. This uses no sends.')
      : allowance && supportsStatus ? t(`本月免费剩余 ${allowance.includedTextAttempts} 次 · 已购买剩余 ${allowance.purchasedTextAttempts} 次。`, voiceEnabled
        ? `${allowance.includedTextAttempts} included units left · ${allowance.purchasedTextAttempts} purchased units left.`
        : `${allowance.includedTextAttempts} included sends left · ${allowance.purchasedTextAttempts} purchased sends left.`) : '';
    $('extra-title').textContent = t('想多聊一会儿？', 'A little more time to talk?');
    $('extra-copy').textContent = t('你可以等下个月的新额度。聊天加额包计划每份 RM15，自由选择，不会自动扣款。付款功能尚未开放。', 'You can wait for next month’s included allowance. An optional Extra Chat Pack is planned at RM15 per pack, with no automatic charge. Purchasing is not available yet.');
    $('extra-rules').textContent = t('查看加额包说明', 'Read pack details');
    $('extra-rules').href = '/care-chat-pack.html?lang=' + lang;
    $('extra-panel').hidden = !exhausted;
    $('error').textContent = errorCode ? t(...(errors[errorCode] || errors.fallback)) : '';
  }
  function showTurns() {
    $('messages').replaceChildren(...turns.map(turn => {
      const li = document.createElement('li');
      li.className = turn.role;
      li.textContent = turn.content;
      return li;
    }));
  }
  const errors = {
    member_login_required: ['请先用你的 FC 邮箱完成验证。', 'Please verify the email you use for FC first.'],
    auth_temporarily_unavailable: ['登录连接暂时不稳定，你输入的文字仍保留。请稍后再试。', 'The sign-in connection is temporarily unavailable. Your draft is still here. Please try later.'],
    monthly_allowance_reached: ['本月聊天额度已用完，下个月会重新开放。音疗与每日打卡仍可照常使用。', 'Your monthly chat allowance has been used. It resets next month. Listening and daily check-ins remain available.'],
    conversation_too_long: ['这段聊天较长，请清空后开始一个新话题。', 'This conversation is getting long. Clear it to start a new topic.'],
    please_wait: ['现在比较忙，请稍候再发送。', 'It is a little busy. Please wait before sending again.'],
    member_budget_unavailable: ['暂时无法确认你的额度，这次没有继续调用 AI。请稍后再试。', 'We could not confirm your allowance, so this request did not continue to AI. Please try later.'],
    fallback: ['暂时未能取得回复。为避免重复发送，请稍后再试；已开始处理的请求可能会使用一次额度。', 'We could not retrieve a reply. Please wait before trying again to avoid duplicates. A request that already began processing may use one send.'],
  };
  async function loadAllowance() {
    if (!ready || !supportsStatus || !window.FCCareAuth.signedIn() || busy || window.FCCareVoice?.active()) return;
    allowanceController?.abort();
    const request = allowanceController = new AbortController();
    checkingAllowance = true; allowanceError = false; paint();
    const timer = setTimeout(() => request.abort(), 15000);
    try {
      const headers = await window.FCCareAuth.headers();
      if (allowanceController !== request) return;
      const response = await fetch('/chat/allowance', { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers }, body: '{}', signal: request.signal });
      const data = await response.json();
      if (allowanceController !== request) return;
      if (!response.ok) throw Error(data.error);
      const value = data.allowance;
      if (!value || ![value.remainingTextAttempts, value.includedTextAttempts, value.purchasedTextAttempts]
        .every(n => Number.isSafeInteger(n) && n >= 0) ||
        value.remainingTextAttempts !== value.includedTextAttempts + value.purchasedTextAttempts)
        throw Error('member_budget_unavailable');
      allowance = value; exhausted = value.remainingTextAttempts === 0; allowanceReady = true;
    } catch (error) {
      if (allowanceController !== request) return;
      allowanceError = true; allowanceReady = false;
      if (error.message === 'member_login_required') window.FCCareAuth.requireSignIn();
    } finally {
      clearTimeout(timer);
      if (allowanceController === request) { checkingAllowance = false; paint(); }
    }
  }
  $('refresh-allowance').onclick = loadAllowance;
  for (const [id, zh, en] of [
    ['tired', '我最近觉得有点累，想一起理一理今天的状态。', 'I have been feeling a little tired. I would like to talk through how today feels.'],
    ['tense', '我心里有点绷，想先放慢一点。', 'I feel a little tense and would like to slow down.'],
    ['talk', '我有些心事，现在只想先说说。', 'There is something on my mind. For now, I would just like to talk.'],
  ]) $('choose-' + id).onclick = () => {
    // Prepare a draft only. Choosing a card never submits data or uses a send.
    if (busy || exhausted || window.FCCareVoice?.active()) return;
    if (!$('message').value.trim()) $('message').value = t(zh, en);
    $('message').focus();
  };
  $('language').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; paint(); };
  $('clear').onclick = () => {
    window.FCCareVoice?.reset();
    controller?.abort(); controller = null; busy = false; turns = []; showTurns();
    $('message').value = ''; errorCode = ''; paint(); loadAllowance();
  };
  $('chat-form').onsubmit = async event => {
    event.preventDefault();
    if (!ready || busy || exhausted || window.FCCareVoice?.active() || supportsStatus && (!allowanceReady || checkingAllowance)) return;
    if (!$('consent').checked) { $('consent').focus(); return; }
    const content = $('message').value.trim();
    if (!content) return;
    const pending = [...turns.slice(-6), { role: 'user', content }];
    while (pending.length > 1 && new TextEncoder().encode(JSON.stringify(pending)).length > 8500)
      pending.splice(0, 2);
    busy = true; errorCode = ''; paint();
    const request = controller = new AbortController();
    const timer = setTimeout(() => request.abort(), 35000);
    try {
      const response = await fetch('/chat/conversation', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...await window.FCCareAuth.headers() },
        body: JSON.stringify({ consent: true, language: lang, turns: pending }), signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (controller !== request) return;
      turns = [...turns, { role: 'user', content }, { role: 'assistant', content: data.reply }].slice(-40);
      allowance = data.allowance; exhausted = allowance?.remainingTextAttempts === 0;
      showTurns(); $('message').value = '';
    } catch (error) {
      if (controller === request) {
        errorCode = error.message;
        if (error.message === 'monthly_allowance_reached') exhausted = true;
        if (error.message === 'member_login_required') window.FCCareAuth.requireSignIn();
      }
    } finally {
      clearTimeout(timer);
      if (controller === request) { busy = false; paint(); if (errorCode) loadAllowance(); }
    }
  };
  window.addEventListener('pagehide', () => { controller?.abort(); allowanceController?.abort(); });
  window.addEventListener('fc-care-voice-state', paint);
  window.addEventListener('fc-care-voice-refresh', loadAllowance);
  window.addEventListener('fc-care-voice-allowance', event => {
    allowance = event.detail; exhausted = allowance?.remainingTextAttempts === 0; paint();
  });
  window.addEventListener('fc-care-voice-transcript', event => {
    $('message').value = event.detail; errorCode = ''; paint(); $('message').focus();
  });
  window.addEventListener('fc-care-auth-changed', () => {
    controller?.abort(); controller = null; busy = false; turns = []; allowance = null; exhausted = false; errorCode = '';
    allowanceController?.abort(); allowanceController = null;
    allowanceReady = false; checkingAllowance = false; allowanceError = false;
    $('message').value = ''; $('consent').checked = false;
    showTurns(); paint(); loadAllowance();
  });
  paint();
  fetch('/chat/features').then(r => r.ok ? r.json() : null).then(data => {
    ready = data?.conversation === true && data?.emailLogin === true;
    const count = data?.monthlyAllowance?.includedTextAttempts;
    includedSends = Number.isInteger(count) && count > 0 && count <= 10000 ? count : null;
    supportsStatus = data?.allowanceStatus === true;
    voiceEnabled = data?.voiceInput === true;
    window.FCCareAuth.configure(data || {}); paint(); loadAllowance();
  }).catch(() => { ready = false; paint(); });
})();
