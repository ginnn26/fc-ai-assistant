let item,
  language = "zh";
const $ = (id) => document.getElementById(id);
function node(tag, text, cls) {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function brief(text, max) {
  const chars = Array.from(text.trim().replace(/\s+/g, " "));
  if (chars.length <= max) return chars.join("");
  const part = chars.slice(0, max).join("");
  const end = Math.max(
    part.lastIndexOf("。"),
    part.lastIndexOf(". "),
    part.lastIndexOf("！"),
    part.lastIndexOf("；"),
  );
  return (end >= max / 2 ? part.slice(0, end + 1) : part.trim()) + "…";
}
function render() {
  const en = language === "en";
  document.documentElement.lang = en ? "en" : "zh-Hans";
  $("title").textContent = item[en ? "name_en" : "name_zh"] || item.name_en;
  document.title = $("title").textContent + " · FC";
  $("status").textContent = item[en ? "category_en" : "category_zh"];
  const box = $("reading");
  box.replaceChildren();
  box.hidden = false;
  const full = node("details", "", "full-explanation");
  full.append(
    node(
      "summary",
      en ? "Read the full explanation & sources" : "展开完整讲解与参考资料",
    ),
  );
  for (const kind of ["purpose", "usage", "caution"]) {
    const ps = item.passages.filter((p) => p.kind === kind);
    if (!ps.length) continue;
    const section = node("section", "");
    section.append(
      node(
        "h2",
        (en
          ? {
              purpose: "Why choose this theme?",
              usage: "How to listen",
              caution: "Care & cautions",
            }
          : { purpose: "为什么选这首", usage: "怎么听", caution: "注意事项" })[
          kind
        ],
      ),
    );
    const texts = ps
      .map((p) => p[language] || p[en ? "zh" : "en"])
      .filter(Boolean);
    // Care instructions remain visible in full; never hide a warning by shortening it.
    section.append(
      node(
        "p",
        kind === "caution"
          ? texts.join("\n\n")
          : brief(texts.join(" "), en ? 240 : 100),
        "article-text",
      ),
    );
    box.append(section);
    if (kind !== "caution") {
      const complete = node("section", "");
      complete.append(node("h3", section.querySelector("h2").textContent));
      for (const text of texts)
        complete.append(node("p", text, "article-text"));
      full.append(complete);
    }
  }
  const article = item.article;
  if (article && (article.zh || article.en)) {
    const section = node("section", "");
    section.append(node("h2", en ? "Full explanation" : "完整讲解"));
    section.append(
      node("p", article[language] || article[en ? "zh" : "en"], "article-text"),
    );
    full.append(section);
  }
  if (article?.references?.length) {
    const section = node("section", "");
    section.append(
      node("h2", en ? "References & further reading" : "参考资料与延伸阅读"),
    );
    section.append(
      node(
        "p",
        en
          ? "General research does not establish the effectiveness of this FC recording."
          : "一般研究资料不代表已验证这首 FC 音轨的效果。",
      ),
    );
    for (const ref of article.references) {
      const p = node("p", ""),
        a = node("a", ref.title + " ↗");
      a.href = ref.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      p.append(a);
      section.append(p);
    }
    full.append(section);
  }
  if (item.testimonials.length) {
    const section = node("details", "", "full-explanation");
    section.append(
      node(
        "summary",
        en ? "Customer shares (optional)" : "查看顾客分享（选读）",
      ),
      node(
        "p",
        en
          ? "Individual experiences do not establish medical effectiveness or guarantee similar results."
          : "以下为个人体验分享，不代表医疗效果或保证每个人都有相同结果。",
      ),
    );
    for (const t of item.testimonials) {
      const p = node("p", ""),
        a = node("a", t.title + " ↗");
      a.href = t.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      p.append(a);
      section.append(p);
    }
    box.append(section);
  }
  // Playback comes before optional long-form reading.
  const listening = node("div", "", "listening");
  listening.append(
    node("h2", en ? "Choose your listening version" : "选择适合你的声音版本"),
    node(
      "p",
      en
        ? "Text is public. Audio playback requires the appropriate FC membership. Choose your existing membership library."
        : "文字说明公开阅读。播放音轨须具备对应 FC 会员权限，请选择你已有的音疗库。",
    ),
  );
  for (const [course, zh, enLabel] of [
    ["sound-healing", "订阅会员", "Subscription"],
    ["private-soundhealing", "长期／私人会员", "Private membership"],
    ["trial-soundhealing", "免费试用", "Trial"],
  ]) {
    const group = node("section", "");
    group.append(node("h3", en ? enLabel : zh));
    const versions = new Set();
    for (const rec of item.recordings.filter(
      (r) => r.course === course && r.version !== "unconfirmed",
    )) {
      if (versions.has(rec.version)) continue;
      versions.add(rec.version);
      const a = node(
        "a",
        { intensive: "Intensive", smooth: "Smooth", bgm: "BGM" }[rec.version] +
          " · " +
          rec.duration +
          " ↗",
        "pill",
      );
      a.href = rec.url;
      a.target = "_blank";
      a.rel = "noopener";
      group.append(a);
    }
    if (versions.size) listening.append(group);
  }
  box.append(listening);
  if (full.children.length > 1) box.append(full);
}
$("zh").onclick = () => {
  language = "zh";
  if (item) render();
};
$("en").onclick = () => {
  language = "en";
  if (item) render();
};
const id = location.pathname.split("/").pop();
fetch("/content-api/public/" + encodeURIComponent(id))
  .then(async (r) => {
    if (!r.ok) throw Error();
    item = (await r.json()).item;
    render();
  })
  .catch(() => {
    $("status").textContent =
      "这份说明尚未发布或暂时无法读取。请返回 FC 音疗目录。 / This explanation is not published or is temporarily unavailable.";
  });
