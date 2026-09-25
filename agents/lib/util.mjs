// Shared helpers for the journal pipeline.
//
// Used by agents/run.mjs, agents/lib/*.mjs and scripts/*.mjs. Nothing here talks
// to the network or to an LLM; it is deliberately boring filesystem + process
// plumbing so that every stage can be reasoned about (and re-run) in isolation.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/** Stages of the pipeline, in execution order (contract C4). */
export const STAGES = [
  "collect",
  "triage",
  "curate",
  "write",
  "review",
  "apply",
  "verify",
  "publish",
];

/** Stages a `--dry-run` is allowed to execute (collect..review). */
export const DRY_RUN_STAGES = STAGES.slice(0, STAGES.indexOf("review") + 1);

/** Options for every YAML document we serialize: stable, never re-wrapped. */
export const YAML_OPTIONS = Object.freeze({
  lineWidth: 0,
  indent: 2,
  minContentWidth: 0,
});

const WEEK_RE = /^\d{4}-W\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

/**
 * ISO-8601 week number for a date, using the Thursday rule: the week that
 * contains January 4th is week 1, so a week belongs to the ISO year of its
 * Thursday.
 *
 * @param {Date} [input]
 * @returns {{year: number, week: number}}
 */
export function isoWeek(input = new Date()) {
  // Normalize to a UTC midnight so local DST shifts cannot move the weekday.
  const d = new Date(
    Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()),
  );
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - isoDay); // move onto this week's Thursday
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year, week };
}

/** Current week as `YYYY-Www` (e.g. `2026-W39`). */
export function isoWeekString(input = new Date()) {
  const { year, week } = isoWeek(input);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` in local time. */
export function dayString(input = new Date()) {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True for a syntactically valid `YYYY-Www`. */
export function isWeekString(value) {
  return typeof value === "string" && WEEK_RE.test(value);
}

/** Midnight `n` days before `from`, as `YYYY-MM-DD`. */
export function daysAgo(n, from = new Date()) {
  const d = new Date(from.getTime() - n * DAY_MS);
  return dayString(d);
}

/** Max of two `YYYY-MM-DD` strings, null-safe. */
export function maxDay(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

function camel(flag) {
  return flag.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Minimal, strict flag parser.
 *
 * @param {string[]} argv
 * @param {{value?: string[], bool?: string[]}} spec flag names WITHOUT the
 *   leading `--`; `value` flags consume the next argv entry (or `--x=y`).
 * @returns {Record<string, any> & {_: string[]}}
 */
export function parseArgs(argv, spec = {}) {
  const valueFlags = new Set(spec.value ?? []);
  const boolFlags = new Set(spec.bool ?? []);
  /** @type {any} */
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    let name = arg.slice(2);
    let value = null;
    const eq = name.indexOf("=");
    if (eq !== -1) {
      value = name.slice(eq + 1);
      name = name.slice(0, eq);
    }
    if (boolFlags.has(name)) {
      out[camel(name)] = value === null ? true : value !== "false";
      continue;
    }
    if (!valueFlags.has(name)) throw new Error(`unknown flag --${name}`);
    if (value === null) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`flag --${name} requires a value`);
      }
      value = next;
      i += 1;
    }
    out[camel(name)] = value;
  }
  return out;
}

/**
 * Repo root: `--root` when given, else the closest ancestor of `cwd` holding a
 * package.json (so scripts work when invoked from a subdirectory).
 */
export function defaultRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

// ---------------------------------------------------------------------------
// filesystem
// ---------------------------------------------------------------------------

export function exists(target) {
  return fs.existsSync(target);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** File contents, or `null` when the file is absent. */
export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
}

/** Parsed JSON, or `null` when the file is absent. */
export function readJson(file) {
  const text = readText(file);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid JSON in ${file}: ${err.message}`);
  }
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
  return file;
}

