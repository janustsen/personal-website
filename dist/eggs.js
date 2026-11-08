// Small easter eggs in the line drawings: things to drag, tap and hover in each section drawing and the masthead portrait.
// Each drawing is wired once site.js has swapped in its inline SVG; without JavaScript the drawings stay plain images.
// Everything moves with smooth ease-out or ease-in-out curves (no springs or bounces). Reduced motion keeps every egg
// but drops the movement: things appear and disappear instead of sliding, and dragged parts return at once.
(() => {
const NS = 'http://www.w3.org/2000/svg';
const still = matchMedia('(prefers-reduced-motion: reduce)');
const out = 'cubic-bezier(.33,1,.68,1)', inout = 'cubic-bezier(.65,0,.35,1)';
const after = (ms, fn) => setTimeout(fn, ms);

// Movement only: skipped with reduced motion. A new movement on the same part replaces the old one.
function play(el, frames, opts) {
  if (still.matches) return null;
  el.getAnimations().forEach(a => a.cancel());
  return el.animate(frames, { duration: 600, easing: inout, ...opts });
}
const moving = el => el.getAnimations().some(a => a.playState === 'running');
// A swing out and straight back, around a pivot in drawing units.
function swing(el, [x, y], deg, ms = 1000) {
  el.style.transformOrigin = `${x}px ${y}px`;
  if (!moving(el)) play(el, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)` }, { transform: 'rotate(0deg)' }], { duration: ms });
}
const lift = (el, dy = -9, ms = 800) => moving(el) || play(el, [{ transform: 'translate(0px, 0px)' }, { transform: `translate(0px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }], { duration: ms });
// A flat flip about the part's own centre, as if it turned over.
function flip(el, [x, y], turns = 1) {
  el.style.transformOrigin = `${x}px ${y}px`;
  const frames = [{ transform: 'scaleX(1)' }];
  for (let i = 0; i < turns; i++) frames.push({ transform: 'scaleX(0.02)' }, { transform: `scaleX(${i % 2 ? 1 : -1})` });
  if (turns % 2) frames.push({ transform: 'scaleX(0.02)' }, { transform: 'scaleX(1)' });
  if (!moving(el)) play(el, frames, { duration: 450 * frames.length / 2, easing: 'ease-in-out' });
}

// New strokes: drawn in with motion, faded in without.
function ink(parent, d, width = 1.3, extra = {}) {
  const path = document.createElementNS(NS, 'path');
  for (const [k, v] of Object.entries({ d, fill: 'none', stroke: 'currentColor', 'stroke-width': width, pathLength: 1, class: 'egg-new', ...extra })) path.setAttribute(k, v);
  parent.append(path);
  return path;
}
function drawIn(el, ms = 500, delay = 0) {
  if (still.matches) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay, fill: 'backwards' });
  return el.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: ms, delay, easing: inout, fill: 'backwards' });
}
function fadeOut(el, ms = 400, delay = 0) {
  const a = el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: ms, delay, easing: out, fill: 'forwards' });
  a.finished.then(() => el.remove(), () => {});
  return a;
}
const circle = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
// Redraw existing strokes, left to right.
function redraw(group, ms = 900) {
  const paths = [...group.querySelectorAll('path:not(.ghost)')].sort((a, b) => a.getBBox().x - b.getBBox().x);
  if (still.matches || paths.some(moving)) return;
  paths.forEach((p, i) => p.animate([{ strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDasharray: '1 2', strokeDashoffset: 0 }],
    { duration: ms * 0.5, delay: (i / paths.length) * ms * 0.6, easing: inout, fill: 'backwards' }));
}

