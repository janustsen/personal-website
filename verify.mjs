import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Set PLAYWRIGHT_CORE_PATH to an existing installation, or install playwright-core locally.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const base = process.env.SITE_URL || 'http://127.0.0.1:63027/';
const evidence = process.env.EVIDENCE_DIR || 'work/verification';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const report = [];
try {
  for (const scenario of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'phone', width: 390, height: 844 },
    { name: 'compact', width: 360, height: 640 },
    { name: 'reduced', width: 390, height: 844, reducedMotion: 'reduce' },
    { name: 'no-javascript', width: 390, height: 844, javaScriptEnabled: false },
  ]) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, reducedMotion: scenario.reducedMotion || 'no-preference', javaScriptEnabled: scenario.javaScriptEnabled !== false });
    await context.addInitScript(() => {
      Element.prototype.requestPointerLock = () => Promise.resolve();
      Element.prototype.setPointerCapture = () => {};
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`); });
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), 'Janus Tsen.');
    assert.equal(await page.locator('.hero-copy .button').isVisible(), true);
    const opening = await page.evaluate(() => ({
      width: innerWidth, document: document.documentElement.scrollWidth,
      images: [...document.images].every(image => image.complete && image.naturalWidth > 0),
      brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash),
      contact: [...document.querySelectorAll('a[href^="mailto:"]')].map(link => link.getAttribute('href')),
    }));
    assert.equal(opening.document, opening.width, `${scenario.name}: horizontal overflow`);
    assert.equal(opening.images, true);
    assert.deepEqual(opening.brokenAnchors, []);
    assert.ok(opening.contact.length >= 2 && opening.contact.every(href => href === 'mailto:janustsen@outlook.com'));
    await page.screenshot({ path: join(evidence, `${scenario.name}-opening.png`) });
    await page.getByRole('link', { name: 'Explore my work' }).click();
    await page.waitForFunction(() => location.hash === '#work');
    await page.waitForTimeout(650);
    const workTop = await page.locator('#work h2').evaluate(element => element.getBoundingClientRect().top);
    assert.ok(workTop >= 65 && workTop < 280, `${scenario.name}: work navigation obscured or delayed (${workTop})`);
    await page.locator('#verdnt summary').click();
    assert.equal(await page.locator('#verdnt details').getAttribute('open'), '');
    assert.ok((await page.locator('#verdnt .detail-body').innerText()).includes('My contribution'));
    await page.locator('#verdnt summary').press('Enter');
    assert.equal(await page.locator('#verdnt details').getAttribute('open'), null);
    await page.locator('#trus summary').click();
    assert.ok((await page.locator('#trus .detail-body').innerText()).includes('Diego Sanchez'));
    await page.locator('#trus summary').press('Space');
    assert.equal(await page.locator('#trus details').getAttribute('open'), null);
    await page.locator('.project-index summary').click();
    assert.ok((await page.locator('.project-index .detail-body').innerText()).includes('Forecasts'));
    await page.locator('.project-index summary').press('Enter');
    for (const [name, selector] of [['connection', '.intersection'], ['work', '#verdnt'], ['ai', '#ai'], ['experience', '#experience'], ['about', '#about'], ['contact', '#contact']]) {
      await page.locator(selector).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${scenario.name}: overflow at ${name}`);
      await page.screenshot({ path: join(evidence, `${scenario.name}-${name}.png`) });
    }
    await page.getByRole('link', { name: 'Back to top' }).click();
    // Poll from the test process: page-side rAF polling can stall with JS disabled.
    for (let attempt = 0; attempt < 30 && await page.evaluate(() => scrollY >= 10); attempt++) await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => scrollY < 10));
    if (scenario.reducedMotion) {
      assert.equal(await page.locator('.hero-art img').evaluate(element => getComputedStyle(element).transform), 'none');
      assert.equal(await page.locator('.connection-trace path').first().evaluate(element => getComputedStyle(element).strokeDashoffset), '0px');
    }
    if (scenario.name === 'desktop') {
      const positions = [];
      for (const y of [300, 900, 1400]) {
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(100);
        positions.push(await page.locator('.intersection').evaluate(element => Number(getComputedStyle(element).getPropertyValue('--join'))));
      }
      assert.ok(positions[2] > positions[0], 'Scroll must draw the connection');
      assert.equal(positions[2], 1);
      report.push({ motion: positions });
    }
    assert.deepEqual(errors, [], `${scenario.name}: browser or asset errors`);
    report.push({ scenario: scenario.name, status: 'passed', navigation: true, nativeDetails: true, keyboard: true, images: true, overflow: false, errors });
    await context.close();
  }
  await writeFile(join(evidence, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
