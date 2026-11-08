# Easter eggs in the drawings

`dist/eggs.js` wires each drawing once `site.js` has swapped in its inline SVG. It groups the strokes inside a rectangle of the drawing (in the drawing's own 800×1000 units) and lays an invisible `.egg-hit` rectangle over each group; only those rectangles take the pointer. Movement uses ease-out or ease-in-out curves, never a spring. Reduced motion keeps every egg but drops the movement: new strokes fade in, dragged parts return at once. Without JavaScript there are no eggs.

## Building (Verdnt studio bench)
1. Drag either chair sideways: it rolls and eases back under the bench (a white backing hides the bench edge behind it, and the edge is filled in where it was).
2. Tap any of the 12 drinks on the retail shelf: it lifts off the shelf and settles back.
3. Tap the can on the bench: bubbles fizz up out of it.
4. Drag the bottle at the end of the bench along it; it eases back.
5. Brush past or tap a pinned research card: it sways on its pin and straightens.
6. Tap the bar chart on the monitor: the bars grow again from the baseline.
7. Tap the laptop: its four sources tick off one by one; tap again to clear them.
8. Secret: tap the drink idea in the middle of the wall five times and a light bulb switches on above it (later fifth taps relight it).

## Experience (desk before the Chicago skyline)
1. Drag the clouds across the sky; they stay where you leave them, in front of the towers.
2. Tap the Willis Tower: its antenna lights blink.
3. Tap the Hancock: its lights blink; secret: the fifth tap sends a small plane across the sky.
4. Tap the price chart: it redraws candle by candle.
5. Tap the checklist: its open items tick off one at a time, then clear.
6. Tap the scatter plot: the regression refits from left to right.
7. Tap the part on the laptop's quote form: it turns over.
8. Drag the drink bottle along the desk; it eases back.

## Values (Statesman board game tabletop)
1. Drag any of the five pawns anywhere on the board; they stay where you put them.
2. Tap a game token: it flips like a coin.
3. Tap the camcorder: it pans on its tripod and a recording dot blinks on its screen.
4. Tap either loose card: it flips over.
5. Tap the card deck: it lifts and settles.
6. Tap the handwritten note: it writes itself again.
7. Brush past or tap the stack of cards: it fans open a little.
8. Tap the sandwich twice to lift it; the third tap eats it, leaving crumbs, and it comes back after six seconds.
9. Secret: tap the donation box to drop coins in; the fifth coin floats a heart up out of it.

## Masthead portrait
The portrait is a masked line image, so its eggs are overlays: white lids for a blink, and moving copies of the tie and hair cut out with clip paths over a white patch. They are wired only after the draw-in finishes, so the draw-in checks never see them.
1. Tap the face: he blinks. 2. Every third tap is a wink. 3. With motion, he also blinks on his own every 5 to 10 seconds.
4. Tap the tie: it swings a little crooked and straightens. 5. Drag the tie sideways: it tilts with you and straightens when let go.
6. Brush or tap the hair: it ruffles.
7. Secret: the seventh face tap puts a small flower in his lapel buttonhole.
8. Tap the breast pocket: a pocket square peeks out; tap again to tuck it away.

## User path and drive
`node verify.mjs` runs `eggChecks` at desktop, phone (touch, through CDP touch events) and reduced-motion desktop. It checks the faint sketch under each inlined drawing (and the barely drawn Building drawing on screen at the top on desktop), the number of interactive parts (24, 10, 15 and 4), that a chair follows a drag without scrolling the page and eases back (instantly with reduced motion), that a vertical swipe over a chair still scrolls on touch, that taps add fizz and ticks, every secret (bulb, plane, eaten sandwich and heart, lapel flower, pocket square), the blink and tie swing, that a dropped pawn and cloud stay put, and that nothing navigates or throws. Read `eggs-*-*.png` for each drawing after its taps and secrets and `eggs-desktop-sketch-at-top.png` for the faint Building drawing at the top.

## Limits
Emulated touch is not a physical phone. Hover eggs (card sway, stack fan, hair ruffle) only fire for a mouse; on touch the same parts respond to a tap.
