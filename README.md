# Janus Tsen

A four-page static personal website. Deploy `dist/`; no build or production dependencies.

Preview: `python3 -u -m http.server 63027 --bind 127.0.0.1 --directory dist`.

Verification: follow `.agents/skills/verify-janus-site/SKILL.md`. `node --check dist/site.js` checks JavaScript syntax; `node verify.mjs` drives all four pages in a real browser.

## Design and sources

A short homepage links to Building, Experience, and About. Each page has its own original canvas ink composition responding to native scrolling. A two-second homepage unveiling assembles an abstract workspace, then reveals the content; it plays once per tab and can be skipped immediately. Reduced-motion visitors get a static composition. Content and navigation work without JavaScript.

Copy follows the user's professional positioning, with public evidence links beside the relevant work. The legacy Duna case-study page is identified as using Verdnt Labs' former name. Manrope is included under the SIL Open Font License in `dist/assets/manrope-license.txt`.

No private source documents, client datasets, credentials, or contact submissions are packaged.
