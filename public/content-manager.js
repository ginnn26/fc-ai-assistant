const $ = (id) => document.getElementById(id);
let csrf = "",
  revision = 0,
  selected = null,
  listings = [];
const labels = {
  draft: "草稿 · Draft",
  published: "已发布 · Published",
  pending: "待整理 · Pending",
};
const messages = {
  editor_not_connected: "管理入口尚未连接储存或管理密码，暂时不能使用。",
  login_required: "请重新登录。",
  login_failed: "管理密码不正确。",
  login_rate_limited: "登录尝试较多，请十五分钟后再试。",
  revision_conflict:
    "资料已被另一位工作人员更新。请重新选择这首音疗，核对后再保存。你的当前文字仍保留在表单中。",
  medical_claim_needs_review:
    "说明包含需要进一步审核的医疗效果用语，尚未发布。",
  purpose_required: "请先补上音疗介绍。",
  human_review_required: "请先保存并完成审核确认。",
  content_unavailable: "暂时无法读取或保存资料。请稍后再试；不要反复点击发布。",
};
function notice(text, error = false) {
  $("notice").textContent = text;
  $("notice").classList.toggle("error", error);
}
async function api(route, body) {
  const res = await fetch("/content-api/admin/" + route, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body
      ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
      : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw Error(
      messages[data.error] ||
        "资料未保存或发布。请检查字段、链接和内容长度后重试。 / " + data.error,
    );
  return data;
}
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function renderList() {
  const q = $("search").value.toLowerCase();
  $("items").replaceChildren();
  for (const i of listings
    .filter((i) => (i.name_en + i.name_zh).toLowerCase().includes(q))
    .sort((a, b) => a.name_en.localeCompare(b.name_en))) {
    const b = el("button", i.name_zh + " / " + i.name_en);
    b.type = "button";
    b.classList.toggle("active", selected?.id === i.id);
    b.append(el("small", labels[i.state]));
    b.onclick = () => loadItem(i.id);
    $("items").append(b);
  }
  $("counts").textContent =
    `${listings.length} 个主题 · ${listings.filter((i) => i.state === "published").length} 已发布`;
}
async function list() {
  const d = await api("items");
  revision = d.revision;
  listings = d.items;
  $("initialize").hidden = listings.length !== 0;
  renderList();
}
async function enter(session) {
  csrf = session.csrf;
  $("login").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  notice(
    session.storage === "local-test"
      ? "本机测试资料库 · 尚未连接 Google Drive，内容不会更新线上 FC。"
      : "Google Drive 共用资料库 · 草稿只供管理人员查看，审核发布后文字公开。",
  );
  await list();
}
function sourceRow(t = {}) {
  const row = el("div", "", "source");
  row.dataset.id = t.id || "case_" + crypto.randomUUID().replaceAll("-", "");
  for (const [key, label] of [
    ["title", "见证简介 / Source title"],
    ["url", "Facebook 原帖链接 / Original post URL"],
  ]) {
    const l = el("label", label),
      input = el("input");
    input.dataset.field = key;
    input.value = t[key] || "";
    input.maxLength = key === "title" ? 180 : 1800;
    l.append(input);
    row.append(l);
  }
  const remove = el("button", "移除此链接 / Remove");
  remove.type = "button";
  remove.onclick = () => {
    row.remove();
    $("reviewed").checked = false;
  };
  row.append(remove);
  $("testimonials").append(row);
}
function recordingRow(rec = {}) {
  const row = el("div", "", "recording");
  for (const [key, label] of [
    ["label", "音轨名称 / Recording name"],
    ["url", "FC 播放链接 / FC player URL"],
    ["duration", "时长 / Duration (hh:mm:ss)"],
  ]) {
    const l = el("label", label),
      input = el("input");
    input.dataset.field = key;
    input.value = rec[key] || "";
    input.maxLength = key === "url" ? 500 : key === "duration" ? 20 : 180;
    l.append(input);
    row.append(l);
  }
  const l = el("label", "声音版本 / Sound version"),
    select = el("select");
  select.dataset.field = "version";
  for (const [value, label] of [
    ["unconfirmed", "待确认 / Unconfirmed"],
    ["intensive", "Intensive"],
    ["smooth", "Smooth"],
    ["bgm", "BGM"],
  ]) {
    const o = el("option", label);
    o.value = value;
    select.append(o);
  }
  select.value = rec.version || "unconfirmed";
  l.append(select);
  row.append(l);
  const remove = el("button", "移除此目录记录 / Remove entry");
  remove.type = "button";
  remove.onclick = () => {
    row.remove();
    $("reviewed").checked = false;
  };
  row.append(remove);
  $("recordings").append(row);
}
function referenceRow(ref = {}) {
  const row = el("div", "", "source");
  for (const [key, label] of [
    ["title", "参考资料标题 / Reference title"],
    ["url", "公开 HTTPS 链接 / Public HTTPS URL"],
  ]) {
    const l = el("label", label),
      input = el("input");
    input.dataset.field = key;
    input.value = ref[key] || "";
    input.maxLength = key === "title" ? 240 : 1800;
    l.append(input);
    row.append(l);
  }
  const remove = el("button", "移除参考资料 / Remove reference");
  remove.type = "button";
  remove.onclick = () => {
    row.remove();
    $("reviewed").checked = false;
  };
  row.append(remove);
  $("references").append(row);
}
async function loadItem(id) {
  try {
    const d = await api("items/" + id);
    selected = d.item;
    revision = d.revision;
    $("empty").hidden = true;
    $("editor").hidden = false;
    $("previewBox").hidden = true;
    $("reviewed").checked = false;
    $("itemTitle").textContent = selected.name_zh + " / " + selected.name_en;
    $("itemState").textContent =
      labels[listings.find((i) => i.id === id)?.state || "draft"];
    for (const [key, field] of [
      ["name_zh", "nameZh"],
      ["name_en", "nameEn"],
      ["category_zh", "categoryZh"],
      ["category_en", "categoryEn"],
    ])
      $(field).value = selected[key] || "";
    for (const kind of ["purpose", "usage", "caution"])
      for (const lang of ["zh", "en"])
        $(kind + (lang === "zh" ? "Zh" : "En")).value = (
          selected.passages || []
        )
          .filter((p) => p.kind === kind)
          .map((p) => p[lang] || "")
          .filter(Boolean)
          .join("\n\n");
    $("testimonials").replaceChildren();
    for (const t of selected.testimonials || []) sourceRow(t);
    $("recordings").replaceChildren();
    $("articleZh").value = selected.article?.zh || "";
    $("themeMediaStatus").textContent = window.FCThemeMedia?.[selected.id]
      ? "专属主题封面已配置；三个声音版本共用。 / A dedicated theme cover is configured for all three sound versions."
      : "尚未配置专属主题封面，请安排配图；系统不会套用其他主题的照片。 / A dedicated cover is still needed; no unrelated theme photo will be substituted.";
    const media = window.FCThemeMedia?.[selected.id];
    $("themeMediaPreview").replaceChildren();
    $("themeMediaPreview").hidden = !media;
    if (media && /^\/assets\/themes-v1\/[a-z0-9_-]+\.webp$/.test(media.src)) {
      const image = el("img", "", "theme-media-preview");
      image.src = media.src;
      image.alt =
        "主题封面 / Cover: " + selected.name_zh + " / " + selected.name_en;
      image.width = 768;
      image.height = 512;
      $("themeMediaPreview").append(image);
    }
    $("articleEn").value = selected.article?.en || "";
    $("references").replaceChildren();
    for (const ref of selected.article?.references || []) referenceRow(ref);
    for (const rec of selected.recordings) recordingRow(rec);
    $("withdraw").disabled = !d.published;
    $("restore").disabled = !d.canRestore;
    $("publicLink").hidden = !d.published;
    $("publicLink").href = "/library/" + id;
    renderList();
  } catch (e) {
    notice(e.message, true);
  }
}
function draft() {
  return {
    ...selected,
    name_zh: $("nameZh").value.trim(),
    name_en: $("nameEn").value.trim(),
    category_zh: $("categoryZh").value.trim(),
    category_en: $("categoryEn").value.trim(),
    article: {
      zh: $("articleZh").value,
      en: $("articleEn").value,
      references: [...$("references").children].map((row) => ({
        title: row.querySelector('[data-field="title"]').value.trim(),
        url: row.querySelector('[data-field="url"]').value.trim(),
      })),
    },
    passages: ["purpose", "usage", "caution"]
      .map((kind) => ({
        id: kind + "_1",
        kind,
        zh: $(kind + "Zh").value.trim(),
        en: $(kind + "En").value.trim(),
      }))
      .filter((p) => p.zh || p.en),
    testimonials: [...$("testimonials").children].map((row) => ({
      id: row.dataset.id,
      title: row.querySelector('[data-field="title"]').value.trim(),
      url: row.querySelector('[data-field="url"]').value.trim(),
    })),
    recordings: [...$("recordings").children].map((row) => {
      const get = (key) =>
        row.querySelector('[data-field="' + key + '"]').value.trim();
      let u;
      try {
        u = new URL(get("url"));
      } catch {
        throw Error(
          "请粘贴完整的 FC 播放链接。 / Enter a complete FC player URL.",
        );
      }
      return {
        label: get("label"),
        url: u.href,
        duration: get("duration"),
        version: get("version"),
        course: u.searchParams.get("courseid"),
        unit: u.searchParams.get("unit"),
      };
    }),
  };
}
async function change(action, extra = {}) {
  const d = await api("edit", { revision, id: selected.id, action, ...extra });
  revision = d.revision;
  await list();
}
$("login").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await enter(await api("login", { password: $("password").value }));
    $("password").value = "";
  } catch (err) {
    notice(err.message, true);
  }
};
$("logout").onclick = async () => {
  try {
    await api("logout", {});
    location.reload();
  } catch (e) {
    notice(e.message, true);
  }
};
$("search").oninput = renderList;
$("newTheme").onclick = async () => {
  try {
    const item = {
      id: "theme_" + crypto.randomUUID().replaceAll("-", ""),
      name_zh: "新音疗",
      name_en: "New theme",
      aliases: [],
      category_zh: "其他主题",
      category_en: "Other themes",
      recordings: [],
      passages: [],
      testimonials: [],
    };
    const d = await api("edit", {
      revision,
      action: "save",
      id: item.id,
      item,
    });
    revision = d.revision;
    await list();
    await loadItem(item.id);
  } catch (e) {
    notice(e.message, true);
  }
};
$("addRecording").onclick = () => {
  if ($("recordings").children.length < 30) recordingRow();
};
$("initialize").onclick = async () => {
  try {
    await api("initialize", {});
    await list();
    notice("现有目录已导入；说明均未自动发布。 / Catalog imported for review.");
  } catch (e) {
    notice(e.message, true);
  }
};
$("addTestimonial").onclick = () => {
  if ($("testimonials").children.length < 20) sourceRow();
};
$("addReference").onclick = () => {
  if ($("references").children.length < 30) referenceRow();
};
$("editor").oninput = () => {
  $("reviewed").checked = false;
};
// A deliberate review checkbox change must not clear itself.
$("reviewed").addEventListener("input", (e) => e.stopPropagation());
$("editor").onsubmit = async (e) => {
  e.preventDefault();
  try {
    if (!$("editor").reportValidity()) return;
    await change("save", { item: draft() });
    $("reviewed").checked = false;
    notice("草稿已保存；公开说明和 AI 尚未改变。 / Draft saved.");
  } catch (err) {
    notice(err.message, true);
  }
};
$("preview").onclick = () => {
  try {
    const box = $("previewBox");
    box.replaceChildren(
      el("h2", $("nameZh").value + " / " + $("nameEn").value),
    );
    for (const p of draft().passages) {
      box.append(
        el(
          "h3",
          {
            purpose: "音疗介绍 / About",
            usage: "使用方式 / Listening",
            caution: "注意事项 / Care",
          }[p.kind],
        ),
        el("p", p.zh),
        el("p", p.en),
      );
    }
    const article = draft().article;
    box.append(
      el("h3", "完整讲解 / Full explanation"),
      el("p", article.zh, "article-text"),
      el("p", article.en, "article-text"),
    );
    for (const ref of article.references)
      box.append(el("p", ref.title + " · " + ref.url));
    box.hidden = false;
  } catch (e) {
    notice(e.message, true);
  }
};
$("publish").onclick = async () => {
  if (!$("reviewed").checked)
    return notice(
      "请先核对内容并勾选审核确认。 / Please review this revision first.",
      true,
    );
  $("publish").disabled = true;
  try {
    await change("publish", { reviewed: true, item: draft() });
    await loadItem(selected.id);
    notice(
      "本次文字说明已发布至当前资料库。 / Published to the current content store.",
    );
  } catch (e) {
    notice(e.message, true);
  } finally {
    $("publish").disabled = false;
  }
};
$("withdraw").onclick = async () => {
  try {
    await change("withdraw");
    await loadItem(selected.id);
    notice(
      "已撤回为草稿，公开说明与 AI 不再读取这份说明。 / Withdrawn to draft.",
    );
  } catch (e) {
    notice(e.message, true);
  }
};
$("restore").onclick = async () => {
  try {
    await change("restore");
    await loadItem(selected.id);
    notice(
      "上一份说明已恢复到草稿；审核发布后才会改变公开内容。 / Previous content restored to draft only.",
    );
  } catch (e) {
    notice(e.message, true);
  }
};
api("session")
  .then(enter)
  .catch((e) => notice(e.message, true));
