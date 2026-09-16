import React from 'react';
import PostLayout from '../../components/PostLayout';

function CodeDeobfuscatorPost() {
  return (
    <PostLayout
      title="Teaching a local model to deobfuscate JavaScript, one rename at a time"
      subtitle="A reusable agentic-workflow harness — oracle, sandbox, eval set — proven out on JS deobfuscation, with a real GEPA prompt-optimization loop underneath it."
    >
      <p>
        This project started as a question about agentic workflows in general, not about JavaScript
        specifically: what does a reusable harness for an LLM-in-the-loop coding task actually need —
        a real automatic oracle, a sandbox, an eval set, traces you can audit — and how do you build one
        cheaply enough to iterate on fast? Deobfuscation turned out to be an unusually good proving ground,
        for a structural reason: it has both a cheap automatic oracle (does the deobfuscated code behave
        identically to the original?) and unlimited ground truth, because you can obfuscate real open-source
        code yourself and know the true identifier names exactly.
      </p>

      <h2>The core design decision: renames only, never free-form rewrites</h2>
      <p>
        The LLM's output in this pipeline is always a rename-map JSON — <code>{'{placeholder: proposed_name}'}</code> —
        never rewritten code. A deterministic AST transform applies the map. That one constraint is what makes
        the whole evaluation cheap and structurally resistant to gaming: a pure rename can't change program
        behavior except through an identifier collision, and the apply step already guards against that. It
        also means "let the model restructure the code, not just rename it" is an explicit, deliberately
        out-of-scope v2 idea — tempting to reach for, but it would break the cheap-oracle property that makes
        the whole harness work.
      </p>

      <h2>Ground truth is generated, not reverse-engineered</h2>
      <p>
        Every local binding gets a unique placeholder assigned at generation time, and the true name is
        recorded then — before obfuscation, not recovered after it. The placeholder survives obfuscation
        intact because it's registered as a reserved name with the obfuscator. The first design I tried was
        the opposite approach — positionally diff the original AST against the obfuscated AST to recover
        names — and abandoned it once I confirmed control-flow flattening restructures the tree badly enough
        that positional matching breaks exactly where the signal matters most.
      </p>

      <h2>Tuning the obfuscator to what the cleaner can actually resolve</h2>
      <p>
        The obfuscator configuration isn't cranked to maximum realism on purpose. Measuring how much of the
        corpus a deterministic cleaner (<code>restringer</code>) could fully resolve back to literal values —
        the <code>clean_ok</code> rate — showed a sharp cliff on control-flow-flattening strength: 3 of 12
        files clean at a 0.75 threshold, 10 of 12 at 0.15. String-array encoding/rotation/shuffling settings
        stay off entirely for the same reason. Turning obfuscation back up "for realism" without re-measuring
        that split would silently degrade corpus quality — it's an empirically tuned tradeoff, not an
        oversight.
      </p>
      <p>
        Getting to <code>restringer</code> at all took a real dead end first: <code>webcrack</code> looked
        like the obvious tool, but its pinned native dependency has no prebuilt binary for the Node version
        this runs on and doesn't compile locally, and even once that was worked around, it still left
        string-array calls unresolved against the obfuscator's current output shape. Restringer, once the
        obfuscator config above was tuned to match it, fully resolved everything.
      </p>

      <h2>The sandbox and the equivalence gate</h2>
      <p>
        Model-generated or candidate code only ever executes inside a Docker sandbox with networking disabled.
        The held-out verifier layer — test files, the baseline pass/fail vector — is mounted read-only: the
        candidate can't see or edit its own verifier, enforced by the mount, not by asking nicely. Equivalence
        is the gate, never the score — a candidate that renames nothing has to score near zero even though
        it's trivially "valid," and a set of anti-gaming regression tests encodes that directly (identity
        candidate scores ~0, an oracle that's handed the answer scores ~1.0, renaming to unrelated words
        scores ~0). Every scoring result also reports <em>how</em> its validity was determined — syntax-only
        versus a real differential test-suite run — so a number produced before the real Docker-based
        equivalence check existed is never silently indistinguishable from one produced after.
      </p>

      <h2>The corpus, and a real baseline</h2>
      <p>
        The corpus is built from <code>validator.js</code>, a real open-source library — 112 of 113 source
        files (one large file times out during processing and was left out rather than special-cased), split
        67 train / 45 held-out / 45 held-out-under-a-different-obfuscator (terser instead of the primary
        obfuscator, to check generalization across obfuscator fingerprints, not just across files). 85 of 112
        files (about 76%) fully resolve via the deterministic cleaner; the rest fall back to raw obfuscated
        code, still valid, just less readable going in.
      </p>
      <p>
        Once the equivalence gate was wired to a real Docker-based differential test rather than a
        syntax-only proxy, the honest zero-shot baseline for the local task model
        (<code>qwen2.5-coder:7b</code>) came out to: held-out identity 0.184 &rarr; LLM 0.372; held-out under
        the other obfuscator, identity 0.305 &rarr; LLM 0.396.
      </p>

      <h2>The optimization loop, and where the gains actually held up</h2>
      <p>
        The pipeline runs a real <code>dspy.GEPA(...).compile()</code> prompt-optimization loop over the
        naming instruction. On the training corpus, optimization moved the score from 0.12 to 0.48 (train)
        and 0.13 to 0.54 (validation) — a striking number on its own, but one I didn't take at face value.
        Re-evaluated properly on the held-out set with the real equivalence gate on, the gain shrank a lot:
        held-out went 0.372 &rarr; 0.426, held-out-other-obfuscator 0.396 &rarr; 0.501. Digging into why the
        4x train-corpus improvement became a 15–27% relative gain on unseen files, the answer wasn't the
        mismatch I expected going in (context available to the model about callee functions) — it was a
        roughly 11% rate of the model's JSON output failing to parse at all, quietly capping the achievable
        score regardless of instruction quality.
      </p>
      <p>
        I also tried escalating GEPA's search budget one notch further (its <code>auto="medium"</code>{' '}
        setting): train moved 0.48 &rarr; 0.65, but validation stayed flat at 0.54. Not worth the extra
        compute — a negative result I kept in the record rather than treating optimization intensity as
        automatically good. The GEPA-optimized instruction, at its first-tier result, is what actually shipped
        as the production default.
      </p>

      <h2>The local/cloud split, and what that boundary actually costs</h2>
      <p>
        The task model is always local — that's a hard rule, not a preference, and it's specifically the
        Ollama-hosted <code>qwen2.5-coder:7b</code> doing every naming call in the real pipeline. The one
        deliberate cloud dependency is the GEPA loop's <em>reflection</em> step, which authenticates through
        my own Claude subscription (via the Python <code>claude_agent_sdk</code>) rather than a metered API
        key — a real, finite resource, not a free one. A verified smoke-test call cost roughly $0.12, almost
        entirely from Claude Code's own default system-prompt overhead, which is exactly why that overhead has
        to be minimized before running the reflection loop at any real scale. For context on where the local
        model actually sits: a quick reference sweep against two cloud coder models on the same naming task
        put them a bit ahead of local <code>qwen2.5-coder:7b</code> (roughly 0.42–0.46 vs. local's 0.37–0.40) —
        useful to know, and not a reason to swap the task model, since staying local is the point of the
        project, not an incidental cost-saving measure.
      </p>

      <h2>Borrowed, not rebuilt</h2>
      <p>
        Call-graph ordering — turning raw AST-extracted call edges into a bottom-up processing order (cycle
        condensation, PageRank as a tiebreak) — is ported directly from LucidHover's own graph-ranking code
        rather than re-derived from scratch. One algorithm, reused across two different projects that both
        needed the same underlying idea: rank functions in a codebase by how structurally important they are.
      </p>

      <h2>Where it stands</h2>
      <p>
        A single-case pipeline visualizer now exists for debugging — a standalone, self-contained HTML view of
        one file's scope graph, per-scope naming calls, applied renames, and final oracle verdict — including
        an opt-in mode to compare the local model's per-scope naming choices against Claude's on one case,
        strictly for comparison, not as a change to the default local pipeline. The project's own documentation
        already flags the natural next step: this same call-graph-ranking and rename-map approach generalizes
        past JavaScript deobfuscation to any task where "propose identifiers, verify behavior didn't change"
        is the right shape — that's an open direction, not something built yet.
      </p>
    </PostLayout>
  );
}

export default CodeDeobfuscatorPost;
