const W = 88, H = 31;
const $ = (sel) => document.querySelector(sel);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULTS = {
  line1: "88x31",
  line2: ".siena.codes",
  size1: 9,
  size2: 9,
  bold1: false,
  bold2: true,
  font: "Verdana",
  textColor: "#2b3a12",
  effect: "glow",
  effectColor: "#ffffff",
  dx: 0,
  dy: 0,
  sharp: false,
  bg: "checker",
  c1: "#f8d98c",
  c2: "#a8d4e6",
  c3: "#ffffff",
  scale: 8,
  border: "bevel",
  borderColor: "#000000",
  icon: "none",
  iconColor: "#fff0aa",
  anim: "none",
};

const PRESETS = [
  { name: "Quilt", line1: "quarterinch", line2: ".siena.codes" },
  { name: "Record grooves", line1: "groover", line2: ".siena.codes", bg: "grooves", c1: "#111111", c2: "#2a2a2a", c3: "#3d3d3d", scale: 6, textColor: "#b6f23a", effect: "none" },
  { name: "Glitter", line1: "blinkie", line2: ".siena.codes", bg: "glitter", c1: "#fff0aa", c2: "#d2f5fb", c3: "#22bfd8", textColor: "#05506e", effect: "none", anim: "twinkle" },
  { name: "Ice", line1: "austral", line2: ".siena.codes", bg: "gradient", c1: "#ffffff", c2: "#8fd6ff", c3: "#2b7bd1", textColor: "#062a54", effect: "none", icon: "sparkle", iconColor: "#2b7bd1" },
  { name: "Lilac", line1: "dollz", line2: ".siena.codes", bg: "gradient", c1: "#e4cfff", c2: "#c49dff", c3: "#a56bff", textColor: "#2a0a5c", effect: "none", anim: "shine" },
  { name: "Pinwheel", line1: "made with", line2: "love", bg: "pinwheel", c1: "#ff9ec0", c2: "#ffffff", scale: 5, textColor: "#7a0f3a", effect: "outline", effectColor: "#ffffff", icon: "heart", iconColor: "#ff4f8b" },
  { name: "Night sky", line1: "best viewed", line2: "at night", bg: "stars", c1: "#0b1440", c2: "#fff0aa", c3: "#d2f5fb", textColor: "#ffffff", effect: "shadow", effectColor: "#000000", icon: "star", iconColor: "#fff0aa", anim: "twinkle" },
  { name: "Construction", line1: "under", line2: "construction", bg: "stripes", c1: "#111111", c2: "#ffd400", scale: 4, textColor: "#000000", effect: "outline", effectColor: "#ffffff", anim: "blink", size2: 8 },
];

const BACKGROUNDS = {
  solid: { colors: ["Color"] },
  gradient: { colors: ["Top", "Middle", "Bottom"] },
  checker: { colors: ["Square 1", "Square 2"], scale: true },
  pinwheel: { colors: ["Blades", "Ground"], scale: true },
  stripes: { colors: ["Stripe 1", "Stripe 2"], scale: true },
  grooves: { colors: ["Record", "Groove", "Shine"], scale: true },
  glitter: { colors: ["Start", "Middle", "End"] },
  stars: { colors: ["Sky", "Big stars", "Small stars"] },
};

const ANIMS = {
  none: { frames: 1, delay: 0, still: 0 },
  blink: { frames: 2, delay: 60, still: 0 },
  twinkle: { frames: 8, delay: 12, still: 2 },
  shine: { frames: 22, delay: 5, still: 21 },
};

const ICONS = {
  star: [
    "....o....",
    "...oxo...",
    "oooxwxooo",
    "oxxxxxxxo",
    ".oxxxxxo.",
    "..oxxxo..",
    ".oxxoxxo.",
    ".oxo.oxo.",
    ".oo...oo.",
  ],
  heart: [
    ".ooo.ooo.",
    "oxwxoxxxo",
    "oxwxxxxxo",
    "oxxxxxxxo",
    ".oxxxxxo.",
    "..oxxxo..",
    "...oxo...",
    "....o....",
  ],
  sparkle: [
    "....x....",
    "....x....",
    "...xwx...",
    "..xwwwx..",
    "xxwwwwwxx",
    "..xwwwx..",
    "...xwx...",
    "....x....",
    "....x....",
  ],
};
const ICON_W = 9;

