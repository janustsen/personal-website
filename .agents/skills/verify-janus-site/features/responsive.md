# Responsive layout and motion

## Sub-features
Desktop hero depth, scroll-driven connecting paths, mobile hero crop, stacked projects, reduced motion, no-JavaScript content.

## How to get to it (user POV)
Open on a desktop or phone and scroll through the portfolio. An OS reduced-motion preference selects the static composition.

## Driving it with Playwright
Run `node verify.mjs`. It covers 1440×1000, 390×844, 360×640, 390px reduced motion, and 390px JavaScript disabled. Inspect generated screenshots, not only results.json.

## Gotchas
Use emulated viewport metrics rather than desktop window resizing for true phone widths. Never infer physical iPhone testing from headless Chromium results. All essential information must be readable without completing an animation.
