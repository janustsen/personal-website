# Project explanations and held-back entries

## Sub-features
Verdnt Group and Trus disclosures under Building; professional entries under Experience; the intro under About; hobbies under Other interests. Values holds four values (Optimization, Human relations, Multiplying throughput, Candor) grounded in Janus's own records; Books holds the bookcase and its book notes.

## Held back
The hidden entry (B1, a Books spine) and how to publish or cut them are documented in [README.md](../../../../README.md#design-and-sources).

## User path and drive
Open the details under either venture ("More on Verdnt Studio" or "How Trus worked"). `node verify.mjs` opens `#verdnt summary` and `#trus summary`, confirms native open state, and closes each with Enter. These controls must also work without JavaScript. It also checks that only the held-back entry carries `data-draft`, that they are hidden, and that no draft tag shows anywhere.
