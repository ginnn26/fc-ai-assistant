const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  vm = require("node:vm");
const {
  createLocalStore,
  editContent,
  publishedFeed,
  initialState,
} = require("../services/shared-content-store");
const {
  validateFeed,
  createKnowledge,
} = require("../services/assistant-knowledge");
const { createGoogleDriveStore } = require("../services/google-drive-store");
const { createContentRouter, passwordHash } = require("../routes/content");
const express = require("express");
const stamp = Date.parse("2026-10-25T04:00:00Z");
test("full articles and references survive publish, withdrawal and restore without entering AI summary evidence", async (t) => {
  const store = fixture(t),
    item = theme();
  item.article = {
    zh: "完整讲解，保留原文与换行。\n".repeat(160),
    en: "Full explanation with paragraphs preserved.\n".repeat(120),
    references: [
      {
        title: "Research source",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      },
    ],
  };
  await editContent(
    store,
    { revision: 0, action: "save", id: item.id, item },
    stamp,
  );
  assert.deepEqual(
    (await store.read()).drafts[item.id].item.article,
    item.article,
  );
  await editContent(
    store,
    { revision: 1, action: "publish", id: item.id, reviewed: true },
    stamp,
  );
  let state = await store.read();
  assert.deepEqual(state.published[item.id].item.article, item.article);
  assert.equal(state.catalog.find((i) => i.id === item.id).article, undefined);
  const feed = validateFeed(await publishedFeed(store, stamp), stamp);
  assert.equal(feed.items.find((i) => i.id === item.id).article, undefined);
  assert.equal(feed.items.find((i) => i.id === item.id).passages.length, 1);
  await editContent(
    store,
    { revision: 2, action: "withdraw", id: item.id },
    stamp,
  );
  assert.deepEqual(
    (await store.read()).drafts[item.id].item.article,
    item.article,
  );
  await editContent(
    store,
    { revision: 3, action: "restore", id: item.id },
    stamp,
  );
  state = await store.read();
  assert.deepEqual(state.drafts[item.id].item.article, item.article);
  assert.equal(state.published[item.id], undefined);
});
test("oversized articles, excessive passages and unsafe reference links reject rather than truncate or replace published content", async (t) => {
  const store = fixture(t),
    item = theme();
  await editContent(
    store,
    { revision: 0, action: "publish", id: item.id, item, reviewed: true },
    stamp,
  );
  for (const article of [
    { zh: "x".repeat(24001) },
    { zh: "<script>bad</script>" },
    { references: [{ title: "bad", url: "javascript:alert(1)" }] },
    {
      references: [{ title: "bad", url: "https://user:password@example.com" }],
    },
    { references: [{ title: "bad", url: "https://127.0.0.1/a" }] },
    {
      references: Array.from({ length: 31 }, () => ({
        title: "source",
        url: "https://example.com",
      })),
    },
  ]) {
    await assert.rejects(
      editContent(
        store,
        {
          revision: 1,
          action: "publish",
          id: item.id,
          item: { ...item, article },
          reviewed: true,
        },
        stamp,
      ),
      /invalid_article/,
    );
    assert.equal((await store.read()).revision, 1);
  }
  const tooMany = structuredClone(item);
  tooMany.passages = Array.from({ length: 13 }, (_, i) => ({
    ...item.passages[0],
    id: "purpose_" + i,
  }));
  await assert.rejects(
    editContent(
      store,
      {
        revision: 1,
        action: "publish",
        id: item.id,
        item: tooMany,
        reviewed: true,
      },
      stamp,
    ),
    /invalid_passage_limit/,
  );
  assert.equal((await store.read()).revision, 1);
});
test("new themes stay private until reviewed and duplicate FC units cannot appear in two themes", async (t) => {
  const store = fixture(t),
    item = theme();
  item.id = "new_theme";
  item.name_en = "New listening theme";
  await editContent(
    store,
    { revision: 0, action: "save", id: item.id, item },
    stamp,
  );
  assert.equal(
    (await publishedFeed(store, stamp)).items.some((i) => i.id === item.id),
    false,
  );
  await assert.rejects(
    editContent(
      store,
      { revision: 1, action: "publish", id: item.id, item, reviewed: true },
      stamp,
    ),
    /duplicate_recording/,
  );
  const unit = "a".repeat(24);
  item.recordings = [
    {
      ...item.recordings[0],
      unit,
      url:
        "https://frequencies-clinic.learnworlds.com/path-player?courseid=sound-healing&unit=" +
        unit,
    },
  ];
  await editContent(
    store,
    { revision: 1, action: "publish", id: item.id, item, reviewed: true },
    stamp,
  );
  const published = validateFeed(await publishedFeed(store, stamp), stamp);
  assert.equal(
    published.items.find((i) => i.id === item.id).name_en,
    item.name_en,
  );
});
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fc-content-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return createLocalStore(path.join(dir, "content.json"));
}
function theme() {
  const item = structuredClone(
    initialState().catalog.find((i) => i.id === "deep_relaxing_sleep"),
  );
  item.passages = [
    {
      id: "purpose_1",
      kind: "purpose",
      zh: "睡前放松的声音陪伴。",
      en: "A sound companion while winding down.",
    },
  ];
  item.testimonials = [];
  return item;
}
test("private draft is invisible to public feed until explicit review; withdrawal preserves draft", async (t) => {
  const store = fixture(t),
    item = theme();
  await editContent(
    store,
    { revision: 0, action: "save", id: item.id, item },
    stamp,
  );
  assert.equal(
    (await publishedFeed(store, stamp)).items.find((i) => i.id === item.id)
      .passages.length,
    0,
  );
  await assert.rejects(
    editContent(store, { revision: 1, action: "publish", id: item.id }, stamp),
    /human_review/,
  );
  await editContent(
    store,
    { revision: 1, action: "publish", id: item.id, reviewed: true },
    stamp,
  );
  const feed = validateFeed(await publishedFeed(store, stamp), stamp);
  assert.equal(
    feed.items.find((i) => i.id === item.id).passages[0].en,
    item.passages[0].en,
  );
  await editContent(
    store,
    { revision: 2, action: "withdraw", id: item.id },
    stamp + 1,
  );
  assert.equal(
    (await store.read()).drafts[item.id].item.passages[0].en,
    item.passages[0].en,
  );
  assert.equal(
    (await publishedFeed(store, stamp + 1)).items.find((i) => i.id === item.id)
      .passages.length,
    0,
  );
});
test("atomic publication cannot overwrite another editor or publish their unreviewed revision", async (t) => {
  const store = fixture(t),
    item = theme();
  await editContent(
    store,
    {
      revision: 0,
      action: "save",
      id: item.id,
      item: { ...item, name_en: "Other editor" },
    },
    stamp,
  );
  await assert.rejects(
    editContent(
      store,
      { revision: 0, action: "publish", id: item.id, item, reviewed: true },
      stamp,
    ),
    /revision_conflict/,
  );
  assert.equal(
    (await store.read()).drafts[item.id].item.name_en,
    "Other editor",
  );
  assert.equal(Object.keys((await store.read()).published).length, 0);
});
test("medical claim, unsafe playback and private/testimonial links cannot be published", async (t) => {
  const store = fixture(t),
    item = theme();
  item.passages[0].en = "This can cure disease";
  await assert.rejects(
    editContent(
      store,
      { revision: 0, action: "publish", id: item.id, item, reviewed: true },
      stamp,
    ),
    /medical_claim/,
  );
  item.passages[0].en = "Quiet listening";
  item.recordings[0].url = "https://example.com/audio.mp3";
  await assert.rejects(
    editContent(
      store,
      { revision: 0, action: "publish", id: item.id, item, reviewed: true },
      stamp,
    ),
    /invalid_recording/,
  );
  item.recordings = theme().recordings;
  item.testimonials = [
    { id: "case1", title: "Shared story", url: "https://example.com/private" },
  ];
  await assert.rejects(
    editContent(
      store,
      { revision: 0, action: "publish", id: item.id, item, reviewed: true },
      stamp,
    ),
    /invalid_testimonial/,
  );
});
test("restoring a prior publication creates a draft without changing public text", async (t) => {
  const store = fixture(t),
    item = theme();
  await editContent(
    store,
    { revision: 0, action: "publish", id: item.id, item, reviewed: true },
    stamp,
  );
  const next = structuredClone(item);
  next.passages[0].en = "A revised listening description.";
  await editContent(
    store,
    { revision: 1, action: "publish", id: item.id, item: next, reviewed: true },
    stamp + 1,
  );
  await editContent(
    store,
    { revision: 2, action: "restore", id: item.id },
    stamp + 2,
  );
  assert.equal(
    (await store.read()).drafts[item.id].item.passages[0].en,
    item.passages[0].en,
  );
  assert.equal(
    (await publishedFeed(store, stamp + 2)).items.find((i) => i.id === item.id)
      .passages[0].en,
    next.passages[0].en,
  );
});
test("stable content remains valid when recently checked; failed checks still expire", async (t) => {
  const store = fixture(t),
    item = theme();
  await editContent(
    store,
    { revision: 0, action: "publish", id: item.id, item, reviewed: true },
    stamp,
  );
  let time = stamp + 30 * 86400000,
    fails = false;
  const k = createKnowledge({
    now: () => time,
    loader: async () => {
      if (fails) throw Error();
      return publishedFeed(store, time);
    },
  });
  await k.refresh(true);
  assert.equal(k.status().fullKnowledge, true);
  assert.equal(k.status().publishedAt, new Date(stamp).toISOString());
  fails = true;
  time += 8 * 86400000;
  await k.refresh(true);
  assert.equal(k.status().fullKnowledge, false);
});
test("Google redirect follows only exact content host and never forwards the credential", async () => {
  const calls = [];
  const store = createGoogleDriveStore({
    url: "https://script.google.com/macros/s/deployment/exec",
    token: "x".repeat(32),
    fetcher: async (u, o) => {
      calls.push([u, o]);
      return calls.length === 1
        ? new Response(null, {
            status: 302,
            headers: {
              location:
                "https://script.googleusercontent.com/macros/echo?result=opaque",
            },
          })
        : Response.json({ ok: true, value: { revision: 4 } });
    },
  });
  assert.deepEqual(await store.read(), { revision: 4 });
  assert.ok(calls[0][1].body.includes("x".repeat(32)));
  assert.equal(calls[1][1].body, undefined);
  assert.equal(calls[1][1].headers, undefined);
  assert.equal(calls[1][1].method, "GET");
  for (const host of [
    "evil.example",
    "script.googleusercontent.com.evil.example",
  ]) {
    let n = 0;
    const bad = createGoogleDriveStore({
      url: "https://script.google.com/macros/s/deployment/exec",
      token: "x".repeat(32),
      fetcher: async () => {
        n++;
        return new Response(null, {
          status: 302,
          headers: { location: "https://" + host + "/" },
        });
      },
    });
    await assert.rejects(bad.read(), /invalid_google_redirect/);
    assert.equal(n, 1);
  }
});
test("missing Drive credential, invalid destination and revision conflicts fail closed", async () => {
  assert.throws(
    () =>
      createGoogleDriveStore({
        url: "https://evil.example",
        token: "x".repeat(32),
      }),
    /invalid_google/,
  );
  assert.throws(
    () =>
      createGoogleDriveStore({
        url: "https://script.google.com/macros/s/id/exec",
        token: "short",
      }),
    /credential/,
  );
  const store = createGoogleDriveStore({
    url: "https://script.google.com/macros/s/id/exec",
    token: "x".repeat(32),
    fetcher: async () =>
      Response.json({ ok: false, error: "revision_conflict" }),
  });
  await assert.rejects(
    store.compareAndSwap(1, { revision: 2 }),
    /revision_conflict/,
  );
});
test("editor requires login, same-origin JSON and CSRF; public reader never returns drafts", async (t) => {
  const store = fixture(t),
    app = express();
  let origin;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  origin = "http://127.0.0.1:" + server.address().port;
  app.use(
    createContentRouter({
      store,
      secret: "s".repeat(32),
      hash: passwordHash("test-editor-pass"),
      origin,
      now: () => stamp,
    }),
  );
  assert.equal((await fetch(origin + "/content-api/admin/items")).status, 401);
  const login = await fetch(origin + "/content-api/admin/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test-editor-pass" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0],
    { csrf } = await login.json(),
    item = theme();
  const send = (body, more = {}) =>
    fetch(origin + "/content-api/admin/edit", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
        ...more,
      },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await send({ revision: 0, id: item.id, action: "save", item })).status,
    403,
  );
  assert.equal(
    (
      await send(
        { revision: 0, id: item.id, action: "save", item },
        { "X-CSRF-Token": csrf, Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await send(
        { revision: 0, id: item.id, action: "save", item },
        { "X-CSRF-Token": csrf },
      )
    ).status,
    200,
  );
  assert.equal(
    (await fetch(origin + "/content-api/public/" + item.id)).status,
    404,
  );
  assert.equal(
    (
      await send(
        { revision: 1, id: item.id, action: "publish", item, reviewed: true },
        { "X-CSRF-Token": csrf },
      )
    ).status,
    200,
  );
  const pub = await (
    await fetch(origin + "/content-api/public/" + item.id)
  ).json();
  assert.equal(pub.item.passages[0].en, item.passages[0].en);
  assert.equal(pub.drafts, undefined);
  assert.equal(pub.history, undefined);
  assert.equal(
    (
      await send(
        { revision: 1, id: item.id, action: "save", item },
        { "X-CSRF-Token": csrf },
      )
    ).status,
    409,
  );
});
test("Apps Script gateway locks compare-and-swap, handles duplicate write and denies unauthenticated reads", () => {
  const token = "g".repeat(32),
    file = "file_id",
    props = { FC_GATEWAY_TOKEN: token, FC_CONTENT_FILE_ID: file };
  let stored = {
      format: "fc-content-1",
      value: {
        schema: 1,
        revision: 0,
        catalog: [],
        drafts: {},
        published: {},
        history: [],
      },
    },
    locks = 0,
    writes = 0;
  const ctx = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => props[k] }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_, s) => [
        ...crypto.createHash("sha256").update(s).digest(),
      ],
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          locks++;
          return true;
        },
        releaseLock: () => {
          locks--;
        },
      }),
    },
    ScriptApp: { getOAuthToken: () => "mock-owner-token" },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }),
    },
    UrlFetchApp: {
      fetch: (url, o) => {
        assert.ok(url.startsWith("https://www.googleapis.com/"));
        if (o.method === "patch") {
          stored = JSON.parse(o.payload);
          writes++;
        }
        return {
          getResponseCode: () => 200,
          getContentText: () =>
            JSON.stringify(o.method === "get" ? stored : { id: file }),
        };
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "../integrations/google-drive/Code.gs"),
      "utf8",
    ),
    ctx,
  );
  const call = (req) =>
    ctx.doPost({
      postData: {
        contents: JSON.stringify(req),
        length: JSON.stringify(req).length,
      },
    });
  assert.equal(call({ action: "read", token: "wrong" }).ok, false);
  assert.equal(writes, 0);
  const value = { ...stored.value, revision: 1 },
    req = {
      action: "write",
      token,
      expectedRevision: 0,
      requestId: crypto.randomUUID(),
      value,
    };
  assert.equal(call(req).ok, true);
  assert.equal(writes, 1);
  assert.equal(locks, 0);
  assert.equal(call(req).ok, true);
  assert.equal(writes, 1);
  assert.equal(
    call({ ...req, requestId: crypto.randomUUID() }).error,
    "revision_conflict",
  );
  assert.equal(locks, 0);
});
