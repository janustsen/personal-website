# Janus Tsen

A static personal website: one long homepage plus a Bookshelf page. Deploy `dist/`; no build or production dependencies. This redesign is for preview review; nothing goes live until Janus approves it.

Preview: `python3 -u -m http.server 63027 --bind 127.0.0.1 --directory dist`.

Verification: follow `.agents/skills/verify-janus-site/SKILL.md`. `npm run lint` checks JavaScript syntax for both site scripts and the verification script; `node verify.mjs` drives both pages in a real browser.

## Design and sources

The look follows alexanderobenauer.com: a single column, the name in condensed capitals with inline contact links, a serif intro, vertical section labels (Building, Experience, Strategy, Tech & AI, Values, Books, About), italic serif entry titles with short descriptions, bracketed thumbnail cards joined to their titles by a rule (detailed pure-stroke line drawings in `dist/assets/drawings/` for Verdnt, DRW, and Morgan Stanley; the headshot for About), simple rules between sections, and a quiet centered footer. No text, images, logo, or code were copied from that site. `/building/`, `/experience/`, and `/about/` redirect to their homepage sections. There is no dark theme.

Motion is limited to a gentle fade-and-rise as entries and cards scroll into view, plus disclosure fades. Anything on screen at load shows at once. Reduced motion disables scroll and disclosure animations. Without JavaScript, content appears without scroll reveal and native disclosures still work. Held-back drafts remain hidden in both modes.

Drafted insights (S1–S5, A0–A5, V1–V5) and book notes (B0–B6) await Janus's approval. Each carries `data-draft="ID"` and an amber draft tag; V1, V3, V5, and B1 are also `hidden`. Approve an item by removing `data-draft` (and `hidden`); cut it by deleting the element, then update the lists in `verify.mjs`.

The homepage offers Email and LinkedIn contact links, uses the supplied headshot and links to the verified GitHub profile at `github.com/janustsen`. X links to the user-provided profile at `x.com/janustsen`.

Copy follows the user's professional positioning, with public evidence links beside the relevant work. External links use plain underlined text without diagonal arrow glyphs; the Bookshelf back link retains its left arrow. Building links to Verdnt Group’s current site and identifies Trus as retired. Crimson Pro, Inter, and Unica One are self-hosted under the SIL Open Font License; see `dist/assets/fonts/LICENSES.txt`.

No private source documents, client datasets, credentials, or contact submissions are packaged.

Bookshelf offers 20 sourced philosophy/business suggestions, tier drag-and-drop and keyboard-accessible menus, filtering, and reading statuses. Initial rankings were suggested from inferred interests; the public interface uses simple S/A/B/C labels. Reading statuses start unset. Changes persist only in the visitor’s browser; Reset restores the suggestions. Multiple book notes can stay open for comparison. Native book details remain available without JavaScript; tier/status controls, filtering, and reset require JavaScript.
