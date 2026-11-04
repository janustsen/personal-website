---
name: verify-janus-site
description: Launch and verify Janus Tsen's static personal website through its real browser UI, including navigation, project details, mobile layouts, reduced motion, and no-JavaScript behavior.
---

# Verify Janus's site

## Launch
From this repository, start `python3 -u -m http.server 63027 --bind 127.0.0.1 --directory dist` in a retained session. A `Serving HTTP` line is readiness. Reuse an owned server. If the port belongs to another task, choose an unused port with `0`, read the printed URL, and set `SITE_URL` for the drive. Never stop other tasks' processes.

## Doctor
Run `curl --fail -I http://127.0.0.1:63027/` (substitute the actual URL). Expect HTTP 200. Confirm the page title is `Janus Tsen` before driving. No credentials, database, or live submissions are needed.

## Drive
Run `node verify.mjs`. This launches a separate headless Chrome process and closes it itself. It needs an installed `playwright-core`; reuse a bundled installation with `PLAYWRIGHT_CORE_PATH=/absolute/path/to/playwright-core/index.mjs`. Otherwise install the locked development dependencies with `npm ci`. On macOS, set `CHROME_PATH` if Chrome is not at the default location. On other platforms the script uses Playwright’s Chromium; install it with `npx playwright-core install chromium` or set `CHROME_PATH` to an existing browser. `SITE_URL` defaults to the launch URL. `EVIDENCE_DIR` defaults to `work/verification`.

The check drives the homepage and Bookshelf in desktop, phone, compact phone, reduced-motion, and no-JavaScript contexts. It checks the heading, fonts, contact destinations, section labels, the drafted-insight markers (shown and held back), scroll reveal (hidden below the fold only with JavaScript and motion, fully visible after scrolling), a section jump link, both Building disclosures with keyboard controls, redirects from the old page URLs, keyboard focus, errors, and horizontal overflow. A final check confirms a reduced-motion preference change reveals everything.

For manual follow-up prefer a named `chrome-devtools-axi` session, never a shared default session. For example `CHROME_DEVTOOLS_AXI_SESSION=janus-portfolio`. Use `emulate --viewport 390x844x1,mobile,touch` for phone widths: resizing a desktop Chrome window can clamp its width to 500px.

## Evidence
Keep the generated PNGs and `results.json`. Read the top-of-page, full-page, disclosure, and Bookshelf screenshots, particularly phone layout and text readability. Browser emulation does not prove a physical phone's behavior. No external email is sent; mailto destinations are inspected.

## Cleanup
The verification script closes only its own Chrome in `finally`. Keep the owned HTTP server running while the user reviews the local preview; stop it using its retained session when the preview is no longer needed. Preserve screenshots and results. Stop a named CLI browser only if this task created it. Never kill processes by name.

## Helpers and maintenance
`verify.mjs` is the executable check. The feature map is in `features/`. Keep it current using `maintain-verification-skill` after changes.

The drive also verifies all 20 Bookshelf entries, native no-JS disclosure, tier/status persistence after reload, search/topic filtering, reset, and desktop drag-and-drop.
