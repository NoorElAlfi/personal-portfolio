---
id: 2026-09-27-jev-werewolf-results
date: 2026-09-27
project: jev-werewolf
kind: experiment
visibility: public
summary: Jev finds deception in LLM Werewolf and Mafia games (AUC 0.61-0.71) but not in human games; the learned signal looks like wolf style, not lying.
links: []
tags:
  - jev
  - werewolf
  - evaluation
  - calibration
  - deception
status: published
sources:
  - "notes: reports in B:/jev-werewolf (local-only research prototype): reports/core.md, reports/human.md, reports/human_wau_endrole.md, reports/live.md, reports/stress.md, reports/ablations.md, reports/richer_jev.md, reports/richer_jev_features.md, reports/site/jev-werewolf.html"
  - "command: python -m pytest -q -> 223 passed, offline"
---

Can a local judge model tell who is lying in a social-deduction game? The same Werewolf and
Mafia transcripts are run past Jev (TypeSafe's System One model, pinned to `jev-1.13.0`) and past
a set of baselines, and accuracy, calibration, cost and latency are reported on both LLM-generated
and human game data.

Every judge sees only `public_view(transcript, upto_round)`: identical text for all of them, no
night actions, no roles. Judges compared: `random` (the chance baseline), `keyword` (suspicious
words in a player's own statements), `length` (talk volume so far), `llama_judge` (llama3.1:8b on
local Ollama reading the whole public view), and six Jev variants — `jev_isolated` (one player at a
time, per round), `jev_batched` (one call per round for all of that round's speakers),
`jev_multidim` (five narrow Jev dimensions per player, combined by a composite fixed before seeing
labels), `jev_noul` ("is X concealing their true role?"), `jev_pairwise` ("does X protect Y?" for
every pair, strongest mutual pair gives p), and `features` (logistic regression on the Jev answers,
`GroupKFold(5)` by game, refit per domain). The unit of analysis is the player-round; CIs are 95%
percentile bootstraps that resample whole games.

## Generated games (`llm_llama31_8b`, 200 games, 4,479 player-rounds, 699 views)

| Judge                                           | AUC (player-round)                               |
| ----------------------------------------------- | ------------------------------------------------ |
| `features` (logistic regression on Jev answers) | 0.825 [0.803, 0.845] held-out                    |
| `jev_multidim`                                  | **0.706 [0.680, 0.730]**                         |
| `jev_pairwise`                                  | 0.545 [0.525, 0.566]                             |
| `jev_batched`                                   | 0.542 [0.504, 0.574]                             |
| `jev_isolated`                                  | 0.513 [0.483, 0.541]                             |
| `length` (talk volume)                          | 0.503 [0.492, 0.514]                             |
| `keyword`                                       | 0.488 [0.462, 0.513]                             |
| `jev_noul`                                      | 0.449 [0.416, 0.482]                             |
| `llama_judge`                                   | 0.403 [0.370, 0.437] (conclusively below chance) |

- `jev_multidim` is the only judge whose round-1 top-1 is above chance (+0.078 [+0.018, +0.143]).
- The regression reaches 0.777 [0.755, 0.798] from the five Jev dimensions alone and 0.825 with all
  Jev features; it needs labels to fit and is refit per domain, so it is not a new judge.
- `llama_judge` ranks wolves as _less_ suspicious: it is the same model that wrote the wolves'
  lines, and it follows the villagers' accusations, which the wolves steer.

## External and human data

| Source                       | Games | Best judge    | AUC                                 |
| ---------------------------- | ----- | ------------- | ----------------------------------- |
| `llm_mafia` (GPT-4o agents)  | 35    | `jev_batched` | **0.640 [0.607, 0.677]**            |
| `human_mafia`                | 44    | none          | every judge at chance (0.451-0.496) |
| `avalon`                     | 20    | `jev_noul`    | 0.608 [0.548, 0.666]                |
| `werewolf_among_us` (spoken) | 191   | `jev_noul`    | 0.547 [0.511, 0.584]                |

- On `llm_mafia` the signal starts in round 1 (0.560) and grows in later rounds; Jev beats random,
  keyword and `llama_judge` there, and the talk-volume baseline reaches 0.547.
- On the human sources no judge - Jev included - is clearly useful. Jev tends to read honest humans
  as deceptive; its ECE on `werewolf_among_us` is 0.407 to 0.562, worse than random.
- Pooling the three human sources, the learned regression reaches 0.572 [0.540, 0.603], mostly on
  the back of `avalon` (20 games - treat with care).

## Live games: a judge decides the vote

Same 50 seat/role setups per condition; the judge's top suspect is voted out.

| Condition                                  | Villagers win                                      |
| ------------------------------------------ | -------------------------------------------------- |
| `random` votes (same 50 games)             | 24% [12, 36]                                       |
| `jev_batched` picks the vote               | **50% [36, 64]** (+26 pp [+12, +40])               |
| `llama_judge` picks the vote               | 12% [4, 22]                                        |
| Jev, abstains below 0.28 / 0.42 confidence | 28% / 12%                                          |
| Jev, without the defense step              | 44% [30, 58] (inconclusive vs 50%, half the calls) |

## Ablations and stress tests

- Criteria leak (the top criterion naming the wolves' prompted tactic) makes Jev _worse_:
  -0.061 [-0.070, -0.050] AUC. Villagers say "deflect" 2-4x as often as wolves, so word-matching
  points at the wrong team.
- Dropping the defense helps slightly (+0.028 [+0.012, +0.042]) and halves the calls; this was not
  planned in advance, so it needs a confirmatory run.
- Stronger liars: swapping the wolves to `gpt-oss:20b` makes them _easier_ for Jev (`jev_isolated`
  0.667 [0.634, 0.698] vs 0.521 on all-llama games), but the talk-volume baseline rises just as
  much (0.509 to 0.609): a lot of this is a style tell, not lie detection.
- Adaptive wolves that see their own Jev score look like they evade it (-0.052 [-0.112, +0.008],
  p = 0.09), but with 50 games per condition the result is inconclusive.

## Cost and latency

| Judge                         | Cost                                 | Speed                                                    |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `jev_batched`                 | $0.069 per 699 views (~$0.0003/game) | 0.20 s per view                                          |
| `jev_isolated`                | $0.092 per 699 views                 | 0.39 s per view                                          |
| `llama_judge`                 | free (local GPU)                     | 4.7-6.3 s per view; 39.6 s on windowed `llm_mafia` views |
| `random`, `keyword`, `length` | $0                                   | ~0 s                                                     |

Jev costs $0.042 per 1M input tokens (output free), and the reports' cost tables add up to just
under $2 of Jev spend in total (core $0.16, human $0.33, ablations $0.19, richer Jev $0.94, live
games $0.17, plus the stress-run judgments). The frontier judge (claude-opus-5 with structured
output) is built and tested but has never been called: it needs an Anthropic API key and is
estimated at $38-114 for 1,208 calls.

## Limitations

- The generated games are llama3.1:8b with generic personas and random votes; their wolf style
  (vague, passive, accusatory villagers) is what `jev_multidim` and the regression pick up. The
  learned weights do not transfer between generated and human data (cosine similarity of
  coefficients -0.22; trained on human data, the model scores 0.384 on generated games, below
  chance).
- Small samples where the interesting cases are: 20 avalon games, 35 llm_mafia, 44 human_mafia.
- The no-defense gain and the adaptive-wolf evasion both need a confirmatory run.
- This is a research prototype, not a product; there is no license file in the repo. The test suite
  is fully offline: 223 tests pass.

## Artifacts for the site

The blog post shows the results above and embeds these four diagrams as images:

- `![AUC by round: the Jev judges and the baselines on the generated games](/jev-werewolf/auc-by-round-generated.png)`
- `![Calibration: reliability of the Jev judges on the generated games](/jev-werewolf/calibration-generated.png)`
- `![AUC by round on the pooled human sources](/jev-werewolf/auc-by-round-human.png)`
- `![Villager win rate when the judge picks the vote](/jev-werewolf/live-villager-win-rate.png)`

The interactive results page is a standalone page on the site, linked from the post:
[Jev Werewolf Experiment, interactive results](/jev-werewolf/results.html).

The diagrams and the interactive results page are served from `public/jev-werewolf/` on the site.