export function writeJson(file, value) {
  return writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Sorted `*.json` file names inside `dir` (empty when absent). */
export function jsonFiles(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((n) => n.endsWith(".json")).sort();
}

/** Sorted `*.<ext>` file names inside `dir` (empty when absent). */
export function filesWithExt(dir, ext) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((n) => n.endsWith(ext)).sort();
}

/** Sorted week directories under `runs/`, e.g. `['2026-W39']`. */
export function weekDirs(runsDir) {
  let names;
  try {
    names = fs.readdirSync(runsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return names
    .filter((e) => e.isDirectory() && isWeekString(e.name))
    .map((e) => e.name)
    .sort();
}

// ---------------------------------------------------------------------------
// front matter
// ---------------------------------------------------------------------------

/**
 * Split a markdown document into its YAML front matter and body. The body is
 * returned verbatim (line endings preserved) so callers can rewrite front
 * matter without touching prose.
 *
 * @param {string} text
 * @returns {{data: any|null, body: string, hasFrontMatter: boolean, header: string|null}}
 */
export function splitFrontMatter(text) {
  const src = String(text ?? "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(src);
  if (!match)
    return { data: null, body: src, hasFrontMatter: false, header: null };
  return {
    data: parseYaml(match[1]) ?? {},
    body: src.slice(match[0].length),
    hasFrontMatter: true,
    header: match[1],
  };
}

/** Rebuild a markdown document from front matter data + body. */
export function joinFrontMatter(data, body) {
  return `---\n${stringifyYaml(data, YAML_OPTIONS)}---\n${body}`;
}

/** Parsed YAML document, or `null` when the file is absent. */
export function readYaml(file) {
  const text = readText(file);
  if (text === null) return null;
  try {
    return parseYaml(text);
  } catch (err) {
    throw new Error(`invalid YAML in ${file}: ${err.message}`);
  }
}

export function stringifyYamlDoc(value) {
  return stringifyYaml(value, YAML_OPTIONS);
}

export function writeYaml(file, value) {
  return writeText(file, stringifyYaml(value, YAML_OPTIONS));
}

// ---------------------------------------------------------------------------
// processes
// ---------------------------------------------------------------------------

/**
 * Run a shell command synchronously and capture everything.
 *
 * @param {string} command
 * @param {{cwd?: string, input?: string|null, env?: Record<string,string>,
 *          allowFailure?: boolean, timeout?: number}} [options]
 * @returns {{ok: boolean, code: number, stdout: string, stderr: string,
 *            ms: number, command: string, error: Error|null}}
 */
export function runCommand(command, options = {}) {
  const {
    cwd,
    input = null,
    env = {},
    allowFailure = false,
    timeout,
  } = options;
  const started = Date.now();
  const res = spawnSync(command, {
    cwd,
    input: input ?? undefined,
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
    timeout,
  });
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  const code = typeof res.status === "number" ? res.status : 1;
  const result = {
    ok: code === 0 && !res.error,
    code,
    stdout,
    stderr,
    ms: Date.now() - started,
    command,
    error: res.error ?? null,
  };
  if (!result.ok && !allowFailure) {
    const detail = (
      stderr ||
      stdout ||
      (res.error && res.error.message) ||
      ""
    ).trim();
    const err = new Error(
      `command failed (exit ${code}): ${command}${detail ? `\n${detail}` : ""}`,
    );
    err.result = result;
    throw err;
  }
  return result;
}

/** One-line stage log: `[collect] ok 412ms -> runs/2026-W39/activity.json`. */
export function log(stage, status, ms, detail = "") {
  process.stdout.write(
    `[${stage}] ${status} ${ms}ms${detail ? ` -> ${detail}` : ""}\n`,
  );
}

export function warn(message) {
  process.stdout.write(`warning: ${message}\n`);
}

/** Pretty JSON for prompt input sections. */
export function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Fenced ```json block, for prompt input sections. */
export function fence(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
}
