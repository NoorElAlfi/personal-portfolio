---
id: 2026-09-05-siem-guard-detectors-harness
date: 2026-09-05
project: siem-guard-code
kind: shipped
visibility: public
summary: "Built SIEM Guard's detection path: behavioral and supply-chain detectors, adversarial generation, parser batching and caching."
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: 85157b3
  - commit: 46ee6df
  - commit: 3238ef8
  - commit: cbdf12e
tags:
  - python
  - detection
  - llm
  - supply-chain
status: published
sources:
  - "commit:c284c20: Fix harness imports to match flat module layout"
  - "commit:cbdf12e: Add batching, retry, and caching to LLMLogParser"
  - "commit:85157b3: Implement BehavioralDetector: two-tier Isolation Forest + LLM reasoning"
  - "commit:46ee6df: Implement SupplyChainDetector: typosquat + source + size + timing detection"
  - "commit:fab59fe: Session 4: Wire BehavioralDetector + SupplyChainDetector into harness"
  - "commit:3238ef8: Implement AdversarialTestingAgent: LLM evasion generation + coverage scoring"
---
`BehavioralDetector` scores logs with a two-tier Isolation Forest plus LLM reasoning, and `SupplyChainDetector` covers typosquat, source, size and timing signals; both were wired into the harness, which first needed its imports fixed against the flat module layout. `LLMLogParser` gained batching, retry and caching, and `AdversarialTestingAgent` generates LLM evasions and scores their coverage.
