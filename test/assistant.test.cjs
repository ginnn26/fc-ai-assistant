const test = require("node:test"),
  assert = require("node:assert/strict"),
  express = require("express");
process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
const {
  generateRecommendations,
  selectCandidates,
  validSelection,
} = require("../services/assistant-recommendation");
const { createChatRouter } = require("../routes/chat");
const catalog = require("../data/assistant-catalog.json");
async function run(fn, opts = {}) {
  const app = express();
  app.use(express.json({ limit: "12kb" }));
  app.use("/chat", createChatRouter(opts));
  const s = app.listen(0, "127.0.0.1");
  await new Promise((r) => s.once("listening", r));
  const base = `http://127.0.0.1:${s.address().port}`;
  try {
    await fn(base);
  } finally {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
}
const post = (base, b) =>
  fetch(base + "/chat/recommend", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
test("catalog uses distinct themes, real units and only protected FC playback routes", () => {
  assert.equal(
    new Set(catalog.items.map((i) => i.id)).size,
    catalog.items.length,
  );
  for (const i of catalog.items) {
    assert.ok(i.recordings.length);
    for (const r of i.recordings) {
      const u = new URL(r.url);
      assert.equal(u.origin, "https://frequencies-clinic.learnworlds.com");
      assert.equal(u.searchParams.get("unit"), r.unit);
      assert.match(r.unit, /^[a-f0-9]{24}$/);
      assert.ok(["bgm", "smooth", "intensive"].includes(r.version));
    }
  }
});
test("sleep BGM preference returns only actual BGM recordings and catalog links", async () => {
  const r = await generateRecommendations("最近晚上睡不着，想听有音乐的版本", {
    language: "zh",
    preference: "bgm",
    ask: async () => JSON.stringify({ ids: ["deep_relaxing_sleep"] }),
  });
  assert.equal(r.mode, "ai");
  assert.equal(r.recommendations[0].id, "deep_relaxing_sleep");
  assert.ok(r.recommendations[0].recordings.every((x) => x.version === "bgm"));
  assert.match(
    r.recommendations[0].description_url,
    /detail-deep-relaxing-sleep$/,
  );
});
test('negative music preferences do not select BGM',async()=>{const r=await generateRecommendations('I want sleep support without music',{ask:async()=>({ids:[]})});assert.ok(r.recommendations.length);assert.ok(r.recommendations.every(i=>i.recordings.every(x=>x.version!=='bgm')));});
test('disliking Intensive is not interpreted as requesting it',async()=>{const r=await generateRecommendations('想睡好一点，不喜欢 Intensive',{ask:async()=>({ids:[]})});assert.ok(r.recommendations.length);assert.ok(r.recommendations.every(i=>i.recordings.every(x=>x.version!=='intensive')));});
test("model cannot invent tracks, playback links, versions or duplicate results", () => {
  const c = selectCandidates("sleep");
  const r = validSelection({ ids: ["fake", c[0].id, c[0].id] }, c);
  assert.equal(r.length, 1);
  assert.equal(r[0], c[0]);
  assert.deepEqual(validSelection("not-json", c), []);
});
test("provider failure gives explicitly labelled catalog matches", async () => {
  const r = await generateRecommendations("I want help relaxing before sleep", {
    ask: async () => {
      throw Error("synthetic failure");
    },
  });
  assert.equal(r.mode, "catalog");
  assert.match(r.message, /keyword matches/);
  assert.ok(r.recommendations.length);
});
test("unrelated requests ask for clarification without spending a provider call", async () => {
  let calls = 0;
  const r = await generateRecommendations("What is the capital of France?", {
    ask: async () => {
      calls++;
    },
  });
  assert.equal(r.status, "clarify");
  assert.equal(calls, 0);
  assert.equal(r.recommendations.length, 0);
});
test("acute chest, breathing and self-harm descriptions never recommend audio or call AI", async () => {
  for (const m of [
    "胸痛喘不过气",
    "I cannot breathe",
    "I want to kill myself",
  ]) {
    let calls = 0;
    const r = await generateRecommendations(m, {
      ask: async () => {
        calls++;
      },
    });
    assert.equal(r.status, "safety");
    assert.equal(r.recommendations.length, 0);
    assert.equal(calls, 0);
  }
});
test("serious disease and detox requests do not produce medical audio prescriptions", async () => {
  for (const m of ["癌症要听什么", "vaccine detox", "高血压想停药"])
    assert.equal((await generateRecommendations(m)).status, "medical");
});
test("recommendation endpoint validates consent, length, preference and origin", () =>
  run(
    async (base) => {
      assert.equal((await post(base, { message: "sleep" })).status, 422);
      assert.equal(
        (await post(base, { message: 2, consent: true })).status,
        422,
      );
      assert.equal(
        (await post(base, { message: "a".repeat(2001), consent: true })).status,
        422,
      );
      assert.equal(
        (
          await post(base, {
            message: "sleep",
            consent: true,
            preference: "invented",
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await fetch(base + "/chat/recommend", {
            method: "POST",
            headers: {
              Origin: "https://other.test",
              "Content-Type": "application/json",
            },
            body: "{}",
          })
        ).status,
        403,
      );
    },
    { recommend: async () => ({ recommendations: [] }) },
  ));
test("transcription requires consent and recognizable audio, and returns editable text only", () => {
  let calls = 0;
  return run(
    async (base) => {
      const submit = async (file, consent) => {
        const f = new FormData();
        f.append("audio", new Blob([file]), "sample.wav");
        if (consent) f.append("consent", "true");
        return fetch(base + "/chat/transcribe", {
          method: "POST",
          headers: { Origin: base },
          body: f,
        });
      };
      const wav = Buffer.alloc(64);
      wav.write("RIFF");
      assert.equal((await submit(wav, false)).status, 422);
      assert.equal((await submit(Buffer.alloc(64), true)).status, 415);
      const res = await submit(wav, true);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), {
        transcript: "I want to relax before sleep.",
      });
      assert.equal(calls, 1);
    },
    {
      transcribe: async () => {
        calls++;
        return "I want to relax before sleep.";
      },
    },
  );
});
test("empty or failed transcription is recoverable without leaking provider errors", () =>
  run(
    async (base) => {
      const f = new FormData(),
        wav = Buffer.alloc(64);
      wav.write("RIFF");
      f.append("audio", new Blob([wav]), "test.wav");
      f.append("consent", "true");
      const r = await fetch(base + "/chat/transcribe", {
        method: "POST",
        headers: { Origin: base },
        body: f,
      });
      assert.equal(r.status, 503);
      assert.deepEqual(await r.json(), { error: "temporarily_unavailable" });
    },
    {
      transcribe: async () => {
        throw Error("PRIVATE-PROVIDER-DETAIL");
      },
    },
  ));
test("request cap stops unbounded provider usage", () =>
  run(
    async (base) => {
      const b = { consent: true, message: "sleep" };
      assert.equal((await post(base, b)).status, 200);
      const r = await post(base, b);
      assert.equal(r.status, 429);
      assert.ok(r.headers.get("Retry-After"));
    },
    {
      maxRequests: 1,
      recommend: async () => ({ message: "test", recommendations: [] }),
    },
  ));
