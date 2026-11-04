# Pinned rails, drawings and header bar

## Sub-features
- Spans: each `.span` pairs entries with one line drawing (`/assets/drawings/<slug>.svg`, 800×1000).
  - Building, Experience and About have one span per item. About's first span is a line portrait traced from the photo.
  - Strategy, Tech & AI, Values and Books each have one span covering the whole section.
  - There are 16 spans in all.
- Rails (wider than 760px): the section label and the drawing are `position: sticky` just below the bar. They stay pinned while the entries scroll and release when the span ends.
- Draw-in: `site.js` swaps each image for its inline SVG and gives every stroke `pathLength=1` and a start point `--d`, in file order.
  - The span's scroll progress sets `--p` from 0.12 to 1.
  - Strokes draw in through `stroke-dashoffset`, until the drawing is complete at the span's end.
  - Phones have no rails; each drawing draws in once when it comes into view.
  - With reduced motion or no JavaScript, drawings show fully drawn.
- Header bar: a fixed bar slides in once the masthead leaves the viewport and slides out at the top.
  - It marks the current section with `aria-current`.
  - It switches without animation under reduced motion.

## User path and drive
Scroll a span slowly on desktop and tablet. The label and drawing hold their place while the text moves, the drawing fills in, and both let go at the next span. On a phone the drawing sits under its entries and draws in once. `node verify.mjs` runs `railChecks` at desktop, tablet, phone and reduced-motion desktop on the Strategy span, and checks that all drawings finish drawn.

## Limits
`--p` animates on phones only where `@property` is supported. Elsewhere the drawing appears at once. Emulated touch does not prove physical-device scroll smoothness.
