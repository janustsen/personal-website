# Responsive layout and motion

## Sub-features
Canvas ink on all four pages: a homepage ribbon, converging Building strands, flowing Experience tracks, and About loops. The homepage ribbon flows passively, pauses in hidden tabs, and adds no decorative scroll space. Homepage text stays stationary. The first home visit in a tab draws an abstract workspace and sweeps it away over 2.1 seconds. Return visits are immediate. Skip intro, keyboard input, focus, scrolling, and reduced-motion changes dismiss it.

## User path and drive
Open the homepage in a fresh tab and let the unveiling finish. Watch the homepage without interacting, then visit and scroll each inner page, and return home. `node verify.mjs` checks initial concealment, final visibility, immediate returns, and each dismissal path. It compares homepage canvas images with no input, confirms no homepage scroll space, and compares inner-page images around real wheel input. Read intro and before/after screenshots as well as results.json.

The drive covers 1440×1000, 390×844, 360×640, reduced motion, and JavaScript disabled. All four pages are checked for horizontal overflow and navigation.

## Limits
Reduced motion bypasses the opening and keeps ink static. Without JavaScript the opening is absent and the decorative canvas is blank. Blocked session storage may replay the intro on returning home, but does not block access. Browser emulation does not prove physical phone behavior.
