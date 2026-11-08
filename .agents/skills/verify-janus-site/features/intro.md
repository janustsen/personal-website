# First-visit intro

## Sub-features
- Gate: the inline script in the head of `dist/index.html` adds `intro-on` to `<html>` only with JavaScript, working `sessionStorage` (key `intro`), no URL hash, and no earlier play in this tab. Without it the page loads as normal.
- Hold: only the line portrait (draws itself in, in step with the masthead copy; no photo) and "Hey, I'm Janus!" (letters rise in) show, with no scroll cue. The page underneath is transparent and does not scroll.
- Trigger: the first wheel, swipe, key or tap, or 3 seconds without one, starts the hand-off (never before the 1.3 s opening finishes).
- Hand-off: the portrait and greeting glide into the masthead portrait and name with a smooth ease-out, no bounce or overshoot, while the page fades in as a whole (about 0.7 s). No blocks are dealt or animated individually; only the masthead portrait keeps drawing in, so the hand-off lands on the same stage of the drawing.
- Settled: the stage is removed and `intro-on`, `intro-out` and `intro-landed` are cleared. Scroll reveal, drawings and the bar then work as normal.
- Reduced motion: the portrait (fully drawn) and greeting stay still; the trigger fades to the page in about 0.3 s.
- Safety: fallback behavior is documented in [README.md](../../../../README.md#design-and-sources). While the intro runs, the body clips sideways overflow (the name starts scaled up) so phones never zoom out.

## User path and drive
Open the homepage in a fresh tab and wait, or scroll once. `node verify.mjs` runs `introChecks` at desktop (wheel), tablet (PageDown), phone (touch swipe through CDP), compact phone (auto-advance, settles at about 3.7 s), and reduced-motion desktop. These cases check the hold state (line portrait and greeting only, partly drawn strokes with motion and fully drawn with reduced motion, no photo, no cue), that mid hand-off only the page fades and no block other than the drawing masthead portrait animates, that the hand-off ends within its budget, that nothing scrolled or overflowed sideways during it, that the layout is untouched afterwards, that the masthead portrait finishes fully drawn and the bar takes over, and that a reload and a `#building` deep link skip the intro. Stroke samples are recorded from document startup. Read the `intro-*-2-mid` and `intro-*-3-settled` screenshots; the drive avoids a screenshot during the hold because waiting for fonts can outlast it. Separate no-JavaScript and blocked-`site.js` cases check that the page and heading are visible with no intro stage; the blocked-script case waits for the fallback before asserting. Both capture `intro-*-fallback.png` and confirm the portrait image has loaded.

## Limits
Browser emulation does not prove physical phone behavior. Mid hand-off screenshots are taken in real time, so the exact frame varies slightly between runs.
