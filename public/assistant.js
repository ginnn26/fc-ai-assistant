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
  const copy = {
    title: ["说说此刻的你。", "Tell us how you feel."],
    intro: [
      "睡眠、情绪，或忙碌一天后的感受。用自己的话说一说，一起找到适合此刻的聆听起点。",
      "Sleep, mood, or how a busy day has left you feeling. Share in your own words and find a listening starting point for today.",
    ],
    "share-title": ["慢慢说，我们一起了解。", "Your words. A little more clarity."],
    "scene-caption": ["声音相伴，照顾日常", "Sound for everyday wellbeing"],
    "guide-title": ["不知道怎么说？从这里开始", "A LITTLE HELP TO GET STARTED"],
    "guide-feel": ["现在，感觉怎么样？", "How do you feel?"],
    "guide-feel-copy": ["想关注什么？对日常有什么影响？", "What is on your mind, and how does it affect your day?"],
    "guide-time": ["从什么时候开始？", "When did it start?"],
    "guide-time-copy": ["持续多久了？最近有什么变化？", "How long has it lasted? Has anything changed?"],
    "guide-care": ["有在接受照顾吗？", "Any care or treatment?"],
    "guide-care-copy": ["如有身体不适，提一提就医或用药情况。", "For physical symptoms, mention any medical care or medication."],
    "guide-foot": ["不需要说得完美，按自己的节奏就好。", "No perfect words needed. Take it at your own pace."],
    "voice-invite": ["留一点空间，给此刻的自己", "A moment for the way you feel"],
    "consent-short": ["我同意将录音及确认的文字交由 OpenAI 处理，用于识别与音疗推荐。", "I agree to send my recording and confirmed text to OpenAI for transcription and listening suggestions."],
    "privacy-label": ["资料如何使用？", "How is my information used?"],
    "consent-copy": [
      "我同意将本次录音及确认后的文字发送给 OpenAI，用于语音识别和音疗主题推荐。FC 不保存本次录音或咨询记录；OpenAI 可能按其服务政策处理资料。请不要说出姓名、电话或其他身份信息。",
      "I agree to send this recording and my confirmed text to OpenAI for transcription and listening-theme recommendations. FC does not retain this audio or consultation history; OpenAI may process data under its service policies. Please omit names, contact details and other identifying information.",
    ],
    "record-note": [
      "建议约 30 秒，最多 60 秒。",
      "About 30 seconds is enough; maximum 60 seconds.",
    ],
    "upload-label": ["也可以上传录音", "Or upload a recording"],
    "upload-copy": [
      "选择 60 秒以内、8 MB 以下的录音。识别后可以修改文字。",
      "Choose a recording up to 60 seconds and 8 MB. You can edit the transcription.",
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
      "请按舒适度选择，音量保持轻柔。如聆听后不舒服，请停止。不要据此停药、改药或延后就医。",
      "Choose a comfortable version and gentle volume. Stop if listening feels uncomfortable. Do not stop medication, change treatment or delay care based on these suggestions.",
    ],
    footer: [
      "FREQUENCIES CLINIC · 声音相伴，照顾日常",
      "FREQUENCIES CLINIC · SOUND FOR EVERYDAY WELLBEING",
    ],
  };
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
    window.FCVoiceUI.paint($("micButton"), { recording, busy, language: lang });
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
    if (!response.ok) throw Error(data.error || "temporarily_unavailable");
    return data;
  }
  const errors = {
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
    const timeout = setTimeout(() => controller?.abort(), 40000);
    status("正在识别录音，请稍候…", "Transcribing your recording…");
    try {
      const form = new FormData();
      form.append("audio", blob, name);
      form.append("consent", "true");
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
    $("results-message").textContent = result.translations?.[result.message]?.[lang] || result.message;
    $("membership-row").hidden = !result.recommendations?.length;
    $("recommendations").replaceChildren();
    $("recommendations").dataset.count = String(
      result.recommendations?.length || 0,
    );
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
    const timeout = setTimeout(() => controller?.abort(), 35000);
    controls();
    status(
      "正在寻找适合探索的音疗主题…",
      "Finding listening themes to explore…",
    );
    try {
      result = await json(
        await fetch("/chat/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            consent: true,
            language: lang,
            preference: $("preference").value,
          }),
          signal: controller.signal,
        }),
      );
      if (token !== sequence) return;
      renderResults();
      $("results-title").focus();
      $("results").scrollIntoView({ behavior: "smooth", block: "start" });
      status("已整理完成。", "Your suggestions are ready.");
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
  status("可以录音，也可以直接输入。", "Record your voice or type instead.");
})();
