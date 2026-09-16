import React from 'react';
import PostLayout from '../../components/PostLayout';

function PokemonShowdownPost() {
  return (
    <PostLayout
      title="Falsifying my own hypothesis: search beats the net I built to help it"
      subtitle="Building a competitive Pokémon Showdown bot, and the controlled A/B tests that killed the idea I set out to prove."
    >
      <p>
        The goal was to build a bot for Pokémon Showdown's Gen 9 OU competitive format that beats the
        heuristic baselines by a wide margin and is competitive with strong pretrained agents — via a real
        hybrid approach (search guided by a pretrained neural net), not a clone of an existing bot. It ended
        somewhere more interesting than planned: the search substrate alone turned out to be the bot, and the
        net never improved it, across seven separate controlled tests.
      </p>

      <h2>Phase 1: from-scratch reinforcement learning — and why it plateaus</h2>
      <p>
        The first approach was a Stable-Baselines3 PPO agent trained from scratch, with a token-embedding
        feature extractor, dense reward shaping, an adaptive opponent-pool curriculum, and behavior-cloning
        warm starts. It plateaued around 82% against a purely random-move opponent and lost to every real
        heuristic bot it faced. That result matches the published literature on this problem: nobody wins
        competitive Pokémon with a small net trained from scratch — the approaches that actually work are
        large offline-RL transformers, or search paired with a strong prior. Rather than keep pushing on a
        dead end, that whole toolkit got archived with a write-up of what each piece did, and the project
        moved to phase 2.
      </p>

      <h2>Phase 2: a pretrained specialist prior, then self-play fine-tuning</h2>
      <p>
        Dropping in pretrained Gen 9 checkpoints from an existing Showdown RL framework (metamon) immediately
        outperformed everything from Phase 1 — a 57.6M-parameter model ("Kadabra") hit roughly 96% average
        against the heuristic baselines cold, no fine-tuning at all. From there, a full self-play fine-tuning
        loop was built on top of metamon's own trainer: collect self-play trajectories, fine-tune on them,
        re-collect with the improved model, repeat. Two iterations (about 18k trajectories in the first pass,
        about 130k in the second) produced a small, noisy gain and a clear overfitting curve — mid-training
        checkpoints beat later ones. The conclusion mattered more than the number: same-architecture self-play
        has limited headroom, and the lever that actually moves the needle is a bigger base model, not more
        self-play on the same one.
      </p>

      <h2>Phase 3: the hybrid that didn't survive its own testing</h2>
      <p>
        The core, novel idea was search over the actual battle-engine's simulated outcomes, using the
        pretrained net as the prior/value function guiding that search — essentially a Pokémon-specialist
        version of an approach normally done with an LLM. Built and evaluated in increments, most of it
        didn't hold up:
      </p>
      <ul>
        <li>Pure engine search alone reached about 65% against heuristics — a working search bot, but below the pretrained net alone.</li>
        <li>Keeping the net's move choice unless search flagged it as a clear blunder (a rare, selective veto) did lift a weaker model meaningfully — but added nothing for the strongest pretrained model, suggesting it was compensating for a weak prior, not adding real value.</li>
        <li>Blending the net's value estimate with search values directly came out flat regardless of the blend weight — symmetric fusion had no selectivity, so it contributed nothing.</li>
        <li>Using the net's own learned value function to score search leaves was a genuine negative result: the net's offline critic isn't a calibrated planning value — it can rate winning positions below losing ones, and search amplifies that miscalibration rather than correcting it.</li>
      </ul>
      <p>
        The fix that actually worked was to stop trying to patch a weak search substrate and build a proper
        one: <strong>determinized Monte Carlo Tree Search</strong> — sample several complete, plausible
        opponent teams consistent with what's been revealed in battle, run MCTS against each, and pool the
        results. Ported from a search design proven on Showdown's random-battle ladder, this "H1" bot reached
        about 83% against the heuristics and tied the strongest pretrained model head-to-head — with no neural
        net involved at all.
      </p>
      <p>
        Re-testing whether the net could still help <em>on top of</em> that stronger search substrate — as a
        post-hoc re-ranker for near-tied decisions — was the actual hypothesis test of the project, and it
        failed cleanly. Across every variant tried (a weaker model as re-ranker, the strongest model as
        re-ranker, even a deliberately well-calibrated non-learned value as re-ranker), none beat plain H1
        by a statistically meaningful margin. <strong>The hybrid thesis is falsified</strong>: blending two
        frozen, roughly-equal decision-makers on a genuinely near-tied decision is just noise, not signal.
      </p>

      <h2>Phase 4: benchmarking against the real competition</h2>
      <p>
        A public leaderboard for this exact problem exists, and its #1 bot (a different open-source project,
        not built on a neural net either) became the real reference opponent, benchmarked locally rather than
        taken on faith. Against it, H1 wins roughly 35–40% of the time — a meaningful gap, which motivated a
        systematic "falsification map" across every lever that might close it: better opponent-team sampling
        quality, more sampled worlds, more search time per decision, and a belief-weighted particle filter
        over likely opponent teams. Nearly all of them measured null — the search is effectively converged at
        its current budget, and no amount of extra compute or cleverness around it moved the result. The one
        lever that did move something concrete was the world-sampling stack itself, which pushed the
        bot's performance against a mid-tier reference model from a coin-flip parity up to a clear, measurable
        edge — the kind of gain that a single head-to-head match against the top bot (with wide statistical
        uncertainty at reasonable sample sizes) would have completely missed.
      </p>

      <h2>What actually generalizes from this project</h2>
      <ul>
        <li>Rank fix ideas by projected impact if you want, but test whether each one is even possible before building it — the two best-ranked ideas on paper here were structurally dead ends, caught early.</li>
        <li>A model's own learned value function is not automatically a good search-leaf value — it was trained for a different purpose (picking a move), and using it for planning can invert exactly where it matters.</li>
        <li>A single head-to-head benchmark against the strongest opponent has real statistical noise; a graded ladder of intermediate opponents makes small real improvements visible that get lost in that noise.</li>
        <li>The most convincing negative result here wasn't "the net didn't help" once — it was the same negative result surviving seven independently-designed tests.</li>
      </ul>

      <h2>Where it stands</h2>
      <p>
        Active. The current roadmap centers on the one clearly untapped lever the falsification map pointed
        to — the bot's team composition, since every test so far has run on a fairly arbitrary team pool — plus
        a longer-shot idea to embed a learned evaluation function directly inside the battle engine itself,
        aimed at the actual measured ceiling rather than anything around it.
      </p>
    </PostLayout>
  );
}

export default PokemonShowdownPost;
