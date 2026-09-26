#!/usr/bin/env node
// Check for the tolerant agent-output parsing in agents/lib/agent.mjs.
//
//   node agents/fixtures/check-extract.mjs
//
// Exit 0 when `extractArtifact()` resolves the artifact from every shape an agent
// CLI may print (JSONL event stream, single JSON document, fenced block, bare
// object with trailing prose), 1 otherwise.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectTelemetry,
  extractArtifact,
  extractArtifactDetailed,
} from "../lib/agent.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(
  readFileSync(path.join(HERE, "fake", "curate.json"), "utf8"),
);
const planText = JSON.stringify(plan, null, 2);

function check(label, stdout, expected) {
  const detailed = extractArtifactDetailed(stdout);
  assert.equal(detailed.ok, true, `${label}: not ok (${detailed.error})`);
  assert.deepEqual(
    extractArtifact(stdout),
    expected,
    `${label}: wrong artifact`,
  );
  process.stdout.write(`ok  ${label.padEnd(28)} via=${detailed.via}\n`);
  return detailed;
}

// 1. `omp -p --mode=json`: a JSONL event stream (the real v18.3.1 shape).
const stream = readFileSync(path.join(HERE, "raw", "omp-jsonl.txt"), "utf8");
const fromStream = check("jsonl event stream", stream, plan);
assert.equal(fromStream.via, "jsonl");

const telemetry = collectTelemetry(stream);
assert.equal(telemetry.model, "deepseek-v4.1-flash");
assert.equal(telemetry.cost.total, 0.0006291);
process.stdout.write(
  `ok  ${"telemetry".padEnd(28)} model=${telemetry.model} cost=${telemetry.cost.total}\n`,
);

// 2. A single JSON document, pretty or compact.
check("whole-document JSON", `${JSON.stringify(plan)}\n`, plan);

// 3. Fenced block inside prose (`claude -p`, or a chatty model).
check(
  "fenced json in prose",
  `Here is the plan:\n\n\`\`\`json\n${planText}\n\`\`\`\nDone.\n`,
  plan,
);

// 4. Bare object followed by trailing prose (`omp -p` without --mode=json).
check(
  "bare object + trailing prose",
  `${planText}\n\nLet me know if you want changes.\n`,
  plan,
);

// 5. Envelope carrying the answer as text, in content blocks.
const envelope = JSON.stringify({
  type: "result",
  session_id: "01a0d98e",
  usage: { totalTokens: 1 },
  content: [{ type: "text", text: `\`\`\`json\n${planText}\n\`\`\`\n` }],
});
check("content-block envelope", envelope, plan);

// 6. Nothing usable -> a hard, named failure.
assert.throws(() => extractArtifact("I could not produce a plan this week."), {
  code: "UNPARSEABLE_AGENT_OUTPUT",
});
process.stdout.write(
  `ok  ${"garbage input".padEnd(28)} throws UNPARSEABLE_AGENT_OUTPUT\n`,
);

process.stdout.write(
  `\nplan artifact resolved: week=${plan.week} actions=${plan.actions.length}\n`,
);
