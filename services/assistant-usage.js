const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { readJSON, secureEndpoint } = require("./assistant-knowledge");
function createUsage({
  secret = process.env.ASSISTANT_SESSION_SECRET,
  file = process.env.ASSISTANT_STATE_FILE,
  mode = process.env.ASSISTANT_ACCESS_MODE ||
    (process.env.RENDER_EXTERNAL_URL ? "production" : "test"),
  identityURL = process.env.FC_IDENTITY_URL,
  bridgeToken = process.env.FC_BRIDGE_TOKEN,
  budget = Number(process.env.ASSISTANT_DAILY_BUDGET_USD || 10),
  fetcher = fetch,
  now = Date.now,
} = {}) {
  const configuredSecret = !!secret && secret.length >= 32;
  secret = configuredSecret ? secret : crypto.randomBytes(32).toString("hex");
  const endpoint = identityURL ? secureEndpoint(identityURL) : null;
  if (!Number.isFinite(budget) || budget <= 0 || budget > 100)
    throw Error("invalid_daily_budget");
  let state = {
    day: "",
    people: {},
    consultations: {},
    reserved: 0,
    tickets: {},
  };
  let storageReady = !file;
  if (file) {
    try {
      if (!path.isAbsolute(file)) throw Error("absolute_state_path_required");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf8");
        if (raw.length > 3_000_000) throw Error("invalid_usage_state");
        state = JSON.parse(raw);
        if (
          typeof state.day !== "string" ||
          !state.people ||
          !state.consultations ||
          !state.tickets ||
          !Number.isFinite(state.reserved)
        )
          throw Error("invalid_usage_state");
      }
      fs.accessSync(path.dirname(file), fs.constants.W_OK);
      storageReady = true;
    } catch {
      storageReady = false;
    }
  }
  const hmac = (s) =>
    crypto.createHmac("sha256", secret).update(s).digest("base64url");
  function sign(data) {
    const raw = Buffer.from(JSON.stringify(data)).toString("base64url");
    return raw + "." + hmac(raw);
  }
  function verify(token, type) {
    if (typeof token !== "string" || token.length > 1600) return null;
    const [raw, mac, ...extra] = token.split(".");
    if (extra.length || !raw || !mac) return null;
    const expected = hmac(raw),
      a = Buffer.from(mac),
      b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const data = JSON.parse(Buffer.from(raw, "base64url"));
      return data.type === type && data.expires > now() ? data : null;
    } catch {
      return null;
    }
  }
  const day = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now()));
  function save() {
    if (file) {
      try {
        fs.writeFileSync(file + ".tmp", JSON.stringify(state), { mode: 0o600 });
        fs.renameSync(file + ".tmp", file);
      } catch {
        storageReady = false;
        throw Error("usage_storage_unavailable");
      }
    }
  }
  function roll() {
    const d = day();
    if (state.day !== d) {
      state = {
        day: d,
        people: {},
        consultations: {},
        reserved: 0,
        tickets: {},
      };
      save();
    }
    for (const [k, v] of Object.entries(state.consultations))
      if (v.expires <= now()) delete state.consultations[k];
  }
  function ready() {
    if (mode !== "test" && (!configuredSecret || !file || !storageReady))
      throw Error("usage_not_configured");
    if (!storageReady) throw Error("usage_storage_unavailable");
  }
  async function session(previous, ticket) {
    ready();
    roll();
    let s = verify(previous, "session");
    if (ticket !== undefined) {
      if (
        typeof ticket !== "string" ||
        ticket.length < 12 ||
        ticket.length > 2000 ||
        !endpoint ||
        !bridgeToken
      )
        throw Error("membership_not_connected");
      const key = hmac(ticket);
      if (state.tickets[key]) throw Error("invalid_membership_ticket");
      const r = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + bridgeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket }),
        redirect: "error",
        signal: AbortSignal.timeout(6000),
      });
      const identity = await readJSON(r, 10000);
      if (
        typeof identity.subject !== "string" ||
        identity.subject.length > 200 ||
        !identity.subject ||
        !["member", "trial"].includes(identity.tier) ||
        !Number.isFinite(identity.expiresAt) ||
        identity.expiresAt <= now() ||
        identity.expiresAt > now() + 900000
      )
        throw Error("invalid_membership_ticket");
      if (state.tickets[key]) throw Error("invalid_membership_ticket");
      s = {
        type: "session",
        subject: hmac("fc:" + identity.subject),
        tier: identity.tier,
        expires: identity.expiresAt,
      };
      state.tickets[key] = now();
      save();
    }
    if (!s)
      s = {
        type: "session",
        subject: crypto.randomBytes(20).toString("hex"),
        tier: "guest",
        expires: now() + 86400000,
      };
    const count = state.people[s.subject] || 0;
    return {
      token: sign(s),
      tier: s.tier,
      remaining: Math.max(0, (s.tier === "member" ? 5 : 2) - count),
      dailyLimit: s.tier === "member" ? 5 : 2,
      quotaMode: mode === "test" ? "test" : file ? "persistent" : "unavailable",
      membershipConnected: !!endpoint,
      timezone: "Asia/Kuala_Lumpur",
    };
  }
  function reserve(sessionToken, consultationToken, kind) {
    ready();
    roll();
    const s = verify(sessionToken, "session");
    if (!s) throw Error("session_required");
    let c = verify(consultationToken, "consultation"),
      entry = c && state.consultations[c.id];
    if (!entry || entry.subject !== s.subject) {
      if (consultationToken) throw Error("consultation_expired");
      const limit = s.tier === "member" ? 5 : 2;
      if ((state.people[s.subject] || 0) >= limit) throw Error("daily_limit");
      if (Object.keys(state.people).length > 10000) throw Error("daily_budget");
      c = {
        type: "consultation",
        id: crypto.randomBytes(20).toString("hex"),
        expires: now() + 1800000,
      };
      entry = {
        subject: s.subject,
        expires: c.expires,
        transcriptions: 0,
        recommendations: 0,
      };
    }
    if (
      (kind === "transcribe" && entry.transcriptions >= 2) ||
      (kind === "recommend" && entry.recommendations >= 2)
    )
      throw Error("consultation_limit");
    // Conservative request reservations, not a representation of the provider's invoice.
    const cost = kind === "transcribe" ? 0.01 : 0.05;
    if (state.reserved + cost > budget) throw Error("daily_budget");
    if (!state.consultations[c.id]) {
      state.people[s.subject] = (state.people[s.subject] || 0) + 1;
      state.consultations[c.id] = entry;
    }
    entry[kind === "transcribe" ? "transcriptions" : "recommendations"]++;
    state.reserved += cost;
    save();
    return {
      consultationToken: sign(c),
      remaining: Math.max(
        0,
        (s.tier === "member" ? 5 : 2) - (state.people[s.subject] || 0),
      ),
      quotaMode: mode === "test" ? "test" : "persistent",
    };
  }
  return {
    session,
    reserve,
    info: () => ({
      mode: mode === "test" ? "test" : "production",
      ready: mode === "test" || (configuredSecret && !!file && storageReady),
      membershipConnected: !!endpoint,
      persistent: !!file && storageReady,
      budgetReservationUSD: budget,
    }),
  };
}
module.exports = { createUsage };
