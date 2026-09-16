const canvas = document.querySelector('#ink');
const context = canvas?.getContext('2d');
if (context) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width, height, progress = 0, target = 0, frame = 0;

  function draw() {
    context.clearRect(0, 0, width, height);
    const mobile = width < 700;
    context.save();
    // Normalized coordinates keep the ink field composed independently on phones.
    context.translate(width * (mobile ? -.2 : .32), height * (mobile ? .38 : .06));
    context.scale(width * (mobile ? 1.35 : .82), height * (mobile ? .7 : 1.03));
    for (let i = 0; i < 42; i++) {
      const offset = i / 41;
      const wave = Math.sin(offset * 4.5 + progress * 2.8);
      context.beginPath();
      context.moveTo(.08 + offset * .62 - progress * .22, 1.24);
      context.bezierCurveTo(
        -.12 + offset * .5 + progress * .42, .65 - progress * .45,
        1.03 - offset * .48 + wave * .1, .98 - progress * .88,
        .87 + offset * .23, -.23 + progress * .35
      );
      context.strokeStyle = `rgba(42, 53, 60, ${.19 + Math.sin(offset * Math.PI) * .23})`;
      context.lineWidth = (i % 7 === 0 ? 1 : .65) / width;
      context.stroke();
    }
    context.restore();
  }

  function tick() {
    progress += (target - progress) * .16;
    if (Math.abs(target - progress) < .0005) progress = target;
    draw();
    frame = progress === target ? 0 : requestAnimationFrame(tick);
  }

  function update() {
    target = reduced.matches ? 0 : Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    if (!frame) frame = requestAnimationFrame(tick);
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

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', resize);
  resize();
}
