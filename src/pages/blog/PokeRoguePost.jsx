import React from 'react';
import PostLayout from '../../components/PostLayout';

function PokeRoguePost() {
  return (
    <PostLayout
      title="Building an autonomous PokéRogue player, from architecture to a full Classic clear"
      subtitle="A heuristic-driven agent that plays PokéRogue's 200-wave Classic run inside the live game: its own decision loop, a swappable LLM layer, and the wins that actually shipped."
    >
      <p>
        PokéRogue is a different open-source Pokémon game from Showdown: a single-player roguelike
        where you build a team and push through a 200-wave "Classic" run, managing money, items, and
        an evolving roster along the way. This bot doesn't automate the game from the outside: it
        runs <strong>inside the live game process</strong> and drives PokéRogue's own UI handlers
        directly. No browser automation, no screen-reading, no reaching into game state to cheat: the
        bot only ever sees what a real player's screen would show, and only ever acts through the same
        input path a player would use.
      </p>

      <h2>The architecture: a decision loop with swappable policies</h2>
      <p>
        The core of the bot is a runtime loop that, whenever the game pauses waiting for input, asks
        "what decision is this?", builds a snapshot of the relevant game state (an{' '}
        <strong>Observation</strong>), and hands it to a <strong>policy</strong> that returns a decision
        (an <strong>Intent</strong>). A separate handler layer turns that Intent into the actual cursor
        movements and menu confirmations the game expects. Policies never touch the live game directly:
        they only ever see an Observation and return an Intent, which is what makes it possible to swap
        out how the bot decides things (heuristic, statistical, or LLM-driven) without touching anything
        else in the pipeline.
      </p>
      <p>
        That separation splits naturally into two kinds of decisions: <strong>battle</strong> decisions
        (what move to use, when to switch, when to flee) and <strong>campaign</strong> decisions (what to
        catch, what to keep, which reward to take, where to route next). Each has its own policy, and
        each policy can be swapped independently.
      </p>

      <h2>Battle: a scoring policy built by studying the hardest Pokémon ROM hacks</h2>
      <p>
        The battle layer starts from something simple: the bot reuses the game's <em>own</em> move-scoring
        logic (the same function the enemy AI itself uses to pick moves) and runs it from the player's
        side as a baseline evaluator.
      </p>
      <p>
        The actual default policy goes well past that baseline, though, and its design isn't invented from
        scratch. Several Pokémon ROM hacks are well known in the community specifically for battle AI that
        feels sharp and threatening without doing anything like a full search (<strong>Run and Bun</strong>,{' '}
        <strong>Radical Red</strong>, <strong>Emerald Kaizo</strong>, <strong>Crystal Kaizo+</strong>, and{' '}
        <strong>Emerald Rogue</strong>), and an AI-assisted research pass through their documentation,
        community reverse-engineering write-ups, and (for Emerald Rogue) its decompiled AI script source
        turned that scattered fan knowledge into a concrete design brief: what pattern each hack actually
        uses, what's worth borrowing, and what's just a well-known implementation bug that became community
        folklore rather than something worth copying.
      </p>
      <p>
        What shipped is a synthesis, not a clone of any one hack: <strong>kill-tiered move scoring</strong>{' '}
        anchored on Run and Bun's scoring conventions (a reliable kill scores differently than a shaky one,
        a fast kill differently than a slow one, distinct tiers, not one flat damage number), a{' '}
        <strong>switch doctrine</strong> informed by Radical Red's named, matchup-based switch predicates,
        and <strong>Emerald Kaizo</strong>-style move-family heuristics (recovery timing, setup gating,
        speed control) layered on top as utility scoring. The result is a stack of small, composable,
        independently-testable scoring passes: bad-move filter, kill tiering, HP-aware recovery,
        setup/utility scoring, with the game's own native evaluation demoted to a tiebreaker that only
        reorders options <em>within</em> a tier, never across one. One deliberate departure from the source
        material: several of those ROM hacks break ties with real randomness, but this bot breaks ties on a
        deterministic hash instead, specifically so the policy stays compatible with the project's
        byte-deterministic test harness: borrow the design, not the non-determinism.
      </p>
      <p>
        It's a measured win, not just an interesting research exercise: on ten paired, isolated seeds
        against the game's own native move-choice logic, the layered policy went <strong>4 wins, 6 ties, 0
        losses</strong>, with a noticeably higher median run depth. It's the bot's default battle policy
        today.
      </p>
      <p>
        A separate switch policy handles when to pivot out of a bad matchup, gated carefully (matchup
        ratio, counter availability, and a "damage-race hold" that resists pivoting when racing an
        opponent down is still the better bet) to avoid the classic bot failure mode of switching back and
        forth forever.
      </p>

      <h2>Exploiting a predictable opponent</h2>
      <p>
        The enemy's own AI turned out to be exploitable once its actual decision procedure was documented
        and reverse-engineered. It picks moves almost deterministically (score every option with its own
        evaluator, take the top one, and only consider KO moves when one exists), and its decision to
        switch out a Pokémon is committed <em>before</em> moves resolve, so a predicted switch is
        effectively a free turn. The bot predicts that switch and either takes a free setup move or
        declines to switch itself out, banking a tempo advantage the enemy AI can't see coming.
      </p>

      <h2>Campaign: a knowledge base doing the heavy lifting</h2>
      <p>
        Campaign decisions run on a generated species database (1,084 entries) scoring each Pokémon's
        intrinsic value, feeding a <strong>marginal-utility catch scorer</strong>: not "is this Pokémon
        good," but "is this specific species worth a turn and a ball to <em>this specific team</em>, right
        now." A phase-aware planner shifts the bot's priorities over the course of a run: leaning toward
        winning the immediate fight early on, and toward long-run survival and boss-readiness as the
        checkpoints (fixed rival and boss battles at waves 115, 145, and 165) get closer. On top of that
        sit a biome-routing scorer for the run's map-selection forks and a mystery-encounter risk table
        for the game's random event choices.
      </p>
      <p>
        One real, previously-invisible bug caught and fixed along the way: the species database had{' '}
        <strong>zero regional forms</strong> for months: every regional variant (Alolan, Galarian, etc.)
        was silently unscoreable, meaning the bot could never sensibly catch, keep, or release any of
        them on their actual merits. Fixing the database's form handling made over two dozen regional
        variants that appear in the game's fixed boss rosters scoreable for the first time.
      </p>

      <h2>The LLM chapter: a blunt failure, then a working design</h2>
      <p>
        The first attempt at using a language model here was the most obvious one: route campaign
        decisions to a frontier model and let it decide broadly. That measured as a clear regression
        (worse than the heuristic baseline), and rewriting the prompts to try to fix it made the result
        worse, not better. A large, capable model produced zero lift as a blunt, full-campaign decider.
      </p>
      <p>
        The design that actually works is much narrower: the LLM layer is <strong>provider-agnostic</strong>{' '}
        (a hosted model or a local open-weight one through Ollama) and only ever overrides specific,
        individually-swappable decision hooks: which reward to take, which move to forget on a level-up,
        which mystery-encounter option to pick, with the heuristic as an automatic fallback on any
        failure. Every model response is grounded in the same structural signals the heuristic itself
        uses (pre-scored options, type coverage, curated move quality), so the model is reasoning over
        the same features rather than starting from nothing. To keep a non-deterministic model call from
        breaking the project's fully reproducible test harness, model answers are recorded once into a{' '}
        <strong>cassette</strong> (a JSON replay file) and every seeded test run replays that cassette
        instead of calling the model live: deterministic testing and a live LLM policy, without either
        one compromising the other. Several of those narrow hooks (mystery-encounter choices, reward
        picks, move-forgetting) now measurably beat the plain heuristic; a few others are wired up but
        not yet verified end-to-end.
      </p>

      <h2>Where the wins actually came from</h2>
      <ul>
        <li>
          <strong>A knapsack-style starter-team picker</strong>, choosing the legal starting roster by
          type-coverage credit and a shared-weakness penalty rather than an ad hoc pick, is the single
          highest-confidence improvement in the project, and it's the one thing that reliably moves how
          deep a run gets.
        </li>
        <li>
          <strong>The bot has cleared the full 200-wave Classic run</strong> with a strong, hand-picked
          starting team. The harder, still-open target is the same feat from a fresh save with a legal
          starting roster: team composition turned out to matter enormously more than in-battle tactics,
          which is exactly why the starter picker is the standout result.
        </li>
        <li>
          <strong>A byte-deterministic test harness</strong> for a live, running game (a seeded random
          source, a virtual clock, and a lock-step driver) was itself real infrastructure to build, and
          it's what makes every other result in this project trustworthy rather than anecdotal.
        </li>
        <li>
          <strong>A sampled knowledge base of the run's fixed boss battles</strong> (each of the game's
          nine scripted walls sampled hundreds of times for real species, typing, and moveset data) turned
          "the bot keeps dying around the same few waves" from a vague impression into an actual, specific
          map of where a run's difficulty concentrates.
        </li>
      </ul>

      <h2>What's been tried and set aside</h2>
      <p>
        A search-based battle policy (Monte Carlo Tree Search) was built and measured, and quietly removed,
        not because it was proven worse, but because it never beat the simpler layered policy already in
        place, and the honest verdict is "unsupported," not "disproven." That's the pattern across most
        small tuning attempts here: the majority of ideas tried against this bot (reward priorities, catch
        quality knobs, EXP distribution, dozens of individually reasonable-sounding tweaks) didn't move
        the result. The wins above are the ones that did, which is exactly why they're worth calling out
        rather than treating as one entry in a long list.
      </p>

      <h2>Where it stands</h2>
      <p>
        Active. The current focus is closing the gap between the legendary-team clears and a fresh-save
        clear: the same starter-picker logic generalized to ongoing catch, release, and routing decisions
        over the course of a run, rather than just the opening team choice.
      </p>
    </PostLayout>
  );
}

export default PokeRoguePost;
