# Responsive layout and motion

## Sub-features
Scroll-driven canvas ink on the short homepage, stationary readable text, independent phone composition, static reduced-motion ink, usable content without JavaScript.

## User path and drive
Open the homepage and scroll. `node verify.mjs` uses native wheel input, compares canvas screenshots before/after, and checks text position. It covers 1440×1000, 390×844, 360×640, reduced motion, and JavaScript disabled. All four pages are checked for horizontal overflow. Read screenshots as well as results.json.

## Limits
Browser emulation does not prove physical phone behavior. No essential content depends on animation. With JavaScript disabled, the decorative canvas is blank.
