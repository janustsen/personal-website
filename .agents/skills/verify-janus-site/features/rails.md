# Pinned rails, drawings and header bar

## Sub-features
- Spans: each section is one `.span` that pairs all of its entries with a single line drawing (`/assets/drawings/<slug>.svg`, 800×1000).
  - The seven drawings are building, experience, strategy, tech-ai, values, books and portrait (About, a line portrait traced from the photo).
  - Each drawing stays pinned for its whole section, then hands off to the next section's drawing.
- Rails (wider than 760px): the section label and the drawing are `position: sticky` just below the bar. They stay pinned while the entries scroll and release when the span ends.
- Draw-in: `site.js` swaps each image for its inline SVG and gives every stroke `pathLength=1` and a start point `--d`, in file order.
  - Scroll sets `--p` from 0 to 1 while the section is on screen. Drawing starts when the section's top reaches 85% of the viewport and finishes about two-thirds of the way through the section, so text is always beside a partly drawn image.
  - Strokes draw in through `stroke-dashoffset`.
  - Phones have no rails. Each drawing sits after its section's first entry and scrubs against its own position: it starts as it enters at 85% and completes by the time its top reaches 20%.
  - With reduced motion or no JavaScript, drawings show fully drawn.
- Header bar: a fixed bar slides in once the masthead leaves the viewport and slides out at the top.
  - It marks the current section with `aria-current`.
  - It switches without animation under reduced motion.

- About opens the page: it holds the intro (Stanford, Verdnt, DRW), the About text and the portrait. The nav lists About first.

## User path and drive
Scroll a span slowly on desktop and tablet. The label and drawing hold their place while the text moves, the drawing fills in, and both let go at the next span. On a phone the drawing sits under its entries and draws in once. `node verify.mjs` runs `railChecks` at desktop, tablet, phone and reduced-motion desktop on the Strategy span, It also samples draw progress as the section enters and moves up the screen. Those samples must show nothing drawn before the section enters, a start as soon as it does, progress that follows the scroll, text on screen beside a partly drawn image, and completion while the section is still visible. The drive also checks that all drawings finish drawn.

## Limits
Emulated touch does not prove physical-device scroll smoothness.