// Pick the strokes inside a rectangle of the drawing into their own group, with an invisible hit area over the rectangle.
// skip: stroke numbers (in file order) to leave out. top: lift the group above the rest of the drawing,
// over a white backing shape (back) so whatever it is dragged across stays hidden behind it.
function kit(svg) {
  const layer = svg.querySelector('g');
  const all = [...layer.querySelectorAll(':scope > path:not(.ghost)')];
  const boxes = new Map(all.map(p => [p, p.getBBox()]));
  return function part([x0, y0, x1, y1], { skip = [], top = false, back = '' } = {}) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'egg');
    if (back) ink(g, back, 0, { fill: '#fff', stroke: 'none', class: 'egg-new egg-back' });
    for (const [p, b] of boxes) {
      if (b.x < x0 || b.y < y0 || b.x + b.width > x1 || b.y + b.height > y1 || skip.includes(all.indexOf(p))) continue;
      boxes.delete(p);
      const ghost = p.previousElementSibling?.classList.contains('ghost') ? p.previousElementSibling : null;
      if (!g.parentNode && !top) (ghost || p).before(g);
      if (ghost) g.append(ghost);
      g.append(p);
    }
    if (!g.parentNode) layer.append(g);
    const hit = document.createElementNS(NS, 'rect');
    for (const [k, v] of Object.entries({ class: 'egg-hit', x: x0, y: y0, width: x1 - x0, height: y1 - y0 })) hit.setAttribute(k, v);
    g.append(hit);
    g.mid = [(x0 + x1) / 2, (y0 + y1) / 2];
    return g;
  };
}

// Pointer handling: a tap (pointer down and up without moving), an optional drag, and an optional mouse hover.
// On touch, a sideways drag holds the page still while a mostly vertical swipe scrolls as usual;
// two-way drags (game pieces) always hold it.
let held = null;
function guard(svg) {
  svg.addEventListener('touchmove', e => {
    if (!held) return;
    const t = e.touches[0];
    if (held.axis === 'x' && !held.locked) {
      if (Math.abs(t.clientY - held.y) > Math.abs(t.clientX - held.x)) { held = null; return; }
      held.locked = true;
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
}
function touch(g, { tap, drag, hover }) {
  g.classList.add(drag ? (drag.axis === 'x' ? 'egg-drag' : 'egg-drag2') : 'egg-tap');
  if (hover) g.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover(); });
  let start = null;
  g.addEventListener('pointerdown', e => {
    if (e.button) return;
    const k = 1 / (g.ownerSVGElement.getScreenCTM()?.a || 1);
    start = { x: e.clientX, y: e.clientY, k, moved: false };
    if (drag) {
      held = { axis: drag.axis, x: e.clientX, y: e.clientY };
      if (e.pointerType === 'mouse') e.preventDefault();
      g.setPointerCapture?.(e.pointerId);
    }
  });
  g.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    if (!start.moved && drag) { start.moved = true; g.classList.add('egg-grabbing'); }
    start.moved = true;
    drag?.move(dx * start.k, dy * start.k);
  });
  const end = e => {
    if (!start) return;
    const s = start;
    start = null; held = null;
    g.classList.remove('egg-grabbing');
    if (s.moved) drag?.end();
    else if (e.type === 'pointerup') tap?.();
  };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  g.addEventListener('lostpointercapture', end);
}
// Drag within limits (in drawing units). back: ease home on release; otherwise stay where dropped.
function slide(g, { x = [0, 0], y = [0, 0], back = true }) {
  let at = [0, 0], now = [0, 0];
  const set = ([a, b]) => { now = [a, b]; g.style.transform = `translate(${a}px, ${b}px)`; };
  const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  touch(g, { drag: {
    axis: y[0] === y[1] ? 'x' : 'xy',
    move(dx, dy) { g.getAnimations().forEach(a => a.cancel()); set([clamp(at[0] + dx, x), clamp(at[1] + dy, y)]); },
    end() {
      if (!back) { at = now; return; }
      const from = g.style.transform;
      set([0, 0]); at = [0, 0];
      play(g, [{ transform: from }, { transform: 'translate(0px, 0px)' }], { duration: 700, easing: out });
    },
  } });
}
// Count taps; the nth one (and every nth after) runs the secret.
function counter(n, every, secret) { let c = 0; return () => { c++; if (c % n === 0) secret(c / n); else every?.(c); }; }

