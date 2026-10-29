// 電機系學程島 — 場景渲染與互動邏輯
(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK = "http://www.w3.org/1999/xlink";

  const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));
  const COLORS = {
    electronics: "#22d3ee",
    electromagnetics: "#fbbf24",
    communications: "#f472b6",
    plaza: "#a78bfa",
  };

  const VIEW = { w: 1440, h: 810, sea: 560 };

  // 島嶼佈局（側視）：cx 中心、top 島頂、w 寬度
  const LAYOUT = {
    electronics: { cx: 215, top: 468, w: 320 },
    plaza: { cx: 590, top: 496, w: 210 },
    electromagnetics: { cx: 940, top: 458, w: 300 },
    communications: { cx: 1270, top: 478, w: 270 },
  };

  // 學生站位（腳底座標）
  const STUDENT_POS = {
    s1: { x: 290, y: 483 },
    s2: { x: 1005, y: 472 },
    s3: { x: 1330, y: 492 },
  };

  const PUMA_POS = { x: 625, y: 496, h: 175 };

  const svg = document.getElementById("scene-svg");
  const panel = document.getElementById("panel");
  const panelBody = document.getElementById("panel-body");
  const overlay = document.getElementById("overlay");

  // ---------- SVG 工具 ----------
  function el(tag, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  }
  const append = (node, ...children) => {
    children.forEach((c) => node.appendChild(c));
    return node;
  };

  function grad(id, stops, vertical = true) {
    const g = el("linearGradient", {
      id,
      x1: 0,
      y1: 0,
      x2: vertical ? 0 : 1,
      y2: vertical ? 1 : 0,
    });
    stops.forEach(([o, c]) => g.appendChild(el("stop", { offset: o, "stop-color": c })));
    return g;
  }

  function glowFilter(id, std) {
    const f = el("filter", { id, x: "-60%", y: "-60%", width: "220%", height: "220%" });
    f.appendChild(el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: std, result: "b" }));
    const m = el("feMerge");
    m.appendChild(el("feMergeNode", { in: "b" }));
    m.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
    f.appendChild(m);
    return f;
  }

  // 島嶼輪廓（側視山丘）
  function hillPath({ cx, top, w }) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    return [
      `M ${x0},572`,
      `C ${x0 + w * 0.1},572 ${x0 + w * 0.2},${top + 46} ${x0 + w * 0.34},${top + 10}`,
      `C ${x0 + w * 0.44},${top + 1} ${x0 + w * 0.56},${top + 1} ${x0 + w * 0.66},${top + 10}`,
      `C ${x0 + w * 0.8},${top + 46} ${x0 + w * 0.9},572 ${x1},572 Z`,
    ].join(" ");
  }

  // 島頂霓虹邊
  function rimPath({ cx, top, w }) {
    const x0 = cx - w / 2;
    return [
      `M ${x0 + w * 0.3},${top + 14}`,
      `C ${x0 + w * 0.4},${top} ${x0 + w * 0.6},${top} ${x0 + w * 0.7},${top + 14}`,
    ].join(" ");
  }

  function wavePath(y, amp, step) {
    let d = `M -60,${y}`;
    for (let x = -60; x < 1520; x += step) d += ` q ${step / 2},${-amp} ${step},0`;
    return d;
  }

  function nameplate(cx, y, main, sub) {
    const g = el("g", { class: "nameplate" });
    g.appendChild(el("rect", { x: cx - 78, y, width: 156, height: 40, rx: 10 }));
    g.appendChild(el("text", { x: cx, y: y + 18, "text-anchor": "middle" }, main));
    g.appendChild(el("text", { x: cx, y: y + 33, "text-anchor": "middle", class: "plate-sub" }, sub));
    return g;
  }

  // ---------- 場景元素 ----------
  function buildSky() {
    const g = el("g");
    g.appendChild(el("rect", { x: 0, y: 0, width: VIEW.w, height: VIEW.sea, fill: "url(#skyGrad)" }));
    // 月亮
    g.appendChild(el("circle", { cx: 1350, cy: 92, r: 30, fill: "#dceaff", opacity: 0.95, filter: "url(#glowBig)" }));
    g.appendChild(el("circle", { cx: 1340, cy: 84, r: 5, fill: "#b9d4f2", opacity: 0.5 }));
    g.appendChild(el("circle", { cx: 1360, cy: 102, r: 3.5, fill: "#b9d4f2", opacity: 0.4 }));
    // 星星
    for (let i = 0; i < 46; i++) {
      const x = 30 + Math.random() * 1380;
      const y = 25 + Math.random() * 320;
      const r = 0.7 + Math.random() * 1.1;
      const star = el("circle", { cx: x, cy: y, r, fill: "#cfe9ff", class: "star" });
      star.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
      star.style.opacity = (0.3 + Math.random() * 0.5).toFixed(2);
      g.appendChild(star);
    }
    return g;
  }

  function buildSea() {
    const g = el("g");
    g.appendChild(el("rect", { x: 0, y: VIEW.sea, width: VIEW.w, height: VIEW.h - VIEW.sea, fill: "url(#seaGrad)" }));
    g.appendChild(el("line", { x1: 0, y1: VIEW.sea, x2: VIEW.w, y2: VIEW.sea, stroke: "rgba(56,189,248,0.3)", "stroke-width": 1.5 }));
    const waves = [
      { y: 592, amp: 6, step: 90, op: 0.18, dur: "8s", delay: "0s" },
      { y: 632, amp: 8, step: 120, op: 0.12, dur: "10s", delay: "-2s" },
      { y: 682, amp: 10, step: 150, op: 0.08, dur: "12s", delay: "-4s" },
      { y: 742, amp: 12, step: 180, op: 0.06, dur: "14s", delay: "-6s" },
    ];
    waves.forEach((wv) => {
      const p = el("path", {
        d: wavePath(wv.y, wv.amp, wv.step),
        stroke: "#7dd3fc",
        "stroke-width": 1.5,
        fill: "none",
        opacity: wv.op,
        class: "wave",
      });
      p.style.animationDuration = wv.dur;
      p.style.animationDelay = wv.delay;
      g.appendChild(p);
    });
    return g;
  }

  function buildRoute() {
    const g = el("g", { class: "routes" });
    [
      "M 365,588 L 495,588",
      "M 685,588 L 800,588",
      "M 1080,588 L 1145,588",
    ].forEach((d) => g.appendChild(el("path", { d, class: "route" })));
    return g;
  }

  // ---------- 建築 ----------
  function buildElectronicsBuilding() {
    const C = COLORS.electronics;
    const g = el("g", { class: "building" });
    g.appendChild(el("rect", { x: 105, y: 398, width: 150, height: 70, fill: "#0a1c30", stroke: C, "stroke-width": 1.5 }));
    g.appendChild(el("rect", { x: 99, y: 390, width: 162, height: 10, rx: 3, fill: "#0a1c30", stroke: C, "stroke-width": 1.5 }));
    [120, 161, 202].forEach((x) =>
      g.appendChild(el("rect", { x, y: 415, width: 28, height: 20, rx: 2, fill: C, opacity: 0.75 }))
    );
    g.appendChild(el("rect", { x: 165, y: 438, width: 26, height: 30, rx: 2, fill: "#06121f", stroke: C, "stroke-width": 1.2 }));
    g.appendChild(el("line", { x1: 240, y1: 390, x2: 240, y2: 352, stroke: C, "stroke-width": 2 }));
    g.appendChild(el("circle", { cx: 240, cy: 348, r: 4, fill: C }));
    return g;
  }

  function buildElectromagneticsBuilding() {
    const C = COLORS.electromagnetics;
    const g = el("g", { class: "building" });
    g.appendChild(el("rect", { x: 866, y: 452, width: 68, height: 8, rx: 3, fill: "#0a1c30", stroke: C, "stroke-width": 1.2 }));
    g.appendChild(el("line", { x1: 872, y1: 458, x2: 900, y2: 334, stroke: C, "stroke-width": 3 }));
    g.appendChild(el("line", { x1: 928, y1: 458, x2: 900, y2: 334, stroke: C, "stroke-width": 3 }));
    // 橫撐
    [
      [878.3, 430, 921.7, 430],
      [884.9, 400, 915.1, 400],
      [891.5, 370, 908.5, 370],
      [878.3, 430, 915.1, 400],
      [921.7, 430, 884.9, 400],
      [884.9, 400, 908.5, 370],
      [915.1, 400, 891.5, 370],
    ].forEach(([x1, y1, x2, y2]) =>
      g.appendChild(el("line", { x1, y1, x2, y2, stroke: C, "stroke-width": 1.5, opacity: 0.8 }))
    );
    g.appendChild(el("circle", { cx: 900, cy: 328, r: 6, fill: C }));
    // 電波
    g.appendChild(el("path", { d: "M 887,316 A 16 16 0 0 0 887,340", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.7 }));
    g.appendChild(el("path", { d: "M 879,310 A 26 26 0 0 0 879,346", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.5 }));
    g.appendChild(el("path", { d: "M 913,316 A 16 16 0 0 1 913,340", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.7 }));
    g.appendChild(el("path", { d: "M 921,310 A 26 26 0 0 1 921,346", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.5 }));
    return g;
  }

  function buildCommunicationsBuilding() {
    const C = COLORS.communications;
    const g = el("g", { class: "building" });
    g.appendChild(el("rect", { x: 1214, y: 472, width: 32, height: 8, rx: 3, fill: "#0a1c30", stroke: C, "stroke-width": 1.2 }));
    g.appendChild(el("line", { x1: 1230, y1: 478, x2: 1230, y2: 444, stroke: C, "stroke-width": 3 }));
    g.appendChild(el("ellipse", { cx: 1230, cy: 424, rx: 36, ry: 13, fill: "#0a1c30", stroke: C, "stroke-width": 2, transform: "rotate(-28 1230 424)" }));
    g.appendChild(el("line", { x1: 1230, y1: 424, x2: 1206, y2: 398, stroke: C, "stroke-width": 2 }));
    g.appendChild(el("circle", { cx: 1204, cy: 396, r: 3.5, fill: C }));
    // 訊號波
    g.appendChild(el("path", { d: "M 1184.7,390.8 A 20 20 0 0 1 1198.8,376.7", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.75 }));
    g.appendChild(el("path", { d: "M 1171.2,387.2 A 34 34 0 0 1 1195.2,363.2", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.55 }));
    g.appendChild(el("path", { d: "M 1157.6,383.6 A 48 48 0 0 1 1191.6,349.6", stroke: C, "stroke-width": 2, fill: "none", opacity: 0.4 }));
    return g;
  }

  function buildPlaza() {
    const L = LAYOUT.plaza;
    const V = COLORS.plaza;
    const g = el("g", { class: "island", "data-island": "plaza", style: `--c:${V}` });
    g.appendChild(el("path", { d: hillPath(L), fill: "url(#hillGrad)", class: "hill" }));
    // PUMA 辦公室
    g.appendChild(el("rect", { x: 490, y: 442, width: 76, height: 54, fill: "#0a1c30", stroke: V, "stroke-width": 1.5 }));
    g.appendChild(el("rect", { x: 485, y: 436, width: 86, height: 8, rx: 2, fill: "#0a1c30", stroke: V, "stroke-width": 1.5 }));
    g.appendChild(el("rect", { x: 498, y: 452, width: 18, height: 14, rx: 2, fill: V, opacity: 0.7 }));
    g.appendChild(el("rect", { x: 540, y: 452, width: 18, height: 14, rx: 2, fill: V, opacity: 0.7 }));
    g.appendChild(el("rect", { x: 517, y: 464, width: 20, height: 32, rx: 2, fill: "#06121f", stroke: V, "stroke-width": 1.2 }));
    g.appendChild(el("text", { x: 528, y: 429, "text-anchor": "middle", fill: V, "font-size": 12, "letter-spacing": 1 }, "PUMA 辦公室"));
    // 碼頭
    g.appendChild(el("line", { x1: 660, y1: 548, x2: 756, y2: 548, stroke: V, "stroke-width": 4, "stroke-linecap": "round" }));
    g.appendChild(el("line", { x1: 672, y1: 548, x2: 672, y2: 574, stroke: V, "stroke-width": 3 }));
    g.appendChild(el("line", { x1: 744, y1: 548, x2: 744, y2: 574, stroke: V, "stroke-width": 3 }));
    g.appendChild(el("path", { d: rimPath(L), class: "rim" }));
    return g;
  }

  function buildCourseIsland(id) {
    const c = COURSE_BY_ID[id];
    const L = LAYOUT[id];
    const g = el("g", { class: "island", "data-island": id, style: `--c:${COLORS[id]}` });
    g.appendChild(el("path", { d: hillPath(L), fill: "url(#hillGrad)", class: "hill" }));
    if (id === "electronics") g.appendChild(buildElectronicsBuilding());
    if (id === "electromagnetics") g.appendChild(buildElectromagneticsBuilding());
    if (id === "communications") g.appendChild(buildCommunicationsBuilding());
    g.appendChild(el("path", { d: rimPath(L), class: "rim" }));
    const npCenter = { electronics: 180, electromagnetics: 900, communications: 1230 }[id];
    const npY = { electronics: 296, electromagnetics: 236, communications: 300 }[id];
    g.appendChild(nameplate(npCenter, npY, c.name, `${YEAR_CN[c.year]} · ${c.credits} 學分`));
    return g;
  }

  // ---------- 角色 ----------
  function buildStudent(s) {
    const color = COLORS[s.island];
    const pos = STUDENT_POS[s.id];
    const g = el("g", {
      class: "student",
      "data-student": s.id,
      style: `--c:${color}`,
      transform: `translate(${pos.x} ${pos.y})`,
    });
    // 選取光環
    g.appendChild(el("ellipse", { cx: 0, cy: 0, rx: 26, ry: 7, class: "ring" }));
    // 腿
    g.appendChild(el("rect", { x: -11, y: -30, width: 9, height: 30, rx: 3.5, fill: "#16233c" }));
    g.appendChild(el("rect", { x: 2, y: -30, width: 9, height: 30, rx: 3.5, fill: "#16233c" }));
    g.appendChild(el("ellipse", { cx: -6.5, cy: -1.5, rx: 6, ry: 2.5, fill: "#0d1626" }));
    g.appendChild(el("ellipse", { cx: 6.5, cy: -1.5, rx: 6, ry: 2.5, fill: "#0d1626" }));
    // 身體
    g.appendChild(el("rect", { x: -13, y: -68, width: 26, height: 40, rx: 9, fill: color }));
    g.appendChild(el("rect", { x: -19, y: -64, width: 6, height: 26, rx: 3, fill: color, opacity: 0.85 }));
    g.appendChild(el("rect", { x: 13, y: -64, width: 6, height: 26, rx: 3, fill: color, opacity: 0.85 }));
    // 頭
    g.appendChild(el("circle", { cx: 0, cy: -80, r: 12, fill: "#f2d3b3" }));
    if (s.gender === "female") {
      g.appendChild(el("path", { d: "M -12,-80 A 12 12 0 0 1 12,-80 L 12,-77 L -12,-77 Z", fill: "#3b2f2a" }));
      g.appendChild(el("path", { d: "M -12,-78 Q -16,-64 -12,-54 L -8,-57 Q -11,-66 -9,-77 Z", fill: "#3b2f2a" }));
      g.appendChild(el("path", { d: "M 12,-78 Q 16,-64 12,-54 L 8,-57 Q 11,-66 9,-77 Z", fill: "#3b2f2a" }));
    } else {
      g.appendChild(el("path", { d: "M -12,-80 A 12 12 0 0 1 12,-80 L 12,-77 L -12,-77 Z", fill: "#1f2937" }));
    }
    // 年份胸牌
    g.appendChild(el("rect", { x: -10, y: -60, width: 20, height: 13, rx: 3, fill: "#ffffff", opacity: 0.92 }));
    g.appendChild(el("text", { x: 0, y: -50, "text-anchor": "middle", class: "badge-text" }, YEAR_CN[s.year]));
    return g;
  }

  function buildPuma() {
    const g = el("g", { class: "puma", "data-target": "review" });
    const w = PUMA_POS.h * (896 / 1200);
    const img = el("image", {
      x: PUMA_POS.x - w / 2,
      y: PUMA_POS.y - PUMA_POS.h,
      width: w,
      height: PUMA_POS.h,
      preserveAspectRatio: "xMidYMax meet",
    });
    img.setAttribute("href", "assets/puma.jpg");
    img.setAttributeNS(XLINK, "xlink:href", "assets/puma.jpg");
    g.appendChild(img);
    // 名牌
    const plate = el("g", { class: "puma-plate" });
    plate.appendChild(el("rect", { x: 570, y: 499, width: 110, height: 20, rx: 10 }));
    plate.appendChild(el("text", { x: 625, y: 513, "text-anchor": "middle" }, "系主任 PUMA"));
    g.appendChild(plate);
    return g;
  }

  // ---------- 對話氣泡 ----------
  function wrap(str, max = 13) {
    const out = [];
    let cur = "";
    for (const ch of str) {
      cur += ch;
      if (cur.length >= max) {
        out.push(cur);
        cur = "";
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  function setBubble(lines) {
    const g = document.getElementById("bubble");
    g.textContent = "";
    const bw = 300;
    const pad = 14;
    const lh = 24;
    const bh = pad * 2 + lines.length * lh - 8;
    const bx = 625 - bw / 2;
    const by = 302 - bh;
    g.appendChild(el("rect", { x: bx, y: by, width: bw, height: bh, rx: 12 }));
    g.appendChild(el("path", { d: `M ${625 - 13},${by + bh - 1} L ${625 + 13},${by + bh - 1} L 625,${by + bh + 16} Z` }));
    lines.forEach((ln, i) => {
      const t = el("text", { x: 625, y: by + pad + 14 + i * lh, "text-anchor": "middle" });
      if (ln.cls) t.setAttribute("class", ln.cls);
      t.textContent = ln.text;
      g.appendChild(t);
    });
    g.classList.add("show");
  }

  // ---------- 面板 ----------
  function openPanel(color) {
    panel.style.setProperty("--c", color);
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }

  function renderStudentPanel(s, course) {
    const color = COLORS[s.island];
    panelBody.innerHTML = `
      <div class="p-head" style="--c:${color}">
        <div class="p-kicker">${YEAR_CN[s.year]} · ${course.name}島</div>
        <h2>${course.name}</h2>
      </div>
      <div class="p-quote" style="--c:${color}">「${s.line}」</div>
      <div class="p-meta">
        <div><span>學分</span><span>${course.credits} 學分</span></div>
        <div><span>開課年份</span><span>${YEAR_CN[course.year]}</span></div>
        <div><span>先修課程</span><span>${course.prerequisites.join("、")}</span></div>
        <div><span>學完後接</span><span>${course.next.join("、")}</span></div>
      </div>
      <button class="p-btn" style="--c:${color}" data-action="course" data-id="${course.id}">查看課程卡 →</button>
    `;
  }

  function renderCoursePanel(c) {
    const color = COLORS[c.id];
    panelBody.innerHTML = `
      <div class="p-head" style="--c:${color}">
        <div class="p-kicker">${YEAR_CN[c.year]} · ${c.credits} 學分</div>
        <h2>${c.name}</h2>
      </div>
      <p class="p-summary">${c.summary}</p>
      <h3 style="--c:${color}">核心主題</h3>
      <ul class="topics" style="--c:${color}">
        ${c.topics.map((t) => `<li>${t}</li>`).join("")}
      </ul>
      <h3 style="--c:${color}">先修課程</h3>
      <p class="p-text">${c.prerequisites.join("、")}</p>
      <h3 style="--c:${color}">學完後接什麼</h3>
      <p class="p-text">${c.next.join("、")}</p>
      <div class="advice" style="--c:${color}">
        <span>學程規劃建議</span>
        <p>${c.advice}</p>
      </div>
    `;
  }

  function renderReviewPanel() {
    const chips = REVIEW.path
      .map((id) => `<span class="chip" style="--c:${COLORS[id]}">${COURSE_BY_ID[id].name}</span>`)
      .join('<span class="arrow">→</span>');
    panelBody.innerHTML = `
      <div class="p-head" style="--c:${COLORS.plaza}">
        <div class="p-kicker">${REVIEW.title}</div>
        <h2>從地基到專題</h2>
      </div>
      <div class="mini-map">${chips}</div>
      <ul class="timeline">
        ${REVIEW.timeline
          .map(
            (t) => `
          <li>
            <span class="t-year">${YEAR_CN[t.year]}</span>
            <div><b>${t.title}</b><p>${t.detail}</p></div>
          </li>`
          )
          .join("")}
      </ul>
      <div class="advice" style="--c:${COLORS.plaza}">
        <span>PUMA 總結</span>
        <p>${PUMA.review}</p>
      </div>
    `;
  }

  // ---------- 互動 ----------
  let state = { mode: null, id: null };

  function clearSceneState() {
    document.querySelectorAll(".island.selected, .student.selected, .puma.selected").forEach((n) => n.classList.remove("selected"));
    document.querySelectorAll(".island.lit").forEach((n) => n.classList.remove("lit"));
    document.querySelectorAll(".route.flow").forEach((n) => n.classList.remove("flow"));
  }

  function closeAll() {
    state = { mode: null, id: null };
    clearSceneState();
    closePanel();
    setBubble(wrap(PUMA.greeting).map((t) => ({ text: t })));
  }

  function selectStudent(id) {
    const s = STUDENTS.find((x) => x.id === id);
    if (!s) return;
    const course = COURSE_BY_ID[s.island];
    state = { mode: "student", id };
    clearSceneState();
    document.querySelector(`.student[data-student="${id}"]`).classList.add("selected");
    document.querySelector(`.island[data-island="${s.island}"]`).classList.add("selected");
    const rest = s.pumaLine.replace(PUMA.catchphrase, "").trim();
    setBubble([{ text: PUMA.catchphrase, cls: "bubble-catch" }, ...wrap(rest).map((t) => ({ text: t }))]);
    renderStudentPanel(s, course);
    openPanel(COLORS[s.island]);
  }

  function selectCourse(id) {
    const c = COURSE_BY_ID[id];
    if (!c) return;
    state = { mode: "course", id };
    clearSceneState();
    document.querySelector(`.island[data-island="${id}"]`).classList.add("selected");
    setBubble(wrap(`「${c.name}」是${YEAR_CN[c.year]}的關鍵課程，課程卡在右邊面板。`).map((t) => ({ text: t })));
    renderCoursePanel(c);
    openPanel(COLORS[id]);
  }

  function selectReview() {
    state = { mode: "review", id: "review" };
    clearSceneState();
    document.querySelector(".puma").classList.add("selected");
    document.querySelectorAll(".route").forEach((n) => n.classList.add("flow"));
    // 三島依學習順序逐一點亮
    REVIEW.path.forEach((id, i) => {
      setTimeout(() => {
        document.querySelector(`.island[data-island="${id}"]`).classList.add("lit");
      }, 350 * i);
    });
    setBubble(wrap("四年總回顧——三島路線與大四專題，看右邊面板！").map((t) => ({ text: t })));
    renderReviewPanel();
    openPanel(COLORS.plaza);
  }

  function bindInteractions() {
    svg.addEventListener("click", (e) => {
      const studentEl = e.target.closest(".student");
      if (studentEl) {
        const id = studentEl.dataset.student;
        if (state.mode === "student" && state.id === id) closeAll();
        else selectStudent(id);
        return;
      }
      const pumaEl = e.target.closest(".puma");
      if (pumaEl) {
        if (state.mode === "review") closeAll();
        else selectReview();
        return;
      }
      const islandEl = e.target.closest(".island");
      if (islandEl) {
        const id = islandEl.dataset.island;
        if (id === "plaza") {
          if (state.mode === "review") closeAll();
          else selectReview();
          return;
        }
        if (state.mode === "course" && state.id === id) closeAll();
        else selectCourse(id);
        return;
      }
      // 點到非互動區域（天空／海面／氣泡等）＝跳出卡片
      if (state.mode) closeAll();
    });

    panelBody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "course") selectCourse(btn.dataset.id);
    });

    document.getElementById("panel-close").addEventListener("click", closeAll);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!overlay.classList.contains("hide")) {
          hideOverlay();
        } else if (state.mode) {
          closeAll();
        }
      }
    });
  }

  // ---------- Onboarding ----------
  function hideOverlay() {
    overlay.classList.add("hide");
    try {
      localStorage.setItem("eeIslandSeen", "1");
    } catch (_) {}
  }

  function initOverlay() {
    let seen = false;
    try {
      seen = !!localStorage.getItem("eeIslandSeen");
    } catch (_) {}
    if (seen) overlay.classList.add("hide");
    document.getElementById("overlay-btn").addEventListener("click", hideOverlay);
  }

  // ---------- 初始化 ----------
  function init() {
    const defs = el("defs");
    defs.appendChild(grad("skyGrad", [[0, "#071021"], [1, "#0b1e36"]]));
    defs.appendChild(grad("seaGrad", [[0, "#0a2440"], [1, "#020a14"]]));
    defs.appendChild(grad("hillGrad", [[0, "#112741"], [1, "#040c18"]]));
    defs.appendChild(glowFilter("glow", 3));
    defs.appendChild(glowFilter("glowBig", 6));
    svg.appendChild(defs);

    svg.appendChild(buildSky());
    svg.appendChild(buildSea());
    svg.appendChild(buildRoute());
    svg.appendChild(buildCourseIsland("electronics"));
    svg.appendChild(buildPlaza());
    svg.appendChild(buildCourseIsland("electromagnetics"));
    svg.appendChild(buildCourseIsland("communications"));
    STUDENTS.forEach((s) => svg.appendChild(buildStudent(s)));
    svg.appendChild(buildPuma());
    svg.appendChild(el("g", { class: "bubble", id: "bubble" }));

    setBubble(wrap(PUMA.greeting).map((t) => ({ text: t })));
    bindInteractions();
    initOverlay();
  }

  init();
})();
