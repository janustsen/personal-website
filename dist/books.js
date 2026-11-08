// Books section: a picked book spins out of the shelf into its cover preview and back,
// and the drawn shelf and covers hide small things to play with.
// Without JavaScript the popovers still open; with reduced motion they simply fade.
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const out = 'cubic-bezier(.22,.61,.36,1)'; // ease-out, no overshoot
const spineOf = pop => document.querySelector(`.spine[popovertarget="${pop.id}"]`);

// The cover starts edge-on at the spine (rotateY 90deg, spine height), turns to face you,
// then travels and grows into its place. Closing plays the same path back on a copy.
function flight(spine, cover) {
  const s = spine.getBoundingClientRect(), c = cover.getBoundingClientRect(), k = s.height / c.height;
  const dx = s.left + s.width / 2 - (c.left + c.width / 2), dy = s.top + s.height / 2 - (c.top + c.height / 2);
  return [
    { transform: `translate(${dx}px,${dy}px) scale(${k}) perspective(500px) rotateY(90deg)` },
    { transform: `translate(${dx}px,${dy}px) scale(${k}) perspective(500px) rotateY(0deg)`, offset: .35 },
    { transform: 'none' },
  ];
}

for (const pop of document.querySelectorAll('.book-pop')) {
  const cover = pop.querySelector('.cover'), spine = spineOf(pop);
  pop.addEventListener('beforetoggle', e => {
    if (!motion || !spine) return;
    if (e.newState === 'open') { cover.style.opacity = '0'; return; }
    // Closing: the popover vanishes at once, so a copy of the cover flies back to the shelf.
    for (const a of cover.getAnimations()) a.cancel();
    const r = cover.getBoundingClientRect();
    const ghost = Object.assign(cover.cloneNode(true), { className: 'cover cover-ghost' });
    Object.assign(ghost.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: 0, zIndex: 50, background: '#fff', pointerEvents: 'none' });
    document.body.append(ghost);
    const back = ghost.animate(flight(spine, ghost).reverse().map(k => k.offset ? { ...k, offset: 1 - k.offset } : k), { duration: 600, easing: 'cubic-bezier(.55,0,.75,.4)', fill: 'forwards' });
    back.finished.then(() => { ghost.remove(); if (!pop.matches(':popover-open')) spine.style.visibility = ''; });
  });
  pop.addEventListener('toggle', e => {
    if (e.newState !== 'open' || !motion || !spine) return;
    pop.classList.add('flying');
    const keys = flight(spine, cover);
    spine.style.visibility = 'hidden';
    cover.style.opacity = '';
    cover.animate(keys, { duration: 700, easing: out }).finished.then(() => pop.classList.remove('flying'), () => pop.classList.remove('flying'));
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
