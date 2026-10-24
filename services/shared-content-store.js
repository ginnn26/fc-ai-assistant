const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const seed = require("../data/assistant-catalog.json");
function initialState() {
  return {
    schema: 1,
    revision: 0,
    catalog: seed.items,
    drafts: {},
    published: {},
    history: [],
  };
}
function checkState(s) {
  if (
    !s ||
    s.schema !== 1 ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.catalog) ||
    !s.drafts ||
    !s.published ||
    !Array.isArray(s.history)
  )
    throw Error("invalid_content_store");
  return s;
}
function createLocalStore(file) {
  if (!path.isAbsolute(file)) throw Error("absolute_content_path_required");
  return {
    kind: "local-test",
    async read() {
      if (!fs.existsSync(file)) return initialState();
      const raw = fs.readFileSync(file, "utf8");
      if (Buffer.byteLength(raw) > 2_800_000)
        throw Error("content_store_too_large");
      return checkState(JSON.parse(raw));
    },
    async compareAndSwap(revision, value) {
      // Single-process local preview only. No await between reading and atomic replacement.
      const old = fs.existsSync(file)
        ? checkState(JSON.parse(fs.readFileSync(file, "utf8")))
        : initialState();
      if (old.revision !== revision) throw Error("revision_conflict");
      checkState(value);
      if (value.revision !== revision + 1) throw Error("invalid_revision");
      const raw = JSON.stringify(value);
      if (Buffer.byteLength(raw) > 2_800_000)
        throw Error("content_store_too_large");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = file + "." + crypto.randomUUID() + ".tmp";
      fs.writeFileSync(temporary, raw, { mode: 0o600 });
      fs.renameSync(temporary, file);
      return { revision: value.revision };
    },
  };
}
function configuredStore() {
  if (process.env.FC_DRIVE_GATEWAY_URL)
    return require("./google-drive-store").createGoogleDriveStore({
      url: process.env.FC_DRIVE_GATEWAY_URL,
      token: process.env.FC_DRIVE_GATEWAY_TOKEN,
    });
  if (!process.env.RENDER_EXTERNAL_URL && process.env.FC_CONTENT_TEST_FILE)
    return createLocalStore(process.env.FC_CONTENT_TEST_FILE);
  return null;
}
async function publishedFeed(store, now = Date.now()) {
  const s = checkState(await store.read());
  if (!s.catalog.length) throw Error("empty_content_store");
  const items = s.catalog.map(
    (i) => s.published[i.id]?.item || { ...i, passages: [], testimonials: [] },
  );
  return {
    version: "shared-" + s.revision,
    publishedAt: s.publishedAt || new Date(now).toISOString(),
    generatedAt: new Date(now).toISOString(),
    items,
  };
}
function safeId(id) {
  return (
    typeof id === "string" &&
    /^[a-z0-9][a-z0-9_-]{0,99}$/.test(id) &&
    !["constructor", "prototype", "__proto__"].includes(id)
  );
}
function sanitizeItem(raw, now = Date.now()) {
  if (!safeId(raw?.id)) throw Error("invalid_theme_id");
  if (!raw.name_en?.trim() || !raw.name_zh?.trim())
    throw Error("invalid_theme_name");
  const source = "https://fc-ai-assistant.onrender.com/library/" + raw.id;
  const item = {
    ...raw,
    description_url: source,
    passages: (raw.passages || []).map((p) => ({
      ...p,
      url: source,
      reviewed: true,
    })),
    testimonials: (raw.testimonials || []).map((p) => ({
      ...p,
      approved: true,
    })),
  };
  const { validateFeed } = require("./assistant-knowledge");
  const valid = validateFeed(
    {
      version: "review",
      publishedAt: new Date(now).toISOString(),
      items: [item],
    },
    now,
  ).items[0];
  // The reader deliberately strips these editorial flags; preserve them in the publisher's output.
  return {
    ...valid,
    passages: valid.passages.map((p) => ({ ...p, reviewed: true })),
    testimonials: valid.testimonials.map((p) => ({ ...p, approved: true })),
  };
}
async function editContent(
  store,
  { revision, action, item, id, reviewed },
  now = Date.now(),
) {
  const s = checkState(await store.read());
  if (s.revision !== revision) throw Error("revision_conflict");
  if (!safeId(id)) throw Error("invalid_theme_id");
  if (action === "save") {
    if (item?.id !== id || Buffer.byteLength(JSON.stringify(item)) > 65000)
      throw Error("invalid_draft");
    // Drafts may contain unreviewed source material, but never executable HTML or instructions.
    if (/[<>]/.test(JSON.stringify(item))) throw Error("plain_text_required");
    if (Object.keys(s.drafts).length >= 600 && !s.drafts[id])
      throw Error("invalid_draft_limit");
    s.drafts[id] = { item, savedAt: new Date(now).toISOString() };
  } else if (action === "publish") {
    if (reviewed !== true || (!item && !s.drafts[id]))
      throw Error("human_review_required");
    if (item && item.id !== id) throw Error("unknown_catalog_item");
    const valid = sanitizeItem(item || s.drafts[id].item, now);
    const otherUnits = new Set(
      s.catalog
        .filter((x) => x.id !== id)
        .flatMap((x) => x.recordings.map((r) => r.course + ":" + r.unit)),
    );
    if (valid.recordings.some((r) => otherUnits.has(r.course + ":" + r.unit)))
      throw Error("duplicate_recording");
    if (!valid.passages.some((p) => p.kind === "purpose" && (p.zh || p.en)))
      throw Error("purpose_required");
    s.history.push({
      id,
      previous: s.published[id] || null,
      at: new Date(now).toISOString(),
    });
    s.history = s.history.slice(-12);
    s.published[id] = { item: valid, publishedAt: new Date(now).toISOString() };
    const index = s.catalog.findIndex((x) => x.id === id);
    const metadata = { ...valid, passages: [], testimonials: [] };
    if (index < 0) {
      if (s.catalog.length >= 600) throw Error("invalid_catalog_limit");
      s.catalog.push(metadata);
    } else s.catalog[index] = metadata;
    delete s.drafts[id];
    s.publishedAt = new Date(now).toISOString();
  } else if (action === "withdraw") {
    if (!s.published[id]) throw Error("not_published");
    s.drafts[id] = {
      item: s.published[id].item,
      savedAt: new Date(now).toISOString(),
    };
    s.history.push({
      id,
      previous: s.published[id],
      at: new Date(now).toISOString(),
    });
    s.history = s.history.slice(-12);
    delete s.published[id];
    s.publishedAt = new Date(now).toISOString();
  } else if (action === "restore") {
    const previous = [...s.history]
      .reverse()
      .find((h) => h.id === id && h.previous);
    if (!previous) throw Error("unknown_previous_revision");
    s.drafts[id] = {
      item: previous.previous.item,
      savedAt: new Date(now).toISOString(),
    };
  } else throw Error("unknown_action");
  s.revision++;
  await store.compareAndSwap(revision, s);
  return { revision: s.revision };
}
module.exports = {
  initialState,
  checkState,
  createLocalStore,
  publishedFeed,
  sanitizeItem,
  safeId,
  editContent,
  store: configuredStore(),
};
