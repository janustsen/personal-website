# Navigation and contact

## Sub-features
Sticky navigation, skip link, work CTA, discipline links, back to top, public evidence links, direct email and LinkedIn.

## How to get to it (user POV)
Open the site, choose Work or Experience, or use Get in touch (Email on phones).

## Driving it with Playwright
Run `node verify.mjs`. Click the `Explore my work` link and confirm `#work` and visible heading position. Follow `Back to top`. Inspect mailto URLs without launching a mail client.

## Gotchas
Native smooth scrolling can take more than 650ms over a long page. Wait for the resulting scroll position. LinkedIn can require sign-in; it is an external source, not a broken local control.
