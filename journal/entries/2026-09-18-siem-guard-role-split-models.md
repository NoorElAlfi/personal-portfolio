---
id: 2026-09-18-siem-guard-role-split-models
date: 2026-09-18
project: siem-guard-code
kind: shipped
visibility: public
summary: Split default models by role (qwen2.5:7b parsing, mistral:7b reasoning), config-driven, and tracked failed_llm rate by origin.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: e74c111
  - commit: f3f5731
tags:
  - python
  - llm
  - observability
  - config
status: published
sources:
  - "commit:e74c111: Session 38: split default models by role (qwen2.5:7b parsing, mistral:7b reasoning), config-driven"
  - "commit:f3f5731: Session 36: failed_llm rate observability (origin-tracked); Session 37: two-corpus dashboard refresh + remove dead contamination param"
---
Default models are now split by role — `qwen2.5:7b` for parsing, `mistral:7b` for reasoning — and the choice lives in configuration rather than in code. The `failed_llm` rate is tracked with the origin of each failure recorded, and the dashboard was refreshed against two corpora.
