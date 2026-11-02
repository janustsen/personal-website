const books = [...document.querySelectorAll('.book')];
const tiers = ['S', 'A', 'B', 'C'];
const states = ['unset', 'want', 'reading', 'finished'];
const status = document.querySelector('#shelf-status');
const search = document.querySelector('#book-search');
const topic = document.querySelector('#book-topic');
const storageKey = 'janus-bookshelf-v1';
let dragged = null;

function move(book, tier) {
  document.querySelector(`.tier[data-tier="${tier}"] .tier-books`).append(book);
  book.querySelector('.book-tier').value = tier;
}
function save() {
  const data = Object.fromEntries(books.map(book => [book.dataset.book, {
    tier: book.querySelector('.book-tier').value, state: book.querySelector('.book-state').value
  }]));
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    status.textContent = 'Your arrangement is saved in this browser. It does not change Janus’s public shelf.';
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
    if (states.includes(entry?.state)) book.querySelector('.book-state').value = entry.state;
  }
} catch { /* Keep the suggested shelf if saved data is unavailable or invalid. */ }
for (const book of books) {
  book.querySelector('.book-controls').hidden = false;
  const summary = book.querySelector('summary');
  summary.draggable = true;
  summary.addEventListener('dragstart', event => {
    dragged = book;
    event.dataTransfer.setData('text/plain', book.dataset.book);
    event.dataTransfer.effectAllowed = 'move';
  });
  summary.addEventListener('dragend', () => { dragged = null; document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target')); });
  book.querySelector('.book-tier').addEventListener('change', event => {
    move(book, event.target.value); event.target.focus(); save();
  });
  book.querySelector('.book-state').addEventListener('change', save);
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
  for (const book of books) { move(book, book.dataset.defaultTier); book.querySelector('.book-state').value = 'unset'; book.open = false; }
  search.value = ''; topic.value = 'all'; filter();
  try { localStorage.removeItem(storageKey); } catch {}
  status.textContent = 'Suggested tiers restored. Reading statuses cleared.';
});
document.querySelector('.shelf-tools').hidden = false;
document.querySelector('.shelf-help').textContent = 'These are reading suggestions, not a record of what I’ve read or my personal ratings. Open a book for context. Drag it to a tier, or use the tier menu inside. Your changes stay in this browser.';
