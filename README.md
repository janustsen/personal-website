# Janus Tsen

A five-page static personal website. Deploy `dist/`; no build or production dependencies.

Preview: `python3 -u -m http.server 63027 --bind 127.0.0.1 --directory dist`.

Verification: follow `.agents/skills/verify-janus-site/SKILL.md`. `npm run lint` checks JavaScript syntax for both site scripts and the verification script; `node verify.mjs` drives all five pages in a real browser.

## Design and sources

A short homepage without a top bar links to Building, Experience, About, and Bookshelf. Canvas ink appears on every page; About and Bookshelf share the loop composition. The homepage responds locally to the mouse cursor and flows passively with no extra scroll space; inner-page ink responds to native scrolling. A 2.1-second homepage unveiling assembles an abstract workspace, then reveals the content; it plays once per tab and ends immediately on Skip, wheel or touch input, keyboard input, focus, or a reduced-motion preference change. The ambient loop pauses in hidden tabs. Reduced-motion visitors get a static composition. Content and navigation work without JavaScript.

The homepage offers Email and LinkedIn contact links, uses the supplied headshot and links to the verified GitHub profile at `github.com/janustsen`. X links to the user-provided profile at `x.com/janustsen`.

Copy follows the user's professional positioning, with public evidence links beside the relevant work. Building links to Verdnt Group’s current site and identifies Trus as retired. Manrope is included under the SIL Open Font License in `dist/assets/manrope-license.txt`.

No private source documents, client datasets, credentials, or contact submissions are packaged.

Bookshelf offers 20 sourced philosophy/business suggestions, tier drag-and-drop and keyboard-accessible menus, filtering, and reading statuses. Initial rankings were suggested from inferred interests; the public interface uses simple S/A/B/C labels. Reading statuses start unset. Changes persist only in the visitor’s browser; Reset restores the suggestions. Multiple book notes can stay open for comparison. Native book details remain available without JavaScript; tier/status controls, filtering, and reset require JavaScript.
