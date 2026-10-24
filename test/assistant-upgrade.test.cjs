const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
const { screen, validateIntake } = require("../services/assistant-intake");
const {
  validateFeed,
  createKnowledge,
} = require("../services/assistant-knowledge");
const { createUsage } = require("../services/assistant-usage");
const { wavDuration } = require("../services/assistant-audio");
const {
  generateRecommendations,
} = require("../services/assistant-recommendation");
const { createChatRouter } = require("../routes/chat");
const { wav } = require("./voice-fixture.cjs");
const seed = require("../data/assistant-catalog.json");
const now = () => Date.parse("2026-10-24T15:59:00Z");
const feed = () => ({
  version: "reviewed-test-1",
  publishedAt: new Date(now()).toISOString(),
  items: [
    {
      ...seed.items.find((x) => x.id === "deep_relaxing_sleep"),
      passages: [
        {
          id: "p1",
          kind: "purpose",
          reviewed: true,
          zh: "适合喜欢音乐作为睡前放松陪伴的人。",
          en: "For listeners who enjoy music while winding down.",
          url: "https://frequencies-clinic.learnworlds.com/detail-deep-relaxing-sleep",
        },
      ],
      testimonials: [],
    },
  ],
});
test("vague repeated tiredness asks for missing context without recommending", () => {
  const first = screen("很累啊很累，真的太累了");
  assert.equal(first.status, "clarify");
  assert.deepEqual(
    first.questions.map((q) => q.id),
    ["onset", "detail", "impact"],
  );
  assert.equal(first.recommendations.length, 0);
  const next = screen("很累啊很累，真的太累了", {
    onset: "两个星期",
    detail: "工作压力大晚上睡不好",
    impact: "白天无法专注",
  });
  assert.equal(next, null);
});
test("chest symptoms override reassuring context and never wait for missing details", () => {
  for (const message of [
    "胸口痛，要听止痛",
    "Chest pain after an old injury",
    "呼吸困難",
    "突然一侧无力",
  ]) {
    const r = screen(message, { medical: "已经看过医生，没事" });
    assert.equal(r.status, "safety");
    assert.equal(r.questions.length, 0);
    assert.equal(r.recommendations.length, 0);
  }
});
test("physical symptoms need context and completion is not medical clearance", () => {
  const r = screen("我肩膀疼痛");
  assert.equal(r.status, "clarify");
  assert.ok(r.questions.some((q) => q.id === "medical"));
  const context = {
    onset: "两天",
    impact: "工作不舒服",
    medical: "还没看医生",
    goal: "想让疼痛消失",
  };
  assert.equal(screen("我肩膀疼痛", context).status, "medical");
  assert.equal(
    screen("我肩膀疼痛", { ...context, goal: "另想听日常放松" }),
    null,
  );
  assert.throws(() => validateIntake({ doctorOverride: true }));
  assert.throws(() => validateIntake({ onset: "a".repeat(401) }));
});
test("reviewed feed validates actual course/unit links and rejects invented or stale sources", () => {
  const f = feed();
  assert.equal(validateFeed(f, now()).items.length, 1);
  const wrong = feed();
  wrong.items[0].recordings = [
    { ...wrong.items[0].recordings[0], url: "https://attacker.example/audio" },
  ];
  assert.throws(() => validateFeed(wrong, now()));
  const stale = feed();
  stale.publishedAt = "2020-01-01";
  assert.throws(() => validateFeed(stale, now()));
  const unreviewed = feed();
  unreviewed.items[0].passages[0].reviewed = false;
  assert.throws(() => validateFeed(unreviewed, now()));
  const duplicate = feed();
  duplicate.items.push(structuredClone(duplicate.items[0]));
  assert.throws(() => validateFeed(duplicate, now()));
});
test("sync is atomic, single flight, truthful on failure, and expires stale descriptions", async () => {
  let calls = 0,
    time = now(),
    fail = false;
  const source = createKnowledge({
    url: "https://bridge.example/fc-knowledge",
    token: "server-only-token",
    now: () => time,
    fetcher: async (_url, opts) => {
      calls++;
      assert.equal(opts.redirect, "error");
      assert.equal(opts.headers.Authorization, "Bearer server-only-token");
      if (fail) throw Error("private upstream error");
      return Response.json(feed());
    },
  });
  await Promise.all([source.refresh(true), source.refresh(true)]);
  assert.equal(calls, 1);
  assert.equal(source.status().fullKnowledge, true);
  fail = true;
  time += 900001;
  await source.refresh();
  assert.equal(source.status().state, "unavailable");
  assert.equal(source.status().fullKnowledge, true);
  time += 8 * 86400000;
  assert.equal(source.status().state, "stale");
  assert.equal(source.status().fullKnowledge, false);
  assert.equal(source.get().version, seed.version);
});
test("AI explanation can quote only a real reviewed passage and cannot invent a testimonial count", async () => {
  const catalog = validateFeed(feed(), now()),
    source = {
      refresh: async () => {},
      get: () => catalog,
      status: () => ({
        fullKnowledge: true,
        state: "synced",
        publishedAt: catalog.publishedAt,
      }),
    };
  const r = await generateRecommendations("I want music before sleep", {
    source,
    ask: async (_messages, options) => {
      assert.equal(options.model, "gpt-5.4-mini");
      return {
        ids: ["deep_relaxing_sleep"],
        evidence: [{ id: "deep_relaxing_sleep", passageId: "p1" }],
        testimonials: 99,
      };
    },
  });
  assert.equal(
    r.recommendations[0].evidence.en,
    catalog.items[0].passages[0].en,
  );
  assert.equal(r.recommendations[0].testimonials.length, 0);
  const bad = await generateRecommendations("sleep music", {
    source,
    ask: async () => ({
      ids: ["deep_relaxing_sleep"],
      evidence: [{ id: "deep_relaxing_sleep", passageId: "made-up" }],
    }),
  });
  assert.equal(bad.recommendations[0].evidence, null);
});
test("daily usage persists across restarts, follows Malaysia midnight, and groups retries", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fc-usage-test-")),
    file = path.join(dir, "usage.json"),
    secret = "x".repeat(40);
  let clock = now();
  try {
    let usage = createUsage({
      file,
      secret,
      mode: "production",
      now: () => clock,
    });
    const s = await usage.session();
    const c = usage.reserve(s.token, "", "transcribe");
    usage.reserve(s.token, c.consultationToken, "recommend");
    assert.equal((await usage.session(s.token)).remaining, 1);
    usage = createUsage({ file, secret, mode: "production", now: () => clock });
    assert.equal((await usage.session(s.token)).remaining, 1);
    usage.reserve(s.token, "", "recommend");
    assert.throws(() => usage.reserve(s.token, "", "recommend"), /daily_limit/);
    clock += 120000;
    assert.equal((await usage.session(s.token)).remaining, 2);
    assert.throws(
      () => usage.reserve(s.token + "tamper", "", "recommend"),
      /session_required/,
    );
    assert.equal(fs.readFileSync(file, "utf8").includes("transcript"), false);
  } finally {
    for (const name of ["usage.json", "usage.json.tmp"]) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    fs.rmdirSync(dir);
  }
});
test("member allowance requires server verification and one-use ticket; client membership choice grants nothing", async () => {
  const usage = createUsage({
    identityURL: "https://bridge.example/fc-identity",
    bridgeToken: "server-only",
    now,
    fetcher: async () =>
      Response.json({
        subject: "fictional-member-123",
        tier: "member",
        expiresAt: now() + 600000,
      }),
  });
  const s = await usage.session("", "one-use-test-ticket");
  assert.equal(s.dailyLimit, 5);
  for (let i = 0; i < 5; i++) usage.reserve(s.token, "", "recommend");
  assert.throws(() => usage.reserve(s.token, "", "recommend"), /daily_limit/);
  await assert.rejects(
    usage.session("", "one-use-test-ticket"),
    /invalid_membership_ticket/,
  );
  const guest = await usage.session("made-up-member-token");
  assert.equal(guest.dailyLimit, 2);
});
test("production fails closed without durable state; global reservation blocks provider spending", async () => {
  await assert.rejects(
    createUsage({ mode: "production" }).session(),
    /usage_not_configured/,
  );
  const usage = createUsage({ budget: 0.05 });
  const s = await usage.session();
  usage.reserve(s.token, "", "recommend");
  assert.throws(() => usage.reserve(s.token, "", "recommend"), /daily_budget/);
});
test("server checks WAV length, header integrity and duration rather than trusting browser limits", () => {
  assert.equal(wavDuration(wav(1)), 1);
  assert.equal(wavDuration(Buffer.from("RIFF fake audio")), null);
  const malformed = wav();
  malformed.writeUInt32LE(1, 28);
  assert.equal(wavDuration(malformed), null);
  assert.equal(wavDuration(wav(61)), 61);
  assert.equal(wavDuration(Buffer.concat([wav(), Buffer.alloc(2)])), null);
});
test("quota failure cannot silently fall back to catalog recommendations", async () => {
  let called = 0;
  await assert.rejects(
    generateRecommendations("relax before sleep", {
      beforeProvider: () => {
        throw Error("daily_limit");
      },
      ask: async () => {
        called++;
      },
    }),
    /daily_limit/,
  );
  assert.equal(called, 0);
});
test("urgent routing does not wait for or contact a source refresh", async () => {
  let refresh = 0;
  const source = {
    get: () => seed,
    status: () => ({}),
    refresh: async () => {
      refresh++;
      throw Error("should not fetch");
    },
  };
  const r = await generateRecommendations("chest pain", { source });
  assert.equal(r.status, "safety");
  assert.equal(refresh, 0);
});
test("unconfirmed recordings remain known metadata but never receive a guessed version", async () => {
  const unknown = {
    ...seed.items[0],
    id: "fictional_unconfirmed_sleep",
    name_en: "Sleep Test",
    recordings: [{ ...seed.items[0].recordings[0], version: "unconfirmed" }],
  };
  let calls = 0;
  const r = await generateRecommendations("sleep", {
    source: {
      get: () => ({ version: "test", items: [unknown] }),
      status: () => ({}),
      refresh: async () => {},
    },
    ask: async () => {
      calls++;
    },
  });
  assert.equal(r.status, "clarify");
  assert.equal(calls, 0);
});
test("urgent help and clarification remain accessible when paid usage is disabled", async () => {
  const express = require("express"),
    app = express();
  app.use(express.json());
  let provider = 0;
  app.use(
    "/chat",
    createChatRouter({
      usage: createUsage({ mode: "production" }),
      recommend: async () => {
        provider++;
        throw Error("should not run");
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const message of ["现在胸口很痛", "很累啊很累啊太累了"]) {
      const r = await fetch(base + "/chat/recommend", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ message, consent: true }),
      });
      assert.equal(r.status, 200);
      assert.equal((await r.json()).recommendations.length, 0);
    }
    assert.equal(provider, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("urgent advice bypasses a spent global rate cap without starting a provider job", async () => {
  const express = require("express"),
    app = express();
  app.use(express.json());
  let provider = 0;
  app.use(
    "/chat",
    createChatRouter({
      maxRequests: 0,
      recommend: async () => {
        provider++;
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const submit = (message) =>
    fetch(base + "/chat/recommend", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ message, consent: true }),
    });
  try {
    assert.equal((await submit("我想睡前放松")).status, 429);
    const r = await submit("胸口疼痛呼吸困难");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).status, "safety");
    assert.equal(provider, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
