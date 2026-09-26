# personal-portfolio

## Agent pipeline

This repo carries a weekly content pipeline: it collects activity from tracked repos,
curates it, writes proposals, and opens a review PR against the content-as-data YAML.

- Operator playbook: [`agents/WORKFLOW.md`](agents/WORKFLOW.md)
- Journal entry workflow: [`journal/README.md`](journal/README.md)

Quick start: `npm run verify` to check content, `node agents/run.mjs --dry-run` for a
no-write rehearsal, `node agents/run.mjs` for the full weekly run. The pipeline runs
locally, never in CI.
