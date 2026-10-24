const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "..");
function registry() {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "public/theme-media.js"), "utf8"),
    { window },
  );
  return window.FCThemeMedia;
}
test("every catalog theme has its own existing cover asset, without shared-image aliases", () => {
  const media = registry(),
    catalog = require("../data/assistant-catalog.json").items;
  // The visual registry also includes eight already-prepared draft themes;
  // this frontend-only release must not alter the production catalog.
  for (const item of catalog) assert.ok(media[item.id], 'Missing cover: '+item.id);
  const hashes = new Set();
  for (const id of Object.keys(media)) {
    const item = {id};
    const m = media[item.id];
    assert.equal(m.src, "/assets/themes-v1/" + item.id + ".webp");
    assert.equal(m.width, 768);
    assert.equal(m.height, 512);
    const bytes = fs.readFileSync(path.join(root, "public", m.src));
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(bytes.length > 5000);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(hash), "Repeated image: " + item.id);
    hashes.add(hash);
  }
});
test("new or unknown themes never receive a guessed cover from their title", () => {
  const media = registry(),
    window = { FCThemeMedia: media };
  const element = () => ({
    children: [],
    hidden: false,
    append(e) {
      this.children.push(e);
    },
  });
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "public/listening-visuals.js"), "utf8"),
    { window, document: { createElement: element } },
  );
  const absent = window.FCVisuals.illustration({
    id: "new_unknown_sleep_theme",
    name_en: "Sleep",
  });
  assert.equal(absent.hidden, true);
  assert.equal(absent.children.length, 0);
  const present = window.FCVisuals.illustration({
    id: "blood_circulation",
    name_en: "Renamed topic",
  });
  assert.equal(present.hidden, false);
  assert.equal(present.children[0].src, media.blood_circulation.src);
  for (const version of ["intensive", "smooth", "bgm"]) {
    const cover = window.FCVisuals.illustration({id:"blood_circulation", version});
    assert.equal(cover.children[0].src, media.blood_circulation.src);
  }
});
