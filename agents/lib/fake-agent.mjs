#!/usr/bin/env node
// Deterministic stand-in for a real LLM CLI (contract C6).
//
// The pipeline's `--agent-cmd` contract is "prompt on stdin, artifact JSON on
// stdout", so that is exactly what this does: it identifies the stage from the
// `<<<STAGE:x>>>` marker embedded in the prompt (plus `<<<KIND:...>>>` for the
// three writer prompts), reads the matching fixture from
// `agents/fixtures/fake/<name>.json`, and prints it.
//
//   node agents/run.mjs --week 2026-W39 --dry-run \
//     --agent-cmd "node agents/lib/fake-agent.mjs"
//
// No network, no model, no disk writes -> the whole pipeline is testable offline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_DIR = path.join(HERE, "..", "fixtures", "fake");

/** plan action / proposal kind -> writer fixture name. */
const WRITER_FIXTURES = {
  project_highlight: "writer-projects",
  project_highlights: "writer-projects",
  blog_post: "writer-blog",
  now_page: "writer-now",
};

const STAGE_FIXTURES = {
  triage: "triage",
  curate: "curate",
  review: "review",
};

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function marker(text, name) {
  const match = new RegExp(`<<<${name}:\\s*([A-Za-z0-9_.-]+)\\s*>>>`).exec(
    text,
  );
  return match ? match[1] : null;
}

function fatalf(message) {
  process.stderr.write(`fake-agent: ${message}\n`);
  process.exit(1);
}

function resolveFixtureName(prompt) {
  const explicit = marker(prompt, "FIXTURE") || process.env.FAKE_FIXTURE;
  if (explicit) return explicit;

  const stage = marker(prompt, "STAGE") || process.env.FAKE_STAGE;
  if (!stage) {
    fatalf(
      "no <<<STAGE:name>>> marker found on stdin (set FAKE_STAGE to override)",
    );
  }
  if (stage === "write") {
    const kind = marker(prompt, "KIND") || process.env.FAKE_KIND;
    if (!kind) fatalf("write stage prompt is missing a <<<KIND:kind>>> marker");
    const fixture = WRITER_FIXTURES[kind];
    if (!fixture) fatalf(`unknown write kind "${kind}"`);
    return fixture;
  }
  const fixture = STAGE_FIXTURES[stage];
  if (!fixture) fatalf(`no fixture is defined for stage "${stage}"`);
  return fixture;
}

const prompt = readStdin();
const fixtureName = resolveFixtureName(prompt);
const fixtureDir = process.env.FAKE_FIXTURE_DIR || DEFAULT_FIXTURE_DIR;
const fixturePath = path.join(fixtureDir, `${fixtureName}.json`);

let fixture;
try {
  fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
} catch (err) {
  fatalf(`cannot read fixture ${fixturePath}: ${err.message}`);
}

// Keep the artifact in the requested week even if the fixture was written for
// another one, so `--week` never fights the fixture data.
const week = marker(prompt, "WEEK");
if (week && fixture && typeof fixture === "object" && "week" in fixture) {
  fixture.week = week;
}

process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
