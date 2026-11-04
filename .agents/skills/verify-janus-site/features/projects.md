# Project explanations and drafted insights

## Sub-features
Verdnt Group and Trus disclosures under Building; one-line professional entries under Experience; public evidence and personal context under About. Strategy, Tech & AI, Values, and Books hold drafted insights awaiting Janus's approval.

## Drafts
Every drafted element carries `data-draft="ID"` (S1–S5, A0–A5, V1–V5, B0–B6) and shows an amber "Draft ID · for approval" tag from CSS. V1, V3, V5, and B1 also carry `hidden` and stay off the page. To approve an item, remove its `data-draft` (and `hidden`); to cut it, delete the element. Update the `drafts` and `heldBack` lists in `verify.mjs` to match.

## User path and drive
Open A closer look under either venture. `node verify.mjs` opens `#verdnt summary` and `#trus summary`, confirms native open state, and closes each with Enter. These controls must also work without JavaScript. It also checks the full draft ID list in page order, that held-back items are hidden, and that every shown draft has its tag.
