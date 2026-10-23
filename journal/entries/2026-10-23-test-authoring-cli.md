---
id: 2026-10-23-test-authoring-cli
date: 2026-10-23
project: test-authoring-cli
kind: experiment
visibility: public
summary: A command-line tool that turns a test-automation platform's authoring API into dry-run-first YAML, then a gated Claude Code session that wrote, ran and repaired tests on public practice sites.
links: []
tags:
  - agents
  - safety
  - evaluation
  - claude-code
  - test-automation
status: pending
sources:
  - "repo: local, not published (B:/katsu-cli-tools); 47 commits between 2026-10-15 and 2026-10-23; the platform and employer are deliberately not named in public content"
  - "test suite: 891 passed in 16.30s (run 2026-10-23), offline, against a stateful in-memory fake of the platform API and a stubbed model"
  - "the platform's authoring API is not publicly documented; the server validates almost nothing: it accepts invented instruction names, negative waits and a step order of 999, and wrong field names give HTTP 500, so all validation lives in the tool and is driven by the live instruction catalog"
  - "the tool encodes what the platform's web app itself sends, so an upgrade can break it; a doctor command compares response shapes (never values) with a stored baseline to turn that into a failed check"
  - "write path: validate against the catalog, plan (sends nothing), apply only with --yes, write gate (team must be on the write list; an empty list is read-only and every write method raises before a request is built), audit intent line written first, request, audit result line; POST and PATCH are never retried; a plan stops at the first failure and prints what it created"
  - "audit log: hash-chained, records method, path, body size and sha256, status and returned ids but never bodies, tokens or secret values; if the intent line cannot be written, the write is not sent; tamper-evident, not tamper-proof"
  - "write-gate hole found 2026-10-21: two code paths (a text-only edit of a human step, and the two requests that build an if branch) called the HTTP client directly and skipped the write-list check, although the write was still audited; proved on the in-memory fake with an empty write list (one PATCH sent, no WriteNotAllowed); not seen on a real server before or after"
  - "fix: those calls now go through client methods that start with the write check, and a source-scan test fails if any write request in the package is made anywhere else; the test was mutation-checked (the bug was reintroduced on purpose and the test failed)"
  - "round-trip check: export every existing test case in the sandbox environment to YAML, plan an edit of that file, expect zero writes; of 134 test cases, 126 plan zero writes and 8 are refused with a stated reason (try/catch steps, half-built conditions, stale log groups, data anomalies)"
  - "draft command: a model drafts a test file from one sentence; the validator feeds problems back for up to 3 repair rounds and rejects a repair that deletes steps or assertions; the model sees only the sentence, the format description, instruction names from the catalog, two hand-written examples and what its three read-only page tools return (an allowlist of 6 public hosts, enforced inside the headless browser too); it runs through the Claude Agent SDK with every built-in tool off and an empty working directory; --show-context prints the whole prompt and stops; the call log holds sizes and hashes, never text, and if it cannot be written no call is made"
  - "draft comparison: 10 requests on public practice sites, three arms (plain prompt; plain prompt plus the instruction catalog; the draft command with browser tools), scored by a local headless-browser rehearsal; first scoreboard draft 10, plain 9, plain plus catalog 7"
  - "scorer bug: the executor's Enter Value instruction types the value and presses Enter, which submits a form early, and the rehearsal did not; two login drafts had passed the rehearsal and failed on the executor; after fixing the rehearsal and re-scoring the same 30 saved drafts with no new model call the scores were draft 8, plain 5, plain plus catalog 6; all 7 drafts that used Enter Value flipped from pass to fail"
  - "after one line about Enter Value was added to the brief, Enter Value appeared in 0 of 30 new drafts (7 of 30 before) and the scores were draft 10, plain 8, plain plus catalog 8; reported cost for 10 drafts was $0.350 for the draft command, $0.130 plain and $0.161 plain plus catalog, about 2.7 times the plain prompt"
  - "the draft command's own worked example (one of the two sent to the model) used Enter Value for a login, found while writing the documentation; fixed, and a test now fails if an example teaches it; the comparison was not re-run after that fix"
  - "what the draft command added in the re-run: it can read the page (a demo account the page shows) and its repair loop fixed an invalid-YAML slip (an unquoted description containing a colon and a space); each decided one draft; one run per cell and ten requests, so the margins are within single-run noise"
  - "executor tally for draft-command output in my practice tenant: 21 drafts run, 19 passed; the 2 that failed were made before the hint and both used Enter Value; the 10 made after it all passed"
  - "executor-only findings: a data variable passed directly as a call argument arrives null (copy it with a set step first; the validator now warns); a test against a large public encyclopedia failed because the site answered the executor's browser with HTTP 429, and the failure message looked identical to a wrong selector, found from the run's screenshot"
  - "agent gate: one Claude Code session per mode through the Agent SDK with only Bash, Read, Write and Edit, permission mode dontAsk plus a PreToolUse hook; one tool command per call, writes only under one folder, every created title must start with the prefix AGENT, only allowlisted public URLs, a fixed budget of applies and executions, edits only to test cases created in that session; the write permission is granted for one team id for the script's own process after checking the target holds exactly that team"
  - "all three recorded sessions used Sonnet 5.5 (claude-sonnet-5-5) on a personal Claude login"
  - "recorded session 1 (2026-10-22, claude-sonnet-5-5, personal Claude login): 3 plain-words requests (a login on the-internet, the author of the first quote on quotes.toscrape.com, a login on saucedemo); 3 test cases created, all 3 PASS on the executor; 21 turns, reported cost $0.20; 20 calls, 2 refused by the gate"
  - "recorded session 2 (repair, 2026-10-22): a test with one wrong selector failed on the executor with ERROR; the agent used the why command to find the cause (id my-text versus the real my-text-id, 60 s wait timeout), edited the same test case in place (3 patches, no new test case) and the run went to PASS; 10 turns, reported cost $0.09; 9 calls, 2 refused"
  - "recorded session 3 (2026-10-23): one 8-step end-to-end purchase test on saucedemo (login, products page, add two products, cart, checkout form, overview, finish, back to products); PASS in 40 s with all 8 human steps passing; 27 turns, reported cost $0.42; 26 calls, 3 refused; the agent reported as inferred, not proven, that the item-total sum comparison is a real test, because the rehearsal browser cannot run JavaScript or set steps and stopped before it"
  - "refused calls in the three sessions were the agent chaining several commands on one line, reading a file outside the allowed list, asking for --help, or editing with sed instead of the edit tool"
  - "limits: personal Claude login, so nothing here may be used on company data until a provider is approved; the gate is code in my repository, not enforced by the platform, and its URL check sees literal URLs only; one recorded session per mode; practice sites a model may know; one user, not reviewed by security"
---

I wrote a command-line tool for a test-automation platform I use at work. A test case, and the reference data around it (variables, UI elements, reusable procedures), becomes a YAML file. The tool checks the file against the platform's live instruction catalog, previews the exact requests it would send, and writes only on `apply --yes` to a team on an explicit write list. It can then start the run and follow it to PASS or FAIL.

Then I let an AI agent drive it. In a gated Claude Code session it wrote tests from plain-words requests on public practice sites, ran them on the executor, and repaired a deliberately broken one using the tool's `why` command. The recorded numbers are in `sources:`.

The parts worth writing about were the places my own checks were wrong: a safety rail with a hole in it, a scoreboard that changed when I fixed the scorer, and a rehearsal that disagreed with the real executor.
