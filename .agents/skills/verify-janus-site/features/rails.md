# Pinned rails, drawings and header bar

## Sub-features
- Spans: each section except About, Books and Other interests is one `.span` that pairs all of its entries with a single line drawing (`/assets/drawings/<slug>.svg`, 800×1000).
  - The three section drawings are building, experience and values. Janus's line portrait is the masthead mark instead (see [navigation.md](navigation.md)).
  - Each span is as tall as its text (or its drawing, if that is taller). A drawing stays pinned only while its section's text is beside it, then hands off to the next one. It never sits beside an empty column.
- Rails (wider than 760px): the section label and the drawing are `position: sticky` just below the bar. They stay pinned while the entries scroll and release when the span ends.
- Draw-in: `site.js` swaps each image for its inline SVG and gives every stroke `pathLength=1` and a start point `--d`, in file order.
  - Scroll sets `--p` from 0 to 1 while the section is on screen. Drawing starts when the section's top reaches 85% of the viewport and finishes about two-thirds of the way through the section, so text is always beside a partly drawn image. It always completes before the drawing releases, or by the page end for the last section.
  - Strokes draw in through `stroke-dashoffset`. With motion, every stroke also has a faint copy underneath (`.ghost`, 15% opacity), so a drawing that has not drawn in yet (Building beside the text at the top of the page) reads as a light sketch instead of an empty column.
  - Phones have no rails. Each drawing sits after its section's first entry and scrubs against its own position: it starts as it enters at 85% and completes by the time its top reaches 20%.
  - With reduced motion or no JavaScript, drawings show fully drawn.
- Header bar: a fixed bar slides in once the masthead leaves the viewport and slides out at the top.
  - It marks the current section with `aria-current`.
  - It switches without animation under reduced motion.

- About opens the page: it holds the intro (Stanford, Verdnt, DRW) and the About text only, with no drawing; the text runs the full width of the content column. The nav lists About first.
- Books holds a drawn bookcase instead of a drawing: spines on shelves, each opening a native popover (`popovertarget`, works without JavaScript) with a line-drawn cover and a note. The read shelf has the homepage books; the second shelf has 20 suggested reads.
- Other interests closes the page with one drawn room instead of entries: eight hobby objects (Karate, Climbing, Running, Sewing, Fashion, Thrifting, Cutting hair, Board game design), each a button that opens a centered popover card. There are no dots: hover or focus traces the object's outline and shows a lettered label on a leader line; touch screens show every label. It has no side drawing. At 560px and below the room crops its empty margins. The drive clicks every object in every context, checks 44px hit areas, no dot, the default labels on touch (on a fresh page, since Chrome's emulation can drop its no-hover state after clicks), one card at a time, Escape and outside-click closing, Enter from the keyboard and the focus label, and with JavaScript the one-time outline shimmer, belt and sneaker drags, stitches, pawn hop, yarn, chalk mark, price tag and clock. Read `*-hobbies-scene.png`, `*-hobbies-hover.png`, `phone-hobbies-labels.png` and `*-hobby-<id>.png`. The toys are listed in the README.

## User path and drive
Scroll a span slowly on desktop and tablet. The label and drawing hold their place while the text moves, the drawing fills in, and both let go at the next span. On a phone the drawing sits after the first entry and scrubs with scroll, including backwards. `node verify.mjs` runs `railChecks` at desktop, tablet, phone and reduced-motion desktop on the Experience span. It also samples draw progress as the section enters and moves up the screen. Those samples must show nothing drawn before the section enters, a start as soon as it does, progress that follows the scroll, text on screen beside a partly drawn image, and completion while the section is still visible. On desktop and tablet it then scrolls every span past its end and checks that the section's last visible block is still below the bar whenever the drawing is pinned, and that the drawing is complete when it releases. The drive also checks that all drawings finish drawn. Read `rails-*-pin-*.png` for the held and released positions, `rails-*-draw-*.png` for scroll progress, and `rails-*-bar-*.png` for the bar returning to the masthead.

## Limits
Emulated touch does not prove physical-device scroll smoothness.
