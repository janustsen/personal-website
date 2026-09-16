# Janus Tsen

A five-page static personal website. Deploy `dist/`; no build or production dependencies.

Preview: `python3 -u -m http.server 63027 --bind 127.0.0.1 --directory dist`.

Verification: follow `.agents/skills/verify-janus-site/SKILL.md`. `node --check dist/site.js` checks JavaScript syntax; `node verify.mjs` drives all five pages in a real browser.

## Design and sources

A short homepage links to Building, Experience, About, and Bookshelf. Each page has its own original canvas ink composition. The homepage responds locally to the mouse cursor and flows passively with no extra scroll space; inner-page ink responds to native scrolling. A two-second homepage unveiling assembles an abstract workspace, then reveals the content; it plays once per tab and can be skipped immediately. Reduced-motion visitors get a static composition. Content and navigation work without JavaScript.

The homepage uses the supplied headshot and links to the verified GitHub profile at `github.com/janustsen`. X links to the user-provided profile at `x.com/janustsen`.

Copy follows the user's professional positioning, with public evidence links beside the relevant work. The legacy Duna case-study page is identified as using Verdnt Group' former name. Manrope is included under the SIL Open Font License in `dist/assets/manrope-license.txt`.

No private source documents, client datasets, credentials, or contact submissions are packaged.

Bookshelf offers 20 sourced philosophy/business suggestions, tier drag-and-drop and keyboard-accessible menus, filtering, and reading statuses. Initial rankings are explicitly AI-suggested, not confirmed personal reads. Changes persist only in the visitor’s browser; Reset restores the suggestions. Native book details remain available without JavaScript.
