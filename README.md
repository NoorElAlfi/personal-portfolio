# personal-portfolio

## Agent pipeline

This repo carries a weekly content pipeline: it collects activity from tracked repos,
curates it, writes proposals, and opens a review PR against the content-as-data YAML.

- Operator playbook: [`agents/WORKFLOW.md`](agents/WORKFLOW.md)
- Journal entry workflow: [`journal/README.md`](journal/README.md)

Quick start: `npm run verify` to check content, `node agents/run.mjs --dry-run` for a
no-write rehearsal, `node agents/run.mjs` for the full weekly run. The pipeline runs
locally, never in CI.

## Ask this site (preview feature)

A small "Ask this site" button that answers questions about the projects, posts and
background. It is a **search, not a chatbot**: there is no AI model, no API key and no
per-question cost. A question is turned into terms, the site's own text is ranked (BM25),
and the best passages are shown **verbatim** with a link to the page they came from. If
the site does not cover a question, it says so and shows nothing.

**Where it runs.** Local development and Netlify deploy previews only. On the production
address the button never renders, the widget code is never requested, and no index is
published. Taking it live is a deliberate change (see "Going live" below).

### How it works

| Step | Where | What happens |
|---|---|---|
| Build the corpus | `scripts/build-chat-index.mjs` | Renders the home page and every post with the site's own React components (through Vite's server-side loader), so what is indexed is exactly what a visitor can read. Splits at each heading into passages of at most about 220 words. Adds one "Contact" passage from the footer's links. Dated card "highlights" (changelog lines) are skipped. |
| Guard against leaks | same script | Fails the build if anything private appears in the output: private repo handles (`agents/repos.txt`), the local private registry, private journal ids, commit hashes, summaries and distinctive slug words. A name the public site already uses is not a marker (the private `siem-guard` repo shares a slug with a public post). |
| Publish the index | `npm run build` (the `postbuild` step) | Writes `dist/chat-index.json` (about 95 kB) **only** when `CONTEXT` is `deploy-preview` or `branch-deploy` (Netlify sets this), or `CHAT_ENABLED=true`. In every other build, including production and CI, nothing is written and a stale file is removed. `CHAT_ENABLED=false` forces it off. |
| Search | `src/lib/chatSearch.js` | Runs in the browser. Stop words, light stemming, a small alias table, one-letter typo tolerance, BM25 with heading matches boosted. A passage is trusted only if it covers at least 60% of the question's weight; words the site never uses count against it. Questions asking for a phone number, address, salary and similar get a specific refusal. |
| Show | `src/components/ChatWidget.jsx` | Plain React elements. Nothing from a question or a passage is ever parsed as HTML, so there is nothing to inject into. Keyboard operable, labelled dialog, polite live region. |

### Re-indexing

- **Deploy previews and branch deploys:** automatic. Every build regenerates the index from
  the site as it is, so a weekly pipeline PR's new post is searchable on its preview before
  you merge it. There is nothing to run and no extra CI step.
- **Locally:** `npm run chat:index` writes `public/chat-index.json` (gitignored), then
  `npm run dev` shows the button on `localhost`. Re-run it after editing site text.
- **Check without writing:** `npm run chat:check` builds the index in memory, runs the leak
  guard and prints the size.

### Testing it

`npm run chat:eval` runs `chat-eval/questions.yml` against the real search code over the site
as it is now: factual questions (the answer must come from a stated page and contain stated
text), questions that must be declined (off-topic, personal, private-project names) and
injection attempts. The questions are in sets written at different times (`tuning`, `heldout`,
`fresh`, `broad`, `faq-paraphrase`, `unseen`, `unseen2`, `unseen3`), because a set you tuned against
says little about questions you have not seen. Judge a change against a set written before it and
read once, not against an old one; to compare two versions of `src/lib/chatSearch.js`, point
`CHAT_SEARCH` at a copy and run the eval for each. Add `--verbose` to see the passage returned for each, `--set <name>` to run one set.
Questions the search cannot answer yet stay in the file with a `known_gap` reason: they are
printed as `GAP`, do not fail the run, and are flagged when they start passing.

### The Hiring FAQ

`content/faq.yml` holds short answers to the usual first questions (about you, work history,
roles sought, relocation, notice, work authorization, compensation). It is **public**: it renders
as the "Hiring FAQ" section on the home page and is indexed like everything else, so the search
answers from it and cites an entry directly (`/#faq-<id>`, which opens that answer). Each entry
may list `also_asked_as` phrasings ("notice period", "visa", "paid"): they are used only to match
a question to its entry and are never shown. `npm run verify` (and so CI) checks the FAQ: valid
shape, no private marker, and every number in an answer must already appear elsewhere on the site.
When the search cannot answer a question it says so and offers the closest FAQ questions to click,
never a passage it is not confident in.

### Going live

It is preview-only by decision. To make it public: set `CHAT_ENABLED=true` for the
production context in Netlify and remove the `isPreviewHost` guard in
`src/components/ChatMount.jsx`. Nothing else changes: still no model, key or cost.

### Limits

It matches words, not meaning, so a paraphrase with words the site never uses (for example
"avoid" where the post says "split") is refused instead of guessed at, and a question whose
answer is in a different passage from the one it matches best can show a neighbouring
passage; the "Also on this site" list is there for that. The static write-ups under
`public/` (explainers, dashboards) are not indexed yet.
