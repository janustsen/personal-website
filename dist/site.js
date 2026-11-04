// Gentle scroll reveal. Content stays visible without JavaScript or with reduced motion.
const items = [...document.querySelectorAll('.reveal')];
const show = el => el.classList.add('in');
if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) items.forEach(show);
else {
  // Whatever is already on screen shows at once, so nothing flashes away and back.
  for (const el of items) if (el.getBoundingClientRect().top < innerHeight) show(el);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { show(entry.target); observer.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.filter(el => !el.classList.contains('in')).forEach(el => observer.observe(el));
  document.documentElement.classList.add('js');
}
