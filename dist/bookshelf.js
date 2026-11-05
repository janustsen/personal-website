const books = [...document.querySelectorAll('.book')];
const tiers = ['S', 'A', 'B', 'C'];
const status = document.querySelector('#shelf-status');
const search = document.querySelector('#book-search');
const topic = document.querySelector('#book-topic');
const storageKey = 'janus-bookshelf-v1';
let dragged = null;

function move(book, tier) {
  document.querySelector(`.tier[data-tier="${tier}"] .tier-books`).append(book);
}
const tierOf = book => book.closest('.tier').dataset.tier;
function save() {
  const data = Object.fromEntries(books.map(book => [book.dataset.book, { tier: tierOf(book) }]));
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    status.textContent = 'Your arrangement is saved in this browser. It doesn’t change the public shelf.';
  } catch { status.textContent = 'Your arrangement works here, but this browser cannot save it.'; }
}
function filter() {
  const query = search.value.trim().toLowerCase();
  for (const book of books) {
    book.hidden = !(book.querySelector('summary').textContent.toLowerCase().includes(query) && (topic.value === 'all' || book.dataset.topic === topic.value));
  }
  document.querySelector('#no-books').hidden = books.some(book => !book.hidden);
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const book of books) {
    const entry = saved?.[book.dataset.book];
    if (tiers.includes(entry?.tier)) move(book, entry.tier);
  }
} catch { /* Keep the suggested shelf if saved data is unavailable or invalid. */ }
for (const book of books) {
  const summary = book.querySelector('summary');
  summary.draggable = true;
  summary.addEventListener('dragstart', event => {
    dragged = book;
    event.dataTransfer.setData('text/plain', book.dataset.book);
    event.dataTransfer.effectAllowed = 'move';
  });
  summary.addEventListener('dragend', () => { dragged = null; document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target')); });
  // Keyboard alternative to dragging: select a book and press S, A, B or C.
  summary.addEventListener('keydown', event => {
    const tier = event.key.toUpperCase();
    if (event.altKey || event.ctrlKey || event.metaKey || !tiers.includes(tier)) return;
    event.preventDefault(); move(book, tier); summary.focus(); save();
    status.textContent = `Moved to tier ${tier}.`;
  });
}
for (const tier of document.querySelectorAll('.tier')) {
  tier.addEventListener('dragover', event => { if (dragged) { event.preventDefault(); tier.classList.add('drop-target'); } });
  tier.addEventListener('dragleave', event => { if (!tier.contains(event.relatedTarget)) tier.classList.remove('drop-target'); });
  tier.addEventListener('drop', event => {
    event.preventDefault();
    if (dragged) { move(dragged, tier.dataset.tier); save(); }
    dragged = null; tier.classList.remove('drop-target');
  });
}
search.addEventListener('input', filter);
topic.addEventListener('change', filter);
document.querySelector('#reset-shelf').addEventListener('click', () => {
  for (const book of books) { move(book, book.dataset.defaultTier); book.open = false; }
  search.value = ''; topic.value = 'all'; filter();
  try { localStorage.removeItem(storageKey); } catch {}
  status.textContent = 'Suggested tiers restored.';
});
document.querySelector('.shelf-tools').hidden = false;
document.querySelector('.shelf-help').textContent = 'I haven’t necessarily read these, and the tiers aren’t my ratings. Open a book to see a note on it. To move it, drag it to another tier, or select it and press S, A, B or C. Your changes stay in this browser.';