// Building: the Verdnt studio bench.
function building(svg, part) {
  // 1. The two chairs roll sideways and drift back under the bench. The bench edge behind each chair is filled in,
  // so it shows once the chair rolls away.
  for (const x of [0, 310]) {
    const edge = svg.querySelector('g > path:not(.ghost)[d^="M326.5 760"]');
    if (edge) { const fill = edge.cloneNode(); fill.classList.add('egg-fill'); fill.setAttribute('d', `M${178 + x} 760L${327 + x} 760M${178 + x} 776L${327 + x} 776`); edge.parentNode.append(fill); }
    const back = `M${178 + x} 734L${186 + x} 718L${319 + x} 718L${327 + x} 730L${325 + x} 850L${310 + x} 866L${190 + x} 866L${180 + x} 854ZM${168 + x} 868L${332 + x} 868L${336 + x} 884L${330 + x} 890L${170 + x} 890L${164 + x} 884Z`;
    slide(part([150 + x, 700, 350 + x, 980], { top: true, back }), { x: [-110, 110] });
  }
  // 2. Every drink on the retail shelf lifts off the shelf and settles back.
  const shelf = [[88, 211, [540, 580], [588, 636], [642, 694], [700, 742]], [226, 351, [536, 584], [590, 633], [640, 692], [698, 744]], [366, 491, [538, 590], [596, 644], [650, 694], [700, 741]]];
  for (const [y0, y1, ...cols] of shelf) for (const [x0, x1] of cols) { const g = part([x0, y0, x1, y1]); touch(g, { tap: () => lift(g, -10) }); }
  // 3. The can on the bench fizzes when opened.
  const can = part([340, 655, 400, 745]);
  touch(can, { tap() {
    [[364, 3], [374, 2.2], [382, 2.6], [370, 1.8]].forEach(([x, r], i) => {
      const b = ink(can, circle(x, 656, r), 1);
      if (still.matches) { b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: i * 120, fill: 'backwards' }); fadeOut(b, 300, 900); return; }
      b.animate([{ transform: 'translate(0px, 4px)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${(i % 2 ? 3 : -3)}px, -34px)`, opacity: 0 }],
        { duration: 1300, delay: i * 160, easing: out, fill: 'both' }).finished.then(() => b.remove(), () => {});
    });
  } });
  // 4. The bottle at the end of the bench slides along it and back.
  slide(part([698, 560, 762, 732]), { x: [-70, 14] });
  // 5. The pinned research cards sway on their pins when you brush past or tap them.
  for (const [r, pin] of [[[55, 60, 185, 210], [115, 74]], [[358, 58, 472, 196], [418, 71]], [[55, 228, 186, 370], [122, 241]], [[344, 212, 472, 347], [406, 227]], [[200, 306, 323, 384], [262, 319]]]) {
    const g = part(r);
    const sway = () => swing(g, pin, r[0] < 200 ? -3 : 3, 1200);
    touch(g, { tap: sway, hover: sway });
  }
  // 6. Secret: tap the drink idea in the middle five times and a light bulb switches on above it.
  const idea = part([185, 130, 340, 305]);
  let bulb = null;
  touch(idea, { tap: counter(5, () => lift(idea, -4, 500), () => {
    if (!bulb) {
      bulb = document.createElementNS(NS, 'g');
      bulb.setAttribute('class', 'egg-bulb');
      idea.append(bulb);
      ink(bulb, 'M253 121C245 116 246 96 260 95C274 96 275 116 267 121L266 128L254 128Z', 1.5);
      ink(bulb, 'M255 132L265 132M256 136L264 136M256 112L258 118L260 112L262 118L264 112', 1.1);
      [...bulb.children].forEach((p, i) => drawIn(p, 600, i * 300));
    }
    const rays = ink(bulb, 'M260 87L260 80M243 95L238 90M277 95L282 90M240 109L233 109M280 109L287 109', 1.2);
    drawIn(rays, 400, 700);
    fadeOut(rays, 800, 3200);
  }) });
  // 7. The bar chart on the monitor grows again from its baseline.
  const bars = part([285, 490, 400, 535]);
  bars.style.transformOrigin = '342px 528px';
  touch(bars, { tap: () => moving(bars) || play(bars, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 900, easing: out }) });
  // 8. The sources on the laptop tick off one by one; tap again to clear them.
  const laptop = part([465, 535, 690, 640]);
  let ticks = null;
  touch(laptop, { tap() {
    if (ticks) { fadeOut(ticks); ticks = null; return; }
    ticks = document.createElementNS(NS, 'g');
    laptop.append(ticks);
    [563, 584, 605, 626].forEach((y, i) => drawIn(ink(ticks, `M584 ${y}L586.5 ${y + 3}L591.5 ${y - 3.5}`, 1.6), 300, i * 250));
  } });
}

