// Long-form public text is stored separately from the bounded AI summary passages.
// Never shorten an article to fit a limit: reject the edit and retain the prior revision.
function articleText(value) {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > 24000 || /[<>]/.test(value))
    throw Error("invalid_article_text");
  return value;
}
function validateArticle(raw) {
  if (raw == null) return { zh: "", en: "", references: [] };
  if (typeof raw !== "object" || Array.isArray(raw))
    throw Error("invalid_article");
  const zh = articleText(raw.zh),
    en = articleText(raw.en);
  if (
    !Array.isArray(raw.references || []) ||
    (raw.references || []).length > 30
  )
    throw Error("invalid_article_references");
  const references = (raw.references || []).map((r) => {
    if (
      typeof r.title !== "string" ||
      !r.title.trim() ||
      r.title.length > 240 ||
      /[<>]/.test(r.title)
    )
      throw Error("invalid_article_reference");
    if (typeof r.url !== "string" || r.url.length > 1800)
      throw Error("invalid_article_reference");
    let u;
    try {
      u = new URL(r.url);
    } catch {
      throw Error("invalid_article_reference");
    }
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      !u.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(
        u.hostname,
      ) ||
      /\.(localhost|local|internal)$/i.test(u.hostname)
    )
      throw Error("invalid_article_reference");
    return { title: r.title, url: u.href };
  });
  return { zh, en, references };
}
module.exports = { validateArticle };
