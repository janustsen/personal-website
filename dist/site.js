// Scroll only enriches the composition. All content and navigation work without it.
if (window.ScrollCraft) ScrollCraft.mount(document.body);
const intersection = document.querySelector('.intersection');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let frame;
function drawConnection() {
  const { top, height } = intersection.getBoundingClientRect();
  const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (innerHeight - top - height * .2) / (height * .72)));
  intersection.style.setProperty('--join', progress);
  frame = null;
}
function scheduleConnection() { if (!frame) frame = requestAnimationFrame(drawConnection); }
addEventListener('scroll', scheduleConnection, { passive: true });
addEventListener('resize', scheduleConnection, { passive: true });
reducedMotion.addEventListener('change', scheduleConnection);
drawConnection();
document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => {
  window.ScrollCraft?.instances.forEach(instance => instance.layout());
  scheduleConnection();
}));
