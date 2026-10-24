/* FC private content gateway. Deployment and owner OAuth approval are separate release steps.
 * Only app-created files are accessible (drive.file). No customer health records belong here.
 * Do not add a public doGet, log request bodies, or put the token in a URL.
 */
function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map(function (n) {
      return ("0" + ((n + 256) % 256).toString(16)).slice(-2);
    })
    .join("");
}
function equal_(a, b) {
  var x = digest_(String(a)),
    y = digest_(String(b)),
    diff = 0;
  for (var i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
function drive_(suffix, method, body) {
  var upload = method === "patch";
  var response = UrlFetchApp.fetch(
    "https://www.googleapis.com/" +
      (upload ? "upload/" : "") +
      "drive/v3/files" +
      suffix,
    {
      method: method,
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      contentType: "application/json",
      payload: body === undefined ? undefined : JSON.stringify(body),
      followRedirects: false,
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
    throw Error("drive_unavailable");
  return JSON.parse(response.getContentText());
}
function doPost(e) {
  var lock;
  try {
    if (!e || !e.postData || e.postData.length > 3000000)
      return output_({ ok: false, error: "invalid_request" });
    var req = JSON.parse(e.postData.contents),
      props = PropertiesService.getScriptProperties();
    var token = props.getProperty("FC_GATEWAY_TOKEN"),
      fileId = props.getProperty("FC_CONTENT_FILE_ID");
    if (
      !token ||
      token.length < 32 ||
      typeof req.token !== "string" ||
      req.token.length > 512 ||
      !equal_(req.token, token)
    )
      return output_({ ok: false, error: "unauthorized" });
    if (!/^[A-Za-z0-9_-]+$/.test(fileId || "")) throw Error("not_initialized");
    if (req.action !== "read" && req.action !== "write")
      throw Error("invalid_action");
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw Error("busy");
    var wrapper = drive_("/" + fileId + "?alt=media", "get");
    if (
      wrapper.format !== "fc-content-1" ||
      !wrapper.value ||
      !Number.isSafeInteger(wrapper.value.revision)
    )
      throw Error("invalid_store");
    if (req.action === "read")
      return output_({ ok: true, value: wrapper.value });
    if (
      !/^[a-f0-9-]{36}$/.test(req.requestId || "") ||
      !req.value ||
      req.value.schema !== 1 ||
      !Array.isArray(req.value.catalog) ||
      !req.value.drafts ||
      !req.value.published ||
      !Array.isArray(req.value.history) ||
      req.value.revision !== req.expectedRevision + 1
    )
      throw Error("invalid_write");
    var serialized = JSON.stringify(req.value),
      hash = digest_(serialized);
    if (serialized.length > 2800000) throw Error("store_too_large");
    if (wrapper.lastRequest && wrapper.lastRequest.id === req.requestId) {
      if (wrapper.lastRequest.digest !== hash) throw Error("invalid_retry");
      return output_({ ok: true, value: { revision: wrapper.value.revision } });
    }
    if (wrapper.value.revision !== req.expectedRevision)
      return output_({ ok: false, error: "revision_conflict" });
    drive_("/" + fileId + "?uploadType=media", "patch", {
      format: "fc-content-1",
      value: req.value,
      lastRequest: { id: req.requestId, digest: hash },
    });
    return output_({ ok: true, value: { revision: req.value.revision } });
  } catch (_) {
    // Do not disclose Drive identifiers, credentials, request text or provider responses.
    return output_({ ok: false, error: "store_unavailable" });
  } finally {
    if (lock) lock.releaseLock();
  }
}
/* Owner-run setup only, after reviewing the scopes and deploying code. Creates private app files.
 * Set FC_GATEWAY_TOKEN yourself in Script Properties before running; never paste it into chat.
 * Re-running reuses saved IDs. A rare partial setup failure may leave a private empty file/folder.
 */
function initializePrivateContentStore() {
  var props = PropertiesService.getScriptProperties();
  if ((props.getProperty("FC_GATEWAY_TOKEN") || "").length < 32)
    throw Error("Configure an owner-managed token first.");
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (props.getProperty("FC_CONTENT_FILE_ID")) return;
    var folder = props.getProperty("FC_CONTENT_FOLDER_ID");
    if (!folder) {
      folder = drive_("", "post", {
        name: "FC Shared Content — Private",
        mimeType: "application/vnd.google-apps.folder",
      }).id;
      props.setProperty("FC_CONTENT_FOLDER_ID", folder);
    }
    var file = drive_("", "post", {
      name: "fc-content.json",
      mimeType: "application/json",
      parents: [folder],
    }).id;
    drive_("/" + file + "?uploadType=media", "patch", {
      format: "fc-content-1",
      value: {
        schema: 1,
        revision: 0,
        catalog: [],
        drafts: {},
        published: {},
        history: [],
      },
    });
    props.setProperty("FC_CONTENT_FILE_ID", file);
  } finally {
    lock.releaseLock();
  }
}
