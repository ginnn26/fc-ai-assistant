// Server-to-server Apps Script client. Never expose this credential to browsers.
const crypto = require("node:crypto");
const { MAX_ARCHIVE_BYTES } = require('./care-catalog-limits');
function endpoint(value) {
  const u = new URL(value);
  if (
    u.origin !== "https://script.google.com" ||
    !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) ||
    u.search ||
    u.hash ||
    u.username ||
    u.password
  )
    throw Error("invalid_google_gateway");
  return u.href;
}
async function boundedJSON(response) {
  if (
    !response.ok ||
    !/application\/json/i.test(response.headers.get("content-type") || "")
  )
    throw Error("drive_unavailable");
  const parts = [];
  let size = 0;
  for await (const part of response.body) {
    size += part.length;
    if (size > MAX_ARCHIVE_BYTES) throw Error("drive_response_too_large");
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
function createGoogleDriveStore({ url, token, fetcher = fetch }) {
  const target = endpoint(url);
  if (typeof token !== "string" || token.length < 32)
    throw Error("drive_credential_required");
  async function call(action, data = {}) {
    const signal = AbortSignal.timeout(20000);
    let response = await fetcher(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, token, ...data }),
      redirect: "manual",
      signal,
    });
    if ([302, 303].includes(response.status)) {
      const u = new URL(response.headers.get("location"));
      if (
        u.origin !== "https://script.googleusercontent.com" ||
        u.username ||
        u.password ||
        u.hash
      )
        throw Error("invalid_google_redirect");
      // ContentService redirects to an ephemeral result URL. No token or POST body follows it.
      response = await fetcher(u.href, {
        method: "GET",
        redirect: "error",
        signal,
      });
    }
    const result = await boundedJSON(response);
    if (!result.ok)
      throw Error(
        result.error === "revision_conflict"
          ? "revision_conflict"
          : "drive_unavailable",
      );
    return result.value;
  }
  return {
    kind: "google-drive",
    read: () => call("read"),
    compareAndSwap: (revision, value, requestId = crypto.randomUUID()) =>
      call("write", { expectedRevision: revision, requestId, value }),
  };
}
module.exports = { createGoogleDriveStore, endpoint };
