# Navigation and contact

## Sub-features
Page structure and profile sources: [README.md](../../../../../README.md#design-and-sources). The homepage is one long index: masthead (profile photo, name, contact links, section jump links), then labelled sections and a quiet footer. Once the masthead scrolls away, a thin fixed bar takes its place, with the photo, name, section links (current one marked) and social links (hidden on phones, where the section links scroll sideways). `/building/`, `/experience/`, and `/about/` are redirect stubs to their home sections. `/bookshelf/` is the only other page.

## User path and drive
Open `/`, use a jump link, follow the Bookshelf link, then `← Janus Tsen` home. `node verify.mjs` drives these paths in five browser contexts: it checks the section labels, the Email and GitHub destinations, the avatar mark (`avatar.png` face crop as 1x/2x WebP, alt "Janus Tsen", sharp at the screen density), a jump to Experience that lands below the bar, keyboard focus, and that each old page URL lands on its home section. Inspect footer destinations without sending email. LinkedIn may require sign-in.
