const seed = require("../data/assistant-catalog.json");
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
    feed.items.length > 600
  )
    throw Error("invalid_feed");
  const stamp = Date.parse(feed.publishedAt);
  if (
    !Number.isFinite(stamp) ||
    stamp > now + 300000 ||
    now - stamp > 7 * 86400000
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
    if (item.description_url && !fcURL(item.description_url))
      throw Error("invalid_description_url");
    const passages = (item.passages || []).slice(0, 12).map((p) => {
      if (
        !/^[a-z0-9_-]{1,80}$/.test(p.id) ||
        !["purpose", "usage", "caution"].includes(p.kind) ||
        p.reviewed !== true ||
        !fcURL(p.url)
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
    items,
  };
}
async function readJSON(response, max = 2_000_000) {
  if (
    !response.ok ||
    !/application\/json/i.test(response.headers.get("content-type") || "")
  )
    throw Error("source_unavailable");
  let size = 0,
    chunks = [];
  for await (const c of response.body) {
    size += c.length;
    if (size > max) throw Error("source_too_large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function secureEndpoint(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.hash ||
    u.search ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)
  )
    throw Error("invalid_bridge_url");
  return u.href;
}
function createKnowledge({
  url = process.env.FC_KNOWLEDGE_URL,
  token = process.env.FC_BRIDGE_TOKEN,
  fetcher = fetch,
  now = Date.now,
  interval = 900000,
} = {}) {
  let current = null,
    checkedAt = null,
    state = url ? "pending" : "not-connected",
    flight = null,
    lastTry = 0;
  const endpoint = url ? secureEndpoint(url) : null;
  const fresh = () =>
    current && now() - Date.parse(current.publishedAt) <= 7 * 86400000;
  const status = () => ({
    state: fresh() ? state : current ? "stale" : state,
    version: fresh() ? current.version : seed.version,
    publishedAt: fresh() ? current.publishedAt : seed.verifiedSourceDate,
    checkedAt,
    fullKnowledge: !!fresh(),
    themes: fresh() ? current.items.length : seed.items.length,
    describedThemes: fresh()
      ? current.items.filter((i) =>
          i.passages.some((p) => p.kind === "purpose"),
        ).length
      : 0,
  });
  async function refresh(force = false) {
    if (!endpoint) return status();
    if (flight) return flight;
    if (!force && now() - lastTry < interval) return status();
    lastTry = now();
    flight = (async () => {
      try {
        if (!token) throw Error("bridge_not_configured");
        const response = await fetcher(endpoint, {
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/json",
          },
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        const next = validateFeed(await readJSON(response), now());
        if (
          current &&
          Date.parse(next.publishedAt) < Date.parse(current.publishedAt)
        )
          throw Error("source_rollback");
        current = next;
        checkedAt = new Date(now()).toISOString();
        state = "synced";
      } catch {
        state = "unavailable";
      } finally {
        flight = null;
      }
      return status();
    })();
    return flight;
  }
  return { refresh, status, get: () => (fresh() ? current : seed) };
}
const knowledge = createKnowledge();
module.exports = {
  knowledge,
  createKnowledge,
  validateFeed,
  fcURL,
  readJSON,
  secureEndpoint,
};