function rand(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(seed, n, minGap) {
  const r = rand(seed), out = [];
  for (let tries = 0; out.length < n && tries < 500; tries++) {
    const p = [2 + Math.floor(r() * (W - 4)), 2 + Math.floor(r() * (H - 4))];
    if (out.every((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) >= minGap)) out.push(p);
  }
  return out;
}

const BIG_STARS = scatter(7, 7, 14);
const SMALL_STARS = scatter(31, 22, 5);
const TWINKLES = scatter(88, 7, 16).map((p, i) => ({ x: p[0], y: p[1], phase: (i * 3) % 8 }));

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const ramp = (a, b, c, t) => (t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2));
const WHITE = [255, 255, 255];

function pinwheel(x, y, s) {
  const n = s * 2;
  let bx = x % n, by = y % n;
  while (bx >= s || by >= s) [bx, by] = [by, n - 1 - bx];
  return by < bx;
}

function blend(d, x, y, col, t) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = (y * W + x) * 4;
  for (let i = 0; i < 3; i++) d[p + i] = Math.round(d[p + i] + (col[i] - d[p + i]) * t);
}

function plus(d, x, y, col, arm) {
  blend(d, x, y, col, 1);
  for (let k = 1; k <= arm; k++) {
    const t = k === arm && arm > 1 ? 0.5 : 0.85;
    blend(d, x + k, y, col, t);
    blend(d, x - k, y, col, t);
    blend(d, x, y + k, col, t);
    blend(d, x, y - k, col, t);
  }
}

function paintBackground(d, S) {
  const [a, b, c] = [S.c1, S.c2, S.c3].map(rgb);
  const s = S.scale;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let col;
      switch (S.bg) {
        case "gradient": col = ramp(a, b, c, y / (H - 1)); break;
        case "checker": col = (Math.floor(x / s) + Math.floor(y / s)) % 2 ? a : b; break;
        case "pinwheel": col = pinwheel(x, y, s) ? a : b; break;
        case "stripes": col = Math.floor((x + y) / s) % 2 ? b : a; break;
        case "grooves": col = Math.floor(x / s) % 2 ? (x % s === 0 ? c : b) : a; break;
        case "glitter": col = ramp(a, b, c, (x / (W - 1) + y / (H - 1)) / 2); break;
        default: col = a;
      }
      const p = (y * W + x) * 4;
      d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
    }
  }
  if (S.bg === "glitter") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((x % 9 === 2 && y % 9 === 3) || (x % 13 === 9 && y % 13 === 8)) {
          blend(d, x, y, WHITE, 1);
          blend(d, x + 1, y, WHITE, 0.45);
          blend(d, x - 1, y, WHITE, 0.45);
          blend(d, x, y + 1, WHITE, 0.45);
          blend(d, x, y - 1, WHITE, 0.45);
        }
      }
    }
  }
  if (S.bg === "stars") {
    for (const [x, y] of SMALL_STARS) blend(d, x, y, c, 1);
    for (const [x, y] of BIG_STARS) plus(d, x, y, b, 2);
  }
}

function inset(S) {
  return { none: 1, bevel: 2, double: 3 }[S.border];
}

function drawIcon(ctx, S, left) {
  const rows = ICONS[S.icon];
  if (!rows) return;
  const top = Math.floor((H - rows.length) / 2);
  const colors = { o: S.borderColor, x: S.iconColor, w: "#ffffff" };
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!colors[ch]) return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(left + x, top + y, 1, 1);
    })
  );
}

const layer = document.createElement("canvas");
layer.width = W;
layer.height = H;
const lctx = layer.getContext("2d", { willReadFrequently: true });

const OUTLINE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function drawText(S, frame, box) {
  lctx.clearRect(0, 0, W, H);
  const lines = [
    { text: S.line1, size: S.size1, bold: S.bold1 },
    { text: S.line2, size: S.size2, bold: S.bold2 },
  ].filter((l) => l.text.trim());
  if (!lines.length) return;
  const total = lines.reduce((sum, l) => sum + l.size + 2, -2);
  const cx = Math.round((box.left + box.right) / 2 + S.dx);
  const maxW = Math.max(4, box.right - box.left);
  let y = (H - total) / 2 + S.dy;
  lctx.textAlign = "center";
  lctx.textBaseline = "middle";
  lines.forEach((l, i) => {
    const mid = Math.round(y + l.size / 2);
    y += l.size + 2;
    if (S.anim === "blink" && frame === 1 && i === lines.length - 1 && lines.length > 1) return;
    lctx.font = `${l.bold ? "bold " : ""}${l.size}px "${S.font}", sans-serif`;
    if (S.effect === "outline") {
      lctx.fillStyle = S.effectColor;
      for (const [ox, oy] of OUTLINE) lctx.fillText(l.text, cx + ox, mid + oy, maxW);
    } else if (S.effect === "shadow") {
      lctx.fillStyle = S.effectColor;
      lctx.fillText(l.text, cx + 1, mid + 1, maxW);
    } else if (S.effect === "glow") {
      lctx.shadowColor = S.effectColor;
      lctx.shadowBlur = 3;
      lctx.fillStyle = S.textColor;
      lctx.fillText(l.text, cx, mid, maxW);
      lctx.fillText(l.text, cx, mid, maxW);
      lctx.shadowBlur = 0;
      lctx.shadowColor = "transparent";
    }
    lctx.fillStyle = S.textColor;
    lctx.fillText(l.text, cx, mid, maxW);
  });
  if (S.sharp) {
    const img = lctx.getImageData(0, 0, W, H);
    for (let p = 3; p < img.data.length; p += 4) img.data[p] = img.data[p] >= 110 ? 255 : 0;
    lctx.putImageData(img, 0, 0);
  }
}

