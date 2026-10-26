// Storage/search capacity is independent of the bounded per-message model input.
// Owner roadmap: 300 themes next, 1,000+ later. Retain headroom and explicit limits.
module.exports = Object.freeze({ MAX_THEMES: 2000, MAX_ARCHIVE_BYTES: 16_000_000 });
