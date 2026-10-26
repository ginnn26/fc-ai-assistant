// Read only the dedicated FC editorial archive. No conversation or member data
// is sent to Google, and drafts never enter a model prompt.
const seed = require('../data/assistant-catalog.json');
const { validateFeed } = require('./care-chat-source-validation');
function createCareKnowledge({ read, now = Date.now, ttl = 900000 } = {}) {
  let cached = null, checked = null, flight = null, retryAt = 0;
  async function snapshot() {
    if (!read) return null;
    if (cached && now() - checked < ttl) return cached;
    if (flight) return flight;
    if (now() < retryAt) return null;
    flight = (async () => {
      try {
        const state = await read();
        if (state?.schema !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 ||
            !Array.isArray(state.catalog) || !state.published || typeof state.published !== 'object')
          throw Error('invalid_content_store');
        const feed = validateFeed({ version: 'shared-' + state.revision,
          publishedAt: state.publishedAt, generatedAt: new Date(now()).toISOString(),
          items: state.catalog.map(item => {
            const published = Object.hasOwn(state.published, item.id) ? state.published[item.id] : null;
            if (published && published.item?.id !== item.id) throw Error('invalid_published_id');
            return published ? published.item : { ...item, passages: [], testimonials: [] };
          }) }, now());
        if (cached && state.revision < cached.revision) throw Error('source_rollback');
        cached = { ...feed, revision: state.revision };
        checked = now();
        return cached;
      } catch {
        // Expired or unavailable editorial data must not be represented as
        // current. Existing metadata-only matching remains explicitly limited.
        retryAt = now() + 30000;
        return null;
      } finally { flight = null; }
    })();
    return flight;
  }
  return { snapshot };
}
function configuredKnowledge() {
  try {
    if (!process.env.FC_DRIVE_GATEWAY_URL) return createCareKnowledge();
    const store = require('./google-drive-store').createGoogleDriveStore({
      url: process.env.FC_DRIVE_GATEWAY_URL, token: process.env.FC_DRIVE_GATEWAY_TOKEN });
    return createCareKnowledge({ read: () => store.read() });
  } catch { return createCareKnowledge(); }
}
function listeningItems(feed) {
  if (!feed) return seed.items;
  return feed.items.map(item => {
    const original = seed.items.find(i => i.id === item.id);
    return { ...original, ...item,
      // Until the public shared reader is released here, use the established
      // FC description page for known themes rather than a broken library URL.
      description_url: original?.description_url || item.description_url,
      knowledgeVersion: feed.version };
  });
}
module.exports = { createCareKnowledge, listeningItems, knowledge: configuredKnowledge() };
