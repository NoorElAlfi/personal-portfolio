---
id: 2026-10-12-cryptic-coach
date: 2026-10-12
project: cryptic-coach
kind: experiment
visibility: public
summary: Fine-tuning Qwen2.5-1.5B-Instruct on cryptic crossword clues; the best model solves about 3.6% of unseen clues, and the "Definition:" line is a template, not reasoning.
links: []
tags:
  - cryptic-coach
  - fine-tuning
  - llm
  - grpo
  - evaluation
  - negative-result
status: published
sources:
  - "repo: B:/finetune_llm (code-name 'Cryptic Coach'); aggregates only in results/results_table.md, results/failure_analysis.json, results/sft_v2.md, results/phase4_grpo.md, results/phase4c_grpo_from_sft_v2.md, results/phase5_gguf.md, results/phase5_api_baseline.md, results/phase5b_distillation.md"
  - "base model Qwen2.5-1.5B-Instruct (Apache 2.0), 4-bit QLoRA on one 8GB GPU (RTX 2070 SUPER, fp16 only)"
  - "test set: 3,000 clues whose answers never appear in training; exact match after normalization, greedy decoding, 95% bootstrap CIs (10,000 resamples); unparseable output counts as wrong; test scored once per stage"
  - "leakage checks on the answer-disjoint split: a plain random split would have leaked 398 edit-distance-1 and 1,378 same-stem answers, plus 13 near-duplicate clues, into test"
  - "SFT-vs-random contrast: the same recipe on a random split scored 3.4% test EM against 1.0% on the answer-disjoint split (first SFT only)"
  - "data: 418,508 of the 578,443 training clues carry a definition annotation that appears verbatim in the clue"
  - "SFT (40,000 clues) test EM 1.0%; SFT v2 (160,000 clues) test EM 2.1%, paired +1.13 points (95% CI [0.6, 1.67]); dev curve flat after about 80,000 clues"
  - "GRPO failed runs (from the 1.0% SFT): about 99% of groups had no correct answer; over 200 steps dev EM fell from 1.8% to 0.3% while the right-letter-count share rose from 43% to 81%"
  - "GRPO final run (from SFT v2 at 2.1%): dynamic sampling, exact-match reward (1.0 exact answer, 0.1 well-formed tag); test EM 3.6%, +1.53 points over SFT v2 (95% CI [0.83, 2.27]); single seed, one lineage"
  - "template finding (final model, 3,000 test clues): the 'Definition:' line equals the dataset annotation 63% of the time (n = 2,175) but the answer is right on only 3.8% of those"
  - "failure breakdown (final model): 51% of wrong answers have the correct letter count, but only about 12% of letters sit in the correct position; 2,823 different answers across the test set"
  - "distillation: teacher-written wordplay explanations made the student worse than matched templated controls: -1.5 to -1.9 test points at 483 clues, and -0.6 points at 3,699 clues; right-length answers fell from about 55% to about 25%; cost $6.36"
  - "GGUF export: final adapter exported to a 986 MB Q4_K_M GGUF; 3.4% test EM versus merged fp16 3.8%, a difference of -0.40 points (paired CI [-0.87, +0.10])"
  - "API baseline: DeepSeek V4.1 Flash 66.3% on the shared 300-clue test subset, a lower bound (86 of 300 clues hit the token limit and count wrong), cost $2.07"
---

I fine-tuned a 1.5B model to solve cryptic crossword clues. A cryptic clue carries two halves that both point at the answer: a plain definition, and wordplay that spells the answer out. I trained Qwen2.5-1.5B-Instruct on one 8GB GPU, first with QLoRA supervised fine-tuning, then with GRPO, a reinforcement-learning method that rewards correct answers. The best model solves about 3.6% of clues whose answers it never saw in training. That is the headline, and I want the chart to say nothing more than that.

## Measuring honestly came first

