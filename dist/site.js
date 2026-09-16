const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#ink');
const context = canvas?.getContext('2d');
if (context) {
  const scene = document.body.dataset.ink || 'home';
  let width, height, progress = 0, target = 0, frame = 0, elapsed = 0, lastTime = 0;

  function draw() {
    context.clearRect(0, 0, width, height);
    const mobile = width < 700;
    context.save();
    // Normalized coordinates keep the ink field composed independently on phones.
    context.translate(width * (mobile ? -.2 : .32), height * (mobile && scene === 'home' ? .38 : .06));
    context.scale(width * (mobile ? 1.35 : .82), height * (mobile ? .7 : 1.03));
    for (let i = 0; i < 42; i++) {
      const offset = i / 41;
      const wave = Math.sin(offset * 4.5 + progress * 2.8);
      context.beginPath();
      if (scene === 'building') {
        context.moveTo(.1 + offset * .7, 1.2);
        context.bezierCurveTo(-.2 + offset * .65 + progress * .45, .6,
          .95 - offset * .38 - progress * .3, .5 - progress * .5,
          .7 + offset * .4, -.25);
      } else if (scene === 'experience') {
        context.moveTo(-.6, .3 + offset * .55);
        context.bezierCurveTo(.2 + progress * .3, .1 + offset * .45,
          .5, .9 + offset * .3 - progress * .9, 1.5, .05 + offset * .55);
      } else if (scene === 'about') {
        context.ellipse(.65, .48, .22 + offset * .25, .35 + offset * .32,
          -.35 + progress * .95, 0, Math.PI * 2);
      } else {
      context.moveTo(.08 + offset * .62 - progress * .22, 1.24);
      context.bezierCurveTo(
        -.12 + offset * .5 + progress * .42, .65 - progress * .45,
        1.03 - offset * .48 + wave * .1, .98 - progress * .88,
        .87 + offset * .23, -.23 + progress * .35
      );
      }
      context.strokeStyle = `rgba(42, 53, 60, ${.19 + Math.sin(offset * Math.PI) * .23})`;
      context.lineWidth = (i % 7 === 0 ? 1 : .65) / width;
      context.stroke();
    }
    context.restore();
  }

  function tick(now) {
    const flowing = scene === 'home' && !reduced.matches;
    if (flowing) {
      elapsed += lastTime ? Math.min(now - lastTime, 64) : 0;
      lastTime = now;
      progress = .5 - .5 * Math.cos(elapsed / 6000);
    } else {
      progress += (target - progress) * .16;
      if (Math.abs(target - progress) < .0005) progress = target;
    }
    draw();
    frame = !document.hidden && (flowing || progress !== target) ? requestAnimationFrame(tick) : 0;
  }

  function update() {
    target = reduced.matches || scene === 'home' ? 0 : Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    if (reduced.matches) progress = 0;
    draw();
    update();
  }

  if (scene !== 'home') addEventListener('scroll', update, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = lastTime = 0;
    update();
  });
  addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', resize);
  resize();
}


// An abstract workspace forms once per tab; returning to the work stays immediate.
if (document.body.classList.contains('home') && !reduced.matches) {
  let seen = false;
  try { seen = sessionStorage.getItem('janus-unveiled') === '1'; } catch {}
  if (!seen) {
    const opening = document.createElement('div');
    opening.className = 'unveiling';
    opening.innerHTML = `<svg viewBox="0 0 720 460" fill="none" aria-hidden="true">
      <g class="workspace-frame"><rect x="140" y="100" width="440" height="260" rx="3" pathLength="1"/><path d="M140 142H580 M250 142V360" pathLength="1"/></g>
      <g class="workspace-piece piece-one"><path d="M168 175H220 M168 196H210 M168 217H217" pathLength="1"/></g>
      <g class="workspace-piece piece-two"><rect x="280" y="172" width="270" height="72" rx="2" pathLength="1"/><path d="M300 209H335L355 192L380 222L411 190L440 209H528" pathLength="1"/></g>
      <g class="workspace-piece piece-three"><rect x="280" y="265" width="125" height="64" rx="2" pathLength="1"/><rect x="425" y="265" width="125" height="64" rx="2" pathLength="1"/></g>
    </svg><button type="button" class="skip-intro">Skip intro</button>`;
    document.body.append(opening);
    document.body.classList.add('is-unveiling');
    try { sessionStorage.setItem('janus-unveiled', '1'); } catch {}
    const events = ['wheel', 'touchstart', 'keydown', 'focusin'];
    function finish() {
      clearTimeout(timeout);
      document.body.classList.remove('is-unveiling');
      opening.remove();
      for (const event of events) window.removeEventListener(event, finish);
      reduced.removeEventListener('change', finish);
    }
    const timeout = setTimeout(finish, 2200);
    for (const event of events) window.addEventListener(event, finish, { passive: true });
    reduced.addEventListener('change', finish);
    opening.querySelector('button').addEventListener('click', finish);
  }
}
