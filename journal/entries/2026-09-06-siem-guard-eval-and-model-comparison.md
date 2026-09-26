---
id: 2026-09-06-siem-guard-eval-and-model-comparison
date: 2026-09-06
project: siem-guard-code
kind: experiment
visibility: public
summary: Validated the pipeline with ground-truth precision/recall/F1, benchmarked parsing across batch sizes, and compared models.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: bcd2940
  - commit: d0c5139
  - commit: 4ee3468
tags:
  - python
  - evaluation
  - benchmark
  - splunk
status: published
sources:
  - "commit:bcd2940: Session 9: Full validation with ground-truth precision/recall/F1"
  - "commit:9bb6bb6: Session 5A: Benchmark parsing performance across batch sizes and LLM params"
  - "commit:59a83fd: Session 5B: Tune LLM parsing params to fixed max_tokens cliff, re-verify"
  - "commit:d0c5139: Session 24: structured output contract + model comparison for parsing accuracy"
  - "commit:4ee3468: Add Splunk dashboards and HEC ingestion script for Sessions 4-7 metrics"
---
Full validation ran against ground truth with precision, recall and F1, and parsing was benchmarked across batch sizes and LLM parameters — which located a fixed `max_tokens` cliff and led to retuned parsing parameters, re-verified afterwards. A structured output contract plus a model comparison went after parsing accuracy specifically. Splunk dashboards and an HEC ingestion script consume the run metrics.