Most of the work went into not fooling myself. The trap is the split: divide clues at random and the same answer appears on both sides, so a model can score by remembering answers instead of solving clues. So the headline split puts every clue for a given answer on one side only. I checked it three ways — zero exact answer overlap, zero edit-distance-1 or same-stem overlap, and zero near-duplicate clues. A plain split would have leaked 398 near-identical answers, 1,378 same-stem answers and 13 near-duplicate clues into test. Every stage is scored on the same 3,000-clue test set with greedy decoding and 95% bootstrap confidence intervals.

The contrast makes the point concrete. The same recipe on a random split scored 3.4%, against 1.0% on the answer-disjoint split, so memorising answers is worth several times the honest number for the first SFT model. I only ran that contrast once.

## SFT learns the shape, not the skill

The model replies with a definition line and then an answer tag. That definition comes from the dataset's annotation: 418,508 of the 578,443 training clues carry one I could match verbatim in the clue. This line is a template, not reasoning. It teaches where the definition sits in the clue and nothing about how the wordplay works.

SFT on 40,000 clues reached 1.0% on test. Four times the data, 160,000 clues, reached 2.1%, a paired gain of +1.13 points (95% CI [0.6, 1.67]). The dev curve was flat after roughly 80,000 clues, so more data of the same kind looks unlikely to help much.

## GRPO failed twice, then worked once

GRPO only learns if some answers in a sampled group are better than others. From the weak first SFT, about 99% of groups contained no correct answer, so there was nothing to learn from. The model optimised the small shaping bonuses instead: over 200 steps dev exact match fell from 1.8% to 0.3% while the share of answers with the right letter count rose from 43% to 81%. A second attempt removed the length bonus and added letter-position credit; it degraded more slowly but still degraded.

The third attempt changed three things at once: a stronger starting model (SFT v2 at 2.1%), dynamic sampling that trains only on groups containing both a right and a wrong answer, and a reward with no shaping at all — 1.0 for the exact answer, 0.1 for a well-formed tag. Test accuracy went from 2.1% to 3.6%, +1.53 points over SFT v2 (95% CI [0.83, 2.27]). I cannot say which of the three changes mattered most, and every result here is a single seed.

## The "Definition:" line is not reasoning

On the test clues the model's definition line matches the dataset annotation 63% of the time (n = 2,175), but the answer is right on only 3.8% of those clues. Finding the definition is learnable pattern matching; working out the wordplay is the unsolved part. Of the wrong answers, 51% have the correct letter count, but on average only about 12% of the letters sit in the correct position. The model has learned the enumeration, not the word.

I tried to fix that with real reasoning. I paid a strong teacher to write wordplay explanations for training clues and trained the student on them. Every explanation-trained model was worse than a matched control, with confidence intervals excluding zero: -1.5 to -1.9 points at 483 clues and -0.6 points at 3,699. The student learned to write fluent wordplay that does not add up, then derived an answer from the invented working; right-length answers fell from about 55% to about 25%.

## Two more measurements

The final adapter was exported to a 986 MB Q4_K_M GGUF. Against the merged fp16 model it scored 3.4% versus 3.8%, a difference of -0.40 points (paired CI [-0.87, +0.10]), so deployment does not change the story. For scale, a large reasoning model, DeepSeek V4.1 Flash, scores 66.3% on the shared 300-clue subset — a lower bound, since 86 of those clues hit the token limit — for $2.07 of API spend. That gap is the difference between reciting a genre and solving it.

![Accuracy by stage](/cryptic-coach/results_chart.png)

## What is still open

I changed several things at once in the successful GRPO run and ran one seed along a single chain, so I cannot credit any single change. The honest reading is that this model learned the format of the task and a little of the substance, and that it solves about 3.6% of clues rather than anything more.

## See it

The interactive overview — the pipeline, the leakage checks, the accuracy table and the failure breakdown — is on its own page: [open the Cryptic Coach overview](/cryptic-coach/overview.html).
