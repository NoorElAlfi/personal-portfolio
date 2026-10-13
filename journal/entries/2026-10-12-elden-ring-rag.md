---
id: 2026-10-12-elden-ring-rag
date: 2026-10-12
project: elden-ring-rag
kind: experiment
visibility: public
summary: errag, a fully local Elden Ring item-and-quest lookup with two tiers, a fail-loud resolver and a golden set as its spec; 2,725 items, 54 eval checks passing.
links: []
tags:
  - elden-ring
  - rag
  - sqlite
  - retrieval
  - evaluation
  - local-first
status: published
sources:
  - "command: python3 -m errag stats -> items 2725, aliases 3732, with region 1448, with location 2438, curated 2, quest steps 285, passages 9643; db errag.db, captured_at 2026-10-11"
  - "command: python3 -m errag eval -> 54 passed, 0 failed, 0 known-gap (xfail); golden set at data/eval/golden.json = 40 answer cases + 6 retrieval cases + 8 invariants"
  - "command: python3 -m errag where \"somber smithing stone ball bearing 1\" -> Somberstone Miner's Bell Bearing [1] (Sellia Crystal Tunnel), exit 0; near alternative Smithing-Stone Miner's Bell Bearing [1] score 0.8333"
  - "command: python3 -m errag where (nothing in corpus) -> exit 2; below threshold -> exit 1 with ranked suggestions; names.ANSWER_MIN = 0.72"
  - "command: python3 -m errag quest Ranni -> ordered Ranni steps with region tags, seq 99-179; quest Ranni -> base 272 steps with 170 region-tagged, dlc 13 steps with 0 region-tagged"
  - "command: python3 -m errag chat --backend none \"struggling with malenia\" -> 12 retrieved blocks, top page Malenia, Blade of Miquella; 9643 passages indexed"
  - "code: names.rank applies a trailing-index guard (0.35 penalty when the query index differs from the item's, 0.6 when the item has no index, 0.9 when the query omits an index the item has), verified against the bell bearing index bug"
  - "readme: no FTS5 -- SQLite's FTS5 trigram tokenizer returns zero rows for the match 'smberston' and cannot rank; corpus is at most a few thousand rows so a Python token-set scorer is simpler and strictly better; revisit past ~100k rows"
  - "readme: no vector store, no embeddings -- tier 1 is a lookup not a synthesis (top-k cosine would blur the near-identical Bell Bearing [1]..[9] entries together); tier 2 is 2.7k words total, which fits a context window whole, and chunking would destroy the ordering that is its entire value"
  - "readme: 287 of the 2725 items have no location -- their pages exist with an empty ==Acquisition== and answer with '(no acquisition text in corpus)'"
  - "readme: the quest document's DLC section is truncated mid-sentence; base game coverage is good, DLC is not"
  - "readme: category is empty for most armaments -- it is read from the page's own [[Category:...]] links and Fandom's weapon pages carry none (Moonveil's wikitext has zero occurrences of 'Category:')"
  - "readme: chat retrieval is heuristic and thinly tested -- only 6 retrieval cases in errag eval, a GENERIC word list, and boss-page preference on combat words are judgement calls"
  - "data/curated/overrides.json: 2 curated entries, merged on top of the corpus after every build; a key matching an existing item overrides its fields and marks the row [curated], a non-matching key with a location is added as a new item"
  - "readme: fetch_fandom.py WEAPON_CLASSES enumerates 40 weapon classes; Category:Weapons returns ~53 overview articles and omits every real weapon; filtering on 'has no {{Infobox Item}}' would drop 517 real items, so index pages are detected by {{Infobox empty}}"
  - "readme: {{SOTE}} on the Bell_Bearings category index flags exactly 10 bearings as Shadow of the Erdtree; no cached item page carries a version marker"
  - "scripts/ollama-serve.sh: OLLAMA_MODELS=/mnt/b/models, OLLAMA_HOST=127.0.0.1:11434, OLLAMA_KEEP_ALIVE=-1; loading an 8B model off /mnt/b measured ~214 s versus rootfs reads at 2.8 GB/s"
---

I wanted a lookup I could run against my own machine for the two Elden Ring questions I
actually ask: where is this item, and what step of this quest am I on. errag answers both
from a local SQLite file, with no network call at query time, no API key and no model
required. It is deliberately two tiers, kept separate.

Tier 1 is item lookup: fuzzy name resolution over the corpus, then a single row with its
region, exact spot, use text and source URL. Tier 2 is ordered quest retrieval: the step
list for a quest, filterable by region or section, with region tags and branch notes kept
intact. The current build holds 2,725 items, 3,732 aliases, 2,438 with a location, 1,448
with a region and 9,643 passages; the quest document contributes 285 ordered steps.

The eval set drove the design more than any other artifact. `data/eval/golden.json` is
registered as the project's real specification: `errag eval` runs 40 answer cases, 6
chat-retrieval cases and 8 invariants, for 54 checks and 0 failures right now. The answer
cases are written from knowledge of the game and not generated from the database, because a
case read out of the database passes no matter how wrong the database is. That is what
caught the scoring tie between the correct answer and `Smithing Stone [1]`.

The resolver is built to fail loudly. A query that resolves to nothing exits 2; a query
below the confidence threshold `ANSWER_MIN = 0.72` prints ranked suggestions instead of an
answer and exits 1; a confident hit exits 0. A trailing index is guarded explicitly so that
asking for `Bell Bearing [1]` cannot answer with `[2]`. When a source page has an empty
`==Acquisition==` section, the card says `(no acquisition text in corpus)` rather than
inventing a location. I also skipped FTS5 and skipped a vector store on purpose. The FTS5
trigram tokenizer returns zero rows for a fuzzy match like `smberston` and cannot rank, and
a Python token-set scorer is simpler for a few thousand rows; I would revisit that past
roughly 100k rows. Embeddings are wrong twice over: top-k cosine would blur five
near-identical `Bell Bearing` entries together, and tier 2 is about 2.7k words that fits in
a context window whole, so chunking it would destroy the ordering that gives it value.

Scraping cannot supply judgement calls, so `data/curated/overrides.json` is merged on top of
the corpus after every build, keyed by item name in any casing or punctuation. A key
matching an existing item overrides its fields and marks the row `[curated]`; a key matching
nothing and supplying a location is added as a new item. It carries 2 entries today, both
clarifying which of the two miner's bell bearings is which.

The honest limits are real. 287 of the 2,725 items have no location at all. The quest
document's DLC section is truncated mid-sentence: 13 DLC steps with 0 region tags against
272 base-game steps with 170 region-tagged, so base-game coverage is good and DLC is not.
`category` is empty for most armaments because Fandom's weapon pages carry no
`[[Category:...]]` links. And chat retrieval is heuristic and thinly tested, covered by only
the 6 retrieval cases — I treat it as a smoke alarm, not a guarantee.

## See it

Both tiers side by side — the item card with its cited source, the ordered quest list, the
resolver's confidence behaviour and the golden set — are walked through here: [errag,
explained](/elden-ring-rag/explained.html).