// Experience: the analyst desk in front of the Chicago skyline.
function experience(svg, part) {
  // 1. The clouds drag across the sky (in front of the towers) and stay where you leave them.
  for (const [r, x] of [[[80, 80, 195, 130], [-35, 560]], [[390, 100, 490, 145], [-345, 265]], [[635, 70, 735, 115], [-590, 20]]]) {
    const g = part(r, { top: true });
    const outline = [...g.querySelectorAll('path:not(.ghost)')].find(p => p.getAttribute('d').endsWith('Z'));
    if (outline) { outline.setAttribute('fill', '#fff'); g.prepend(outline.previousElementSibling?.classList.contains('ghost') ? outline.previousElementSibling : outline, outline); }
    slide(g, { x, back: false });
  }
  // Aircraft warning lights blink on the antenna tips.
  const lights = (tower, tips) => tips.forEach(([x, y]) => {
    const dot = ink(tower, circle(x, y, 3.2), 0, { class: 'egg-new egg-dot' });
    dot.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 1600, easing: 'ease-in-out' }).finished.then(() => dot.remove(), () => {});
  });
  // 2. The Willis Tower's antenna lights blink.
  const willis = part([278, 105, 368, 445]);
  touch(willis, { tap: () => lights(willis, [[309, 110], [325, 124]]) });
  // 3. Secret: the Hancock's lights blink too, and on the fifth tap a small plane crosses the sky.
  const hancock = part([540, 145, 605, 452]);
  const sky = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ x: 42, y: 42, width: 716, height: 400, overflow: 'hidden', class: 'egg-sky' })) sky.setAttribute(k, v);
  svg.querySelector('g').append(sky);
  touch(hancock, { tap: counter(5, () => lights(hancock, [[563, 150], [583, 150]]), () => {
    lights(hancock, [[563, 150], [583, 150]]);
    const plane = document.createElementNS(NS, 'g');
    sky.append(plane);
    ink(plane, 'M0 0L26 0Q35 0 35 3Q35 6 26 6L4 6L-3 -5L1 -5L7 0M13 6L7 15L11 15L21 6M14 0L9 -8L12 -8L20 0', 1.1);
    ink(plane, 'M-8 3L-30 3M-12 7L-26 7', 0.7);
    if (still.matches) { plane.setAttribute('transform', 'translate(330 26)'); plane.animate([{ opacity: 0 }, { opacity: 1 }], 300); fadeOut(plane, 600, 2500); return; }
    plane.animate([{ transform: 'translate(-50px, 34px)' }, { transform: 'translate(760px, 14px)' }], { duration: 7000, easing: 'linear' }).finished.then(() => plane.remove(), () => {});
  }) });
  // 4. The price chart redraws itself, candle by candle.
  const candles = part([80, 480, 262, 640]);
  touch(candles, { tap: () => redraw(candles) });
  // 5. The checklist beside it ticks off its open items one at a time, then clears.
  const list = part([268, 478, 372, 648]);
  const open = [1, 2, 4, 5, 7, 8].map(i => 491 + 16.5 * i);
  let done = [];
  touch(list, { tap() {
    if (done.length === open.length) { done.forEach(p => fadeOut(p)); done = []; return; }
    const y = open[done.length];
    const tick = ink(list, `M272 ${y}L273.6 ${y + 2.2}L276.6 ${y - 2.4}`, 1.1);
    done.push(tick);
    drawIn(tick, 300);
  } });
  // 6. The regression on the right-hand monitor refits from left to right.
  const scatter = part([422, 462, 748, 680]);
  touch(scatter, { tap: () => redraw(scatter, 1200) });
  // 7. The quoted part on the laptop turns over.
  const bracket = part([418, 740, 508, 812]);
  touch(bracket, { tap: () => flip(bracket, [463, 776], 2) });
  // 8. The drink bottle slides along the desk and back.
  slide(part([698, 725, 748, 895]), { x: [-60, 8] });
}

