import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const base = process.env.SITE_URL || 'http://127.0.0.1:63027/';
const evidence = process.env.EVIDENCE_DIR || 'work/verification';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : chromium.executablePath()), headless: true });
const results = [];
try {
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'phone', viewport: { width: 390, height: 844 } },
    { name: 'compact', viewport: { width: 360, height: 640 } },
    { name: 'reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    { name: 'no-js', viewport: { width: 390, height: 844 }, javaScriptEnabled: false },
  ]) {
    const { name, ...options } = scenario;
    const context = await browser.newContext(options);
    await context.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.resolve(); Element.prototype.setPointerCapture = () => {}; });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), 'Janus Tsen');
    assert.equal(await page.getByRole('link', { name: 'GitHub', exact: true }).getAttribute('href'), 'https://github.com/janustsen');
    assert.ok(await page.locator('.portrait img').evaluate(img => img.complete && img.naturalWidth > 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
    if (name !== 'reduced' && name !== 'no-js') {
      assert.equal(await page.locator('.unveiling').count(), 1, 'First visit should unveil');
      assert.equal(await page.locator('.home-content').evaluate(el => getComputedStyle(el).opacity), '0');
      await page.waitForTimeout(350);
      await page.screenshot({ path: join(evidence, `${name}-intro.png`) });
      await page.locator('.unveiling').waitFor({ state: 'detached' });
    } else assert.equal(await page.locator('.unveiling').count(), 0);
    assert.equal(await page.locator('.home-content').evaluate(el => getComputedStyle(el).opacity), '1');
    const firstLink = page.locator('.home-links a').first();
    const linkBefore = await firstLink.boundingBox();
    await firstLink.focus();
    await page.waitForTimeout(300);
    assert.deepEqual(await firstLink.boundingBox(), linkBefore, 'Link feedback must not move the text');
    assert.equal(await firstLink.evaluate(el => getComputedStyle(el, '::after').transform), 'matrix(1, 0, 0, 1, 0, 0)');
    await page.screenshot({ path: join(evidence, `${name}-start.png`) });
    const canvasBefore = await page.locator('#ink').screenshot();
    const textBefore = await page.locator('.home-content').boundingBox();
    assert.ok(textBefore.y >= 0 && textBefore.y + textBefore.height <= options.viewport.height, `${name}: portrait and links must fit the opening viewport`);
    // The homepage must move while idle, with no scrolling or pointer input.
    await page.waitForTimeout(850);
    const canvasAfter = await page.locator('#ink').screenshot();
    const textAfter = await page.locator('.home-content').boundingBox();
    await page.screenshot({ path: join(evidence, `${name}-idle.png`) });
    if (name !== 'reduced' && name !== 'no-js') {
      assert.ok(!canvasBefore.equals(canvasAfter), `${name}: ink must visibly flow without input`);
      assert.ok(Math.abs(textBefore.y - textAfter.y) < 2, `${name}: text should stay still`);
    }
    if (name === 'reduced') assert.ok(canvasBefore.equals(canvasAfter), 'Reduced-motion ink must stay still');
    await page.mouse.wheel(0, 700);
    assert.equal(await page.evaluate(() => scrollY), 0, 'The homepage must not add decorative scroll space');
    for (const [label, path] of [['Building', 'building/'], ['Experience', 'experience/'], ['About', 'about/'], ['Bookshelf', 'bookshelf/']]) {
      await page.getByRole('link', { name: label, exact: false }).click();
      await page.waitForURL(new URL(path, base).href);
      assert.equal(await page.locator('h1').innerText(), label);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.waitForTimeout(150);
      const inkBefore = await page.locator('#ink').evaluate(el => el.toDataURL());
      await page.screenshot({ path: join(evidence, `${name}-${label.toLowerCase()}-start.png`) });
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(850);
      const inkAfter = await page.locator('#ink').evaluate(el => el.toDataURL());
      if (name !== 'reduced' && name !== 'no-js') assert.notEqual(inkBefore, inkAfter, `${label}: rendered ink should move`);
      else assert.equal(inkBefore, inkAfter, `${label}: fallback ink should stay static`);
      await page.screenshot({ path: join(evidence, `${name}-${label.toLowerCase()}-scrolled.png`) });
      if (label === 'Building') {
        for (const id of ['verdnt', 'trus']) {
          await page.locator(`#${id} summary`).click();
          assert.equal(await page.locator(`#${id} details`).getAttribute('open'), '');
          const animation = await page.locator(`#${id} .detail-body`).evaluate(el => getComputedStyle(el).animationName);
          assert.equal(animation, name === 'reduced' ? 'none' : 'note-open');
          if (name === 'reduced') {
            assert.equal(await page.locator(`#${id}`).evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
          }
          await page.screenshot({ path: join(evidence, `${name}-${id}-open.png`) });
          await page.locator(`#${id} summary`).press('Enter');
          assert.equal(await page.locator(`#${id} details`).getAttribute('open'), null);
        }
      }
      if (label === 'Bookshelf') {
        assert.equal(await page.locator('.book').count(), 20);
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
      }
      await page.screenshot({ path: join(evidence, `${name}-${path.slice(0,-1)}.png`), fullPage: true });
      await page.getByRole('link', { name: 'Janus Tsen' }).click();
      await page.waitForURL(base);
      assert.equal(await page.locator('.unveiling').count(), 0, 'Returning home must be immediate');
    }
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.activeElement.tagName === 'A'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ scenario: name, status: 'passed', pages: 5, homepageMotion: name === 'reduced' || name === 'no-js' ? 'static' : 'passive', scrollPixels: name === 'no-js' ? 'not applicable' : name === 'reduced' ? 'static' : 'changed', keyboardDetails: true, intro: name === 'reduced' || name === 'no-js' ? 'bypassed' : 'once per tab', overflow: false, errors });
    await context.close();
  }
  // Freeze passive animation time so pixel changes prove pointer response alone.
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await context.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(() => callback(1000));
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.unveiling').waitFor({ state: 'hidden' });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    const before = await page.locator('#ink').evaluate(el => el.toDataURL());
    await page.mouse.move(1100, 800, { steps: 12 });
    await page.waitForTimeout(500);
    const after = await page.locator('#ink').evaluate(el => el.toDataURL());
    if (reduced) assert.equal(before, after, 'Reduced motion must ignore the pointer');
    else assert.notEqual(before, after, 'Pointer must disrupt the ink independently of passive flow');
    await page.screenshot({ path: join(evidence, `pointer-${reduced ? 'reduced' : 'active'}.png`) });
    await context.close();
    results.push({ pointerResponse: reduced ? 'disabled for reduced motion' : 'verified with passive time frozen', status: 'passed' });
  }
  for (const action of ['skip', 'keyboard', 'scroll', 'preference']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.unveiling').count(), 1);
    if (action === 'skip') await page.getByRole('button', { name: 'Skip intro' }).click();
    if (action === 'keyboard') await page.keyboard.press('Tab');
    if (action === 'scroll') await page.mouse.wheel(0, 80);
    if (action === 'preference') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.unveiling').waitFor({ state: 'hidden', timeout: 700 });
    assert.equal(await page.locator('.home-content').evaluate(el => getComputedStyle(el).opacity), '1');
    await context.close();
    results.push({ introDismissal: action, status: 'passed' });
  }
  await writeFile(join(evidence, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
