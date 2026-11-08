# Responsive layout and motion

## Sub-features
Masthead: the line portrait on the left, a vertical rule as tall as the row, then the name, contact links and section links on the right; the whole group is centered on the page. At 560px and below the portrait (120px) stacks above the text, everything centered, and the links wrap. Desktop: vertical section labels, and a full-width line drawing beside each section (see [rails.md](rails.md)). `verify.mjs` checks that no link carries a diagonal arrow glyph. At 760px and below: each drawn section’s image sits after its first entry, before the remaining entries.

## User path and drive
Scroll the homepage top to bottom. Sections' entries and cards fade and rise once as they enter the viewport; anything already on screen at load shows at once. `node verify.mjs` checks that below-the-fold entries start hidden only when JavaScript runs and motion is welcome, that all non-hidden entries are fully visible after scrolling, and that a reduced-motion preference set after load reveals those entries. Disclosures fade their contents in. Read the top, full-page, and disclosure screenshots as well as results.json.

The drive covers 1440×1000, 390×844, 360×640, reduced motion, and JavaScript disabled, and checks both pages for horizontal overflow. The rail pass adds 820×1180 (tablet). A width sweep (360, 390, 620, 768, 820, 1024, 1180, 1240, 1440, 1920) checks for sideways overflow and text outside the screen, a centered header group with the portrait (at least 80px wide) right of the text, a bar that fits, and the Other interests hobbies; it saves `width-*-top.png` and `width-*-interests.png`.

## Limits
Motion and JavaScript fallbacks follow [README.md](../../../../README.md#design-and-sources). Browser emulation does not prove physical phone behavior.