// Values: the tabletop with the Statesman board game.
function values(svg, part) {
  // 1. The five pawns move anywhere on the board and stay where you put them.
  for (const r of [[245, 395, 280, 445], [436, 368, 470, 416], [275, 458, 310, 510], [398, 505, 432, 556], [188, 565, 224, 616]]) {
    const [cx, cy] = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
    slide(part(r), { x: [205 - cx, 485 - cx], y: [392 - cy, 610 - cy], back: false });
  }
  // 2. The two game tokens flip like coins.
  for (const r of [[343, 430, 376, 460], [454, 574, 490, 607]]) { const g = part(r); touch(g, { tap: () => flip(g, g.mid, 3) }); }
  // 3. The camcorder starts recording: it pans a little on the tripod and a dot blinks on its screen.
  const cam = part([460, 80, 640, 190]);
  touch(cam, { tap() {
    if (cam.querySelector('.egg-dot')) return;
    swing(cam, [559, 212], -3, 2400);
    const rec = ink(cam, circle(578, 141, 3), 0, { class: 'egg-new egg-dot' });
    rec.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], { duration: 900, iterations: 3 }).finished.then(() => rec.remove(), () => {});
  } });
  // 4. The two loose cards flip over.
  for (const r of [[524, 505, 592, 582], [584, 490, 660, 560]]) { const g = part(r); touch(g, { tap: () => flip(g, g.mid, 2) }); }
  // 5. The card deck lifts and settles.
  const deck = part([540, 398, 604, 466]);
  touch(deck, { tap: () => lift(deck, -8) });
  // 6. The handwritten note writes itself again.
  const note = part([478, 628, 650, 714]);
  touch(note, { tap: () => redraw(note, 1400) });
  // 7. The stack of cards fans open a little and closes.
  const stack = part([493, 736, 674, 876]);
  touch(stack, { tap: () => swing(stack, [500, 860], -4, 1100), hover: () => swing(stack, [500, 860], -2, 1100) });
  // 8. Tap the sandwich: it lifts twice, and on the third tap it is eaten (crumbs left behind) and comes back a little later.
  const sandwich = part([55, 655, 260, 768], { skip: [116, 119] });
  touch(sandwich, { tap: counter(3, () => lift(sandwich, -6), () => {
    if (sandwich.classList.contains('egg-eaten')) return;
    sandwich.classList.add('egg-eaten');
    const crumbs = document.createElementNS(NS, 'g');
    svg.querySelector('g').append(crumbs);
    [[120, 742], [150, 748], [175, 740], [205, 750], [138, 754]].forEach(([x, y], i) => drawIn(ink(crumbs, circle(x, y, 1.4), 1), 200, 300 + i * 80));
    const fade = still.matches ? 150 : 600;
    sandwich.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fade, fill: 'forwards' });
    after(6000, () => {
      fadeOut(crumbs, fade);
      sandwich.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, fill: 'forwards' }).finished.then(() => sandwich.classList.remove('egg-eaten'), () => {});
    });
  }) });
  // 9. Secret: drop coins in the donation box; the fifth one floats a heart up out of it.
  const box = part([75, 60, 335, 335]);
  touch(box, { tap: counter(5, () => coin(), () => { coin(); heart(); }) });
  function coin() {
    const c = ink(box, 'M216 30a8 3 0 1 0 16 0a8 3 0 1 0 -16 0', 1.2);
    if (still.matches) { c.animate([{ opacity: 0 }, { opacity: 1 }], 150); fadeOut(c, 300, 500); return; }
    c.animate([{ transform: 'translate(0px, -10px)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { transform: 'translate(0px, 105px)', opacity: 0 }],
      { duration: 900, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'both' }).finished.then(() => c.remove(), () => {});
  }
  function heart() {
    const h = ink(box, 'M215 52C215 44 205 40 200 47C195 40 185 44 185 52C185 60 200 68 200 68C200 68 215 60 215 52Z', 1.4);
    drawIn(h, 700, 500);
    if (!still.matches) h.animate([{ transform: 'translate(0px, 0px)' }, { transform: 'translate(0px, -24px)' }], { duration: 2600, delay: 500, easing: out, fill: 'forwards' });
    fadeOut(h, 700, 3200);
  }
}

// Masthead portrait. The portrait is a masked line image, so its eggs work on overlays: white lids for a blink,
// and moving copies of the tie and hair cut out with clip paths (the original is covered while a copy moves).
function portrait(svg) {
  const img = svg.querySelector('image');
  if (!img) return;
  img.id = 'egg-face';
  const node = (name, attrs, parent = svg) => {
    const el = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    parent.append(el);
    return el;
  };
  const defs = node('defs', {});
  const clip = (id, points) => node('polygon', { points }, node('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs));
  // Each copy's cut-out is a little larger than the white patch under it, so no seam shows where they meet.
  const tiePoly = '574,868 636,868 644,1000 648,1254 532,1254 544,1000';
  const hairPoly = '280,60 880,60 880,396 280,396';
  clip('egg-tie-clip', '571,866 639,866 647,1000 651,1254 529,1254 541,1000');
  clip('egg-hair-clip', '276,56 884,56 884,400 276,400');
  // A moving copy of part of the picture over a white patch that hides the original while it moves.
  function copy(points, clipId) {
    const g = node('g', { class: 'egg-copy' });
    node('polygon', { points, fill: '#fff' }, g);
    const moving = node('g', {}, g);
    node('use', { href: '#egg-face', 'clip-path': `url(#${clipId})` }, moving);
    return [g, moving];
  }
  const hits = node('g', { class: 'egg-hits' });
  const hit = (cls, x, y, w, h) => { const g = node('g', { class: `egg ${cls}` }, hits); node('rect', { class: 'egg-hit', x, y, width: w, height: h }, g); return g; };

  // 1. Tap the face to blink. 2. Every third tap is a wink. 3. He also blinks on his own now and then.
  const lids = node('g', { class: 'egg-lids', opacity: 0 });
  const eyes = [['529', '435', '46', '15', 'M484 434Q529 448 574 431'], ['697', '432', '50', '15', 'M648 430Q697 446 746 427']];
  const lid = eyes.map(([cx, cy, rx, ry, d]) => { const g = node('g', {}, lids); node('ellipse', { cx, cy, rx, ry, fill: '#fff' }, g); ink(g, d, 5); return g; });
  const blink = (wink = false) => {
    lid[0].style.display = wink ? 'none' : '';
    lids.animate([{ opacity: 1 }, { opacity: 1 }], { duration: wink ? 450 : 140 });
  };
  // 7. Secret: on the seventh tap a small flower appears in his lapel buttonhole.
  let flower = false;
  const face = hit('egg-tap', 420, 380, 400, 290);
  let taps = 0;
  touch(face, { tap() {
    taps++;
    blink(taps % 3 === 0);
    if (taps === 7 && !flower) {
      flower = true;
      const f = node('g', { class: 'egg-flower' });
      [[0, -11], [10, -4], [7, 9], [-7, 9], [-10, -4]].forEach(([dx, dy]) => drawIn(ink(f, circle(823 + dx, 868 + dy, 6.5), 4), 500, 200));
      drawIn(ink(f, circle(823, 868, 3.5), 4), 300, 600);
      drawIn(ink(f, 'M823 880Q826 892 822 904', 4), 300, 0);
    }
  } });
  if (!still.matches) {
    const idle = () => after(5000 + Math.random() * 5000, () => { if (!document.hidden) blink(); idle(); });
    idle();
  }
  // 4. Tap the tie and it swings a little crooked, then straightens. 5. Drag it sideways and it straightens when let go.
  const [tieCopy, tieMove] = copy(tiePoly, 'egg-tie-clip');
  tieCopy.style.display = 'none';
  tieMove.style.transformOrigin = '605px 872px';
  const tie = hit('egg-tap egg-tie', 532, 805, 116, 449);
  const tieOn = () => { tieCopy.style.display = ''; };
  const tieOff = () => { tieCopy.style.display = 'none'; tieMove.style.transform = ''; };
  const straighten = from => {
    const a = play(tieMove, [{ transform: from }, { transform: 'rotate(0deg)' }], { duration: 900, easing: out });
    tieMove.style.transform = '';
    if (a) a.finished.then(tieOff, () => {}); else tieOff();
  };
  touch(tie, {
    tap() { if (moving(tieMove)) return; tieOn(); const a = play(tieMove, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(7deg)', offset: 0.35 }, { transform: 'rotate(0deg)' }], { duration: 1400 }); if (a) a.finished.then(tieOff, () => {}); else tieOff(); },
    drag: { axis: 'x', move(dx) { tieOn(); tieMove.getAnimations().forEach(a => a.cancel()); tieMove.style.transform = `rotate(${Math.max(-10, Math.min(10, -dx / 12))}deg)`; }, end() { straighten(tieMove.style.transform); } },
  });
  tie.classList.replace('egg-tap', 'egg-drag');
  // 6. Brush the hair (or tap it) and it ruffles.
  const [hairCopy, hairMove] = copy(hairPoly, 'egg-hair-clip');
  hairCopy.style.display = 'none';
  hairMove.style.transformOrigin = '580px 396px';
  const hair = hit('egg-tap', 300, 70, 560, 300);
  const ruffle = () => {
    if (still.matches || moving(hairMove)) return;
    hairCopy.style.display = '';
    play(hairMove, [{ transform: 'skewX(0deg)' }, { transform: 'skewX(-3deg)', offset: 0.4 }, { transform: 'skewX(0deg)' }], { duration: 1100 }).finished.then(() => { hairCopy.style.display = 'none'; }, () => {});
  };
  touch(hair, { tap: ruffle, hover: ruffle });
  // 8. Tap the breast pocket and a pocket square peeks out; tap again to tuck it away.
  let square = null;
  const pocket = hit('egg-tap', 760, 1050, 190, 110);
  touch(pocket, { tap() {
    if (square) { fadeOut(square); square = null; return; }
    square = node('g', { class: 'egg-square' });
    drawIn(ink(square, 'M790 1118L806 1084L822 1112L842 1074L860 1106L878 1080L894 1102', 5), 700);
  } });
  svg.append(hits);
  guard(svg);
}

const wire = { building, experience, values };
function ready(holder, setup) {
  const go = () => {
    const svg = holder.querySelector(':scope > svg');
    if (!svg || svg.dataset.eggs) return false;
    svg.dataset.eggs = '1';
    // A frame later, so the first-visit intro has already copied the plain portrait.
    requestAnimationFrame(() => { try { setup(svg); } catch { /* The drawing stays as it is. */ } });
    return true;
  };
  if (!go()) new MutationObserver((_, obs) => { if (go()) obs.disconnect(); }).observe(holder, { childList: true });
}
for (const fig of document.querySelectorAll('.span[data-art] > .art')) {
  const fn = wire[fig.parentElement.dataset.art];
  if (fn) ready(fig, svg => { guard(svg); fn(svg, kit(svg)); });
}
// The portrait's eggs wait until it has finished drawing itself in.
const mark = document.querySelector('.mark');
if (mark) ready(mark, svg => Promise.all(mark.getAnimations().map(a => a.finished)).then(() => portrait(svg), () => portrait(svg)));
})();
