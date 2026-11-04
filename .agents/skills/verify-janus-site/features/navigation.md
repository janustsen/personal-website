# Navigation and contact

## Sub-features
Page structure and profile sources: [README.md](../../../../README.md#design-and-sources). The homepage is one long index: masthead (name, contact links, section jump links), then labelled sections and a quiet footer. `/building/`, `/experience/`, and `/about/` are redirect stubs to their home sections. `/bookshelf/` is the only other page.

## User path and drive
Open `/`, use a jump link, follow the Bookshelf link, then `← Janus Tsen` home. `node verify.mjs` drives these paths in five browser contexts: it checks the section labels, the Email and GitHub destinations, the loaded headshot, a jump to Experience, keyboard focus, and that each old page URL lands on its home section. Inspect footer destinations without sending email. LinkedIn may require sign-in.