function overlay(d, S, frame, edge) {
  if (S.anim === "twinkle") {
    const ink = lctx.getImageData(0, 0, W, H).data;
    const under = d.slice();
    for (const t of TWINKLES) {
      const k = (frame + t.phase) % 8;
      if (k === 0 || k === 4) blend(d, t.x, t.y, WHITE, 1);
      else if (k === 1 || k === 3) plus(d, t.x, t.y, WHITE, 1);
      else if (k === 2) plus(d, t.x, t.y, WHITE, 2);
    }
    for (let p = 0; p < d.length; p += 4) {
      if (ink[p + 3] > 40) { d[p] = under[p]; d[p + 1] = under[p + 1]; d[p + 2] = under[p + 2]; }
    }
  }
  if (S.anim === "shine" && frame < 14) {
    const pos = -18 + frame * 9;
    for (let y = edge; y < H - edge; y++) {
      for (let x = edge; x < W - edge; x++) {
        const dist = Math.abs(x - y * 0.6 - pos);
        if (dist < 2) blend(d, x, y, WHITE, 0.6);
        else if (dist < 3.5) blend(d, x, y, WHITE, 0.25);
      }
    }
  }
}

function drawBorder(ctx, S) {
  if (S.border === "none") return;
  const frame = (i) => {
    ctx.fillRect(i, i, W - i * 2, 1);
    ctx.fillRect(i, H - 1 - i, W - i * 2, 1);
    ctx.fillRect(i, i + 1, 1, H - 2 - i * 2);
    ctx.fillRect(W - 1 - i, i + 1, 1, H - 2 - i * 2);
  };
  ctx.fillStyle = S.borderColor;
  frame(0);
  if (S.border === "double") {
    frame(2);
    return;
  }
  ctx.fillStyle = "rgba(255,255,255,.6)";
  ctx.fillRect(1, 1, W - 3, 1);
  ctx.fillRect(1, 2, 1, H - 4);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(1, H - 2, W - 2, 1);
  ctx.fillRect(W - 2, 1, 1, H - 3);
}

function render(ctx, S, frame) {
  const img = ctx.createImageData(W, H);
  paintBackground(img.data, S);
  ctx.putImageData(img, 0, 0);
  const edge = inset(S);
  let left = edge + 1;
  if (ICONS[S.icon]) {
    drawIcon(ctx, S, edge + 2);
    left = edge + 2 + ICON_W + 1;
  }
  drawText(S, frame, { left, right: W - edge - 1 });
  ctx.drawImage(layer, 0, 0);
  if (S.anim === "twinkle" || S.anim === "shine") {
    const top = ctx.getImageData(0, 0, W, H);
    overlay(top.data, S, frame, edge);
    ctx.putImageData(top, 0, 0);
  }
  drawBorder(ctx, S);
}

const form = $("#controls");
const big = $("#big");
const bctx = big.getContext("2d", { willReadFrequently: true });
const sctx = $("#small").getContext("2d");
const work = document.createElement("canvas");
work.width = W;
work.height = H;
const wctx = work.getContext("2d", { willReadFrequently: true });

let S = { ...DEFAULTS };
let playing = !reduceMotion;
let frame = 0;
let timer = 0;

function readControls() {
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "radio") { if (el.checked) S[el.name] = el.value; }
    else if (el.type === "checkbox") S[el.name] = el.checked;
    else if (el.type === "number" || el.type === "range") {
      const v = Number(el.value);
      if (el.value !== "" && Number.isFinite(v)) S[el.name] = Math.min(Number(el.max), Math.max(Number(el.min), Math.round(v)));
    } else S[el.name] = el.value;
  }
}

function writeControls() {
  for (const el of form.elements) {
    if (!el.name || !(el.name in S)) continue;
    if (el.type === "radio") el.checked = el.value === S[el.name];
    else if (el.type === "checkbox") el.checked = Boolean(S[el.name]);
    else el.value = S[el.name];
  }
}

