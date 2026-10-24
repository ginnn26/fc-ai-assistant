const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const shared = require("../services/shared-content-store");
function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return salt + ":" + crypto.scryptSync(password, salt, 32).toString("hex");
}
function createContentRouter({
  store = shared.store,
  secret = process.env.FC_CONTENT_SESSION_SECRET,
  hash = process.env.FC_CONTENT_ADMIN_PASSWORD_HASH,
  origin = process.env.RENDER_EXTERNAL_URL ||
    process.env.FC_CONTENT_TEST_ORIGIN ||
    "https://fc-ai-assistant.onrender.com",
  now = Date.now,
} = {}) {
  const r = express.Router();
  const ready =
    !!store &&
    typeof secret === "string" &&
    secret.length >= 32 &&
    /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash || "");
  const secure = origin.startsWith("https:");
  const cookieName = secure ? "__Host-fc_editor" : "fc_editor_test";
  const mac = (raw) =>
    crypto
      .createHmac("sha256", secret || "disabled")
      .update(raw)
      .digest("base64url");
  const equal = (a, b) =>
    typeof a === "string" &&
    typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const sessions = new Map();
  let failed = 0,
    reset = 0;
  r.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    });
    next();
  });
  r.use("/content-api", express.json({ limit: "80kb" }));
  const page = (name) => (req, res) =>
    res.sendFile(path.join(__dirname, "../public", name));
  r.get("/content-manager", page("content-manager.html"));
  r.get("/library/:id", page("library.html"));
  r.get("/content-api/public/:id", async (req, res) => {
    if (!store || !shared.safeId(req.params.id))
      return res.status(404).json({ error: "not_published" });
    try {
      const s = shared.checkState(await store.read());
      const entry = s.published[req.params.id];
      if (!entry) return res.status(404).json({ error: "not_published" });
      res.json({
        item: shared.sanitizeItem(entry.item, now()),
        publishedAt: entry.publishedAt,
      });
    } catch {
      res.status(503).json({ error: "content_unavailable" });
    }
  });
  r.use("/content-api/admin", (req, res, next) => {
    if (!ready) return res.status(503).json({ error: "editor_not_connected" });
    if (
      req.method !== "GET" &&
      (req.headers.origin !== origin ||
        !/application\/json/.test(req.headers["content-type"] || ""))
    )
      return res.status(403).json({ error: "origin_required" });
    next();
  });
  r.post("/content-api/admin/login", (req, res) => {
    if (now() >= reset) {
      failed = 0;
      reset = now() + 900000;
    }
    if (failed >= 5)
      return res.status(429).json({ error: "login_rate_limited" });
    const password = req.body?.password;
    failed++;
    if (
      typeof password !== "string" ||
      password.length > 256 ||
      !equal(passwordHash(password, hash.split(":")[0]), hash)
    )
      return res.status(401).json({ error: "login_failed" });
    // In-memory sessions expire on restart and are bounded. The password hash is server-only.
    for (const [k, v] of sessions) if (v.expires <= now()) sessions.delete(k);
    if (sessions.size >= 10)
      return res.status(429).json({ error: "too_many_editor_sessions" });
    const raw = crypto.randomBytes(32).toString("base64url"),
      csrf = crypto.randomBytes(32).toString("base64url");
    sessions.set(raw, { expires: now() + 3600000, csrf });
    res.setHeader(
      "Set-Cookie",
      cookieName +
        "=" +
        raw +
        "." +
        mac(raw) +
        "; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600" +
        (secure ? "; Secure" : ""),
    );
    res.json({ csrf, storage: store.kind });
  });
  r.use("/content-api/admin", (req, res, next) => {
    const value = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    const [raw, signature] = (value || "").split(".");
    const session = sessions.get(raw);
    if (!session || session.expires <= now() || !equal(signature, mac(raw)))
      return res.status(401).json({ error: "login_required" });
    if (
      req.method !== "GET" &&
      !equal(req.headers["x-csrf-token"], session.csrf)
    )
      return res.status(403).json({ error: "csrf_required" });
    req.editorSession = { raw, ...session };
    next();
  });
  r.get("/content-api/admin/session", (req, res) =>
    res.json({ csrf: req.editorSession.csrf, storage: store.kind }),
  );
  r.post("/content-api/admin/logout", (req, res) => {
    sessions.delete(req.editorSession.raw);
    res.setHeader(
      "Set-Cookie",
      cookieName +
        "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" +
        (secure ? "; Secure" : ""),
    );
    res.json({ ok: true });
  });
  r.get("/content-api/admin/items", async (req, res) => {
    try {
      const s = shared.checkState(await store.read());
      const combined = [
        ...s.catalog,
        ...Object.entries(s.drafts)
          .filter(([id]) => !s.catalog.some((i) => i.id === id))
          .map(([, d]) => d.item),
      ];
      res.json({
        revision: s.revision,
        storage: store.kind,
        items: combined.map((i) => ({
          id: i.id,
          name_en: (s.drafts[i.id]?.item || s.published[i.id]?.item || i)
            .name_en,
          name_zh: (s.drafts[i.id]?.item || s.published[i.id]?.item || i)
            .name_zh,
          state: s.drafts[i.id]
            ? "draft"
            : s.published[i.id]
              ? "published"
              : "pending",
        })),
      });
    } catch {
      res.status(503).json({ error: "content_unavailable" });
    }
  });
  r.get("/content-api/admin/export", async (req, res) => {
    try {
      const s = shared.checkState(await store.read());
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="fc-content-backup.json"',
      );
      res.json(s);
    } catch {
      res.status(503).json({ error: "content_unavailable" });
    }
  });
  r.post("/content-api/admin/initialize", async (req, res) => {
    try {
      const existing = shared.checkState(await store.read());
      if (
        existing.revision !== 0 ||
        existing.catalog.length ||
        Object.keys(existing.drafts).length ||
        Object.keys(existing.published).length
      )
        return res.status(409).json({ error: "already_initialized" });
      const next = shared.initialState();
      next.revision = 1;
      await store.compareAndSwap(0, next);
      res.json({ revision: 1 });
    } catch {
      res.status(503).json({ error: "content_unavailable" });
    }
  });
  r.get("/content-api/admin/items/:id", async (req, res) => {
    try {
      if (!shared.safeId(req.params.id))
        return res.status(404).json({ error: "unknown_item" });
      const s = shared.checkState(await store.read()),
        id = req.params.id;
      const item =
        s.drafts[id]?.item ||
        s.published[id]?.item ||
        s.catalog.find((i) => i.id === id);
      if (!item) return res.status(404).json({ error: "unknown_item" });
      res.json({
        revision: s.revision,
        item,
        published: !!s.published[id],
        canRestore: s.history.some((h) => h.id === id && h.previous),
        history: s.history
          .filter((h) => h.id === id)
          .map((h) => ({ at: h.at })),
      });
    } catch {
      res.status(503).json({ error: "content_unavailable" });
    }
  });
  r.post("/content-api/admin/edit", async (req, res) => {
    try {
      if (!Number.isSafeInteger(req.body?.revision))
        throw Error("invalid_revision");
      const result = await shared.editContent(store, req.body, now());
      // Both the public reader and AI use this same store; force an AI refresh after a publication.
      if (req.body.action !== "save")
        await require("../services/assistant-knowledge").knowledge.refresh(
          true,
        );
      res.json(result);
    } catch (e) {
      const known =
        /^(revision_conflict|invalid_|plain_text|required|purpose_required|human_review_required|unknown_|not_published|medical_claim_needs_review|unreviewed_|duplicate_)/.test(
          e.message,
        );
      res
        .status(e.message === "revision_conflict" ? 409 : known ? 400 : 503)
        .json({ error: known ? e.message : "content_unavailable" });
    }
  });
  return r;
}
module.exports = { createContentRouter, passwordHash };
