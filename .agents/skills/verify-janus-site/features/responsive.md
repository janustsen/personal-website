# Responsive layout and motion

## Sub-features
Desktop: name and links on the right, intro on the left, vertical section labels, and a full-width line drawing beside each section (see [rails.md](rails.md)). `verify.mjs` checks that no link carries a diagonal arrow glyph. Below 760px: centered masthead, with each section’s drawing stacked under its entries.

## User path and drive
Scroll the homepage top to bottom. Sections' entries and cards fade and rise once as they enter the viewport; anything already on screen at load shows at once. `node verify.mjs` checks that below-the-fold entries start hidden only when JavaScript runs and motion is welcome, that all non-hidden entries are fully visible after scrolling, and that a reduced-motion preference set after load reveals those entries. Disclosures fade their contents in. Read the top, full-page, and disclosure screenshots as well as results.json.

The drive covers 1440×1000, 390×844, 360×640, reduced motion, and JavaScript disabled, and checks both pages for horizontal overflow. The rail pass adds 820×1180 (tablet).

## Limits
Motion and JavaScript fallbacks follow [README.md](../../../../../README.md#design-and-sources). Browser emulation does not prove physical phone behavior.
