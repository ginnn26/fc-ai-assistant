// Decorative illustrations; headings and guidance remain selectable text.
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
    const s = svg("0 0 360 140");
    s.append(
      shape("rect", {
        width: 360,
        height: 140,
        rx: 18,
        fill: "var(--scene-bg)",
      }),
    );
    s.append(
      shape("circle", { cx: 296, cy: 32, r: 62, fill: "var(--scene-glow)" }),
    );
    const line = (d, stroke = "var(--scene-ink)", width = 3) =>
      s.append(
        shape("path", {
          d,
          fill: "none",
          stroke,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
    const circle = (cx, cy, r, fill) =>
      s.append(shape("circle", { cx, cy, r, fill }));
    for (let n = 0; n < 3; n++)
      line(
        `M-10 ${105 + n * 12} Q70 ${50 + n * 12} 165 ${105 + n * 7} T380 ${92 + n * 12}`,
        "var(--scene-line)",
        1,
      );
    if (type === "rest") {
      s.append(
        shape("path", {
          d: "M282 18a24 24 0 1 0 31 31 23 23 0 0 1-31-31",
          fill: "var(--scene-ink)",
        }),
      );
      s.append(
        shape("rect", {
          x: 95,
          y: 89,
          width: 154,
          height: 26,
          rx: 13,
          fill: "var(--scene-glow)",
        }),
      );
      circle(124, 76, 15, "#e8bd9c");
      s.append(
        shape("path", {
          d: "M142 95q35-45 89 0v9h-89Z",
          fill: "var(--scene-ink)",
        }),
      );
      line("m113 77 7 2m18 8 14 9M88 113h170M256 29h6m-3-3v6M324 73h6m-3-3v6");
    } else if (type === "eyes") {
      s.append(
        shape("path", {
          d: "M108 71q70-77 144 0-74 77-144 0Z",
          fill: "#fffaf1",
        }),
      );
      line("M108 71q70-77 144 0-74 77-144 0Z");
      circle(180, 71, 27, "var(--scene-ink)");
      circle(180, 71, 13, "var(--scene-bg)");
      circle(190, 61, 5, "white");
      line("m132 32-6-10m54 1V12m48 20 6-10");
    } else if (type === "focus") {
      s.append(
        shape("path", {
          d: "M141 111V92q-25-15-25-39 0-38 43-38 40 0 40 36l16 19h-17v26h-21v15",
          fill: "var(--scene-glow)",
        }),
      );
      line(
        "M141 111V92q-25-15-25-39 0-38 43-38 40 0 40 36l16 19h-17v26h-21v15M145 43q12-15 26 0m-32 11q20-15 40 0m-38 12q15-9 28 0",
      );
      circle(262, 53, 20, "#fffaf1");
      line("m252 53 7 7 14-15M249 92h27m-13-9v18");
    } else if (type === "energy") {
      circle(180, 30, 12, "#e8bd9c");
      line("M180 45v59m-30-47 30 16 30-16m-30 47-28 19m28-19 28 19");
      [
        "#ba705a",
        "#c98c46",
        "#d1b250",
        "#5c8e75",
        "#5d99a1",
        "#7177aa",
      ].forEach((c, i) => circle(180, 96 - i * 9, 4, c));
      line(
        "M139 34q-33 36 0 69m82-69q33 36 0 69M124 24q-47 46 0 91m112-91q47 46 0 91",
      );
    } else {
      circle(106, 39, 19, "var(--scene-glow)");
      s.append(
        shape("path", {
          d: "M0 139q100-87 198-16 90-63 162 6v11Z",
          fill: "var(--scene-glow)",
        }),
      );
      line(
        "M201 113V53m0 27q-38-3-34-34 35-1 34 34Zm0 17q38-3 34-34-35-1-34 34ZM61 91q20-14 40 0m163-32q12-10 24 0",
      );
    }
    wrap.append(s);
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
