# Responsive layout and motion

## Sub-features
Canvas ink and unveiling behavior: [README.md](../../../../README.md#design-and-sources).

## User path and drive
Open the homepage in a fresh tab and let the unveiling finish. Watch the homepage without interacting, then visit and scroll each inner page, and return home. `node verify.mjs` checks initial concealment, final visibility, immediate returns, and dismissal by Skip, keyboard, wheel input, and a reduced-motion preference change. It compares homepage canvas images with no input, confirms no homepage scroll space, and compares inner-page images around real wheel input. Read intro and before/after screenshots as well as results.json.

The drive covers 1440×1000, 390×844, 360×640, reduced motion, and JavaScript disabled. All five pages are checked for horizontal overflow and navigation.

## Limits
Reduced motion bypasses the opening and keeps ink static. Without JavaScript the opening is absent and the decorative canvas is blank. Blocked session storage may replay the intro on returning home, but does not block access. Browser emulation does not prove physical phone behavior.
