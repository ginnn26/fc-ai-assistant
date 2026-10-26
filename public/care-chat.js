(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  let ready = false, busy = false, turns = [], allowance = null, includedSends = null, exhausted = false, errorCode = '', controller;
  let supportsStatus = false, allowanceReady = false, checkingAllowance = false, allowanceError = false, allowanceController;
  let voiceEnabled = false;
  function validAllowance(value) {
    return value && [value.remainingTextAttempts, value.includedTextAttempts, value.purchasedTextAttempts]
      .every(n => Number.isSafeInteger(n) && n >= 0) &&
      value.remainingTextAttempts === value.includedTextAttempts + value.purchasedTextAttempts;
  }
  const t = (zh, en) => lang === 'zh' ? zh : en;
  function paint() {
    window.FCCareAuth.language(lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = $('title').textContent = t('FC 暖心聊聊', 'FC Care Chat');
    $('language').textContent = t('English', '中文');
    $('intro').textContent = t('我是小暖 Sunny，FC 的 AI 聊天伙伴。说说心事、整理心情，或找适合此刻的音疗，都可以慢慢跟我聊。打字或说话都可以。', 'Hi, I’m Sunny, your FC AI chat companion. Take your time to share what’s on your mind, talk through how you feel, or explore a suitable FC listening theme. Type or use your voice.');
    $('message-label').textContent = voiceEnabled ? t('打字，或点麦克风说一说', 'Type, or tap the microphone') : t('今天的你，感觉怎么样？', 'How are you feeling today?');
    document.documentElement.className = window.FCCareAuth.signedIn() ? 'chat-active' : '';
    $('chat-room').hidden = !window.FCCareAuth.signedIn();
    $('consent-copy').textContent = voiceEnabled
      ? t('我同意使用 FC AI 处理聊天和所选录音。', 'I agree to AI processing my chat and selected recordings.')
      : t('我同意使用 FC AI 处理这次聊天。', 'I agree to AI processing this chat for FC Care Chat.');
    $('privacy-label').textContent = t('隐私与使用说明', 'Privacy & how it works');
    $('privacy-copy').textContent = t('FC 暖心聊聊使用 OpenAI 提供 AI 回复和录音转文字。发送的聊天文字和录音会传送给 OpenAI 处理。请避免提供姓名、电话及可识别个人身份的资料。按「结束并发送」或达到 60 秒上限时才会上传录音；发送前可取消录音。', 'FC Care Chat uses OpenAI for AI replies and voice transcription. Chat text and voice notes you send are sent to OpenAI for processing. Leave out names, phone numbers and identifying details. Recordings upload when you choose Finish & send or reach the 60-second limit. You can cancel before sending.');
    $('usage-copy').textContent = t('打字发送用 1 次额度。录音结束后自动处理并回复，无需查看或确认文字，合共用 2 次：后台转文字 1 次，聊天发送 1 次。录音本身不扣次数；发送前取消不会扣次数。每月 1 日按马来西亚时间更新附送额度。', 'A typed send uses 1 unit. Finishing a voice note automatically processes it and gets a reply, without text review or confirmation. It uses 2 units: 1 for transcription and 1 for chat. Recording itself is free; cancelling before sending uses no allowance. Included allowance renews on the 1st in Malaysia time.');
    $('latest-message').textContent = t('查看最新回复 ↓', 'Latest reply ↓');
    $('chat-scroll').ariaLabel = t('聊天消息', 'Chat messages');
    $('allowance-summary').textContent = allowance ? t(`本月还剩 ${allowance.remainingTextAttempts} 次 · 额度说明`, `${allowance.remainingTextAttempts} units left · Allowance`) : t('我的聊天额度', 'My chat allowance');
    $('clear').textContent = t('清空聊天', 'Clear chat');
    const voiceReady = window.FCCareVoice?.readyToSend?.() === true;
    $('send').textContent = busy ? t('正在回复…', 'Replying…') : voiceReady ? t('发送录音 · 用 2 次 ↗', 'Send voice · 2 units ↗') : t('发送 ↗', 'Send ↗');
    $('chat-form').className = voiceReady ? 'has-voice-draft' : '';
    $('boundary').textContent = t('提供日常身心支持，不作诊断或医疗建议。紧急不适请先就医。', 'Everyday wellbeing support, not diagnosis or medical advice. Seek care first for urgent symptoms.');
    $('starter-title').textContent = t('今天，想从哪里开始？', 'Where would you like to begin?');
    $('starter-hint').textContent = t('选一个开头，也可以直接写。选完不会自动发送。', 'Pick a starting point, or write your own. Nothing is sent until you choose Send.');
    $('starter-tired').textContent = t('有点疲倦', 'Feeling tired');
    $('starter-tense').textContent = t('心里很绷', 'Feeling tense');
    $('starter-talk').textContent = t('想说说心事', 'Need to talk');
    $('starters').hidden = !ready || !window.FCCareAuth.signedIn() || turns.length > 0;
    $('allowance').textContent = !ready
      ? t('聊天暂未开放。会员验证和每月额度保护接通后，即可使用。', 'Chat is not open yet. Member verification and monthly allowance protection must be connected first.')
      : exhausted ? t('这份聊天额度已用完。付费会员资格有效期间，下个月会更新附送额度。', 'Your available chat allowance has been used. Included allowance renews next month while your paid membership remains active.')
      : allowance ? voiceEnabled ? t(`还剩 ${allowance.remainingTextAttempts} 次可用额度。`, `${allowance.remainingTextAttempts} allowance units remain.`)
        : t(`还可发送 ${allowance.remainingTextAttempts} 次文字消息。`, `${allowance.remainingTextAttempts} text sends remain.`)
      : includedSends && voiceEnabled ? t(`每月包含 ${includedSends} 次可用额度。转文字用 1 次，确认发送再用 1 次；每月 1 日按马来西亚时间更新。`, `${includedSends} allowance units are included each month. Conversion uses 1; sending the reviewed text uses 1 more. Renews on the 1st in Malaysia time.`)
      : includedSends ? t(`每月免费 ${includedSends} 次文字发送。你发一条算一次，AI 回复不另计；每月 1 日按马来西亚时间更新。`, `${includedSends} text sends are included free each month. Each message you send counts once; the AI reply does not count separately. Renews on the 1st in Malaysia time.`)
      : t('每月包含一份聊天额度，用完后可等下月再来。', 'A chat allowance is included each month. Once used, you can return next month.');
    const waitingForAllowance = supportsStatus && (!allowanceReady || checkingAllowance);
    const voiceActive = window.FCCareVoice?.active() === true;
    window.FCCareVoice?.configure({ enabled: voiceEnabled,
      allowed: ready && !busy && !exhausted && !waitingForAllowance && window.FCCareAuth.signedIn() &&
        (!allowance || allowance.remainingTextAttempts >= 2), language: lang, remainingUnits: allowance?.remainingTextAttempts ?? null });
    $('message').disabled = !ready || busy || exhausted || waitingForAllowance || voiceActive || !window.FCCareAuth.signedIn();
    $('send').disabled = !ready || busy || exhausted || waitingForAllowance || voiceActive && !voiceReady || !window.FCCareAuth.signedIn();
    $('refresh-allowance').hidden = !ready || !supportsStatus || !window.FCCareAuth.signedIn();
    $('refresh-allowance').disabled = busy || checkingAllowance || voiceActive;
    $('refresh-allowance').textContent = checkingAllowance ? t('正在查看…', 'Checking…') : t('刷新次数', 'Refresh allowance');
    $('allowance-status').textContent = allowanceError
      ? errorCode === 'member_not_eligible' ? t(...errors.member_not_eligible) : t('暂时未能查到剩余次数，请点「刷新次数」。查询不会扣次数。', 'We could not check your remaining sends. Select “Refresh allowance”. Checking uses no sends.')
      : checkingAllowance ? t('正在查看你的剩余次数，不会扣次数。', 'Checking your remaining sends. This uses no sends.')
      : allowance && supportsStatus ? t(`本月附送剩余 ${allowance.includedTextAttempts} 次。`, voiceEnabled
        ? `${allowance.includedTextAttempts} included units left.`
        : `${allowance.includedTextAttempts} included sends left.`) : '';
    const low = allowanceReady && !checkingAllowance && !allowanceError && allowance && allowance.remainingTextAttempts > 0 && allowance.remainingTextAttempts <= 10;
    $('allowance-tip').hidden = !low;
    $('allowance-tip').textContent = low && !voiceEnabled ? t(`温馨提醒：还可发送 ${allowance.remainingTextAttempts} 次。附送额度会在下个月 1 日更新。`, `A gentle reminder: ${allowance.remainingTextAttempts} sends remain. Included allowance renews on the 1st of next month.`) : low ? t(`温馨提醒：还剩 ${allowance.remainingTextAttempts} 次额度。打字发送用 1 次；录音转文字再发送合共用 2 次。附送额度会在下个月 1 日更新。`, `A gentle reminder: ${allowance.remainingTextAttempts} units remain. A typed send uses 1; converting and sending a voice note uses 2. Included allowance renews on the 1st of next month.`) : '';
    $('extra-title').textContent = t('照顾自己，慢慢来。', 'Keep making time for yourself.');
    $('extra-copy').textContent = t('本月聊天额度已用完。付费会员资格有效期间，附送额度会在下个月 1 日按马来西亚时间更新。你仍可按会员权限聆听音疗，也可以继续每日打卡。', 'Your chat allowance for this month has been used. Included allowance renews on the 1st of next month in Malaysia time while your paid membership remains active. You can keep listening within your membership and continue your daily check-ins.');
    $('extra-panel').hidden = !exhausted;
    $('error').textContent = errorCode ? t(...(errors[errorCode] || errors.fallback)) : '';
  }
  function showTurns() {
    const previousScroll = $('chat-scroll').scrollTop || 0;
    $('messages').replaceChildren(...turns.map(turn => {
      const li = document.createElement('li');
      li.className = turn.role;
      li.textContent = turn.content;
      if (turn.role === 'assistant' && Array.isArray(turn.recommendations)) {
        const node = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
        const safe = (value, player = false) => {
          try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'frequencies-clinic.learnworlds.com' && !u.username && !u.password &&
            (player ? u.pathname === '/path-player' && !!u.searchParams.get('courseid') && !!u.searchParams.get('unit') : /^\/detail-[a-z0-9-]+$/.test(u.pathname)); } catch { return false; }
        };
        const link = (label, href) => { const el = node('a', label); el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; return el; };
        for (const item of turn.recommendations.slice(0,3)) {
          if (typeof item.name !== 'string' || !safe(item.descriptionUrl)) continue;
          const card = node('article', ''); card.className = 'listening-card';
          const cover = window.FCThemeMedia?.[item.id];
          if (cover && /^\/assets\/themes-v1\/[a-z0-9_-]+\.webp$/.test(cover.src)) {
            const image = node('img', ''); image.src = cover.src; image.alt = ''; image.width = 768; image.height = 512; image.loading = 'lazy';
            card.append(image);
          }
          card.append(node('p', t('给此刻的聆听选择', 'A listening choice for now')), node('h3', (lang === 'zh' ? item.nameZh : item.nameEn) || item.name),
            node('p', item.source === 'catalog-theme' ? t('与你刚才谈到的主题相近，可以按自己的感受选择。', 'A listening theme related to what you shared; choose what feels comfortable.') : item.reason),
            node('p', item.source === 'catalog-theme' ? t('先看这首音疗的使用说明，选择你会员可用的版本，按舒适音量聆听。', 'Read this recording’s instructions, choose a version available to your membership and listen at a comfortable volume.') : item.usage),
            link(t('查看音疗说明 ↗', 'Read the audio guide ↗'), item.descriptionUrl));
          const versions = node('details', '');
          versions.append(node('summary', t('选择会员音疗版本', 'Choose your member recording')));
          const courseNames = { 'sound-healing': t('订阅会员', 'Subscription'), 'private-soundhealing': t('私人音疗', 'Private library'), 'trial-soundhealing': t('试用音疗', 'Trial library') };
          for (const r of (Array.isArray(item.recordings) ? item.recordings : []).slice(0,12)) {
            if (safe(r.url, true)) versions.append(link(`${courseNames[r.course] || t('会员音疗', 'Member library')} · ${r.version || ''}`, r.url));
          }
          card.append(versions); li.append(card);
        }
      }
      return li;
    }));
    $('chat-scroll').scrollTop = previousScroll;
  }
  function jumpToReply() {
    const scroll = $('chat-scroll');
    const reply = $('messages').lastElementChild;
    // Read the start of a long reply, rather than skipping to the end of its cards.
    scroll.scrollTop = reply ? Math.max(0, reply.offsetTop - scroll.offsetTop - 12) : scroll.scrollHeight;
    $('latest-message').hidden = true;
  }
  $('latest-message').onclick = jumpToReply;
  $('chat-scroll').onscroll = () => {
    const scroll = $('chat-scroll');
    if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40) $('latest-message').hidden = true;
  };
  function fitDraft() {
    const input = $('message');
    if (!input.style) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  }
  $('message').oninput = fitDraft;
  function fitViewport() {
    // Dynamic height also follows the on-screen keyboard in full-screen browsers.
    const height = window.visualViewport?.height || window.innerHeight;
    if (height) document.documentElement.style?.setProperty('--chat-height', height + 'px');
  }
  window.visualViewport?.addEventListener('resize', fitViewport);
  window.addEventListener('resize', fitViewport);
  fitViewport();
  const errors = {
    member_not_eligible: ['这个账户暂未获得暖心聊聊使用资格，不必重复登录。每月附送额度仅限有效付费会员；如有疑问，请联系 FC 核对。', 'Care Chat access is not enabled for this account. You do not need to sign in again. Monthly included allowance is for active paid members only. Contact FC if you need an eligibility check.'],
    member_login_required: ['请先用你的 FC 邮箱完成验证。', 'Please verify the email you use for FC first.'],
    auth_temporarily_unavailable: ['登录连接暂时不稳定，你输入的文字仍保留。请稍后再试。', 'The sign-in connection is temporarily unavailable. Your draft is still here. Please try later.'],
    monthly_allowance_reached: ['本月聊天额度已用完。付费会员资格有效期间，下个月会更新附送额度。音疗仍按会员权限开放，每日打卡不受影响。', 'Your monthly chat allowance has been used. Included allowance renews next month while your paid membership remains active. Audio access follows your membership; daily check-ins are unaffected.'],
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
      if (!validAllowance(value)) throw Error('member_budget_unavailable');
      if (errorCode === 'member_not_eligible') errorCode = '';
      allowance = value; exhausted = value.remainingTextAttempts === 0; allowanceReady = true;
    } catch (error) {
      if (allowanceController !== request) return;
      allowanceError = true; allowanceReady = false;
      if (error.message === 'member_not_eligible') errorCode = error.message;
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
    fitDraft(); $('message').focus();
  };
  $('language').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; showTurns(); paint(); };
  $('clear').onclick = () => {
    window.FCCareVoice?.reset();
    controller?.abort(); controller = null; busy = false; turns = []; showTurns();
    $('message').value = ''; $('latest-message').hidden = true; $('chat-scroll').scrollTop = 0; fitDraft(); errorCode = ''; paint(); loadAllowance();
  };
  $('chat-form').onsubmit = async event => {
    event.preventDefault();
    if (!ready || busy || exhausted || supportsStatus && (!allowanceReady || checkingAllowance)) return;
    if (!$('consent').checked) { $('consent').focus(); return; }
    if (window.FCCareVoice?.active()) {
      if (!window.FCCareVoice.readyToSend?.()) return;
      // One explicit voice-send action. The capture module locks conversion
      // synchronously, so a double click cannot upload or send twice.
      if (await window.FCCareVoice.convertForSend()) return $('chat-form').onsubmit(event);
      return;
    }
    const content = $('message').value.trim();
    if (!content) return;
    const pending = [...turns.slice(-6).map(({role, content}) => ({role, content})), { role: 'user', content }];
    while (pending.length > 1 && new TextEncoder().encode(JSON.stringify(pending)).length > 8500)
      pending.splice(0, 2);
    const scroll = $('chat-scroll');
    const wasNearLatest = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
    const scrollBeforeRequest = scroll.scrollTop;
    busy = true; errorCode = ''; paint();
    const request = controller = new AbortController();
    const timer = setTimeout(() => request.abort(), 35000);
    try {
      const headers = await window.FCCareAuth.headers();
      if (controller !== request) return;
      const response = await fetch('/chat/conversation', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ consent: true, language: lang, turns: pending }), signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (controller !== request) return;
      if (typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 1200 || !validAllowance(data.allowance))
        throw Error('invalid_chat_response');
      turns = [...turns, { role: 'user', content }, { role: 'assistant', content: data.reply,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [] }].slice(-40);
      allowance = data.allowance; exhausted = allowance?.remainingTextAttempts === 0;
      const stayedNearLatest = Math.abs(scroll.scrollTop - scrollBeforeRequest) < 40;
      showTurns(); $('message').value = ''; fitDraft(); paint();
      if (wasNearLatest && stayedNearLatest) jumpToReply();
      else $('latest-message').hidden = false;
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
  window.addEventListener('fc-care-voice-submit', () => $('chat-form').onsubmit({ preventDefault() {} }));
  window.addEventListener('fc-care-voice-refresh', loadAllowance);
  window.addEventListener('fc-care-voice-allowance', event => {
    if (!validAllowance(event.detail)) { allowanceReady = false; allowanceError = true; paint(); return; }
    allowance = event.detail; exhausted = allowance.remainingTextAttempts === 0; paint();
  });
  window.addEventListener('fc-care-voice-transcript', event => {
    $('message').value = event.detail; fitDraft(); errorCode = ''; paint(); $('message').focus();
  });
  window.addEventListener('fc-care-voice-send-draft', event => {
    // Keep the transcript if the following chat request fails, without opening
    // the keyboard or making the customer review it before the direct send.
    $('message').value = event.detail; fitDraft(); errorCode = ''; paint();
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
