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
    // The portrait is a likeness, so it shows whole; the other drawings draw in.
    if (motion && fig.parentElement.dataset.art !== 'portrait') fig.classList.add('drawing');
    scrub(fig);
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
// working sessionStorage and no deep link. The picture pops in and "Hey, I'm Janus!" rises in, alone on the screen.
// The first scroll, swipe, key or tap (or 3 seconds without one) whips them into the header as the page fades in.
// Reduced motion keeps both still and swaps to the page with a short fade.
const root = document.documentElement;
if (root.classList.contains('intro-on')) {
  try { intro(); } catch { root.classList.remove('intro-on', 'intro-out', 'intro-landed'); document.querySelector('.intro-stage')?.remove(); }
}
function intro() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const curve = f => CSS.supports('animation-timing-function', 'linear(0, 1)')
    ? `linear(${Array.from({ length: 49 }, (_, i) => +f(i / 48).toFixed(4)).join()})` : 'cubic-bezier(.34,1.56,.64,1)';
  const back = curve(t => 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2);
  const spring = curve(t => 1 - Math.exp(-6 * t) * Math.cos(t * Math.PI * 2.6));
  const out = 'cubic-bezier(.33,1,.68,1)', inout = 'cubic-bezier(.65,0,.35,1)';

  const stage = document.createElement('div');
  stage.className = 'intro-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = `<img class="intro-face" src="/assets/avatar-320.webp" alt=""><p class="intro-hello"><span class="intro-hi">${'Hey, I’m Janus!'.replace(/\S/g, '<span>$&</span>')}</span><span class="intro-name">Janus Tsen</span></p>`;
  document.body.append(stage);
  const [face, hello] = stage.children, [hi, name] = hello.children;
  if (!still) {
    face.animate([{ transform: 'rotate(-25deg) scale(0)' }, { transform: 'rotate(0deg) scale(1)' }], { duration: 650, easing: back });
    [...hi.children].forEach((letter, i) => {
      const timing = { duration: 450, delay: 350 + i * 40, fill: 'backwards' };
      letter.animate([{ translate: '0 46px', opacity: 0 }, { opacity: 1, offset: 0.4 }, { translate: '0 0', opacity: 1 }], { ...timing, easing: back });
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
    const mark = document.querySelector('.mark'), [nx, ny] = centre(document.querySelector('.identity h1 a'));
    root.classList.add('intro-out');
    const shown = document.querySelector('.page').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: out }).finished;

    // Picture and greeting: a quick wind-up, then a spring into the header picture and name.
    const [fx, fy, fw] = centre(face), [hx, hy] = centre(hello);
    const [mx, my, mw] = centre(mark), radius = parseFloat(getComputedStyle(mark).borderTopLeftRadius);
    const k = mw / fw, whip = { duration: 600, fill: 'forwards' };
    face.animate([
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', borderRadius: '50%', opacity: 1, easing: inout },
      { transform: 'translate(0px, 0px) rotate(-6deg) scale(1.08)', borderRadius: '50%', opacity: 1, offset: 1 / 6, easing: spring },
      { transform: `translate(${mx - fx}px, ${my - fy}px) rotate(0deg) scale(${k})`, borderRadius: `${radius / k}px`, opacity: 1 },
    ], whip);
    const wind = 1 / 12;
    hi.animate([{ opacity: 1, transform: 'scale(1)', easing: spring }, { opacity: 1, transform: 'scale(1)', offset: wind, easing: spring }, { opacity: 0, transform: 'scale(.36)' }], whip);
    name.animate([{ opacity: 0, transform: 'scale(2.6)' }, { opacity: 0, transform: 'scale(2.6)', offset: wind, easing: spring }, { opacity: 1, transform: 'scale(1)' }], whip);
    const whipped = hello.animate([
      { transform: 'translate(0px, 0px) skewX(0deg) scale(1)', easing: inout },
      { transform: 'translate(0px, 0px) skewX(-12deg) scale(1.04)', offset: wind, easing: spring },
      { transform: `translate(${nx - hx}px, ${ny - hy}px) skewX(0deg) scale(1)` },
    ], whip).finished.then(() => { root.classList.add('intro-landed'); face.remove(); hello.remove(); });

    Promise.allSettled([whipped, shown]).then(done);
  }
}
