// Reuse FC homepage photography; headings and guidance remain selectable text.
(() => {
  const ns = "http://www.w3.org/2000/svg";
  function shape(tag, attrs) {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }
  const icons = {
    why: [
      "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11Z",
    ],
    listen: ["M4 14v-3a8 8 0 0 1 16 0v3", "M2 13h5v8H2Zm15 0h5v8h-5Z"],
    care: ["m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z", "m8 12 3 3 5-6"],
    book: [
      "M12 5C8 2 3 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-1-10 1Zm0 0v15",
    ],
  };
  function svg(box) {
    return shape("svg", {
      viewBox: box,
      "aria-hidden": "true",
      focusable: "false",
    });
  }
  function icon(kind) {
    const s = svg("0 0 24 24");
    for (const d of icons[kind] || icons.book)
      s.append(
        shape("path", {
          d,
          fill: "none",
          stroke: "currentColor",
          "stroke-width": 1.6,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
    return s;
  }
  function theme(item) {
    const text = (item.name_en + " " + item.name_zh).toLowerCase();
    if (/sleep.*stress|睡眠.*压力/.test(text)) return "balance";
    if (/sleep|睡眠/.test(text)) return "rest";
    if (/eye|vision|眼|视力/.test(text)) return "eyes";
    if (/brain|focus|memory|mental clarity|大脑|专注/.test(text))
      return "focus";
    if (/energy|chakra|aura|ground|能量|脉轮|接地/.test(text)) return "energy";
    if (/stress|anxi|conflict|positive|confiden|情绪|自信/.test(text))
      return "balance";
    return "comfort";
  }
  function illustration(item) {
    const type = theme(item),
      wrap = document.createElement("div");
    wrap.className = "fc-scene fc-scene-" + type;
    const image = document.createElement("img");
    const files = {
      rest: "rest",
      eyes: "daily",
      focus: "focus",
      energy: "energy",
      balance: "balance",
      comfort: "daily",
    };
    image.src = "/assets/fc-home-" + files[type] + "-v1.webp";
    image.alt = "";
    image.width =
      type === "focus" || type === "eyes" || type === "comfort" ? 840 : 768;
    image.height =
      type === "focus" || type === "eyes" || type === "comfort" ? 1050 : 512;
    image.decoding = "async";
    image.loading = "lazy";
    wrap.append(image);
    return wrap;
  }
  function point(kind, label, text, headingTag = "h4") {
    const row = document.createElement("div");
    row.className = "fc-visual-point";
    const badge = document.createElement("span");
    badge.className = "fc-point-icon fc-point-" + kind;
    badge.append(icon(kind));
    const body = document.createElement("div"),
      heading = document.createElement(headingTag),
      p = document.createElement("p");
    heading.textContent = label;
    p.textContent = text;
    body.append(heading, p);
    row.append(badge, body);
    return row;
  }
  window.FCVisuals = { illustration, icon, point };
})();
