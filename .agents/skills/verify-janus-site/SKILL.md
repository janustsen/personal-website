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
Run `node verify.mjs`. This launches a separate headless Chrome process and closes it itself. It needs an installed `playwright-core`; reuse a bundled installation with `PLAYWRIGHT_CORE_PATH=/absolute/path/to/playwright-core/index.mjs`. Otherwise install it locally with `npm install --no-save playwright-core`. Set `CHROME_PATH` if Chrome is not at the macOS default. `SITE_URL` defaults to the launch URL. `EVIDENCE_DIR` defaults to `work/verification`.

The check scrolls the homepage using native wheel input and compares rendered canvas pixels, confirms stationary text, follows all three page links and their home links, and opens/closes both Building disclosures with keyboard controls. It checks route headings, errors, overflow, and keyboard focus in desktop, phone, compact phone, reduced-motion, and no-JavaScript contexts. Reduced-motion pixels must remain static. Native pointer lock/capture is disabled for automation.

For manual follow-up prefer a named `chrome-devtools-axi` session, never a shared default session. The task used `CHROME_DEVTOOLS_AXI_SESSION=janus-portfolio`. Use `emulate --viewport 390x844x1,mobile,touch` for phone widths: resizing a desktop Chrome window can clamp its width to 500px.

## Evidence
Keep the generated PNGs and `results.json`. Read opening, scrolled, and inner-page screenshots, particularly mobile ink visibility and text readability. Browser emulation does not prove a physical phone's behavior. No external email is sent; mailto destinations are inspected.

## Cleanup
The verification script closes only its own Chrome in `finally`. Keep the owned HTTP server running while the user reviews the local preview; stop it using its retained session when the preview is no longer needed. Preserve screenshots and results. Stop a named CLI browser only if this task created it. Never kill processes by name.

## Helpers and maintenance
`verify.mjs` is the executable check. The feature map is in `features/`. Keep it current using `maintain-verification-skill` after changes.
