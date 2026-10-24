(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let lang = "zh",
    busy = false,
    recording = false,
    recorder = null,
    stream = null,
    timer = null,
    controller = null,
    sequence = 0,
    result = null,
    seconds = 0,
    recordToken = 0,
    discard = false;
  const t = (zh, en) => (lang === "zh" ? zh : en);
  let intake = {},
    sessionInfo = null,
    sessionToken = "",
    consultationToken = "",
    bootstrapPromise = null,
    audioContext = null,
    analyser = null,
    waveFrame = null;
  try {
    sessionToken = localStorage.getItem("fc-assistant-session-v2") || "";
  } catch {}
  const copy = {
    title: ["说说此刻的你。", "Tell us how you feel."],
    intro: [
      "跟着下面的提示，说说你的近况。我们会先了解需要，必要时追问，再从 FC 已收录的资料中寻找聆听主题。",
      "Use the prompts below to share how you feel. We will understand your needs, ask for context when needed, and explore themes in the available FC catalog.",
    ],
    "share-title": ["从你的声音开始。", "Begin with your voice."],
    "consent-copy": [
      "我同意将本次录音及确认后的文字发送给 OpenAI，用于识别和聆听主题推荐。FC 不保存录音或咨询内容；只记录匿名用量编号与次数。OpenAI 可能按其服务政策处理资料。请不要提供姓名、电话或其他身份资料。",
      "I agree to send this audio and confirmed text to OpenAI for transcription and listening-theme suggestions. FC does not retain audio or consultation content; only pseudonymous usage identifiers and counts. OpenAI may process data under its service policies. Please omit names, contact details and other identifying information.",
    ],
    "record-note": [
      "建议 30–60 秒，说清楚即可，不用讲满。",
      "Aim for 30–60 seconds; there is no minimum.",
    ],
    "upload-label": ["也可以上传录音", "Or upload a recording"],
    "upload-copy": [
      "选择 60 秒以内、8 MB 以下的录音。会先在设备上转换格式，再发送识别；识别后可以修改文字。",
      "Choose a recording up to 60 seconds and 8 MB. Your device converts it before upload, and you can edit the transcript.",
    ],
    "upload-button": ["识别这段录音", "Transcribe recording"],
    "review-label": [
      "确认你的文字，再继续",
      "REVIEW YOUR WORDS BEFORE CONTINUING",
    ],
    "input-label": ["识别文字／直接输入", "Your transcript / type instead"],
    "preference-label": ["声音偏好", "Listening preference"],
    sendButton: ["确认文字，查看推荐 ↗", "Confirm text & find themes ↗"],
    boundary: [
      "这是日常身心支持内容选择工具，不用于诊断或治疗疾病。紧急不适请先就医，不要等待音疗推荐。",
      "A tool for choosing everyday wellbeing content, not for diagnosis or medical treatment. Seek care for urgent symptoms rather than waiting for recommendations.",
    ],
    "results-title": ["你的聆听起点。", "Your listening starting point."],
    reset: ["重新开始", "Start again"],
    "membership-label": [
      "选择你的 FC 会员入口（不会改变会员权限）",
      "Choose your FC membership route (access remains unchanged)",
    ],
    "access-note": [
      "订阅会员包括月度、半年和年度方案。仅显示目录中确实存在的版本；播放仍由 FC 检查你的登录与会员资格。",
      "Subscription includes monthly, half-year and annual plans. Only catalogued versions are shown. FC still checks your login and membership access.",
    ],
    "results-boundary": [
      "选择舒服的版本，保持轻柔音量；如有不适，请停止。",
      "Choose a comfortable version and gentle volume; stop if listening feels uncomfortable.",
    ],
    footer: [
      "FREQUENCIES CLINIC · 声音相伴，照顾日常",
      "FREQUENCIES CLINIC · SOUND FOR EVERYDAY WELLBEING",
    ],
    "guide-title": ["不知道怎样开始说？", "Not sure where to start?"],
    "guide-note": [
      "可以只说你知道的，不确定就说明；身体不适时请加上就医、受伤和用药情况。",
      "Share what you know; ‘not sure’ is fine. For physical symptoms, include any injury, medical assessment and current medication.",
    ],
    followupButton: ["补充好了，继续 ↗", "Continue with this context ↗"],
  };
  function usageNote() {
    if (!sessionInfo) {
      $("usage-note").textContent = t(
        "测试体验 · 正在准备本次咨询。",
        "Test experience · Preparing your consultation.",
      );
      return;
    }
    const count = sessionInfo.remaining;
    $("usage-note").textContent =
      sessionInfo.quotaMode === "test"
        ? t(
            `测试额度：本次设备会话还可开启 ${count} 次咨询。正式会员每日额度尚未启用。`,
            `Test allowance: ${count} consultations remain for this device session. Formal member daily allowances are not enabled.`,
          )
        : t(
            `今日剩余 ${count} 次咨询 · 同次必要补充不另扣次数 · 马来西亚时间每日重置。`,
            `${count} consultations remain today. Necessary context in the same consultation does not use another allowance. Resets daily in Malaysia time.`,
          );
  }
  async function bootstrap(force = false) {
    if (force) bootstrapPromise = null;
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      const fragment = new URLSearchParams(location.hash.slice(1)),
        ticket = fragment.get("fc_ticket");
      if (ticket)
        history.replaceState(null, "", location.pathname + location.search);
      const data = await json(
        await fetch("/chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, ...(ticket ? { ticket } : {}) }),
          signal: AbortSignal.timeout(10000),
        }),
      );
      sessionToken = data.token;
      sessionInfo = data;
      try {
        localStorage.setItem("fc-assistant-session-v2", sessionToken);
      } catch {}
      usageNote();
      return data;
    })();
    try {
      return await bootstrapPromise;
    } catch (e) {
      bootstrapPromise = null;
      throw e;
    }
  }
  function status(zh, en, error = false) {
    $("status").textContent = t(zh, en);
    $("status").classList.toggle("error", error);
  }
  function option(value, text) {
    const e = document.createElement("option");
    e.value = value;
    e.textContent = text;
    return e;
  }
  function paint() {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
    for (const [id, c] of Object.entries(copy)) $(id).textContent = t(...c);
    $("language").textContent = t("English", "中文");
    $("guide-list").replaceChildren(
      ...[
        t(
          "现在最想改善什么？有什么具体感觉？",
          "What would you like support with? What does it feel like?",
        ),
        t(
          "什么时候开始？持续多久、多久出现一次？",
          "When did it start, how long has it lasted, and how often?",
        ),
        t(
          "怎样影响你的睡眠、工作或日常活动？",
          "How does it affect sleep, work or daily activities?",
        ),
        t(
          "喜欢平稳频率、背景音乐，还是没有偏好？",
          "Do you prefer steady frequencies, background music, or either?",
        ),
      ].map((x) => make("li", x)),
    );
    usageNote();
    $("steps").replaceChildren(
      ...[
        t("说说近况", "Share"),
        t("核对文字", "Review"),
        t("探索音疗", "Explore"),
      ].map((s, i) => {
        const e = document.createElement("span"),
          b = document.createElement("b");
        b.textContent = "0" + (i + 1);
        e.append(b, document.createTextNode(s));
        return e;
      }),
    );
    const pref = $("preference").value || "any",
      member = $("membership").value || "";
    $("preference").replaceChildren(
      option("any", t("暂时没有偏好", "No preference")),
      option("smooth", "Smooth · " + t("平稳频率", "Steady frequency")),
      option("bgm", "BGM · " + t("背景音乐", "With music")),
      option(
        "intensive",
        "Intensive · " + t("强弱变化明显", "Varying intensity"),
      ),
    );
    $("preference").value = pref;
    $("membership").replaceChildren(
      option("", t("请选择会员入口", "Choose a membership route")),
      option(
        "sound-healing",
        t("订阅会员（月／半年／年）", "Subscription member"),
      ),
      option(
        "private-soundhealing",
        t("长期／私人会员", "Long-term / private member"),
      ),
      option("trial-soundhealing", t("免费试用", "Free trial")),
    );
    $("membership").value = member;
    $("messageInput").placeholder = t(
      "例如：最近工作压力大，晚上难放松，想听柔和、有音乐的版本。",
      "For example: work has been stressful and I find it hard to unwind. I prefer gentle sound with music.",
    );
    $("cancel-recording").textContent = t("取消录音", "Cancel recording");
    $("mic-help-copy").textContent = t(
      "若浏览器不允许麦克风，请在网站权限中开启，或在新窗口打开后再按录音。你也可以上传录音或直接输入。",
      "If your browser blocks recording, allow the microphone in site permissions or open this tool directly and tap record. You can also upload audio or type.",
    );
    $("open-direct").href = location.origin + location.pathname;
    $("open-direct").textContent = t(
      "在新窗口使用语音 ↗",
      "Open voice tool in a new window ↗",
    );
    controls();
    renderResults();
  }
  function controls() {
    $("language").disabled = busy || recording;
    $("mic-label").textContent = recording
      ? t("停止录音", "Stop recording")
      : t("点击，说说近况", "Tap to speak");
    $("micButton").classList.toggle("recording", recording);
    $("micButton").setAttribute("aria-pressed", String(recording));
    $("micButton").disabled = busy;
    $("cancel-recording").hidden = !recording;
    $("sendButton").disabled = busy || recording;
    $("upload-button").disabled = busy || recording;
    $("messageInput").disabled = busy || recording;
    $("audio-file").disabled = busy || recording;
    $("preference").disabled = busy || recording;
    $("consent").disabled = busy || recording;
    $("followupButton").disabled = busy || recording;
    $("intake-fields")
      .querySelectorAll("textarea")
      .forEach((e) => (e.disabled = busy || recording));
    $("count").textContent = $("messageInput").value.length + " / 2000";
  }
  function consent() {
    if ($("consent").checked) return true;
    status(
      "请先阅读并勾选资料使用说明。",
      "Please review and accept the data-use notice first.",
      true,
    );
    $("consent").focus();
    return false;
  }
  async function json(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("temporarily_unavailable");
    }
    if (data.consultationToken) consultationToken = data.consultationToken;
    if (sessionInfo && Number.isInteger(data.remaining)) {
      sessionInfo.remaining = data.remaining;
      usageNote();
    }
    if (!response.ok) throw Error(data.error || "temporarily_unavailable");
    return data;
  }
  async function recommendationRequest(payload, signal) {
    const send = () =>
      fetch("/chat/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      }).then(json);
    try {
      return await send();
    } catch (e) {
      if (e.message !== "session_required") throw e;
      await bootstrap(true);
      payload.sessionToken = sessionToken;
      return send();
    }
  }
  const errors = {
    daily_limit: [
      "今日咨询额度已用完，请明天再来。紧急不适仍请立即求医。",
      "Today's consultation allowance is used. Please return tomorrow; seek immediate care for urgent symptoms.",
    ],
    daily_budget: [
      "今天的 AI 服务用量已达上限，请稍后再来。紧急求助提示仍可使用。",
      "Today's AI service capacity has been reached. Urgent-help guidance remains available.",
    ],
    consultation_limit: [
      "本次咨询已达到重试上限。可以重新开始一次咨询。",
      "This consultation has reached its retry limit. You can start a new consultation.",
    ],
    session_required: [
      "请刷新页面后重试，以重新核对本次用量。",
      "Refresh this page to prepare a new usage session.",
    ],
    consultation_expired: [
      "本次咨询已过期，请重新开始。",
      "This consultation has expired. Please start again.",
    ],
    membership_not_connected: [
      "会员验证暂未接通，请使用测试入口或稍后再试。",
      "Membership verification is not connected yet. Use the test entry or try again later.",
    ],
    usage_not_configured: [
      "正式服务的用量设置尚未完成，目前不能开始咨询。",
      "Usage controls for the formal service are not ready yet.",
    ],
    invalid_audio_duration: [
      "请使用 0.5–60 秒的录音。",
      "Please use a recording between 0.5 and 60 seconds.",
    ],
    audio_needs_conversion: [
      "此录音无法转换，请重录或直接输入文字。",
      "This audio could not be converted. Record again or type instead.",
    ],
    speech_not_clear: [
      "没有识别到清楚的话语，可以重录或直接输入。",
      "No clear speech was detected. Record again or type instead.",
    ],
    unsupported_audio: [
      "录音格式无法识别，请改用 MP3、M4A、WAV 或 WebM。",
      "Unsupported audio. Try MP3, M4A, WAV or WebM.",
    ],
    audio_too_large: [
      "录音超过 8 MB，请缩短后重试。",
      "Audio exceeds 8 MB. Please use a shorter recording.",
    ],
    please_shorten: [
      "内容较长，请缩短录音或将文字控制在 2000 字以内。",
      "Please shorten the recording or keep the text within 2000 characters.",
    ],
    please_wait: [
      "请求较多，请稍后再试。文字仍在此页。",
      "Please wait before trying again. Your text remains here.",
    ],
    consent_required: [
      "请先同意本次资料处理。",
      "Please accept data processing for this request.",
    ],
  };
  async function boundedWav(blob) {
    const Offline =
      window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw Error("audio_needs_conversion");
    const decoder = new Offline(1, 1, 16000),
      decoded = await decoder.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration < 0.5 || decoded.duration > 60.1)
      throw Error("invalid_audio_duration");
    const frames = Math.floor(Math.min(decoded.duration, 60) * 16000),
      render = new Offline(1, frames, 16000),
      src = render.createBufferSource();
    src.buffer = decoded;
    src.connect(render.destination);
    src.start();
    const mono = (await render.startRendering()).getChannelData(0),
      buffer = new ArrayBuffer(44 + mono.length * 2),
      view = new DataView(buffer);
    const word = (o, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    word(0, "RIFF");
    view.setUint32(4, buffer.byteLength - 8, true);
    word(8, "WAVE");
    word(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    word(36, "data");
    view.setUint32(40, mono.length * 2, true);
    mono.forEach((v, i) =>
      view.setInt16(
        44 + i * 2,
        Math.round(Math.max(-1, Math.min(1, v)) * (v < 0 ? 32768 : 32767)),
        true,
      ),
    );
    return new Blob([buffer], { type: "audio/wav" });
  }
  function failure(error) {
    const c = errors[error.message] || [
      "暂时无法完成，请稍后重试。你可以保留或修改文字后再提交。",
      "Unable to complete this request. Please retry later; you can keep or edit your text.",
    ];
    status(...c, true);
  }
  async function transcribe(blob, name) {
    if (!consent()) return;
    const token = ++sequence;
    busy = true;
    controls();
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 50000);
    status("正在识别录音，请稍候…", "Transcribing your recording…");
    try {
      await bootstrap();
      const wav = await boundedWav(blob);
      const form = new FormData();
      form.append("audio", wav, "recording.wav");
      form.append("consent", "true");
      form.append("sessionToken", sessionToken);
      if (consultationToken)
        form.append("consultationToken", consultationToken);
      const data = await json(
        await fetch("/chat/transcribe", {
          method: "POST",
          body: form,
          signal: controller.signal,
        }),
      );
      if (token !== sequence) return;
      $("messageInput").value = data.transcript;
      $("results").hidden = true;
      result = null;
      status(
        "识别完成。请先核对或修改文字，再点「确认文字，查看推荐」。",
        "Transcription is ready. Review or edit it, then confirm to see recommendations.",
      );
      $("messageInput").focus();
    } catch (e) {
      if (token === sequence) failure(e);
    } finally {
      clearTimeout(timeout);
      if (token === sequence) {
        busy = false;
        controller = null;
        controls();
      }
    }
  }
  function release() {
    clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach((s) => s.stop());
    stream = null;
    if (waveFrame) cancelAnimationFrame(waveFrame);
    waveFrame = null;
    audioContext?.close().catch(() => {});
    audioContext = null;
    analyser = null;
    drawWave();
  }
  function drawWave() {
    const canvas = $("waveform"),
      ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#53755c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (analyser) {
      const values = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(values);
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * canvas.width,
          y = ((v / 128) * canvas.height) / 2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
    } else {
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
    }
    ctx.stroke();
    if (recording) waveFrame = requestAnimationFrame(drawWave);
  }
  async function record() {
    if (recording) {
      recorder?.stop();
      return;
    }
    if (busy || !consent()) return;
    $("mic-help").hidden = true;
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      $("mic-help").hidden = false;
      status(
        "此环境不支持录音，可以上传录音或直接输入。",
        "Recording is unavailable here. Upload a recording or type instead.",
        true,
      );
      return;
    }
    busy = true;
    controls();
    const token = ++sequence;
    status("正在请求麦克风…", "Requesting microphone…");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== sequence) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) {
        try {
          audioContext = new Audio();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          audioContext.createMediaStreamSource(media).connect(analyser);
          void audioContext.resume();
        } catch {
          analyser = null;
        }
      }
      const type = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg",
      ].find((v) => MediaRecorder.isTypeSupported(v));
      recorder = new MediaRecorder(
        stream,
        type ? { mimeType: type } : undefined,
      );
      const chunks = [];
      discard = false;
      recordToken = token;
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size) chunks.push(e.data);
      });
      recorder.addEventListener("error", () => {
        if (token !== sequence) return;
        discard = true;
        recording = false;
        busy = false;
        release();
        controls();
        status(
          "录音中断，请重试或直接输入。",
          "Recording was interrupted. Retry or type instead.",
          true,
        );
      });
      recorder.addEventListener(
        "stop",
        () => {
          media.getTracks().forEach((t) => t.stop());
          if (token !== sequence) return;
          recording = false;
          release();
          controls();
          if (discard) return;
          const mime = recorder.mimeType || "audio/webm",
            audio = new Blob(chunks, { type: mime });
          if (audio.size < 1000) {
            status(
              "录音太短，请再说一句。",
              "The recording was too short. Try another sentence.",
              true,
            );
            return;
          }
          void transcribe(
            audio,
            mime.includes("mp4")
              ? "recording.m4a"
              : mime.includes("ogg")
                ? "recording.ogg"
                : "recording.webm",
          );
        },
        { once: true },
      );
      recorder.start(1000);
      busy = false;
      recording = true;
      drawWave();
      seconds = 0;
      controls();
      status(
        "正在录音 · 0 秒。说完后点击停止。",
        "Recording · 0 seconds. Tap stop when finished.",
      );
      timer = setInterval(() => {
        seconds++;
        status(
          `正在录音 · ${seconds} / 60 秒`,
          `Recording · ${seconds} / 60 seconds`,
        );
        if (seconds >= 60 && recorder.state === "recording") recorder.stop();
      }, 1000);
    } catch {
      release();
      busy = false;
      recording = false;
      controls();
      $("mic-help").hidden = false;
      status(
        "麦克风未能开启。请检查权限，或上传录音／直接输入。",
        "Microphone unavailable. Check permission, upload audio or type instead.",
        true,
      );
    }
  }
  function make(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function safeLink(url) {
    try {
      const u = new URL(url);
      if (u.username || u.password) return null;
      if (
        u.origin === "https://fc-ai-assistant.onrender.com" &&
        /^\/library\/[a-z0-9_-]{1,100}$/.test(u.pathname) &&
        !u.search &&
        !u.hash
      )
        return u.href;
      return (u.origin === "https://frequencies-clinic.learnworlds.com" &&
        ["/path-player", "/start"].includes(u.pathname)) ||
        (u.origin === "https://frequencies-clinic.learnworlds.com" &&
          u.pathname.startsWith("/detail-"))
        ? u.href
        : null;
    } catch {
      return null;
    }
  }
  function link(url, text, cls) {
    const a = make("a", text, cls);
    a.href = safeLink(url);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }
  function brief(text, max = lang === "zh" ? 85 : 210) {
    const chars = Array.from(
      String(text || "")
        .trim()
        .replace(/\s+/g, " "),
    );
    if (chars.length <= max) return chars.join("");
    const part = chars.slice(0, max).join("");
    const end = Math.max(
      part.lastIndexOf("。"),
      part.lastIndexOf(". "),
      part.lastIndexOf("；"),
    );
    return (end >= max / 2 ? part.slice(0, end + 1) : part.trim()) + "…";
  }
  function renderResults() {
    if (!result) {
      $("results").hidden = true;
      return;
    }
    $("results").hidden = false;
    $("results-title").textContent =
      result.status === "safety"
        ? t("先照顾你的安全。", "Your safety comes first.")
        : result.status === "clarify"
          ? t("再了解你一点。", "A little more context.")
          : result.status === "medical"
            ? t("先了解身体的需要。", "Put your health first.")
            : t("你的聆听起点。", "Your listening starting point.");
    $("results").classList.toggle(
      "safety-result",
      ["safety", "medical"].includes(result.status),
    );
    $("results-message").textContent =
      result.translations?.[result.message]?.[lang] || result.message;
    $("membership-row").hidden = !result.recommendations?.length;
    $("results-boundary").hidden = !result.recommendations?.length;
    $("intakeForm").hidden = !result.questions?.length;
    $("intake-fields").replaceChildren();
    for (const question of result.questions || []) {
      const label = make("label", question[lang] || question.label),
        input = make("textarea");
      input.id = "intake-" + question.id;
      input.name = question.id;
      input.maxLength = 400;
      input.rows = 2;
      input.value = intake[question.id] || "";
      input.oninput = () => {
        intake[question.id] = input.value.trim();
      };
      label.htmlFor = input.id;
      label.append(input);
      $("intake-fields").append(label);
    }
    const knowledge = result.knowledge || sessionInfo?.knowledge;
    $("source-status").hidden = !result.recommendations?.length;
    $("source-status").textContent = knowledge?.fullKnowledge
      ? t(
          `资料来源：FC 已审核说明 · ${knowledge.describedThemes} / ${knowledge.themes} 个主题已收录说明 · 发布于 ${knowledge.publishedAt.slice(0, 10)}${knowledge.state !== "synced" ? " · 暂未取得更新，当前使用此版本" : ""}`,
          `Source: reviewed FC information · ${knowledge.describedThemes} / ${knowledge.themes} themes have descriptions · Published ${knowledge.publishedAt.slice(0, 10)}${knowledge.state !== "synced" ? " · Refresh unavailable; using this version" : ""}`,
        )
      : t(
          "目前使用已核对的目录快照；完整说明与自动同步尚未接通。没有资料的内容不会编写成功效或见证。",
          "Currently using a verified catalog snapshot. Full descriptions and automatic synchronization are not connected yet. Missing benefits or testimonials will not be invented.",
        );
    $("recommendations").replaceChildren();
    if (result.recommendations?.length > 1) {
      $("recommendations").append(
        make(
          "p",
          t(
            "先选最符合当前聆听需要的一首，再按需选择其他主题，不必全部听。选项排列不代表医疗治疗顺序。",
            "Start with one theme that fits your listening goal; add another only if useful. You do not need every option. This is not a medical treatment sequence.",
          ),
          "listening-plan",
        ),
      );
    }
    let option = 0;
    for (const item of result.recommendations || []) {
      const card = make("article", null, "result-card");
      card.append(window.FCVisuals.illustration(item));
      card.append(
        make(
          "span",
          t(`聆听选项 ${++option}`, `Listening option ${option}`),
          "option-label",
        ),
      );
      const reason = result.translations?.[item.reason]?.[lang] || item.reason;
      card.append(
        make("h3", lang === "zh" ? item.name_zh : item.name_en),
        make("div", lang === "zh" ? item.name_en : item.name_zh, "subtitle"),
        window.FCVisuals.point(
          "why",
          t("为什么推荐", "Why this theme"),
          brief(reason),
        ),
      );
      const usage = (item.usage || [])
        .filter((p) => safeLink(p.url))
        .map((p) => p[lang] || p[lang === "zh" ? "en" : "zh"])
        .filter(Boolean);
      card.append(
        window.FCVisuals.point(
          "listen",
          t("怎么听", "How to listen"),
          usage.length
            ? brief(usage.join(" "))
            : t(
                "这首的具体用法尚待核实，请先查看完整说明。",
                "Specific usage is not verified yet; check the full explanation first.",
              ),
        ),
      );
      const more = make("details", null, "recommendation-details");
      more.append(
        make("summary", t("详细讲解与资料来源", "Explanation & sources")),
      );
      more.append(make("p", reason));
      if (item.evidence && safeLink(item.evidence.url)) {
        const quote = make("blockquote", null, "source-quote");
        quote.append(
          make("p", item.evidence[lang] || item.evidence.quote),
          link(
            item.evidence.url,
            t("查看 FC 原说明 ↗", "Read the FC source ↗"),
          ),
        );
        more.append(quote);
      } else
        more.append(
          make(
            "p",
            t(
              "这项选择按目录主题匹配；暂未提供已核实的说明摘录。",
              "This is a catalog-theme match; no verified description excerpt is provided yet.",
            ),
            "small",
          ),
        );
      if (item.usage?.length) {
        const details = make("section");
        details.append(
          make("h4", t("完整使用说明", "Full listening guidance")),
        );
        for (const p of item.usage) {
          if (safeLink(p.url))
            details.append(
              make("p", p[lang] || p[lang === "zh" ? "en" : "zh"]),
              link(p.url, t("查看使用说明 ↗", "Read usage guidance ↗")),
            );
        }
        more.append(details);
      }
      if (item.testimonials?.length) {
        const details = make("details");
        details.append(
          make(
            "summary",
            t(
              `${item.testimonials.length} 条已收录的顾客分享`,
              `${item.testimonials.length} catalogued customer shares`,
            ),
          ),
          make(
            "p",
            t(
              "个人经历不代表每个人都会有相同体验，也不是临床疗效证明。",
              "Individual experiences do not predict everyone's results or establish clinical efficacy.",
            ),
            "small",
          ),
        );
        for (const p of item.testimonials) {
          try {
            const u = new URL(p.url);
            if (
              u.protocol === "https:" &&
              ["www.facebook.com", "facebook.com"].includes(u.hostname) &&
              /\/(posts|videos|reel|photo|permalink)/.test(u.pathname)
            ) {
              const a = make("a", p.title, "testimonial");
              a.href = u.href;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              details.append(a);
            }
          } catch {}
        }
        more.append(details);
      }
      if (safeLink(item.description_url))
        more.append(
          link(
            item.description_url,
            t("查看完整主题说明 ↗", "Read the full theme explanation ↗"),
          ),
        );
      const paths = make("div", null, "links");
      paths.append(
        link(
          "https://frequencies-clinic.learnworlds.com/start",
          t("我的音疗库 ↗", "My FC library ↗"),
        ),
      );
      card.append(paths);
      const course = $("membership").value;
      if (course) {
        const recordings = (item.recordings || []).filter(
          (r) => r.course === course,
        );
        if (!recordings.length)
          card.append(
            make(
              "p",
              t(
                "该会员入口暂未列出此主题，请在音疗库查看可用内容。",
                "This theme is not listed for this route. Check your library for available content.",
              ),
              "small",
            ),
          );
        for (const r of recordings) {
          const label = {
            smooth: t("平稳频率", "Steady frequency"),
            bgm: t("带背景音乐", "With music"),
            intensive: t("强弱变化明显", "Varying intensity"),
          }[r.version];
          if (safeLink(r.url))
            card.append(
              link(
                r.url,
                `${r.version === "bgm" ? "BGM" : r.version === "smooth" ? "Smooth" : "Intensive"} · ${label} · ${r.duration} ↗`,
                "version",
              ),
            );
        }
      } else
        card.append(
          make(
            "p",
            t(
              "播放版本：请先选择上方会员入口。",
              "Playback versions: choose your route above.",
            ),
            "small",
          ),
        );
      // Critical care instructions stay outside the collapsed explanation.
      for (const p of (item.passages || []).filter(
        (p) => p.kind === "caution",
      )) {
        const warning = p[lang] || p[lang === "zh" ? "en" : "zh"];
        if (warning)
          card.append(
            window.FCVisuals.point("care", t("留意一下", "Take care"), warning),
          );
      }
      card.append(more);
      $("recommendations").append(card);
    }
  }
  $("language").onclick = () => {
    lang = lang === "zh" ? "en" : "zh";
    paint();
    status("已切换语言。", "Language changed.");
  };
  $("micButton").onclick = record;
  $("cancel-recording").onclick = () => {
    discard = true;
    sequence++;
    if (recorder?.state === "recording") recorder.stop();
    release();
    recording = false;
    busy = false;
    controls();
    status("录音已取消，没有发送。", "Recording cancelled; it was not sent.");
  };
  $("messageInput").oninput = controls;
  $("membership").onchange = renderResults;
  $("upload-button").onclick = async () => {
    if (busy || recording || !consent()) return;
    const f = $("audio-file").files?.[0];
    if (!f) {
      status("请先选择录音文件。", "Choose a recording first.", true);
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      failure(Error("audio_too_large"));
      return;
    }
    busy = true;
    controls();
    const url = URL.createObjectURL(f);
    try {
      const audio = new Audio();
      audio.preload = "metadata";
      const duration = await new Promise((resolve, reject) => {
        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.onerror = () => reject(Error("unsupported_audio"));
        audio.src = url;
        setTimeout(() => reject(Error("unsupported_audio")), 5000);
      });
      if (Number.isFinite(duration) && duration > 61) {
        status(
          "请上传 60 秒以内的录音。",
          "Please upload a recording no longer than 60 seconds.",
          true,
        );
        return;
      }
    } catch (e) {
      failure(e);
      return;
    } finally {
      URL.revokeObjectURL(url);
      busy = false;
      controls();
    }
    await transcribe(f, f.name);
  };
  $("messageForm").onsubmit = async (e) => {
    e.preventDefault();
    if (busy || !consent()) return;
    const message = $("messageInput").value.trim();
    if (!message) {
      $("messageInput").focus();
      status(
        "请先说说或写下你的情况。",
        "Please share a few words first.",
        true,
      );
      return;
    }
    busy = true;
    const token = ++sequence;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 50000);
    controls();
    status(
      "正在寻找适合探索的音疗主题…",
      "Finding listening themes to explore…",
    );
    try {
      result = await recommendationRequest(
        {
          message,
          consent: true,
          language: lang,
          preference: $("preference").value,
          intake,
          sessionToken,
          ...(consultationToken ? { consultationToken } : {}),
        },
        controller.signal,
      );
      if (token !== sequence) return;
      renderResults();
      $("results-title").focus();
      $("results").scrollIntoView({ behavior: "smooth", block: "start" });
      status(
        result.status === "clarify" ? "请补充下方的问题。" : "已整理完成。",
        result.status === "clarify"
          ? "Please answer the questions below."
          : "Your response is ready.",
      );
    } catch (e) {
      if (token === sequence) failure(e);
    } finally {
      clearTimeout(timeout);
      if (token === sequence) {
        busy = false;
        controller = null;
        controls();
      }
    }
  };
  $("intakeForm").onsubmit = (e) => {
    e.preventDefault();
    if (busy || recording) return;
    $("intake-fields")
      .querySelectorAll("textarea")
      .forEach((input) => {
        intake[input.name] = input.value.trim();
      });
    $("messageForm").requestSubmit();
  };
  $("reset").onclick = () => {
    sequence++;
    controller?.abort();
    controller = null;
    discard = true;
    if (recorder?.state === "recording") recorder.stop();
    release();
    busy = false;
    recording = false;
    result = null;
    intake = {};
    consultationToken = "";
    $("messageInput").value = "";
    $("audio-file").value = "";
    $("consent").checked = false;
    $("mic-help").hidden = true;
    paint();
    status("已清空本次内容。", "This consultation has been cleared.");
    $("messageInput").focus();
  };
  window.addEventListener("pagehide", () => {
    discard = true;
    sequence++;
    controller?.abort();
    if (recorder?.state === "recording") recorder.stop();
    release();
  });
  paint();
  drawWave();
  void bootstrap().catch(() => {
    $("usage-note").textContent = t(
      "测试服务暂未准备好；紧急不适请先求医。",
      "The test service is not ready. Seek care first for urgent symptoms.",
    );
  });
  status("可以录音，也可以直接输入。", "Record your voice or type instead.");
})();
