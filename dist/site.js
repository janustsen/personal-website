// Scroll reveal, pinned drawings that draw in as you scroll, and the condensed header bar.
// Everything stays visible and fully drawn without JavaScript or with reduced motion.
const hasIO = 'IntersectionObserver' in window;
const motion = hasIO && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 761px)');

const items = [...document.querySelectorAll('.reveal')];
const show = el => el.classList.add('in');
if (!motion) items.forEach(show);
else {
  // Whatever is already on screen shows at once, so nothing flashes away and back.
  for (const el of items) if (el.getBoundingClientRect().top < innerHeight) show(el);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { show(entry.target); observer.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.filter(el => !el.classList.contains('in')).forEach(el => observer.observe(el));
  document.documentElement.classList.add('js');
}

// Drawings: swap each <img> for its inline SVG so the strokes can draw in.
// The draw-in is tied to scroll while the section is on screen: it starts when the section's top
// reaches 85% of the viewport and finishes about two-thirds of the way through the section, so
// the text beside it is always on screen while it draws. Phones scrub against the drawing itself.
const near = new Set();
function scrub(fig) {
  if (!fig.classList.contains('drawing')) return;
  const h = innerHeight;
  let t;
  // Drawing starts when the section reaches 85% of the viewport. A section already above that
  // at the top of the page (About) starts from nothing at load and draws in as you scroll.
  if (wide.matches) {
    const span = fig.parentElement.getBoundingClientRect();
    const start = Math.min(0.85 * h, span.top + scrollY);
    // Complete two-thirds of the way through, and always before the drawing releases
    // (when the span's bottom reaches the drawing's bottom), whichever comes first.
    const pin = parseFloat(getComputedStyle(fig).top) || 0;
    const release = start - (pin + fig.offsetHeight - span.height) - 0.08 * h;
    // ...and never later than the page end, so the last section's drawing also completes.
    const toEnd = start - span.top + (document.documentElement.scrollHeight - h - scrollY);
    const travel = Math.max(1, Math.min(Math.max(0.3 * h, Math.min((2 / 3) * (span.height + 0.7 * h), release)), release > 0 ? release : Infinity, toEnd));
    t = (start - span.top) / travel;
  } else {
    const top = fig.getBoundingClientRect().top;
    t = (Math.min(0.85 * h, top + scrollY) - top) / (0.65 * h);
  }
  fig.style.setProperty('--p', Math.min(1, Math.max(0, t)).toFixed(3));
}
// ghost: give every stroke a faint copy underneath, so a section drawing reads as a light sketch before it draws in.
async function svgOf(img, ghost) {
  const res = await fetch(img.currentSrc || img.src);
  if (!res.ok) throw new Error(`${res.status}`);
  const svg = new DOMParser().parseFromString(await res.text(), 'image/svg+xml').documentElement;
  if (svg.nodeName !== 'svg') throw new Error('Not an SVG');
  if (img.alt) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', img.alt); } else svg.setAttribute('aria-hidden', 'true');
  const paths = svg.querySelectorAll('path');
  paths.forEach((path, i) => { path.setAttribute('pathLength', '1'); path.style.setProperty('--d', (i / paths.length * 0.92).toFixed(4)); });
  if (ghost) paths.forEach(path => { const copy = path.cloneNode(); copy.setAttribute('class', 'ghost'); path.before(copy); });
  return document.importNode(svg, true);
}
async function inline(fig) {
  const img = fig.querySelector('img');
  if (!img) return;
  try {
    const svg = await svgOf(img, motion);
    if (motion) fig.classList.add('drawing');
    scrub(fig);
    fig.replaceChildren(svg);
    near.add(fig); request();
  } catch { /* Keep the static image. */ }
}
// Masthead portrait: inlined at once and drawn in over a couple of seconds on load, no scroll needed.
// The first-visit intro shows a copy that draws in step with it.
const mark = document.querySelector('.mark');
const markImg = mark?.querySelector('img');
// The static image waits hidden (.mark-wait, set in the head); if it was already shown (slow load), skip the draw-in.
const portrait = markImg ? svgOf(markImg).then(svg => {
  if (motion && getComputedStyle(markImg).opacity === '0') mark.classList.add('drawing');
  mark.replaceChildren(svg);
  return svg;
}) : Promise.reject(new Error('No portrait'));
portrait.catch(() => { /* Keep the static image. */ }).finally(() => document.documentElement.classList.remove('mark-wait'));
const arts = [...document.querySelectorAll('.art')];
if (hasIO && arts.length) {
  const loader = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { loader.unobserve(entry.target); inline(entry.target); }
  }, { rootMargin: '150% 0px' });
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) near.add(entry.target); else near.delete(entry.target);
    request(); // a jump (nav link, reload) brings drawings into view without a later scroll event
  });
  arts.forEach(fig => { loader.observe(fig); watcher.observe(fig); });
}

