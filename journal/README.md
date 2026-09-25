# Journal

The journal is the factual record the rest of the content pipeline cites. Prose on the site is
generated _from_ journal entries; the entries themselves are never generated. If a fact is not in
an entry's body or `sources:` list, no writer may use it.

## Layout

| Path                               | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `journal/inbox.md`                 | Raw scratch bullets, unedited, no format. Never cited.               |
| `journal/entries/<id>.md`          | Committed, public entries. Front matter plus a markdown body.        |
| `journal/private/<id>.md`          | Gitignored, local-only private entries. Identical format.            |
| `agents/private-projects.yml`      | Gitignored, local-only private project records for `project:` joins. |
| `agents/schemas/entry.schema.json` | Machine-readable version of the front-matter contract below.         |

Never put anything in `content/` that you would not publish: `?raw` inlines those files into the
client bundle verbatim, so a stray import there publishes whatever it reads. That is why private
project metadata lives in `agents/private-projects.yml` and private entries live in
`journal/private/`. Local runs read `journal/entries/`, `journal/private/` and the private registry;
`scripts/verify-content.mjs` reports an absent local-only path as a `NOTE`, never a failure, so a CI
checkout stays green. CI therefore has no private tokens at all, which means the privacy check is
only as strong as a local run — run `npm run verify` before pushing.

## Front matter

```yaml
---
id: 2026-09-25-lucidhover-callgraph-cache # ^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$, unique, == filename
date: 2026-09-25 # YYYY-MM-DD
project: lucidhover # content/projects.yml id, or agents/private-projects.yml id for private work
kind: shipped # shipped | fixed | learned | wrote | experiment
visibility: public # public | private
summary: One line, <= 200 chars, no newline.
links: # each item has exactly one of repo|commit|pr|url
  - repo: NoorElAlfi/lucidHover # "owner/name"
  - commit: 1a2b3c4
tags: [vscode, sqlite]
status: pending # pending | published | skipped
sources: [] # machine-collected facts, e.g. "commit:abc1234: subject"
---
Body markdown.
```

`links` may be empty unless `kind: shipped`, which requires at least one link.

## Rules

1. `id` is unique and equals the filename stem (`<id>.md`).
2. `project` must resolve to an `id` in `content/projects.yml`, or — for local-only private work — in
   `agents/private-projects.yml`; the gate joins the two registries into one id namespace. Use
   `status`, not prose, to record workflow state; `status: pending -> published` is flipped by
   `scripts/apply-proposals.mjs`. A public entry whose `project` exists only in the private registry
   is reported as a warning, since private joins are local-only.
3. `kind: shipped` requires at least one link.
4. `summary` is a single line of at most 200 characters.
5. `visibility: private` means the entry is evidence only, and it must live in `journal/private/` —
   a `visibility: private` entry found in the committed `journal/entries/` directory is a hard
   failure, because private evidence must never be committed to this public repository. No repo URL
   or handle belonging to a private project may appear in public content (`content/*.yml`, `src/**`,
   or any `visibility: public` entry). A private record's own `repo`/`links`/`description` fields are
   the join target, not a leak, so they are exempt — and `agents/private-projects.yml` is outside the
   scan targets entirely. `scripts/verify-content.mjs` fails hard (`private_leak`) when the leak
   reaches pipeline-facing content — a public registry record, a `generated: true` post, an `.mdx`
   post body, or a public entry — and only warns (exit 0, printed with `file:line`) when it lives
   solely in hand-written `.jsx` site sources, because pre-existing prose is the author's call. Run
   it with `--strict-private` to fail on those warnings too.
6. `sources` holds machine-collected facts, one per line, in the form `commit:<sha>: <subject>`,
   `pr:<owner>/<name>#<n>: <title>`, or a bare URL. Only facts present in the body or in `sources:`
   are citable by writers.
7. Body markdown may cite only facts that are in the body or in `sources:`. No invented numbers,
   metrics, dates, or outcomes.

## Capture workflow

1. **Capture.** While working, append plain bullets to `journal/inbox.md`. No schema, no
   front matter, no deduping — wrong-format notes are fine, missing notes are not.
2. **Normalize.** Turn inbox bullets into entries under `journal/entries/` (public work) or
   `journal/private/` (private work). This is either the pipeline's `triage` stage (which reads
   `runs/<week>/activity.json` and emits entries) or a manual pass: copy the front-matter template
   below, set `id` to `<date>-<project>-<slug>`, set `visibility` **and file the entry in the matching
   directory**, fill `links`/`tags`, copy the shell/`gh` evidence into `sources:`, leave
   `status: pending`, and clear the consumed bullets from `inbox.md`. Add missing private projects to
   `agents/private-projects.yml` so their `project` id resolves.
3. **Verify.** Run `node scripts/verify-content.mjs --root .`. It validates every entry against
   `agents/schemas/entry.schema.json`, checks `id`/filename agreement and `project` resolution against
   both registries, and rejects private leaks. `NOTE` lines only report absent local-only paths (an
   unresolvable `project` says so explicitly when `agents/private-projects.yml` is missing). Fix the
   reported paths until it exits 0; the pipeline will not consume an entry that fails verification.

## Entry template

```markdown
---
id: 2026-09-25-my-project-thing
date: 2026-09-25
project: my-project
kind: fixed
visibility: public
summary: One line, <= 200 chars, no newline.
links:
  - commit: 1a2b3c4
tags: [tag-one, tag-two]
status: pending
sources:
  - "commit:1a2b3c4: the real commit subject, copied verbatim"
---

What actually happened, in past tense, with only facts that are in `sources:`.
```
