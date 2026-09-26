---
id: 2026-09-20-siem-guard-code-public-release
date: 2026-09-20
project: siem-guard-code
kind: shipped
visibility: public
summary: Published the SIEM Guard code repository with a README and MIT LICENSE, then split default parsing and reasoning models by role through config.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: ad5676a
tags: [security, python]
status: pending
sources:
  - "commit:ad5676a: Add README and MIT LICENSE"
  - "commit:e74c111: Session 38: split default models by role (qwen2.5:7b parsing, mistral:7b reasoning), config-driven"
  - "commit:f3f5731: Session 36: failed_llm rate observability (origin-tracked); Session 37: two-corpus dashboard refresh + remove dead contamination param"
  - "repo:NoorElAlfi/siem-guard-code: public, default branch main, 38 commits since 2026-07-27, last push 2026-09-20T20:26:26Z, description: SIEM Guard: LLM-assisted log parsing plus statistical anomaly and supply-chain detection (code and tests only)"
  - "repo:NoorElAlfi/siem-guard-code: no tags, no GitHub releases"
---

The public code repository for SIEM Guard was published this week.

- `ad5676a` (2026-09-20, the newest commit in the window) added the README and an MIT `LICENSE`,
  giving the project its first explicit license.
- `e74c111` (2026-09-18) split the default models by role through configuration: qwen2.5:7b for
  parsing and mistral:7b for reasoning.
- `f3f5731` (2026-09-17) added origin-tracked `failed_llm` rate observability, refreshed the
  two-corpus dashboard, and removed a dead contamination parameter.

Scope stated by the repository itself, not by prose here: it is described as "code and tests only".
It carries 38 commits since 2026-07-27 with a last push of 2026-09-20T20:26:26Z, and it has no tags
and no releases, so nothing was published as a versioned artifact.
