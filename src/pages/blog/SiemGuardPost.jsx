import React from 'react';
import PostLayout from '../../components/PostLayout';

function SiemGuardPost() {
  return (
    <PostLayout
      title="SIEM Guard: what a local-LLM SIEM pipeline gets right, gets wrong, and the number that was never real"
      subtitle="A local, LLM-assisted security log pipeline, an honest baseline, and the finding I'm least proud of taking months to catch."
    >
      <p>
        SIEM Guard pairs regex log parsing, an Isolation Forest behavioral anomaly detector, a local model
        (Ollama, Mistral 7B) doing the connective reasoning, and an adversarial self-testing agent that
        red-teams the pipeline's own detection rules — all running locally, against real labeled validation
        data, with no cherry-picking. This is a summary of a much longer story; the full six-part series,
        with every number, every regression, and the raw results JSON, lives in the project's own repo.
      </p>

      <h2>The honest starting point</h2>
      <p>
        The first full validation run (500 labeled logs, 400 normal and 100 engineered anomalies) came in at
        58.6% weighted parsing accuracy, a perfect 1.0 F1 on SSH behavioral detection, 0.4 F1 on supply-chain
        detection, and 78.7% coverage across 15 MITRE ATT&CK techniques with one technique at a flat 0%. Three
        quarters of the pipeline's wall-clock time went to parsing — including a log type nothing downstream
        even reads. None of that was a failure; it was what an honest first measurement actually looks like,
        and a much better foundation than a README full of green checkmarks.
      </p>

      <h2>A 20-session improvement arc, measured instead of projected</h2>
      <p>
        The follow-up work ranked four candidate fixes by projected ROI before writing any code. The two
        best-ranked ideas — tuning Isolation Forest's contamination parameter, and a temporal validation
        window — turned out to be architecturally impossible in the existing code, caught by a half-session
        of investigation each before either was built. The third-ranked idea, an adaptive parsing cache, made
        accuracy measurably worse for three separate pipeline runs and caused a silent SSH detection
        regression (100% recall collapsing to 16.7%, with the false-positive rate staying a clean 0% the
        entire time) — the kind of regression an aggregate score hides on purpose, and a big part of why
        recall and precision get tracked separately, never folded into one number. The lowest-ranked idea on
        the list — package-name normalization for supply-chain detection — turned out to be the cheapest,
        most effective fix of the round.
      </p>

      <h2>The finding I'm least proud of taking this long to catch</h2>
      <p>
        The MITRE ATT&CK coverage number from the first validation run — "78.7% of techniques detected" —
        wasn't measuring anything. The scoring function drew each technique's detection rate from a random
        distribution and never checked the LLM-generated evasion text against any real detection logic, from
        the very first run. It took the same code producing three different coverage numbers across three
        runs with zero changes to make that obvious. Real, deterministic detection logic now exists for two
        of the fifteen techniques, reusing the pipeline's own detection code rather than a heuristic invented
        just for the test; every place that percentage still shows up now carries an explicit caveat so it
        can't be mistaken for a real measurement again.
      </p>

      <h2>The second dataset, and two real bugs it found</h2>
      <p>
        Every number above was measured against one synthetic dataset for twenty sessions straight — a real
        methodology risk, since a bug can hide simply because the test data never exercises it. A second,
        structurally different dataset (different entity counts, IP ranges, anomaly ratios, and an entirely
        disjoint set of package names) surfaced two real, previously invisible bugs: a field-extraction bug
        that silently drops a value when it collides with a short substring elsewhere in the same log line,
        and a more serious batch-parsing bug where the LLM parser trusted response-array position to map
        back to input lines without verifying it — meaning an anomalous entity's behavior could get silently
        misattributed to a completely different, innocent host. Both are fixed now; the detection logic
        itself (thresholds, typosquat scoring) generalized to the new dataset with a zero-percent gap.
      </p>

      <h2>Where the numbers actually stand</h2>
      <ul>
        <li>Parsing accuracy: 58.6% &rarr; <strong>97.5%</strong> (original corpus) / <strong>98.8%</strong> (new, disjoint corpus)</li>
        <li>HTTP false-positive rate: 33% &rarr; <strong>0%</strong>, both corpora</li>
        <li>SSH behavioral recall: <strong>100%</strong>, holding, after a mid-arc regression to 16.7% that was caught and fixed</li>
        <li>Typosquat recall: 25% &rarr; <strong>100%</strong>, both corpora</li>
        <li>MITRE coverage that means anything: 0 of 15 techniques (all simulated) &rarr; <strong>2 of 15</strong> with real detection logic; 13 remain a caveated random number; 5 are a closed, explicitly out-of-scope decision</li>
      </ul>

      <h2>Read the full series</h2>
      <p>
        This post is a summary. The complete six-part write-up — architecture, the full parsing benchmark,
        the behavioral-detector false-positive investigation, the supply-chain fix, the adversarial red-team
        results, and the full fix arc with every regression and A/B test — plus the raw results JSON for both
        validation datasets, is in the repo:{' '}
        <a href="https://github.com/NoorElAlfi/siem-guard" target="_blank" rel="noopener noreferrer">github.com/NoorElAlfi/siem-guard</a>.
      </p>
    </PostLayout>
  );
}

export default SiemGuardPost;
