# Bookshelf

## Sub-features
Twenty sourced suggestions grouped into S, A, B and C tiers, with no per-book tier or status menus and no drawings or photos. Each book has a native disclosure; opening another keeps existing notes open. With JavaScript, drag a summary to a tier or focus it and press S, A, B or C. Tier moves persist in local storage. Search matches title or author; topic filters combine with search and show an empty state when nothing matches. Reset restores suggested tiers, closes notes and clears filters. Without JavaScript the tools are hidden and disclosures still work.

## User path and drive
Follow Bookshelf from the homepage. `node verify.mjs` checks all 20 entries and independent disclosures in desktop, phone, compact phone, reduced-motion and no-JavaScript contexts. The JavaScript cases move Good Strategy/Bad Strategy to C with the keyboard, reload to confirm persistence, search Rumelt, combine it with Philosophy for an empty state, and reset. Desktop also drags the book to A and resets again. The no-JavaScript case closes a disclosure with Enter. Every context checks for overflow, captures `*-bookshelf.png`, and follows the home link.

## Limits
Persistence is local to this browser. External publisher links are inspected in source; no purchase is made.
