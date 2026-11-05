# First-visit intro

## Sub-features
- Gate: the inline script in the head of `dist/index.html` adds `intro-on` to `<html>` only with JavaScript, working `sessionStorage` (key `intro`), no URL hash, and no earlier play in this tab. Without it the page loads as normal.
- Hold: only the picture (pops in with a spin) and "Hey, I'm Janus!" (letters rise in) show, with a bobbing "Scroll" cue. The page underneath is transparent and does not scroll.
- Trigger: the first wheel, swipe, key or tap, or 3 seconds without one, starts the reorder (never before the 1.3 s opening finishes).
- Reorder: the picture and greeting spring into the masthead mark and name (phones have no mark, so the picture folds into the name). Every block on the first screen (contact links, section links, labels, About lines, entries, drawings) sweeps in from the bottom corners as a tilted card, piles mid-screen and is dealt into place in DOM order. It takes about 1.7 s on desktop and under 2 s on tall tablets.
- Settled: the stage is removed and `intro-on`, `intro-deal` and `intro-landed` are cleared. Scroll reveal, drawings and the bar then work as normal.
- Reduced motion: the picture and greeting stay still; the trigger fades to the page in about 0.3 s.
- Safety: fallback behavior is documented in [README.md](../../../../../README.md#design-and-sources). While the intro runs, the body clips sideways overflow so phones never zoom out.

## User path and drive
Open the homepage in a fresh tab and wait, or scroll once. `node verify.mjs` runs `introChecks` at desktop (wheel), tablet (PageDown), phone (touch swipe through CDP), compact phone (auto-advance, settles at about 4.6 s), and reduced-motion desktop. These cases check the hold state, the mid-reorder state, that the reorder ends within its budget, that nothing scrolled or overflowed sideways during it, that the layout is untouched afterwards, that the portrait draws in with scroll and the bar takes over, and that a reload and a `#building` deep link skip the intro. Read the `intro-*-1-start`, `-2-mid` and `-3-settled` screenshots. Separate no-JavaScript and blocked-`site.js` cases check that the page and heading are visible with no intro stage; the blocked-script case waits for the fallback before asserting.

## Limits
Browser emulation does not prove physical phone behavior. Mid-reorder screenshots are taken in real time, so the exact frame varies slightly between runs.
