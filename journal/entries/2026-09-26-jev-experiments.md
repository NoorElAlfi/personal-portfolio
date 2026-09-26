---
id: 2026-09-26-jev-experiments
date: 2026-09-26
project: null
kind: experiment
visibility: public
summary: "JEV (system one models) is a decision-making model the author is learning, applied to a Werewolf benchmark and to SIEM Guard alongside Semif."
links:
  - url: https://typesafe.ai/blog/introducing-system-one-models-and-jev
tags:
  - jev
  - system-one
  - semif
  - siem-guard
  - experimentation
status: published
sources:
  - "user: JEV is a new specialized AI decision-making model, distinct from JEPA (https://typesafe.ai/blog/introducing-system-one-models-and-jev)"
  - "user: applied JEV to a Werewolf toy example - a local LLM plays every character in a game of Werewolf while Jev scores each statement for suspicion and votes out the most suspicious player each round, to test whether Jev catches werewolves more often than chance"
  - "user: applied JEV and Semif (the open-source version of JEV) to SIEM Guard"
---

JEV is a family of specialized "system one" decision-making models, and a line of work the author is
actively learning. It is not JEPA, and it is not a continuation of the failed JEPA compression project:
an earlier note left that question open, and the author has since answered it.

Two experiments so far. The first is a toy benchmark: a local LLM plays every character in a game of
Werewolf while Jev scores each statement for suspicion and votes out the most suspicious player each
round, testing whether Jev catches werewolves more often than chance. The second applies Jev and Semif,
its open-source counterpart, to SIEM Guard.
