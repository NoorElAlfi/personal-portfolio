# agents/fixtures — offline pipeline fixtures

**These files are not real project facts.** They are deliberately invented, internally
consistent stand-ins used to exercise the agent pipeline offline (no LLM, no network) and
to document the exact artifact shapes the contract expects.

## Layout

| Path                                                                         | What it is                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activity.json`                                                              | A realistic `collect` artifact: two repositories with commits, merged pull requests and one tagged private repo.                                        |
| `journal/*.md`                                                               | The committed-tier samples: a public `shipped` entry and a vague experiment with no outcome.                                                            |
| `journal/private/*.md`                                                       | The local-only tier sample: a `visibility: private` fix, mirroring how real private entries live outside `journal/entries/`.                            |
| `fake/triage.json`                                                           | `triage` artifact — the same three entries as JSON (so the stage round-trips them back to markdown).                                                    |
| `fake/curate.json`                                                           | `plan.json` for `2026-W39`: two project highlights, one blog post, one now-page update, one `noop`. Together the actions cover all three entries.       |
| `fake/writer-projects.json`, `fake/writer-blog.json`, `fake/writer-now.json` | Writer artifacts: `proposals/project_highlights.json`, `proposals/blog_post.json`, `proposals/now_page.json`.                                           |
| `fake/review.json`                                                           | `pass` with no violations.                                                                                                                              |
| `raw/omp-jsonl.txt`                                                          | A verbatim-shaped `omp -p --mode=json` stdout: a JSONL event stream whose last assistant `message_end` carries `fake/curate.json` as escaped JSON text. |
| `check-extract.mjs`                                                          | Assertions for `agents/lib/agent.mjs`'s tolerant parsing, run against `raw/omp-jsonl.txt` plus synthetic shapes.                                        |

The private sample entry names the project id `siem-guard`, which resolves through the
local-only `agents/private-projects.yml` registry (gitignored; see
`agents/private-projects.example.yml`). Copying the fixtures into a working tree therefore
means copying `journal/private/` into the local-only tier:

```sh
cp agents/fixtures/journal/*.md          journal/entries/
cp agents/fixtures/journal/private/*.md  journal/private/
```

## Using them

The stub agent (`agents/lib/fake-agent.mjs`) identifies the stage from the
`<<<STAGE:name>>>` marker in the prompt it receives on stdin (`<<<KIND:...>>>` picks the
right writer, `<<<WEEK:...>>>` re-stamps the week field, `<<<PROJECT:...>>>` filters the
project-highlight fixture down to the project a single action asked about). It then prints
the matching file from `fake/` verbatim:

```sh
node agents/run.mjs --week 2026-W39 --dry-run \
  --agent-cmd "node agents/lib/fake-agent.mjs"

node agents/fixtures/check-extract.mjs
```

Set `FAKE_FIXTURE_DIR=/path/to/dir` to point the stub at a different fixture set, and
`FAKE_STAGE`/`FAKE_KIND`/`FAKE_FIXTURE` when the prompt has no markers.

The fixture set is intentionally small: it covers every stage, every proposal kind, a
private entry in the local-only tier, a noise entry that must be planned as `noop`, and a
JSONL event stream that only the tolerant parser can read.
