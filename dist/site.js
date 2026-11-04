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
const START = 0.12; // share of the drawing visible when its span begins
const near = new Set();
function scrub(fig) {
  if (!fig.classList.contains('drawing')) return;
  if (!wide.matches) {
    // Narrow screens: no pinning; the drawing draws in once, when most of it is on screen.
    const r = fig.getBoundingClientRect();
    if (r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2) drawOnce(fig);
    else if (!fig.dataset.shown) fig.style.setProperty('--p', START);
    return;
  }
  fig.classList.remove('once');
  const span = fig.parentElement.getBoundingClientRect();
  const pin = parseFloat(getComputedStyle(fig).top) || 0;
  const t = Math.min(1, Math.max(0, (pin - span.top) / Math.max(1, span.height - fig.offsetHeight)));
  fig.style.setProperty('--p', (START + (1 - START) * t).toFixed(3));
}
function drawOnce(fig) {
  if (wide.matches || fig.dataset.shown || !fig.classList.contains('drawing')) return;
  fig.dataset.shown = '1'; fig.classList.add('once'); fig.style.setProperty('--p', 1);
}
async function inline(fig) {
  const img = fig.querySelector('img');
  if (!img) return;
  try {
    const res = await fetch(img.currentSrc || img.src);
    if (!res.ok) return;
    const svg = new DOMParser().parseFromString(await res.text(), 'image/svg+xml').documentElement;
    if (svg.nodeName !== 'svg') return;
    if (img.alt) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', img.alt); } else svg.setAttribute('aria-hidden', 'true');
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, i) => { path.setAttribute('pathLength', '1'); path.style.setProperty('--d', (i / paths.length * 0.92).toFixed(4)); });
    fig.style.setProperty('--p', START);
    if (motion) fig.classList.add('drawing');
    fig.replaceChildren(document.importNode(svg, true));
    near.add(fig); request();
  } catch { /* Keep the static image. */ }
}
const arts = [...document.querySelectorAll('.art')];
if (hasIO && arts.length) {
  const loader = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { loader.unobserve(entry.target); inline(entry.target); }
  }, { rootMargin: '150% 0px' });
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) near.add(entry.target); else near.delete(entry.target);
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