// Header bar: appears once the full header has scrolled away and marks the current section.
const bar = document.querySelector('.bar');
const masthead = document.querySelector('.masthead');
const links = bar ? [...bar.querySelectorAll('[data-for]')] : [];
const sections = [...document.querySelectorAll('main > section[id]')];
function current() {
  let id = null;
  for (const section of sections) if (section.getBoundingClientRect().top < innerHeight * 0.4) id = section.id;
  for (const link of links) {
    if (id && link.dataset.for.split(' ').includes(id)) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}
if (bar && masthead && hasIO) {
  bar.hidden = false;
  bar.inert = true;
  new IntersectionObserver(([entry]) => {
    const on = !entry.isIntersecting;
    bar.classList.toggle('on', on);
    bar.inert = !on;
  }).observe(masthead);
}

let queued = false;
function frame() { queued = false; near.forEach(scrub); current(); }
function request() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
addEventListener('scroll', request, { passive: true });
addEventListener('resize', request);
request();

// First-visit intro. The head script in index.html adds .intro-on once per tab session, only with JavaScript,
// working sessionStorage and no deep link. The line portrait draws itself in and "Hey, I'm Janus!" rises in, alone on the screen.
// The first scroll, swipe, key or tap (or 3 seconds without one) glides them smoothly into the header as the page fades in.
// Reduced motion keeps both still and swaps to the page with a short fade.
const root = document.documentElement;
if (root.classList.contains('intro-on')) {
  try { intro(); } catch { root.classList.remove('intro-on', 'intro-out', 'intro-landed'); document.querySelector('.intro-stage')?.remove(); }
}
function intro() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Smooth ease-out everywhere: no spring, bounce or overshoot.
  const smooth = 'cubic-bezier(.22,1,.36,1)', out = 'cubic-bezier(.33,1,.68,1)';

  const stage = document.createElement('div');
  stage.className = 'intro-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = `<div class="intro-face"></div><p class="intro-hello"><span class="intro-hi">${'Hey, I’m Janus!'.replace(/\S/g, '<span>$&</span>')}</span><span class="intro-name">Janus Tsen</span></p>`;
  document.body.append(stage);
  const [face, hello] = stage.children, [hi, name] = hello.children;
  // Added in the same frame as the masthead copy, so the hand-off lands on a drawing at the same stage.
  portrait.then(svg => {
    const copy = svg.cloneNode(true), mask = copy.querySelector('mask');
    if (mask) { mask.id += '-intro'; copy.querySelector('[mask]')?.setAttribute('mask', `url(#${mask.id})`); }
    face.classList.toggle('drawing', mark.classList.contains('drawing'));
    face.append(copy);
  }, () => face.append(Object.assign(new Image(), { src: markImg?.src || '/assets/drawings/portrait.svg', alt: '' })));
  if (!still) {
    [...hi.children].forEach((letter, i) => {
      const timing = { duration: 450, delay: 350 + i * 40, fill: 'backwards' };
      letter.animate([{ translate: '0 46px', opacity: 0 }, { opacity: 1, offset: 0.4 }, { translate: '0 0', opacity: 1 }], { ...timing, easing: smooth });
      letter.animate([{ rotate: '-14deg' }, { rotate: '0deg' }], { ...timing, easing: out });
    });
  }

  // Hold the page still until the picture and greeting have landed; the header is measured at the top of the page.
  const born = performance.now();
  let triggered = false;
  const go = () => { if (!triggered) { triggered = true; setTimeout(reorder, Math.max(0, 1300 - (performance.now() - born))); } };
  const auto = setTimeout(go, 3000);
  const hold = e => { if (e.cancelable && (e.type !== 'keydown' || [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home'].includes(e.key))) e.preventDefault(); go(); };
  const holds = ['wheel', 'touchmove', 'keydown', 'pointerdown', 'scroll'];
  holds.forEach(type => addEventListener(type, hold, { passive: false }));
  const done = () => {
    holds.forEach(type => removeEventListener(type, hold, { passive: false }));
    root.classList.remove('intro-on', 'intro-out', 'intro-landed');
    stage.remove();
    request();
  };

  function reorder() {
    clearTimeout(auto);
    scrollTo({ top: 0, behavior: 'instant' });
    if (still) {
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.then(() => {
        done();
        document.querySelector('.page').animate([{ opacity: 0 }, { opacity: 1 }], 150);
      });
      return;
    }
    const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; };
    const [nx, ny] = centre(document.querySelector('.identity h1 a'));
    root.classList.add('intro-out');
    const shown = document.querySelector('.page').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: out }).finished;

    // Picture and greeting glide straight into the header picture and name with a smooth ease-out.
    const [fx, fy, fw] = centre(face), [hx, hy] = centre(hello);
    const [mx, my, mw] = centre(mark);
    const k = mw / fw, glide = { duration: 700, easing: smooth, fill: 'forwards' };
    face.animate([{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${mx - fx}px, ${my - fy}px) scale(${k})` }], glide);
    hi.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.36)' }], glide);
    name.animate([{ opacity: 0, transform: 'scale(2.6)' }, { opacity: 1, transform: 'scale(1)' }], glide);
    const landed = hello.animate([{ transform: 'translate(0px, 0px)' }, { transform: `translate(${nx - hx}px, ${ny - hy}px)` }], glide)
      .finished.then(() => { root.classList.add('intro-landed'); face.remove(); hello.remove(); });

    Promise.allSettled([landed, shown]).then(done);
  }
}

// Toys in the hobbies scene and on the bookcase. Each is small, eases out smoothly and never blocks a card from opening;
// a real drag is the only thing that cancels the click. Reduced motion keeps the state changes and drops the movement.
const toys = document.querySelector('.scene');
if (toys) {
  const replay = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };
  const count = new WeakMap(), bump = el => { const n = (count.get(el) || 0) + 1; count.set(el, n); return n; };
  // Drag to swing: the jeans, the belt, the rope, a book spine. Let go and it settles back.
  let drag = null;
  addEventListener('pointerdown', e => {
    const host = e.target.closest?.('.hobby, .spine');
    const part = host?.matches('.spine') ? host : host?.querySelector('.swing');
    if (part) drag = { host, part, x: e.clientX, moved: false, k: host.matches('.spine') ? 0.25 : -0.35, max: host.matches('.spine') ? 12 : 24 };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    drag.part.classList.add('held');
    drag.part.style.rotate = `${Math.max(-drag.max, Math.min(drag.max, dx * drag.k))}deg`;
  });
  const letGo = () => { if (!drag) return; drag.part.classList.remove('held'); drag.part.style.rotate = ''; const d = drag; drag = null; if (d.moved) d.host.dataset.dragged = '1'; };
  addEventListener('pointerup', letGo);
  addEventListener('pointercancel', letGo);
  addEventListener('click', e => {
    const host = e.target.closest?.('[data-dragged]');
    if (host) { delete host.dataset.dragged; e.preventDefault(); }
  }, true);

  // Scene objects that react to a hover or a tap.
  const faces = [[[31, 12]], [[27.5, 8.5], [34.5, 15.5]], [[27.5, 8.5], [31, 12], [34.5, 15.5]], [[27.5, 8.5], [34.5, 8.5], [27.5, 15.5], [34.5, 15.5]],
    [[27.5, 8.5], [34.5, 8.5], [31, 12], [27.5, 15.5], [34.5, 15.5]], [[27.5, 8], [34.5, 8], [27.5, 12], [34.5, 12], [27.5, 16], [34.5, 16]]];
  const poke = btn => {
    const toy = btn.dataset.toy;
    if (toy === 'roll') {
      btn.querySelector('.pips').innerHTML = faces[Math.floor(Math.random() * 6)].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3"/>`).join('');
      replay(btn, 'play');
    } else if (toy === 'snip' || toy === 'tap') replay(btn, 'play');
    else if (toy === 'yarn') btn.style.setProperty('--unroll', (bump(btn) % 6) / 5);
  };
  toys.addEventListener('pointerover', e => { const btn = e.target.closest('.hobby'); if (e.pointerType === 'mouse' && btn && btn.dataset.toy !== 'yarn' && !btn.contains(e.relatedTarget)) poke(btn); });
  toys.addEventListener('pointerdown', e => { const btn = e.target.closest('.hobby'); if (btn && (e.pointerType !== 'mouse' || btn.dataset.toy === 'yarn')) poke(btn); });
  toys.addEventListener('click', e => {
    const btn = e.target.closest('.hobby');
    if (btn?.dataset.toy === 'climb' && bump(btn) >= 3) btn.classList.add('found');
    if (btn?.dataset.toy === 'price') btn.querySelector('.price').textContent = ['$3', '$2', '$1', 'free'][Math.min(bump(btn), 3)];
  });
  // The wall clock keeps the visitor's own time.
  const tick = () => { const d = new Date(), m = d.getMinutes();
    toys.querySelector('.clock-m').style.rotate = `${m * 6}deg`; toys.querySelector('.clock-h').style.rotate = `${(d.getHours() % 12) * 30 + m / 2}deg`; };
  tick(); setInterval(tick, 30000);

  // Bookcase: an opened book keeps a bookmark; the cat wakes after three pats; the plant grows a leaf for each suggested read you open.
  const cat = document.querySelector('.cat'), plant = document.querySelector('.plant');
  document.querySelectorAll('.spine').forEach(spine => spine.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    spine.classList.add('marked');
    if (spine.closest('[aria-label="Suggested reads"]') && !spine.dataset.counted) { spine.dataset.counted = '1'; plant.dataset.grow = Math.min(3, +(plant.dataset.grow || 0) + 1); }
  }));
  cat?.addEventListener('pointerdown', () => { if (bump(cat) >= 3) cat.classList.add('awake'); replay(cat, 'flick'); });
  // Covers: tilt toward the pointer; three taps stamp an ex libris.
  document.querySelectorAll('.book-pop .cover').forEach(cover => {
    cover.addEventListener('pointermove', e => { const r = cover.getBoundingClientRect();
      cover.style.setProperty('--tx', ((e.clientY - r.top) / r.height - 0.5) * -10 + 'deg'); cover.style.setProperty('--ty', ((e.clientX - r.left) / r.width - 0.5) * 12 + 'deg'); });
    cover.addEventListener('pointerleave', () => { cover.style.removeProperty('--tx'); cover.style.removeProperty('--ty'); });
    cover.addEventListener('click', () => { if (bump(cover) >= 3) cover.classList.add('stamped'); });
  });
}
