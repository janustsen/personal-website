import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const base = process.env.SITE_URL || 'http://127.0.0.1:63027/';
const evidence = process.env.EVIDENCE_DIR || 'work/verification';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : chromium.executablePath()), headless: true });
const drafts = ['S1', 'S2', 'S3', 'S4', 'S5', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'V1', 'V2', 'V3', 'V4', 'V5', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const heldBack = ['V1', 'V3', 'V5', 'B1'];
const results = [];
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
try {
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
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

    // Drafted insights carry removable IDs; personal ones stay hidden until approved.
    assert.deepEqual(await page.locator('[data-draft]').evaluateAll(els => els.map(el => el.dataset.draft)), drafts);
    for (const id of drafts) {
      const item = page.locator(`[data-draft="${id}"]`);
      if (heldBack.includes(id)) assert.equal(await item.isVisible(), false, `${id} is held back`);
      else {
        assert.ok(await item.isVisible(), `${id} is shown for review`);
        assert.match(await item.evaluate(el => getComputedStyle(el, '::before').content), new RegExp(`Draft ${id}`));
      }
    }

    // Scroll reveal: below-the-fold content waits for the viewport only when motion is welcome.
    const late = page.locator('#about .item').last();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('js')), animated);
    assert.equal(await late.evaluate(el => getComputedStyle(el).opacity), animated ? '0' : '1');
    assert.equal(await page.locator('.reveal').first().evaluate(el => getComputedStyle(el).opacity), '1', 'Opening content is visible at once');
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 500) {
      await page.evaluate(top => scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.reveal').evaluateAll(els => els.filter(el => !el.closest('[hidden]') && getComputedStyle(el).opacity !== '1').length), 0, 'Everything is visible after scrolling');
    assert.ok(await page.locator('#about img').evaluate(img => img.complete && img.naturalWidth > 0), 'Headshot loads');
    assert.deepEqual(await page.locator('.thumb.drawing img').evaluateAll(imgs => imgs.map(img => img.complete && img.naturalWidth > 0)), [true, true, true], 'Line drawings load');
    assert.equal(await page.locator('a').evaluateAll(links => links.filter(a => /[\u2197\u2196\u2198\u2199]/.test(a.textContent)).length), 0, 'Links carry no arrow glyphs');
    await page.screenshot({ path: join(evidence, `${name}-home-full.png`), fullPage: true });

    // Section jumps and project disclosures.
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('.jump').getByRole('link', { name: 'Experience' }).click();
    await page.waitForURL(`${base}#experience`);
    for (let attempt = 0; attempt < 50 && Math.abs(await page.locator('#experience').evaluate(el => el.getBoundingClientRect().top)) >= 4; attempt++) await page.waitForTimeout(100);
    assert.ok(await page.locator('#experience').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 4), 'Jump link lands on its section');
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
      await book.locator('.book-tier').selectOption('C');
      await book.locator('.book-state').selectOption('reading');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await book.evaluate(el => el.closest('.tier').dataset.tier), 'C');
      assert.equal(await book.locator('.book-state').inputValue(), 'reading');
      await page.locator('#book-search').fill('Rumelt');
      assert.equal(await page.locator('.book:visible').count(), 1);
      await page.locator('#book-topic').selectOption('Philosophy');
      assert.ok(await page.locator('#no-books').isVisible());
      await page.getByRole('button', { name: 'Reset shelf' }).click();
      assert.equal(await page.locator('.book:visible').count(), 20);
      assert.equal(await book.evaluate(el => el.closest('.tier').dataset.tier), 'S');
      assert.equal(await book.locator('.book-state').inputValue(), 'unset');
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
    results.push({ scenario: name, status: 'passed', reveal: animated ? 'on scroll' : 'static', drafts: `${drafts.length - heldBack.length} shown, ${heldBack.length} held back`, bookshelf: name === 'no-js' ? 'native details' : 'tiers, status, filter, reset', overflow: false, errors });
    await context.close();
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
