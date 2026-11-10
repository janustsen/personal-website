// Books section: a picked book spins out of the shelf into its cover preview and back,
// and the drawn shelf and covers hide small things to play with.
// Without JavaScript the popovers still open; with reduced motion they simply fade.
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
// One duration and easing for the cover, the card and the backdrop (style.css uses the same --fly and --fly-ease).
const fly = { duration: 520, easing: 'cubic-bezier(.22,.61,.36,1)' };
const spineOf = pop => document.querySelector(`.spine[popovertarget="${pop.id}"]`);

// Opening, the cover starts edge-on at the spine (rotateY 90deg, spine height), turns to face you in a quick
// first quarter, then glides and grows into its place. Closing glides back and turns edge-on into the spine in a
// quick last quarter. Only transform moves; both rects are read once, before anything animates.
function flight(s, c, open) {
  const k = s.height / c.height;
  const dx = s.left + s.width / 2 - (c.left + c.width / 2), dy = s.top + s.height / 2 - (c.top + c.height / 2);
  const at = deg => ({ transform: `translate(${dx}px,${dy}px) scale(${k}) perspective(500px) rotateY(${deg}deg)` });
  return open
    ? [{ ...at(90), easing: 'cubic-bezier(.3,.6,.6,1)' }, { ...at(0), offset: .25, easing: fly.easing }, { transform: 'none' }]
    : [{ transform: 'none', easing: fly.easing }, { ...at(0), offset: .75, easing: 'cubic-bezier(.4,0,.7,.4)' }, at(90)];
}
const fixedAt = (el, r) => Object.assign(el.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: 0 });

for (const pop of document.querySelectorAll('.book-pop')) {
  const cover = pop.querySelector('.cover'), spine = spineOf(pop);
  if (!motion || !spine) continue;
  pop.addEventListener('beforetoggle', e => {
    for (const a of cover.getAnimations()) if (!(a instanceof CSSAnimation)) a.cancel();
    if (e.newState === 'open') {
      // The card and backdrop fade in by CSS (@starting-style); the cover flies from the spine in the same frame.
      pop.classList.add('flying');
      requestAnimationFrame(() => {
        const keys = flight(spine.getBoundingClientRect(), cover.getBoundingClientRect(), true);
        spine.style.visibility = 'hidden';
        const done = () => pop.classList.remove('flying');
        cover.animate(keys, fly.duration).finished.then(done, done);
      });
      return;
    }
    // Closing: the popover leaves the top layer at once, so a still copy of the backdrop and card fades out
    // while a copy of the cover flies back to its spine. The fade starts wherever the opening fade had got to
    // (the card's text, surface and backdrop share one timing), and the copy keeps the card's scroll position.
    const card = pop.getBoundingClientRect(), c = cover.getBoundingClientRect(), s = spine.getBoundingClientRect();
    const shown = +getComputedStyle(pop.querySelector('.book-close')).opacity, scrolled = pop.scrollTop;
    const layer = Object.assign(document.createElement('div'), { className: 'book-exit', inert: true });
    layer.setAttribute('aria-hidden', 'true');
    const veil = Object.assign(document.createElement('div'), { className: 'book-veil' });
    const still = Object.assign(pop.cloneNode(true), { id: '', className: 'book-pop shown' });
    still.removeAttribute('popover');
    still.querySelector('.cover').style.visibility = 'hidden';
    fixedAt(still, card);
    still.style.overflow = 'hidden';
    const ghost = cover.cloneNode(true);
    ghost.classList.add('cover-ghost');
    fixedAt(ghost, c);
    layer.append(veil, still, ghost);
    document.body.append(layer);
    still.scrollTop = scrolled;
    for (const el of [veil, still]) el.animate([{ opacity: shown }, { opacity: 0 }], { ...fly, fill: 'forwards' });
    ghost.animate(flight(s, c, false), { duration: fly.duration, fill: 'forwards' })
      .finished.then(() => { layer.remove(); if (!pop.matches(':popover-open')) spine.style.visibility = ''; });
  });
}

// Every cover: click to set its moving part going (again to put it back); the third click reveals a hidden detail.
document.addEventListener('click', e => {
  const art = e.target.closest?.('.cover-art');
  if (!art) return;
  art.classList.toggle('on');
  art.dataset.clicks = (+art.dataset.clicks || 0) + 1;
  if (art.dataset.clicks >= 3) art.classList.add('found');
});

// Horizontal drag helper: calls move(dx) while dragging and end() on release; a drag never counts as a click.
function drag(el, move, end, axis = 'x') {
  let start = null, moved = false;
  el.addEventListener('pointerdown', e => { start = e; moved = false; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    const d = axis === 'x' ? e.clientX - start.clientX : e.clientY - start.clientY;
    if (!moved && Math.abs(d) < 5) return;
    moved = true; el.classList.add('dragging'); move(d);
  });
  const stop = () => { if (!start) return; start = null; el.classList.remove('dragging'); if (moved) end(); };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; } }, true);
}

// Leaning books: drag one upright; let go and it eases back against its neighbour.
for (const book of document.querySelectorAll('.spine.lean, .spine.lean-right')) {
  const tilt = parseFloat(book.style.getPropertyValue('--tilt'));
  drag(book, dx => { book.style.rotate = `${tilt * Math.min(1, Math.max(0, 1 - Math.sign(-tilt) * dx / 40))}deg`; }, () => { book.style.rotate = ''; });
}

// Bookend: nudge or push it along; it slides back. Nudge it five times and a mouse peeks out.
const bookend = document.querySelector('.bookend');
if (bookend) {
  let nudges = 0;
  const count = () => { if (++nudges >= 5) bookend.classList.add('found'); };
  drag(bookend, dx => { bookend.style.translate = `${Math.max(-6, Math.min(24, dx))}px 0`; }, () => { bookend.style.translate = ''; count(); });
  bookend.addEventListener('click', () => {
    bookend.style.translate = '10px 0';
    setTimeout(() => { bookend.style.translate = ''; }, 260);
    count();
  });
}

// Spider: pull it down on its thread; let go and it climbs back up.
const spider = document.querySelector('.spider');
if (spider) drag(spider, dy => spider.style.setProperty('--drop', `${Math.max(18, Math.min(170, 18 + dy))}px`), () => spider.style.removeProperty('--drop'), 'y');

// Mug: click for a curl of steam. Glasses: click to flip them over.
const mug = document.querySelector('.mug');
mug?.addEventListener('click', () => { mug.classList.add('on'); clearTimeout(mug.t); mug.t = setTimeout(() => mug.classList.remove('on'), 1600); });
document.querySelector('.glasses')?.addEventListener('click', e => e.currentTarget.classList.toggle('on'));

// Open book: click to turn the page. (The cat, the plant, bookmarks and spine swinging live in site.js.)
document.querySelector('.open-book')?.addEventListener('click', e => e.currentTarget.classList.toggle('on'));
