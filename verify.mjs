import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const base = process.env.SITE_URL || 'http://127.0.0.1:63027/';
const evidence = process.env.EVIDENCE_DIR || 'work/verification';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : chromium.executablePath()), headless: true });
const heldBack = ['V1', 'V3', 'V5', 'B1'];
const results = [];
// Pinned rails, scroll-scrubbed drawing and the condensed header bar.
async function railChecks(context, name, pinned, animated) {
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  // Jump instantly so every measurement is taken at rest, not mid smooth-scroll.
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const bar = page.locator('.bar');
  assert.equal(await bar.evaluate(el => el.classList.contains('on')), false, 'Bar hidden while the header shows');
  const span = page.locator('.span[data-art="strategy"]');
  const fig = span.locator('.art');
  await span.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.span[data-art="strategy"] .art svg'));
  const at = async t => {
    await page.evaluate(t => { const s = document.querySelector('.span[data-art="strategy"]'); const f = s.querySelector('.art');
      const pin = parseFloat(getComputedStyle(f).top) || 0; scrollTo(0, scrollY + s.getBoundingClientRect().top - pin + t * (s.offsetHeight - f.offsetHeight)); }, t);
    await page.waitForTimeout(250);
    return page.evaluate(() => { const f = document.querySelector('.span[data-art="strategy"] .art'); const l = document.querySelector('#strategy-label');
      return { top: f.getBoundingClientRect().top, label: l.getBoundingClientRect().top, pin: parseFloat(getComputedStyle(f).top), position: getComputedStyle(f).position,
        p: f.classList.contains('drawing') ? parseFloat(getComputedStyle(f).getPropertyValue('--p')) : 1, drawing: f.classList.contains('drawing'), bar: document.querySelector('.bar').classList.contains('on'),
        barBottom: document.querySelector('.bar').getBoundingClientRect().bottom, current: document.querySelector('.bar [aria-current]')?.textContent }; });
  };
  const a = await at(0.1), b = await at(0.6), c = await at(1.4);
  assert.ok(a.bar && a.current === 'Thinking', `${name}: bar shows and marks Thinking (${JSON.stringify(a)})`);
  if (!pinned) {
    assert.equal(a.position, 'static', 'Phone: no pinned rails');
  } else {
    assert.ok(Math.abs(a.top - a.pin) < 2 && Math.abs(b.top - b.pin) < 2, `${name}: drawing pinned while entries scroll`);
    assert.ok(Math.abs(a.label - a.pin) < 2 && Math.abs(b.label - b.pin) < 2, `${name}: section label pinned`);
    assert.ok(a.pin >= a.barBottom, `${name}: rails sit below the bar`);
    assert.ok(c.top < c.pin - 40, `${name}: drawing releases at the end of its span`);
    if (!animated) assert.ok(!a.drawing, `${name}: reduced motion shows drawings fully drawn`);
  }
  if (animated) {
    // Draw-in happens while the section is on screen: it starts as the section (phones: the drawing) enters,
    // is partly drawn with entries readable beside it, and is complete while the section's text is still visible.
    const place = frac => page.evaluate(([frac, wide]) => {
      const s = document.querySelector('.span[data-art="strategy"]'), f = s.querySelector('.art');
      const el = wide ? s : f; scrollTo(0, scrollY + el.getBoundingClientRect().top - frac * innerHeight);
    }, [frac, pinned]);
    const read = () => page.evaluate(() => {
      const s = document.querySelector('.span[data-art="strategy"]'), f = s.querySelector('.art');
      const visibleText = [...s.querySelectorAll('.entries p')].filter(el => { const r = el.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight; }).length;
      return { p: parseFloat(getComputedStyle(f).getPropertyValue('--p')), visibleText, artTop: f.getBoundingClientRect().top, artBottom: f.getBoundingClientRect().bottom };
    });
    const samples = [];
    for (const frac of [0.9, 0.75, 0.5, 0.3, 0.1]) { await place(frac); await page.waitForTimeout(200); samples.push(await read()); }
    if (pinned) for (let k = 1; k <= 12; k++) { await page.evaluate(() => scrollBy(0, innerHeight * 0.15)); await page.waitForTimeout(120); const r = await read(); samples.push(r); if (r.p >= 1) break; }
    const ps = samples.map(x => x.p);
    assert.equal(ps[0], 0, `${name}: nothing drawn before the section enters (${ps})`);
    assert.ok(ps[1] > 0 && ps[1] < 0.5, `${name}: drawing starts as soon as the section enters (${ps})`);
    assert.ok(ps.every((v, i) => i === 0 || v >= ps[i - 1]), `${name}: drawing progress follows the scroll (${ps})`);
    const partial = samples.filter(x => x.p > 0.05 && x.p < 0.95);
    assert.ok(partial.length >= 2 && partial.every(x => x.visibleText > 0 && x.artBottom > 0), `${name}: text is on screen beside a partly drawn image (${JSON.stringify(partial)})`);
    const done = samples.find(x => x.p >= 1);
    assert.ok(done && done.visibleText > 0 && done.artBottom > 0, `${name}: drawing completes while the section is still on screen (${JSON.stringify(samples.at(-1))})`);
  }
  if (pinned) {
    // Every section: a pinned drawing always has its section's text beside it, and it is complete before it releases.
    for (const slug of await page.locator('.span').evaluateAll(spans => spans.map(sp => sp.dataset.art))) {
      const sel = `.span[data-art="${slug}"]`;
      await page.evaluate(sel => { const sp = document.querySelector(sel); scrollTo(0, scrollY + sp.getBoundingClientRect().top - 0.9 * innerHeight); }, sel);
      let wasPinned = false, released = null;
      for (let k = 0; k < 80 && !released; k++) {
        await page.waitForTimeout(60);
        const r = await page.evaluate(sel => {
          const sp = document.querySelector(sel), f = sp.querySelector('.art'), pin = parseFloat(getComputedStyle(f).top);
          const blocks = [...sp.querySelectorAll('.entries > *')].filter(el => el.getClientRects().length), last = blocks[blocks.length - 1].getBoundingClientRect();
          const top = f.getBoundingClientRect().top;
          return { pinned: Math.abs(top - pin) < 1.5 && sp.getBoundingClientRect().top < pin - 1, gone: top < pin - 1.5, lastBottom: last.bottom, pin,
            p: f.classList.contains('drawing') ? parseFloat(getComputedStyle(f).getPropertyValue('--p')) : 1 };
        }, sel);
        if (r.pinned) { wasPinned = true; assert.ok(r.lastBottom > r.pin + 40, `${name}/${slug}: pinned drawing has its section's text beside it (${JSON.stringify(r)})`); }
        if (r.gone) released = r;
        // The last section can reach the page end before its drawing scrolls away; that counts as its end.
        const moved = await page.evaluate(() => { const y = scrollY; scrollBy(0, innerHeight * 0.08); return scrollY !== y; });
        if (!moved && !released) released = r;
      }
      assert.ok(released, `${name}/${slug}: drawing releases or the page ends`);
      assert.equal(released.p, 1, `${name}/${slug}: drawing is complete before it releases`);
    }
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  assert.equal(await bar.evaluate(el => el.classList.contains('on')), false, `${name}: bar expands back into the header at the top`);
  await page.close();
  results.push({ rails: name, status: 'passed' });
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
try {
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'compact', viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true },
    { name: 'reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    { name: 'no-js', viewport: { width: 390, height: 844 }, javaScriptEnabled: false },
  ]) {
    const { name, ...options } = scenario;
    const animated = name !== 'reduced' && name !== 'no-js';
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').textContent(), 'Janus Tsen');
    assert.ok(await page.evaluate(() => document.fonts.check('300 17px "Crimson Pro"') && document.fonts.check('28px "Unica One"')), 'Site fonts load');
    assert.equal(await page.getByRole('link', { name: 'GitHub', exact: true }).first().getAttribute('href'), 'https://github.com/janustsen');
    assert.equal(await page.getByRole('link', { name: 'Email', exact: true }).first().getAttribute('href'), 'mailto:janustsen@outlook.com');
    for (const id of ['building', 'experience', 'strategy', 'ai', 'values', 'books', 'about']) assert.equal(await page.locator(`#${id} h2.label`).count(), 1, `${id} has a section label`);
    assert.ok(await noOverflow(page), `${name}: no horizontal overflow at load`);
    await page.screenshot({ path: join(evidence, `${name}-home-top.png`) });

    // Held-back personal entries stay hidden; nothing on the page carries a draft tag.
    assert.deepEqual(await page.locator('[data-draft]').evaluateAll(els => els.map(el => el.dataset.draft)), heldBack);
    for (const id of heldBack) assert.equal(await page.locator(`[data-draft="${id}"]`).isVisible(), false, `${id} is held back`);
    assert.equal(await page.locator('main *').evaluateAll(els => els.filter(el => /Draft|for approval/i.test(getComputedStyle(el, '::before').content)).length), 0, 'No draft tags shown');

    // Scroll reveal: below-the-fold content waits for the viewport only when motion is welcome.
    const late = page.locator('main > section').last().locator('.item').last();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('js')), animated);
    assert.equal(await late.evaluate(el => getComputedStyle(el).opacity), animated ? '0' : '1');
    assert.equal(await page.locator('.opening').evaluate(el => getComputedStyle(el).opacity), '1', 'Opening About text is visible at once');
    assert.equal(await page.locator('#about').evaluate(el => el === document.querySelector('main > section')), true, 'About opens the page');
    assert.equal(await page.locator('.reveal').evaluateAll(els => els.filter(el => el.getBoundingClientRect().top < innerHeight && getComputedStyle(el).opacity !== '1').length), 0, 'Content on screen at load shows at once');
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 500) {
      await page.evaluate(top => scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.reveal').evaluateAll(els => els.filter(el => !el.closest('[hidden]') && getComputedStyle(el).opacity !== '1').length), 0, 'Everything is visible after scrolling');
    assert.ok(await page.locator('.mark').evaluate(img => img.complete && img.currentSrc.endsWith(devicePixelRatio >= 2 ? '/avatar-152.webp' : '/avatar-76.webp') && img.alt === 'Janus Tsen'), 'Avatar mark loads as WebP, sharp at the screen density');
    // Every span's drawing is on the page: inline SVG strokes with JavaScript, the image file without it.
    await page.waitForFunction(js => [...document.querySelectorAll('.art')].every(fig => js ? fig.querySelectorAll('svg path').length > 0 : fig.querySelector('img').complete && fig.querySelector('img').naturalWidth > 0), name !== 'no-js');
    assert.deepEqual(await page.locator('main > section').evaluateAll(secs => secs.map(sec => sec.querySelectorAll('.art').length)), [1, 1, 1, 1, 1, 1, 1, 1], 'Exactly one drawing per section');
    await page.waitForFunction(() => { const path = [...document.querySelectorAll('.art')].pop().querySelector('svg path:last-of-type');
      return !path || parseFloat(getComputedStyle(path).strokeDashoffset) === 0; }, null, { timeout: 6000 });
    assert.equal(await page.locator('a').evaluateAll(links => links.filter(a => /[\u2197\u2196\u2198\u2199]/.test(a.textContent)).length), 0, 'Links carry no arrow glyphs');
    await page.screenshot({ path: join(evidence, `${name}-home-full.png`), fullPage: true });

    // Section jumps and project disclosures.
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('.jump').getByRole('link', { name: 'Experience' }).click();
    await page.waitForURL(`${base}#experience`);
    for (let attempt = 0; attempt < 50 && Math.abs(await page.locator('#experience').evaluate(el => el.getBoundingClientRect().top)) >= 4; attempt++) await page.waitForTimeout(100);
    assert.ok(await page.locator('#experience').evaluate(el => Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) < 4), 'Jump link lands on its section, below the bar');
    for (const id of ['verdnt', 'trus']) {
      const summary = page.locator(`#${id} summary`);
      await summary.click();
      assert.equal(await page.locator(`#${id} details`).getAttribute('open'), '');
      assert.equal(await page.locator(`#${id} .detail-body`).evaluate(el => getComputedStyle(el).animationName), name === 'reduced' ? 'none' : 'note-open');
      await page.screenshot({ path: join(evidence, `${name}-${id}-open.png`) });
      await summary.press('Enter');
      assert.equal(await page.locator(`#${id} details`).getAttribute('open'), null);
    }
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => ['A', 'SUMMARY'].includes(document.activeElement.tagName)));

    // Old page URLs land on their home sections.
    for (const id of ['building', 'experience', 'about']) {
      await page.goto(new URL(`${id}/`, base).href);
      await page.waitForURL(`${base}#${id}`);
    }

    // Bookshelf tier board.
    await page.goto(new URL('bookshelf/', base).href, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').innerText(), 'BOOKSHELF');
    assert.equal(await page.locator('.book').count(), 20);
    assert.equal(await page.locator('a').evaluateAll(links => links.filter(a => /[\u2197\u2196\u2198\u2199]/.test(a.textContent)).length), 0, 'Bookshelf links carry no arrow glyphs');
    const book = page.locator('[data-book="strategy"]');
    await book.locator('summary').click();
    assert.equal(await book.getAttribute('open'), '');
    const otherBook = page.locator('.book:not([data-book="strategy"])').first();
    await otherBook.locator('summary').click();
    assert.equal(await otherBook.getAttribute('open'), '');
    assert.equal(await book.getAttribute('open'), '', 'Opening another book must keep existing notes open');
    await otherBook.locator('summary').click();
    if (name !== 'no-js') {
      assert.equal(await page.locator('.book select, .book-controls').count(), 0, 'Books have no tier or status menus');
      await book.locator('summary').focus();
      await page.keyboard.press('c');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await book.evaluate(el => el.closest('.tier').dataset.tier), 'C', 'Keyboard move persists');
      await page.locator('#book-search').fill('Rumelt');
      assert.equal(await page.locator('.book:visible').count(), 1);
      await page.locator('#book-topic').selectOption('Philosophy');
      assert.ok(await page.locator('#no-books').isVisible());
      await page.getByRole('button', { name: 'Reset shelf' }).click();
      assert.equal(await page.locator('.book:visible').count(), 20);
      assert.equal(await book.evaluate(el => el.closest('.tier').dataset.tier), 'S');
      if (name === 'desktop') {
        await book.locator('summary').dragTo(page.locator('.tier[data-tier="A"] .tier-label'));
        assert.equal(await book.evaluate(el => el.closest('.tier').dataset.tier), 'A');
        await page.getByRole('button', { name: 'Reset shelf' }).click();
      }
    } else {
      assert.equal(await page.locator('.shelf-tools').isVisible(), false);
      await book.locator('summary').press('Enter');
      assert.equal(await book.getAttribute('open'), null);
    }
    assert.ok(await noOverflow(page), `${name}: bookshelf has no horizontal overflow`);
    await page.screenshot({ path: join(evidence, `${name}-bookshelf.png`), fullPage: true });
    await page.getByRole('link', { name: '← Janus Tsen' }).click();
    await page.waitForURL(base);

    assert.deepEqual(errors, []);
    results.push({ scenario: name, status: 'passed', reveal: animated ? 'on scroll' : 'static', heldBack: heldBack.length, bookshelf: name === 'no-js' ? 'native details' : 'tiers, keyboard moves, filter, reset', overflow: false, errors });
    await context.close();
  }
  for (const [label, options, pinned, animated] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }, true, true],
    ['tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true }, true, true],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, false, true],
    ['reduced-desktop', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }, true, false],
  ]) {
    const railContext = await browser.newContext(options);
    await railChecks(railContext, label, pinned, animated);
    await railContext.close();
  }
  // A reduced-motion preference set after load still shows every section.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.reveal').evaluateAll(els => els.filter(el => !el.closest('[hidden]') && getComputedStyle(el).opacity !== '1').length), 0);
  await context.close();
  results.push({ preferenceChange: 'reduced motion reveals everything', status: 'passed' });
  await writeFile(join(evidence, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