function syncUi() {
  const bg = BACKGROUNDS[S.bg];
  document.querySelectorAll("[data-color]").forEach((row) => {
    const i = Number(row.dataset.color);
    row.hidden = i >= bg.colors.length;
    row.querySelector("span").textContent = bg.colors[i] || "";
  });
  $("#scale-row").hidden = !bg.scale;
  $("#effect-color").hidden = S.effect === "none";
  $("#border-color").hidden = S.border === "none" && S.icon !== "star" && S.icon !== "heart";
  $("#icon-color").hidden = S.icon === "none";
  const animated = S.anim !== "none";
  $("#gif").disabled = !animated;
  $("#play").hidden = !animated;
  $("#play").textContent = playing ? "Pause" : "Play";
  $("#play").setAttribute("aria-pressed", String(!playing));
  $("#save-note").textContent = animated
    ? "Save GIF keeps the animation. Save PNG saves one still frame."
    : "Pick an animation to save a GIF.";
}

function altText() {
  return $("#alt").value.trim() || [S.line1, S.line2].map((t) => t.trim()).filter(Boolean).join(" ") || "88x31 button";
}

function fileName(ext) {
  const slug = `${S.line1} ${S.line2}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${slug || "button"}.${ext}`;
}

const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function updateCode() {
  const href = $("#href").value.trim() || "https://example.com";
  const src = fileName(S.anim === "none" ? "png" : "gif");
  $("#code").value = `<a href="${attr(href)}"><img src="${attr(src)}" width="88" height="31" alt="${attr(altText())}"></a>`;
  $("#alt").placeholder = altText();
  $("#copied").textContent = "";
}

function show(f) {
  render(bctx, S, f);
  sctx.clearRect(0, 0, W, H);
  sctx.drawImage(big, 0, 0);
}

function tick() {
  const a = ANIMS[S.anim];
  frame = (frame + 1) % a.frames;
  show(frame);
  timer = setTimeout(tick, a.delay * 10);
}

function draw() {
  clearTimeout(timer);
  const a = ANIMS[S.anim];
  big.setAttribute("aria-label", `Button preview: ${altText()}`);
  if (a.frames > 1 && playing) {
    frame = 0;
    show(frame);
    timer = setTimeout(tick, a.delay * 10);
  } else {
    show(a.still);
  }
}

function update() {
  readControls();
  syncUi();
  updateCode();
  draw();
}

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function savePng() {
  const name = fileName("png");
  render(wctx, S, ANIMS[S.anim].still);
  work.toBlob((blob) => save(blob, name), "image/png");
}

function saveGif() {
  const a = ANIMS[S.anim];
  const frames = [];
  for (let f = 0; f < a.frames; f++) {
    render(wctx, S, f);
    frames.push(wctx.getImageData(0, 0, W, H).data);
  }
  save(new Blob([encodeGif(frames, W, H, a.delay)], { type: "image/gif" }), fileName("gif"));
}

async function copyCode() {
  const box = $("#code");
  try {
    await navigator.clipboard.writeText(box.value);
    $("#copied").textContent = "Copied.";
  } catch {
    box.focus();
    box.select();
    $("#copied").textContent = "Press Ctrl+C or Cmd+C to copy.";
  }
}

function loadPreset(p) {
  const keep = $("#keep-text").checked ? { line1: S.line1, line2: S.line2 } : {};
  S = { ...DEFAULTS, ...p, ...keep };
  delete S.name;
  writeControls();
  syncUi();
  updateCode();
  draw();
}

function buildPresets() {
  const list = $("#presets");
  for (const p of PRESETS) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset";
    btn.setAttribute("aria-label", `Use the ${p.name} example`);
    btn.title = p.name;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const state = { ...DEFAULTS, ...p };
    render(cv.getContext("2d", { willReadFrequently: true }), state, ANIMS[state.anim].still);
    btn.append(cv);
    btn.addEventListener("click", () => loadPreset(p));
    li.append(btn);
    list.append(li);
  }
}

form.addEventListener("input", update);
form.addEventListener("change", update);
form.addEventListener("submit", (e) => e.preventDefault());
$("#href").addEventListener("input", updateCode);
$("#alt").addEventListener("input", () => { updateCode(); big.setAttribute("aria-label", `Button preview: ${altText()}`); });
$("#png").addEventListener("click", savePng);
$("#gif").addEventListener("click", saveGif);
$("#copy").addEventListener("click", copyCode);
$("#play").addEventListener("click", () => {
  playing = !playing;
  syncUi();
  draw();
});

buildPresets();
writeControls();
syncUi();
updateCode();
draw();
