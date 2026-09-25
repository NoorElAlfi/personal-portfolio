# Agent pipeline — operator playbook

The portfolio is content-as-data: metadata lives in YAML under `content/`, prose lives
in `.mdx` (hand-written legacy posts stay `.jsx`). The weekly agent pipeline turns
"what I did last week" into review-ready PRs against that data. It never publishes
directly, and it never runs in CI.

Everything here is grounded in the frozen contract (C1–C6). Where the contract is
ambiguous, this doc says so instead of inventing behaviour — see
[Contract ambiguities](#contract-ambiguities).

---

## The one rule: `content/` is public-bundle material

`import raw from '../../content/x.yml?raw'` inlines the **entire** YAML file into the
client JS verbatim, so anything in `content/*.yml` is shipped to every visitor
regardless of any render filter. Therefore: **never put anything in `content/` that you
would not publish.** Keeping private data out of `content/` is the first line of
defence; the `private_leak` check in [§6](#6-guardrails) is the second.

Private data has three local-only, gitignored homes:

| Local-only path               | Holds                                                                               | Committed counterpart                                   |
| ----------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `agents/private-projects.yml` | private project metadata — the `project` join target for entries about private work | `agents/private-projects.example.yml` (template)        |
| `journal/private/<id>.md`     | private journal entries                                                             | none — `journal/entries/` is the committed, public tier |
| `runs/<week>/`                | pipeline artifacts, raw agent output, private-repo evidence                         | none                                                    |

Local runs read both `journal/entries/` and `journal/private/`; CI sees only
`journal/entries/`. `npm run verify` tolerates the absence of both local-only paths and
prints an informational note instead of failing — that is what keeps CI green while
local runs do the full check. When a project id cannot be resolved, the error names
whether the private registry was absent. The weekly run and `verify` are local-first by
design for the same reason (see [§3](#3-commands) and [§6](#6-guardrails)).

---

## 1. Two-tier journal

| Tier       | Location                                           | Who writes it                              | Purpose                                                                                |
| ---------- | -------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Raw        | `JOURNAL.md` inside each tracked repo              | you, while working                         | free-form running notes; never published, never parsed by the site                     |
| Normalized | `journal/entries/<id>.md` in this repo             | you (or `triage`, from collected activity) | the citable record the pipeline reads                                                  |
| Private    | `journal/private/<id>.md` (gitignored, local-only) | you                                        | same entry shape, for work you cannot publish yet; read by local runs, never committed |

Only the normalized tier is machine-readable, and **only facts present in an entry's
body or its `sources:` list are citable by writers**. `journal/entries/` is committed
and public; `journal/private/` is local-only. Local runs read both tiers, CI sees only
`journal/entries/`. `journal/README.md` explains the
per-entry workflow; `npm run verify` enforces the shape below.

### Exact entry format (`journal/entries/<id>.md`)

```markdown
---
id: 2026-09-25-lucidhover-callgraph-cache # ^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$, unique
date: 2026-09-25
project: lucidhover # MUST match an id in content/projects.yml
kind: shipped # shipped | fixed | learned | wrote | experiment
visibility: public # public | private
summary: One line, <= 200 chars, no newline.
links:
  - commit: 1a2b3c4 # each item has exactly one of repo|commit|pr|url
tags: [vscode, sqlite]
status: pending # pending | published | skipped
sources: [] # machine-collected facts, e.g. "commit:1a2b3c4: subject"
---

Body markdown. Only facts in the body or in `sources` are citable by writers.
```

Rules enforced by `npm run verify`:

- `id` is unique and matches the id regex.
- `kind: shipped` requires at least one link.
- `project` resolves to an id in `content/projects.yml` — or, for private work, in
  `agents/private-projects.yml` (local-only; its absence is tolerated, see
  [§3](#3-commands)).
- An entry with `visibility: private` belongs in `journal/private/` (gitignored), not in
  the committed `journal/entries/`. Private project metadata belongs in
  `agents/private-projects.yml`, never in `content/`. No repo URL or `owner/name` handle
  of a private project may appear in public content.

---

## 2. Stages

Stages run in this fixed order: `collect`, `triage`, `curate`, `write`, `review`,
`apply`, `verify`, `publish`. Each stage writes its artifact under `runs/<week>/`
(week = ISO `YYYY-Www`), and `runs/` is gitignored because it contains private-repo
evidence.

| Stage     | Kind  | Reads                                                               | Writes                                                                                                                                         |
| --------- | ----- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `collect` | code  | `agents/repos.txt`, git history / PR state of the listed repos      | `runs/<week>/activity.json`                                                                                                                    |
| `triage`  | agent | `activity.json`, `content/projects.yml`, `journal/inbox.md`         | `runs/<week>/entries/*.md`, `runs/<week>/inbox.json`                                                                                           |
| `curate`  | agent | `runs/<week>/entries/*.md`, `journal/inbox.md`                      | `runs/<week>/plan.json`                                                                                                                        |
| `write`   | agent | `plan.json`, the cited entries (evidence), existing `content/*.yml` | `runs/<week>/proposals/{project_highlights,now_page,blog_post}.json`                                                                           |
| `review`  | agent | proposal artifacts + the cited entries (evidence)                   | `runs/<week>/review.json`                                                                                                                      |
| `apply`   | code  | `runs/<week>/proposals/*.json`, `runs/<week>/inbox.json`            | `content/*.yml`, `content/posts/<slug>.mdx`, consumed entries `status: pending -> published`, promoted bullets cleared from `journal/inbox.md` |
| `verify`  | code  | `content/`, `journal/entries/`                                      | exit code (report on stdout)                                                                                                                   |
| `publish` | code  | applied working tree                                                | commit + branch + PR (no auto-merge); `runs/<week>/summary.md` via `notify`                                                                    |

### The inbox is input, not a suggestion

`journal/inbox.md` is the one channel the author writes by hand, so `triage` **and** `curate`
receive it, and no bullet is ever dropped silently. `triage` turns every bullet into an entry
and records that bullet's exact text in `runs/<week>/inbox.json`; `apply` deletes a bullet from
the inbox only once the entry it became has been published. A bullet the pipeline could not act
on stays visible in the inbox instead of disappearing.

Bullets that are instructions about the site are honoured as instructions: `now_page` is the
action for "the current focus changed" **and** for retiring an area — the writer retires a card
by listing its id in `remove_ids` (see `agents/prompts/writer-now.md`). A retirement is never
expressed as a highlight or a post.

Raw agent stdout for every agent stage is written to `runs/<week>/raw/<stage>.txt`,
and `usage`/`cost` reported by the model, when present, lands in
`runs/<week>/manifest.json`.

### Why those stages are code, not agents

Agents are used **only** where judgment or prose is required. Anything that has one
correct answer — counting, date arithmetic, git/PR inspection, and file surgery — is
deterministic code, because:

- a merged `content/*.yml` diff must be reproducible and reviewable; a second run of
  `apply` must produce zero additional diff (idempotency);
- provenance and citation checks must be exact: `verify` fails the build if a
  generated number is not present in the concatenated cited entry text/`sources`;
- schema and uniqueness constraints (`id` formats, plan/proposal shapes) are cheap to
  check in code and impossible to guarantee from a prompt.

The rule of thumb: **if a wrong answer would be a hallucination rather than a taste
difference, keep it in code.**

### Agent-vs-code boundary

| Concern                                                     | Owner            | Why                                      |
| ----------------------------------------------------------- | ---------------- | ---------------------------------------- |
| Repo/commit/PR collection, date windows                     | code             | exact, auditable commands                |
| Journal entry ids, dates, link shape, uniqueness            | code (validated) | mechanical format, must be deterministic |
| Is this activity worth an entry?                            | agent (`triage`) | judgment                                 |
| Highlight/post/`now` selection                              | agent (`curate`) | judgment, prioritisation                 |
| Prose: post body, highlight and description text            | agent (`write`)  | writing                                  |
| Merging proposals into `content/`, flipping entry status    | code (`apply`)   | deterministic, idempotent                |
| Citations, numeric tokens, private-leak, duplicates, schema | code (`verify`)  | must be exact and reproducible           |
| Commit/branch/PR creation                                   | code (`publish`) | file surgery, no judgment                |

### Producer / reviewer rule

The reviewer is a **separate agent invocation** that receives only:

1. the proposal artifact(s) under `runs/<week>/proposals/`,
2. the cited journal entries (body + `sources`), i.e. the evidence,
3. `plan.json` for the intended actions.

It never receives the writer's reasoning, rationale, drafts, or agent transcript. A
verdict is `review.json` (`verdict` + `violations[]` with `rule` ∈
`unresolvable_citation | unsourced_number | private_leak | style_violation | duplicate
| schema_invalid`). `apply` refuses to run against a failing verdict.

---

## 3. Commands

All scripts live at the repo root and accept `--root <dir>` (default: repo root).

```sh
npm run verify                              # node scripts/verify-content.mjs — all content checks
node agents/run.mjs --dry-run               # stages collect..review only; no writes to content/ or git
node agents/run.mjs                         # full weekly run, writes content/ + opens a PR
node agents/run.mjs --from review           # resume from a stage, reusing earlier artifacts
node agents/run.mjs --only write            # run exactly one stage
node agents/run.mjs --no-publish            # everything except the PR step
node agents/run.mjs --week 2026-W39         # pin the week (default: current ISO week)
node agents/run.mjs --since 2026-09-18      # narrow the collect window
node agents/run.mjs --agent-cmd "omp -p --mode=json --no-session --cwd ."
node agents/run.mjs --agent-cmd "claude -p --output-format text"
```

`--dry-run` = stages `collect..review` only: no writes to `content/` and no git
operations. `--from`/`--only` reuse or isolate stages via the artifacts already on
disk.

Individual scripts:

```sh
node scripts/verify-content.mjs [--root <dir>] [--json]
node scripts/apply-proposals.mjs [--root <dir>] [--week <YYYY-Www>] [--dry-run]
node scripts/notify.mjs [--root <dir>] [--week <w>]
```

`verify-content.mjs` prints a readable report and exits 1 on any failure; with
`--json` it emits `{root, ok, strictPrivate, checks, warnings}`. The human-readable
summary line ends with `... N finding(s), M warning(s)` — findings fail (exit 1),
warnings are printed as `file:line` and exit 0 unless `--strict-private` promotes them.
See [§6 Guardrails](#6-guardrails) for which files each severity applies to.

Both private trees are local-only: `verify-content.mjs` tolerates the absence of
`journal/private/` and `agents/private-projects.yml` and prints an informational note
instead of failing — that is what keeps CI green while a local run does the full check.
When a project id cannot be resolved, the error says whether the private registry was
absent.

### Agent invocation (`agents/lib/agent.mjs`)

Default command: `omp -p --mode=json --no-session --no-tools --cwd <repo-root>`. Prompts
live in `agents/prompts/*.md` and are fed to the process **on stdin**; each prompt contains
a `<<<STAGE:<name>>>` marker so a stub can identify the stage.

`--no-tools` is deliberate: every fact a stage needs is embedded in its prompt, so an agent
with tools does nothing but explore the repository. Measured on the first real run, writer
and reviewer calls spent minutes and megabytes on `read`/`grep`/`bash`/`eval` calls before
answering — one stage ran past twenty minutes without producing output. With tools off the
same stages answer in seconds. Re-enable them with `--agent-cmd` if a future stage genuinely
needs to read the tree.

`omp -p --mode=json` emits a **JSONL event stream** (one JSON object per line), not a
single JSON object. The final assistant text arrives in the last
`{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"..."}]}}`
event. `agent.mjs` parses that, and also tolerates a fenced code block, a wrapper
envelope (last balanced `{...}`), and plain text output.

Overrides:

- `--agent-cmd "<cmd>"` or `$AGENT_CMD`;
- `--agent-cmd "claude -p --output-format text"` works unchanged — the prompt is still
  fed on stdin and the artifact JSON is read from stdout;
- bare `omp -p` also works (plain-text output is accepted);
- `$AGENT_TIMEOUT_MS` caps one agent call (default 600000). A stage that hangs is worse
  than one that fails: on timeout the child tree is killed, raw stdout is still written,
  and the stage fails with `timed out after Ns` so the run can resume with `--from`.

Raw stdout from every agent stage is always saved to `runs/<week>/raw/<stage>.txt`,
even on success. On unparseable output the stage is retried once, then fails hard.
`agents/lib/fake-agent.mjs` is a deterministic stub (no LLM) that emits fixture-driven
outputs per stage — used for offline tests.

---

## 4. Weekly loop

1. **During the week** — take notes in each repo's `JOURNAL.md`, and normalize the
   ones worth citing into `journal/entries/<id>.md` (`status: pending`). Entries you
   cannot publish go to the local-only `journal/private/` instead.
2. **Run** — `npm run agent:run` (or `node agents/run.mjs`). Inspect
   `runs/<week>/plan.json`, `runs/<week>/review.json`, and the diffs it proposes.
3. **Review** — read the PR and the Netlify deploy preview for the branch. Fix or
   discard by editing/abandoning the branch; nothing is live yet.
4. **Merge** — merging the PR is the whole release step. It flips nothing extra:
   `apply` already flipped the consumed entries `status: pending -> published` and
   wrote the new `content/*.yml` / `content/posts/<slug>.mdx` in the same PR. Netlify
   then builds `main` on its own.

A silent week (no publishable activity) produces no PR and no notification.

---

## 5. Extending the pipeline

**Add a project** — a **public** project goes in `content/projects.yml` (newest first)
using the C1 schema (`id` kebab-case, unique; `status` ∈ `shipped|active|paused`;
`visibility` ∈ `public|private`; `links[]` each with exactly one of `to`/`href`) — but
remember `content/` ships to every visitor ([the one rule](#the-one-rule-content-is-public-bundle-material)),
so only set `visibility: private` there if the metadata itself is publishable. Anything
else goes in `agents/private-projects.yml` (copy `agents/private-projects.example.yml`;
gitignored, local-only) so local runs still resolve the `project` join key. Either way,
add its repo to `agents/repos.txt` so `collect` sees it. Add a `JOURNAL.md` in that repo
if you want a raw tier there.

**Add a post** — either hand-write it: a `.jsx` (legacy) or `.mdx` file under
`src/pages/blog/`, plus a `content/posts.yml` entry (`slug`, `title`, `summary`,
`tags`, `file`, `date`, `project`, `source_ids`, `generated: false`); or let the
pipeline do it: `curate` emits a `blog_post` action and `write` emits
`proposals/blog_post.json`, which `apply` turns into `content/posts/<slug>.mdx`
plus the `content/posts.yml` entry with `generated: true`.

**Track a repo** — one line per repo in `agents/repos.txt`:

```
owner/name [private|public]
```

The `public|private` token drives the redaction guardrail below. Private repos are
collected locally only; their evidence stays under the gitignored `runs/`.

---

## 6. Guardrails

- **`content/` is public-bundle material** — the first line of defence. `?raw` inlines
  the whole YAML file into the client bundle, so anything under `content/` reaches every
  visitor regardless of render filters. Keep private project metadata in
  `agents/private-projects.yml` and private entries in `journal/private/`; the
  `private_leak` check below is the second line of defence.
- **Private-repo refs (`private_leak`)** — severity depends on who authored the file:
  - **Hard fail (exit 1)** in the pipeline's own output: any non-private record in
    `content/*.yml`; any post with `generated: true` (its registry fields _and_ its body
    file); any `.mdx` body under `src/**`; public journal entries. Machine-written
    content must be airtight.
  - **Warn only (exit 0, printed as `file:line`)** in hand-written `.jsx`/`.js` site
    sources — pre-existing authored content is the author's call, not a pipeline
    failure. `npm run verify -- --strict-private` promotes those warnings to failures.
  - **Exempt** — a private record's _own_ `repo`/`links`/`description` is never a leak:
    it is the journal's join target, not public-visible content. That covers
    `agents/private-projects.yml` (local-only) and, should one ever sit there, a
    `visibility: private` record in `content/*.yml`. Only appearances of private data in
    public-visible content count. `review` also looks for leaks, before `verify` sees
    the applied content.
- **Provenance** — every generated `text`, `description`, and `body_markdown` must
  carry non-empty `source_ids` that resolve to existing journal entries, and every
  numeric token in generated text must appear in the concatenated cited entry
  text/`sources`. This is the invariant `verify` enforces.
- **No auto-merge** — `publish` opens a PR; a human merges. CI gates the PR, it never
  merges it.
- **Max 1 post per week** — `curate` plans at most one `blog_post` action.
- **Silent week** — a plan of only `noop` actions yields no PR and no notification.
- **Idempotency** — re-running `apply` on the same proposals must produce no
  additional diff.

---

## 7. What to check when a run goes wrong

1. `runs/<week>/raw/<stage>.txt` — raw agent stdout for the failing stage. Read this
   first: it is the unmodified model output, including JSONL noise and retries.
2. `runs/<week>/manifest.json` — `usage`/`cost` for the stage, when the model reported
   them.
3. The stage artifact itself — `activity.json`, `entries/*.md`, `plan.json`,
   `proposals/*.json`, `review.json`. Artifacts are the debug surface; the pipeline is
   resumable from them.
4. Resume instead of re-running the week: `node agents/run.mjs --from <stage>`, or
   `--only <stage>` to isolate one stage. Fix the prompt/input, then re-run from that
   stage.
5. If the verdict is `fail`, read `violations[].rule` and `detail` in `review.json`,
   fix the proposal or the cited entry, and re-run `--from write` (or `--from review`).
6. `npm run verify` **warnings** are not failures — each prints as `file:line` and the
   run still exits 0. Canonical example: `src/pages/blog/SiemGuardPost.jsx:90` links
   `github.com/NoorElAlfi/siem-guard` (private) from a public post. Deliberately **not**
   auto-fixed: that repo holds the six-part write-up the sentence refers to, while the
   public `siem-guard-code` repo is "code and tests only", so repointing the link would
   falsify the sentence — it is an open author decision (publish the write-up, or reword
   the sentence). After resolving, re-run `npm run verify` and confirm the summary
   line's `M warning(s)` count drops.

---

## Contract ambiguities

Reported, not invented. Each of these needs a contract decision before code depends
on it:

1. **Plan action type vs proposal file name.** `plan.json` uses the action type
   `project_highlight` (singular) while the proposal artifact is
   `proposals/project_highlights.json` with `"kind": "project_highlights"`. The mapping
   is assumed 1:1 per kind, but nothing in C1–C6 states it.
2. **Where a generated post file lives.** C4 says `apply` writes
   `content/posts/<slug>.mdx`; C1 says `content/posts.yml`'s `file` is a basename
   "inside `src/pages/blog/`". Whether the generated `.mdx` is `content/posts/<slug>.mdx`
   or `src/pages/blog/<slug>.mdx` (and what `file` then holds) is unspecified.
3. **Who writes `last_activity` and `highlights`.** C1 marks both as "written by the
   pipeline", but C4 only assigns `content/*.yml` writes to `apply-proposals.mjs`
   (from proposals) — no proposal kind carries `last_activity`, so its writer/derivation
   rule (newest highlight date? collect date?) is undefined.
4. **Default week and default `--since`.** C4 documents `--week <YYYY-Www>` and
   `--since <YYYY-MM-DD>` but not their defaults (current ISO week? last 7 days?
   since the previous run?). The playbook assumes "current ISO week" above.
5. **"Silent week" trigger.** The guardrail is described, but the mechanical test is
   not: no collected activity, or a `plan.json` whose actions are all `noop`? Both are
   plausible; the pipeline should implement one and say which.
6. **Numeric tokens vs dates.** The verify invariant says "every numeric token in
   generated text appears in the concatenated cited entry text/`sources`". A generated
   sentence containing `2026-09-25` or `v2` contains numeric tokens; whether such
   tokens are exempt (or must be split/ignored) is unspecified.
7. **CI file ownership.** `.github/workflows/ci.yml` cannot be created in this
   workspace: it is a protected path and must be added manually by the user. The
   intended content is the workflow described in section 3/6 of this doc (Node 20,
   `npm ci` → `npm run verify` → `npm run build`, `pull_request` + `push` to `main`,
   no secrets, no deploys, comment stating the weekly run is local by design).
