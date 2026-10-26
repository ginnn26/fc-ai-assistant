
const { MAX_THEMES } = require('./care-catalog-limits');
const FC = "https://frequencies-clinic.learnworlds.com";
function fcURL(value, playback = false) {
  try {
    const u = new URL(value);
    if (u.origin !== FC || u.username || u.password || u.hash) return false;
    return playback
      ? u.pathname === "/path-player"
      : /^\/detail-[a-z0-9-]+$/.test(u.pathname);
  } catch {
    return false;
  }
}
function sourceURL(value) {
  if (fcURL(value)) return true;
  try {
    const u = new URL(value);
    return (
      u.origin === "https://fc-ai-assistant.onrender.com" &&
      /^\/library\/[a-z0-9_-]{1,100}$/.test(u.pathname) &&
      !u.search &&
      !u.hash &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
function text(value, max = 1400) {
  if (typeof value !== "string" || value.length > max || /[<>]/.test(value))
    throw Error("invalid_source_text");
  return value;
}
function validateFeed(feed, now = Date.now()) {
  if (
    !feed ||
    typeof feed !== "object" ||
    typeof feed.version !== "string" ||
    !Array.isArray(feed.items) ||
    !feed.items.length ||
    feed.items.length > MAX_THEMES
  )
    throw Error("invalid_feed");
  const stamp = Date.parse(feed.publishedAt);
  const generated = Date.parse(feed.generatedAt || feed.publishedAt);
  if (
    !Number.isFinite(stamp) ||
    stamp > now + 300000 ||
    !Number.isFinite(generated) ||
    generated > now + 300000 ||
    generated < stamp ||
    now - generated > 7 * 86400000
  )
    throw Error("stale_feed");
  const ids = new Set(),
    units = new Set();
  const items = feed.items.map((item) => {
    if (!/^[a-z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id))
      throw Error("invalid_theme_id");
    ids.add(item.id);
    if (
      !Array.isArray(item.recordings) ||
      !item.recordings.length ||
      item.recordings.length > 30
    )
      throw Error("invalid_recordings");
    const recordings = item.recordings.map((r) => {
      if (
        ![
          "sound-healing",
          "private-soundhealing",
          "trial-soundhealing",
        ].includes(r.course) ||
        !/^[a-f0-9]{24}$/.test(r.unit) ||
        !["intensive", "smooth", "bgm", "unconfirmed"].includes(r.version) ||
        !fcURL(r.url, true)
      )
        throw Error("invalid_recording");
      const u = new URL(r.url),
        key = r.course + ":" + r.unit;
      if (
        units.has(key) ||
        u.searchParams.get("courseid") !== r.course ||
        u.searchParams.get("unit") !== r.unit ||
        [...u.searchParams.keys()].some(
          (k) => !["courseid", "unit"].includes(k),
        )
      )
        throw Error("invalid_recording_url");
      units.add(key);
      return {
        course: r.course,
        unit: r.unit,
        version: r.version,
        duration: text(r.duration, 20),
        label: text(r.label || item.name_en, 180),
        url: r.url,
      };
    });
    if (item.description_url && !sourceURL(item.description_url))
      throw Error("invalid_description_url");
    if (
      !Array.isArray(item.passages || []) ||
      (item.passages || []).length > 12
    )
      throw Error("invalid_passage_limit");
    const passages = (item.passages || []).map((p) => {
      if (
        !/^[a-z0-9_-]{1,80}$/.test(p.id) ||
        !["purpose", "usage", "caution"].includes(p.kind) ||
        p.reviewed !== true ||
        !sourceURL(p.url)
      )
        throw Error("unreviewed_passage");
      if (
        p.kind !== "caution" &&
        /降血压|降血壓|降血糖|治愈|治癒|排毒|消除肿瘤|消除腫瘤|guarantee|cure|detox|lower.{0,12}(blood pressure|blood sugar)|replace.{0,15}(medication|medical treatment)/i.test(
          (p.zh || "") + " " + (p.en || ""),
        )
      )
        throw Error("medical_claim_needs_review");
      return {
        id: p.id,
        kind: p.kind,
        zh: text(p.zh),
        en: text(p.en),
        url: p.url,
      };
    });
    if (new Set(passages.map((p) => p.id)).size !== passages.length)
      throw Error("duplicate_passage");
    const testimonials = (item.testimonials || [])
      .slice(0, 20)
      .filter((p) => p.approved === true)
      .map((p) => {
        const u = new URL(p.url);
        if (
          u.protocol !== "https:" ||
          !["www.facebook.com", "facebook.com"].includes(u.hostname) ||
          u.username ||
          u.password ||
          !/\/(posts|videos|reel|photo|permalink)/.test(u.pathname)
        )
          throw Error("invalid_testimonial");
        return { id: text(p.id, 80), title: text(p.title, 180), url: u.href };
      })
      .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
    return {
      id: item.id,
      name_en: text(item.name_en, 180),
      name_zh: text(item.name_zh, 180),
      aliases: (item.aliases || []).slice(0, 20).map((x) => text(x, 180)),
      category_en: text(item.category_en || "Other themes", 80),
      category_zh: text(item.category_zh || "其他主题", 80),
      description_url: item.description_url || null,
      recordings,
      passages,
      testimonials,
    };
  });
  return {
    version: text(feed.version, 100),
    publishedAt: new Date(stamp).toISOString(),
    generatedAt: new Date(generated).toISOString(),
    items,
  };
}

module.exports = { validateFeed };

