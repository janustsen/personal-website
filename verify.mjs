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
// The first-visit intro plays once per tab session; the page checks below start from the settled page.
const skipIntro = () => { try { sessionStorage.setItem('intro', '1'); } catch {} };
// Check rendered media, not social-preview metadata or unused files in assets.
async function portraitOnly(page) {
  assert.deepEqual(await page.locator('img').evaluateAll(imgs => imgs.filter(img =>
    !(img.matches('.mark > img, .intro-face > img') && /\/assets\/drawings\/portrait\.svg$/.test(new URL(img.currentSrc || img.src).pathname)) &&
    !(img.matches('.art > img') && /\/assets\/drawings\/(building|experience|strategy|values|tech-ai|design|books)\.svg$/.test(new URL(img.currentSrc || img.src).pathname))
  ).map(img => img.getAttribute('src'))), [], 'Only line drawings appear on the page; no profile photo');
  assert.equal(await page.locator('#about img, #about svg, #about figure, #about picture, #about video, #about canvas').count(), 0, 'About is text only');
  assert.equal(await page.locator('.bar img, .bar svg, .bar picture').count(), 0, 'Header bar has no avatar or portrait');
}
async function mastheadChecks(page, name, animated, js) {
  await portraitOnly(page);
  if (!js) {
    await page.waitForFunction(() => { const img = document.querySelector('.mark img'); return img?.complete && img.naturalWidth > 0; }, null, { timeout: 6000 });
    assert.equal(await page.locator('.mark img').evaluate(img => getComputedStyle(img).opacity), '1', 'No-JS portrait is visible');
  } else {
    await page.waitForFunction(() => document.querySelector('.mark svg path'), null, { timeout: 6000 });
    if (animated) {
      // Observe real stroke progress before any scroll, rather than only checking the finished class.
      await page.waitForFunction(() => { const m = document.querySelector('.mark'), p = parseFloat(getComputedStyle(m).getPropertyValue('--p'));
        return p > 0.08 && p < 0.8; }, null, { timeout: 4000 });
      // Chrome can serialize a resolved offset as calc(1px).
      const start = await page.locator('.mark').evaluate(m => ({ p: parseFloat(getComputedStyle(m).getPropertyValue('--p')), scroll: scrollY,
        offsets: [...m.querySelectorAll('path')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, ''))),
        running: m.getAnimations().some(a => a.playState === 'running') }));
      assert.ok(start.running && start.scroll === 0 && start.offsets.some(v => v < 1) && start.offsets.some(v => v > 0), `${name}: strokes draw on load without scrolling (${JSON.stringify(start)})`);
      await page.screenshot({ path: join(evidence, `${name}-portrait-1-drawing.png`) });
      await page.waitForFunction(p => parseFloat(getComputedStyle(document.querySelector('.mark')).getPropertyValue('--p')) > p + 0.1, start.p, { timeout: 4000 });
      await page.screenshot({ path: join(evidence, `${name}-portrait-2-progress.png`) });
    } else {
      assert.ok(await page.locator('.mark').evaluate(m => !m.getAnimations().some(a => a.playState === 'running') &&
        [...m.querySelectorAll('path')].every(p => parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, '')) === 0)), `${name}: reduced-motion portrait is fully drawn immediately`);
    }
    await page.waitForFunction(() => { const m = document.querySelector('.mark'); return !m.getAnimations().some(a => a.playState === 'running') &&
      [...m.querySelectorAll('path')].every(p => parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, '')) === 0); }, null, { timeout: 6000 });
    assert.equal(await page.locator('.mark').evaluate(m => m.classList.contains('drawing')), animated, `${name}: reduced motion skips draw-in`);
    assert.equal(await page.evaluate(() => scrollY), 0, `${name}: portrait completes without scrolling`);
  }
  await page.screenshot({ path: join(evidence, `${name}-portrait-3-finished.png`) });
  results.push({ portrait: name, status: 'passed', mode: !js ? 'static SVG image' : animated ? 'strokes progress without scroll' : 'fully drawn, no animation' });
}
// First-visit intro: the line portrait (drawing itself in) and greeting alone, then on a scroll, key or swipe (or after about 3 seconds)
// they spring into the header picture and name while the page fades in. A reload or a deep link lands straight on the page.
async function introChecks(name, options, trigger) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // A blocked site.js must not leave the page hidden: the head script drops the intro after 4 seconds.
  if (trigger === 'blocked') await page.route('**/site.js*', route => route.abort());
  await page.goto(base);
  const state = () => page.evaluate(() => ({ on: document.documentElement.classList.contains('intro-on'), stage: !!document.querySelector('.intro-stage'),
    page: getComputedStyle(document.querySelector('.page')).opacity, h1: getComputedStyle(document.querySelector('.identity h1')).visibility,
    mark: getComputedStyle(document.querySelector('.mark img, .mark svg')).opacity }));
  if (trigger === 'blocked') await page.waitForTimeout(4500);
  if (trigger === 'none' || trigger === 'blocked') {
    assert.deepEqual(await state(), { on: false, stage: false, page: '1', h1: 'visible', mark: '1' }, `${name}: ${trigger === 'blocked' ? 'page and portrait show once a blocked site.js cancels the intro' : 'no intro without JavaScript'}`);
    await portraitOnly(page);
    assert.ok(await page.locator('.mark img').evaluate(img => img.complete && img.naturalWidth > 0 && /\/assets\/drawings\/portrait\.svg$/.test(new URL(img.src).pathname)), `${name}: loaded line portrait fallback`);
    await page.screenshot({ path: join(evidence, `intro-${name}-fallback.png`) });
    await context.close();
    results.push({ intro: name, status: 'passed', shown: false });
    return;
  }
  const still = options.reducedMotion === 'reduce';
  await page.waitForTimeout(1600);
  assert.deepEqual({ ...await state(), mark: undefined }, { on: true, stage: true, page: '0', h1: 'hidden', mark: undefined }, `${name}: only the intro shows on a first visit`);
  const hold = await page.evaluate(() => ({ hi: document.querySelector('.intro-hi').textContent, face: document.querySelectorAll('.intro-face svg path').length > 0,
    offsets: [...document.querySelectorAll('.intro-face svg path')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, ''))),
    moving: document.querySelector('.intro-stage').getAnimations({ subtree: true }).filter(a => a.playState === 'running').length }));
  await portraitOnly(page);
  assert.ok(hold.hi === 'Hey, I’m Janus!' && hold.face, `${name}: line portrait and greeting`);
  assert.ok(still ? hold.offsets.every(v => v === 0) : hold.offsets.some(v => v > 0) && hold.offsets.some(v => v < 1), `${name}: intro portrait ${still ? 'fully drawn' : 'partly drawn'} (${hold.offsets})`);
  assert.equal(await page.evaluate(() => document.querySelector('.intro-stage').children.length), 2, `${name}: the intro is only the picture and greeting, no scroll cue`);
  if (still) assert.equal(hold.moving, 0, `${name}: reduced motion keeps the intro still`);
  await page.screenshot({ path: join(evidence, `intro-${name}-1-start.png`) });
  // While the intro runs the page must not scroll or overflow sideways (a phone would zoom out).
  await page.evaluate(() => { window.introWatch = { wide: 0, scrolled: 0 }; const tick = () => { const w = window.introWatch;
    w.wide = Math.max(w.wide, document.documentElement.scrollWidth - innerWidth); w.scrolled = Math.max(w.scrolled, scrollY);
    if (document.documentElement.classList.contains('intro-on')) requestAnimationFrame(tick); }; tick(); });
  const { width, height } = options.viewport;
  if (trigger === 'wheel') { await page.mouse.move(width / 2, height / 2); await page.mouse.wheel(0, 600); }
  if (trigger === 'key') await page.keyboard.press('PageDown');
  if (trigger === 'touch') await (await context.newCDPSession(page)).send('Input.synthesizeScrollGesture', { x: width / 2, y: height * 0.7, yDistance: -300, gestureSourceType: 'touch' });
  const fired = await page.evaluate(() => performance.now());
  if (!still) {
    await page.waitForFunction(() => document.documentElement.classList.contains('intro-out'), null, { timeout: 4000 });
    await page.waitForTimeout(250);
    // The masthead portrait keeps drawing in, in step with the intro copy that lands on it; nothing else animates.
    const moving = await page.evaluate(() => [...document.querySelectorAll('.page *')].filter(el => !el.matches('.mark') && el.getAnimations().length).length);
    assert.equal(moving, 0, `${name}: the page fades in as a whole; no blocks are dealt into place`);
    await page.screenshot({ path: join(evidence, `intro-${name}-2-mid.png`) });
  }
  const ended = await (await page.waitForFunction(() => !document.documentElement.classList.contains('intro-on') && performance.now(), null, { timeout: 6000, polling: 'raf' })).jsonValue();
  if (trigger === 'auto') assert.ok(ended > 3000 && ended < 5000, `${name}: auto-advances after about 3 seconds (settled at ${Math.round(ended)} ms)`);
  else assert.ok(ended - fired < (still ? 600 : 2300), `${name}: the intro hands over in one short burst (${Math.round(ended - fired)} ms)`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(evidence, `intro-${name}-3-settled.png`) });
  assert.deepEqual(await state(), { on: false, stage: false, page: '1', h1: 'visible', mark: '1' }, `${name}: the page is fully back`);
  const settled = await page.evaluate(() => ({ watch: window.introWatch, scrollY,
    moved: [...document.querySelectorAll('.contact, .jump, .label, .opening > *, .item, .art')].filter(el => getComputedStyle(el).transform !== 'none' && !el.matches('.reveal:not(.in)')).length,
    hidden: [...document.querySelectorAll('.reveal')].filter(el => el.getBoundingClientRect().top < innerHeight && getComputedStyle(el).opacity !== '1').length,
    mark: getComputedStyle(document.querySelector('.mark')).visibility }));
  assert.deepEqual(settled, { watch: { wide: 0, scrolled: 0 }, scrollY: 0, moved: 0, hidden: 0, mark: 'visible' }, `${name}: settled into the normal layout`);
  // The normal page works after the intro: the masthead portrait finishes drawn, the page scrolls and the bar takes over.
  await page.waitForFunction(() => { const m = document.querySelector('.mark'); return m.querySelector('svg') && (!m.classList.contains('drawing') || parseFloat(getComputedStyle(m).getPropertyValue('--p')) === 1); }, null, { timeout: 4000 });
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, height * 0.6);
  await page.waitForTimeout(700);
  assert.ok(await page.evaluate(() => scrollY > 0), `${name}: the page scrolls after the intro`);
  await page.evaluate(() => scrollTo(0, 1600));
  await page.waitForTimeout(500);
  assert.ok(await page.locator('.bar').evaluate(el => el.classList.contains('on')), `${name}: header bar takes over after the intro`);
  // Repeat visit in the same tab, and a deep link in a new one, land straight on the page.
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal((await state()).on, false, `${name}: no intro on a repeat visit`);
  const deep = await context.newPage();
  await deep.goto(new URL('#building', base).href, { waitUntil: 'networkidle' });
  assert.equal(await deep.evaluate(() => document.documentElement.classList.contains('intro-on')), false, `${name}: no intro on a deep link`);
  assert.deepEqual(errors, []);
  await context.close();
  results.push({ intro: name, status: 'passed', trigger, reorderMs: trigger === 'auto' ? null : Math.round(ended - fired), autoSettledMs: trigger === 'auto' ? Math.round(ended) : null });
}
// Pinned rails, scroll-scrubbed drawing and the condensed header bar.
async function railChecks(context, name, pinned, animated) {
  await context.addInitScript(skipIntro);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  // Jump instantly so every measurement is taken at rest, not mid smooth-scroll.
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const bar = page.locator('.bar');
  assert.equal(await bar.evaluate(el => el.classList.contains('on')), false, 'Bar hidden while the header shows');
  await page.screenshot({ path: join(evidence, `rails-${name}-bar-hidden.png`) });
  const span = page.locator('.span[data-art="strategy"]');
  const fig = span.locator('.art');
  await span.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.span[data-art="strategy"] .art svg'));
  const at = async t => {
    await page.evaluate(t => { const s = document.querySelector('.span[data-art="strategy"]'); const f = s.querySelector('.art');
      const pin = parseFloat(getComputedStyle(f).top) || 0; scrollTo(0, scrollY + s.getBoundingClientRect().top - pin + t * (s.offsetHeight - f.offsetHeight)); }, t);
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(evidence, `rails-${name}-pin-${t}.png`) });
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
    for (const frac of [0.9, 0.75, 0.5, 0.3, 0.1]) {
      await place(frac); await page.waitForTimeout(200); samples.push(await read());
      await page.screenshot({ path: join(evidence, `rails-${name}-draw-${frac}.png`) });
    }
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
  await page.screenshot({ path: join(evidence, `rails-${name}-bar-return.png`) });
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
    await context.addInitScript(skipIntro);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await mastheadChecks(page, name, animated, name !== 'no-js');
    assert.equal(await page.locator('h1').textContent(), 'Janus Tsen');
    assert.ok(await page.evaluate(() => document.fonts.check('300 17px "Crimson Pro"') && document.fonts.check('28px "Unica One"')), 'Site fonts load');
    assert.equal(await page.getByRole('link', { name: 'GitHub', exact: true }).first().getAttribute('href'), 'https://github.com/janustsen');
    assert.equal(await page.getByRole('link', { name: 'Email', exact: true }).first().getAttribute('href'), 'mailto:janustsen@outlook.com');
    for (const id of ['building', 'experience', 'strategy', 'ai', 'values', 'design', 'books', 'interests', 'about']) assert.equal(await page.locator(`#${id} h2.label`).count(), 1, `${id} has a section label`);
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
    // Masthead mark: the line portrait (no photo anywhere), drawn in once on load with motion, whole without it.
    await portraitOnly(page);
    if (name !== 'no-js') {
      await page.waitForFunction(() => document.querySelector('.mark svg'), null, { timeout: 6000 })
        .catch(() => { throw new Error(`${name}: masthead portrait was never inlined (portrait.svg fetch or site.js failed)`); });
      await page.waitForFunction(() => !document.querySelector('.mark').getAnimations().some(a => a.playState === 'running'), null, { timeout: 6000 })
        .catch(() => { throw new Error(`${name}: masthead portrait draw-in never finished`); });
    }
    const mark = await page.locator('.mark').evaluate((m, js) => {
      if (!js) { const img = m.querySelector('img'); return { svg: false, src: /\/assets\/drawings\/portrait\.svg\?v=\w+$/.test(img.src) && img.complete && img.naturalWidth > 0, alt: img.alt }; }
      return { svg: m.querySelectorAll('svg path').length > 0, src: true, alt: m.querySelector('svg').getAttribute('aria-label'), drawing: m.classList.contains('drawing'),
        p: m.classList.contains('drawing') ? parseFloat(getComputedStyle(m).getPropertyValue('--p')) : 1 };
    }, name !== 'no-js');
    assert.ok(mark.src && mark.alt === 'Line drawing of Janus Tsen' && (name === 'no-js' || (mark.svg && mark.p === 1 && mark.drawing === animated)), `Masthead mark is the line portrait, drawn in ${animated ? 'on load' : 'whole'} (${JSON.stringify(mark)})`);
    // Every span's drawing is on the page: inline SVG strokes with JavaScript, the image file without it.
    await page.waitForFunction(js => [...document.querySelectorAll('.art')].every(fig => js ? fig.querySelectorAll('svg path').length > 0 : fig.querySelector('img').complete && fig.querySelector('img').naturalWidth > 0), name !== 'no-js');
    assert.deepEqual(await page.locator('main > section').evaluateAll(secs => secs.map(sec => sec.querySelectorAll('.art').length)), [0, 1, 1, 1, 1, 1, 1, 1, 0], 'Exactly one drawing per section, none beside About (text only) or Other interests');
    await page.waitForFunction(() => { const path = [...document.querySelectorAll('.art')].pop().querySelector('svg path:last-of-type');
      return !path || parseFloat(getComputedStyle(path).strokeDashoffset) === 0; }, null, { timeout: 6000 });
    assert.equal(await page.locator('a').evaluateAll(links => links.filter(a => /[\u2197\u2196\u2198\u2199]/.test(a.textContent)).length), 0, 'Links carry no arrow glyphs');
    await page.screenshot({ path: join(evidence, `${name}-home-full.png`), fullPage: true });

    // Section jumps and project disclosures.
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => scrollY === 0, null, { timeout: 6000 });
    await page.waitForTimeout(100);
    if (name !== 'no-js') assert.ok(await page.locator('.mark').evaluate(m =>
      !m.getAnimations().some(a => a.playState === 'running') && [...m.querySelectorAll('path')].every(p => parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, '')) === 0)), `${name}: scrolling back does not replay the portrait`);
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
    await portraitOnly(page);
    assert.equal(await page.locator('img, svg, .art').count(), 0, 'Bookshelf has no drawings or photos');
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
  for (const [name, options, trigger] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }, 'wheel'],
    ['tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true }, 'key'],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'touch'],
    ['compact-auto', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }, 'auto'],
    ['reduced', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }, 'wheel'],
    ['no-js', { viewport: { width: 390, height: 844 }, javaScriptEnabled: false }, 'none'],
    ['site-js-blocked', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'blocked'],
  ]) await introChecks(name, options, trigger);
  // Masthead portrait with a slow site.js: the static image (already loaded) stays hidden until the swap, so it never
  // shows whole and then restarts its draw-in; the draw-in then runs from the start.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(skipIntro);
    const page = await context.newPage();
    // Hold site.js until the hidden image is asserted, then release it, so the check never races the swap.
    let release, held = new Promise(r => { release = r; });
    await page.route('**/site.js*', async route => { await held; await route.continue(); });
    await page.goto(base, { waitUntil: 'commit' });
    await page.waitForFunction(() => { const img = document.querySelector('.mark img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 4000 });
    const waiting = await page.evaluate(() => ({ swapped: !!document.querySelector('.mark svg'), opacity: getComputedStyle(document.querySelector('.mark img')).opacity }));
    assert.deepEqual(waiting, { swapped: false, opacity: '0' }, 'Static portrait stays hidden while site.js loads');
    release();
    await page.waitForFunction(() => document.querySelector('.mark svg'), null, { timeout: 6000 })
      .catch(() => { throw new Error('slow site.js: masthead portrait was never inlined'); });
    const p = await page.locator('.mark').evaluate(m => m.classList.contains('drawing') ? parseFloat(getComputedStyle(m).getPropertyValue('--p')) : null);
    assert.ok(p !== null && p < 0.5, `Portrait draws in from the start after a slow site.js (--p ${p})`);
    await context.close();
    results.push({ portrait: 'slow site.js', status: 'passed', hiddenUntilSwap: true });
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
  await context.addInitScript(skipIntro);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.reveal').evaluateAll(els => els.filter(el => !el.closest('[hidden]') && getComputedStyle(el).opacity !== '1').length), 0);
  await context.close();
  results.push({ preferenceChange: 'reduced motion reveals everything', status: 'passed' });
  // Every width: no sideways overflow or clipped header links, a large portrait set left with the name beside it (below it on phones), the bar fits, and Other interests holds its three entries.
  for (const width of [360, 390, 620, 768, 820, 1024, 1180, 1240, 1440, 1920]) {
    const mobile = width < 700;
    const sized = await browser.newContext({ viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile });
    await sized.addInitScript(skipIntro);
    const page = await sized.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const mark = document.querySelector('.mark').getBoundingClientRect(), W = innerWidth;
      const outside = [...document.querySelectorAll('.masthead a, main h2, main h3, main p')].filter(el => { const b = el.getBoundingClientRect(); return b.width && (b.left < -1 || b.right > W + 1); }).length;
      const name = document.querySelector('.identity h1 a').getBoundingClientRect(), page = document.querySelector('.page').getBoundingClientRect();
      const jump = document.querySelector('.jump');
      return { wide: document.documentElement.scrollWidth - W, outside, jumpScrolls: jump.scrollWidth > jump.clientWidth && getComputedStyle(jump).overflowX === 'auto' || jump.scrollWidth <= jump.clientWidth,
        mark: Math.round(mark.width), markLeft: Math.round(mark.left - page.left), stacked: name.top >= mark.bottom, beside: name.left > mark.right && name.top < mark.bottom, interests: [...document.querySelectorAll('#interests h3')].map(h => h.textContent),
        aboutEntries: document.querySelectorAll('#about article').length };
    });
    await page.evaluate(() => scrollTo(0, 2000));
    await page.waitForTimeout(450);
    const barFits = await page.evaluate(() => { const bar = document.querySelector('.bar'); return [...bar.children].every(el => getComputedStyle(el).display === 'none' || el.getBoundingClientRect().right <= innerWidth + 1); });
    assert.ok(r.wide <= 0 && r.outside === 0 && r.jumpScrolls, `${width}px: no sideways overflow or clipped text (${JSON.stringify(r)})`);
    assert.ok(r.mark >= 96 && Math.abs(r.markLeft) < 2 && (width <= 560 ? r.stacked : r.beside), `${width}px: header portrait is large and set left, the name ${width <= 560 ? 'below' : 'beside'} it (${JSON.stringify(r)})`);
    assert.ok(barFits, `${width}px: header bar fits the screen`);
    assert.deepEqual(r.interests, ['Writing & ideas', 'Homer Humanities', 'Karate'], `${width}px: Other interests holds its three entries`);
    assert.equal(r.aboutEntries, 0, `${width}px: those entries are no longer under About`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: join(evidence, `width-${width}-top.png`) });
    await page.locator('#interests').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(evidence, `width-${width}-interests.png`) });
    await sized.close();
    results.push({ width, status: 'passed', mark: r.mark });
  }
  await writeFile(join(evidence, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
