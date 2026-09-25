#!/usr/bin/env node
/**
 * Stage runner for the portfolio agent pipeline (contract C4).
 *
 *   node agents/run.mjs [--week <YYYY-Www>] [--dry-run] [--from <stage>]
 *                       [--only <stage>] [--no-publish] [--agent-cmd <cmd>]
 *                       [--since <YYYY-MM-DD>] [--root <dir>]
 *
 * Stages run in order: collect, triage, curate, write, review, apply, verify,
 * publish. Every stage writes its artifact under `runs/<week>/` before the next
 * one starts, so a failure leaves the previous stages' output on disk and the
 * run directory identifies exactly where it stopped.
 *
 * Only `collect` (and the three shell-out stages) contain logic; the four agent
 * stages exist to assemble a prompt, hand it to `agents/lib/agent.mjs`, and
 * validate the shape of what came back structurally. Deep content validation
 * belongs to `scripts/verify-content.mjs`.
 */
import path from "node:path";
import fs from "node:fs";
import { callAgent } from "./lib/agent.mjs";
import {
  DRY_RUN_STAGES,
  STAGES,
  dayString,
  daysAgo,
  defaultRoot,
  ensureDir,
  exists,
  fence,
  filesWithExt,
  isWeekString,
  isoWeekString,
  joinFrontMatter,
  log,
  parseArgs,
  readJson,
  readText,
  readYaml,
  runCommand,
  splitFrontMatter,
  warn,
  writeJson,
  writeText,
} from "./lib/util.mjs";

const USAGE = `Usage: node agents/run.mjs [options]

  --week <YYYY-Www>   run week (default: the current ISO week)
  --dry-run           run collect..review only, never touch content/ or git
  --from <stage>      start at a stage and continue to the end
  --only <stage>      run exactly one stage (reusing earlier artifacts)
  --no-publish        skip the git/PR publish stage
  --agent-cmd <cmd>   agent CLI to run (default: $AGENT_CMD or omp -p --mode=json)
  --since <date>      collect commits/PRs/releases since YYYY-MM-DD
  --root <dir>        repository root (default: nearest package.json)
  --help              this text

Stages: ${STAGES.join(", ")}
`;

const SPEC = {
  value: ["week", "from", "only", "agent-cmd", "since", "root"],
  bool: ["dry-run", "no-publish", "help"],
};

const ENTRY_ID_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTRY_KINDS = ["shipped", "fixed", "learned", "wrote", "experiment"];
const VISIBILITIES = ["public", "private"];
const ENTRY_STATUSES = ["pending", "published", "skipped"];
const ACTION_TYPES = ["project_highlight", "blog_post", "now_page", "noop"];
const VIOLATION_RULES = [
  "unresolvable_citation",
  "unsourced_number",
  "private_leak",
  "style_violation",
  "duplicate",
  "schema_invalid",
];
const LINK_KEYS = ["repo", "commit", "pr", "url"];
const SUMMARY_MAX = 200;

/** plan action type -> prompt, proposal kind and proposal file stem. */
const WRITERS = {
  project_highlight: {
    prompt: "writer-projects",
    kind: "project_highlights",
    stem: "project_highlights",
  },
  blog_post: { prompt: "writer-blog", kind: "blog_post", stem: "blog_post" },
  now_page: { prompt: "writer-now", kind: "now_page", stem: "now_page" },
};

// ---------------------------------------------------------------------------
// small predicates
// ---------------------------------------------------------------------------

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
  return condition;
}

function isStringArray(value, { min = 0 } = {}) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.every((v) => typeof v === "string" && v.trim() !== "")
  );
}

function requireString(value, where) {
  expect(
    typeof value === "string" && value.trim() !== "",
    `${where} must be a non-empty string`,
  );
}

function requireStringArray(value, where, options) {
  expect(
    isStringArray(value, options),
    `${where} must be an array of non-empty strings`,
  );
}

function rel(ctx, target) {
  return path.relative(ctx.root, target).split(path.sep).join("/");
}

function indent(text) {
  const body = String(text ?? "").trimEnd();
  return body ? `${body.replace(/^/gm, "  ")}\n` : "";
}

function artifactPath(ctx, name) {
  return path.join(ctx.weekDir, name);
}

function rawPath(ctx, name) {
  return path.join(ctx.weekDir, "raw", `${name}.txt`);
}

function recordTelemetry(ctx, stage, call) {
  if (!call.telemetry) return;
  const existing = ctx.telemetry[stage];
  if (existing === undefined) ctx.telemetry[stage] = call.telemetry;
  else if (Array.isArray(existing))
    existing.push({ call: call.name ?? null, ...call.telemetry });
  else
    ctx.telemetry[stage] = [
      existing,
      { call: call.name ?? null, ...call.telemetry },
    ];
}

// ---------------------------------------------------------------------------
// prompts
// ---------------------------------------------------------------------------

function buildPrompt(ctx, promptName, { markers = [], sections = [] } = {}) {
  const file = path.join(ctx.root, "agents", "prompts", `${promptName}.md`);
  const text = readText(file);
  expect(text !== null, `prompt not found: ${rel(ctx, file)}`);
  const header = [
    `<<<WEEK:${ctx.week}>>>`,
    `<<<ROOT:${ctx.root}>>>`,
    ...markers,
  ].join("\n");
  return `${text}\n${header}\n\n---\n\n# INPUT\n\n${sections.join("\n")}\n`;
}

function entriesSection(entries) {
  const payload = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    project: entry.project ?? null,
    kind: entry.kind,
    visibility: entry.visibility,
    summary: entry.summary,
    tags: entry.tags ?? [],
    links: entry.links ?? [],
    sources: entry.sources ?? [],
    body: entry.body,
  }));
  return [
    `## Journal entries (${payload.length})`,
    "",
    "These are the only citable facts. Nothing outside them may appear in your output.",
    "",
    fence(payload),
  ].join("\n");
}

function projectsSection(projects) {
  if (!projects) {
    return [
      "## Projects",
      "",
      "No project registry exists yet (`content/projects.yml`, `agents/private-projects.yml`); treat `project` as null.",
    ].join("\n");
  }
  const payload = projects.map((project) => ({
    id: project?.id ?? null,
    title: project?.title ?? null,
    visibility: project?.visibility ?? null,
    registry: project?.registry ?? null,
    highlights: Array.isArray(project?.highlights)
      ? project.highlights.map((h) => ({
          date: h?.date ?? null,
          text: h?.text ?? null,
        }))
      : [],
  }));
  return [
    "## Projects",
    "",
    "Records whose `registry` is `agents/private-projects.yml` are private: their page is",
    "local-only, so a highlight for them is written there and never into `content/`.",
    "",
    fence(payload),
  ].join("\n");
}

function actionSection(action) {
  return [
    `## Plan action`,
    "",
    "Act only on this action.",
    "",
    fence(action),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// readers
// ---------------------------------------------------------------------------

/**
 * Project registries: the public `content/projects.yml` plus the local-only
 * `agents/private-projects.yml`, which holds the join target for entries about
 * private work and is absent on CI. Each record carries the file it came from so
 * callers can tell the two tiers apart.
 */
function readProjects(root) {
  const files = ["content/projects.yml", "agents/private-projects.yml"];
  const projects = [];
  let found = false;
  for (const file of files) {
    const doc = readYaml(path.join(root, file));
    if (doc === null) continue;
    expect(Array.isArray(doc), `${file} must hold a list`);
    found = true;
    for (const project of doc) projects.push({ ...project, registry: file });
  }
  return found ? projects : null;
}

/** Journal entries, from both tiers (the private tier is local-only). */
function readJournalEntries(root) {
  const dirs = [
    path.join(root, "journal", "entries"),
    path.join(root, "journal", "private"),
  ];
  const entries = [];
  for (const dir of dirs) {
    for (const name of filesWithExt(dir, ".md")) {
      const text = readText(path.join(dir, name)) ?? "";
      const { data, body } = splitFrontMatter(text);
      entries.push({ file: name, ...(data ?? {}), body });
    }
  }
  return entries;
}

/** Journal entries triaged into this run. */
function readRunEntries(ctx) {
  const dir = path.join(ctx.weekDir, "entries");
  return filesWithExt(dir, ".md").map((name) => {
    const text = readText(path.join(dir, name)) ?? "";
    const { data, body } = splitFrontMatter(text);
    return { ...(data ?? {}), body };
  });
}

function readProposals(ctx) {
  const dir = path.join(ctx.weekDir, "proposals");
  return filesWithExt(dir, ".json").map((name) => ({
    file: `proposals/${name}`,
    name,
    value: readJson(path.join(dir, name)),
  }));
}

/** Delete stale `*.<ext>` files in `dir` that are not in `keep`. */
function pruneStale(dir, ext, keep) {
  for (const name of filesWithExt(dir, ext)) {
    if (keep.has(name)) continue;
    try {
      fs.rmSync(path.join(dir, name), { force: true });
    } catch {
      warn(`could not remove stale artifact ${name}`);
    }
  }
}

// ---------------------------------------------------------------------------
// collect (no LLM)
// ---------------------------------------------------------------------------

function parseRepoList(text) {
  const repos = [];
  for (const [index, rawLine] of String(text).split(/\r?\n/).entries()) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [name, ...rest] = line.split(/\s+/);
    const hint = (rest[0] ?? "").toLowerCase();
    if (!/^[\w.-]+\/[\w.-]+$/.test(name)) {
      warn(
        `agents/repos.txt:${index + 1}: ignoring ${JSON.stringify(line)} (expected owner/name)`,
      );
      continue;
    }
    if (hint && hint !== "private" && hint !== "public") {
      warn(
        `agents/repos.txt:${index + 1}: unknown visibility ${JSON.stringify(hint)}, assuming public`,
      );
    }
    repos.push({
      name,
      visibility_hint: hint === "private" ? "private" : "public",
    });
  }
  return repos;
}

function lastRunSince(ctx) {
  const lastRun = readJson(path.join(ctx.runsDir, ".last-run.json"));
  if (!lastRun) return null;
  if (typeof lastRun.since === "string" && DAY_RE.test(lastRun.since))
    return lastRun.since;
  if (
    typeof lastRun.finished_at === "string" &&
    DAY_RE.test(lastRun.finished_at.slice(0, 10))
  ) {
    return lastRun.finished_at.slice(0, 10);
  }
  return null;
}

function ghJson(apiPath, cwd) {
  const res = runCommand(`gh api "${apiPath}"`, { cwd, allowFailure: true });
  if (!res.ok) {
    const message = (res.stderr || res.stdout || `exit ${res.code}`)
      .trim()
      .split(/\r?\n/)[0];
    return { ok: false, error: message.slice(0, 300) };
  }
  try {
    return { ok: true, value: JSON.parse(res.stdout) };
  } catch (err) {
    return { ok: false, error: `unparseable gh output: ${err.message}` };
  }
}

function collectRepo(repo, ctx, sinceIso, ghAvailable) {
  const entry = {
    name: repo.name,
    private: repo.visibility_hint === "private",
    visibility_hint: repo.visibility_hint,
    default_branch: null,
    commits: [],
    pulls: [],
    releases: [],
    journal_markdown: null,
    error: null,
    failed_calls: [],
  };
  if (!ghAvailable) {
    entry.error = "gh CLI not available";
    entry.failed_calls.push("meta", "commits", "pulls", "releases");
    return entry;
  }

  const fail = (call, message) => {
    entry.failed_calls.push(call);
    if (!entry.error) entry.error = `${call}: ${message}`;
  };

  const meta = ghJson(`repos/${repo.name}`, ctx.root);
  if (meta.ok) {
    entry.private = meta.value?.private === true;
    entry.default_branch = meta.value?.default_branch ?? null;
  } else {
    fail("meta", meta.error);
  }

  const commits = ghJson(
    `repos/${repo.name}/commits?since=${sinceIso}&per_page=100`,
    ctx.root,
  );
  if (commits.ok && Array.isArray(commits.value)) {
    entry.commits = commits.value.slice(0, 100).map((commit) => ({
      sha: String(commit?.sha ?? "").slice(0, 7),
      date: String(
        commit?.commit?.author?.date ?? commit?.commit?.committer?.date ?? "",
      ).slice(0, 10),
      author: commit?.author?.login ?? commit?.commit?.author?.name ?? null,
      message: String(commit?.commit?.message ?? "")
        .split("\n")[0]
        .slice(0, 200),
    }));
  } else {
    fail("commits", commits.error ?? "unexpected payload");
  }

  const pulls = ghJson(
    `repos/${repo.name}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
    ctx.root,
  );
  if (pulls.ok && Array.isArray(pulls.value)) {
    entry.pulls = pulls.value
      .filter((pull) => pull?.merged_at && pull.merged_at >= sinceIso)
      .map((pull) => ({
        number: pull.number,
        title: String(pull.title ?? "").slice(0, 200),
        merged_at: pull.merged_at,
      }));
  } else {
    fail("pulls", pulls.error ?? "unexpected payload");
  }

  const releases = ghJson(`repos/${repo.name}/releases?per_page=20`, ctx.root);
  if (releases.ok && Array.isArray(releases.value)) {
    entry.releases = releases.value
      .filter(
        (release) => release?.published_at && release.published_at >= sinceIso,
      )
      .map((release) => ({
        tag: release.tag_name ?? null,
        name: String(release.name ?? "").slice(0, 200),
        published_at: release.published_at,
      }));
  } else {
    fail("releases", releases.error ?? "unexpected payload");
  }

  // JOURNAL.md is optional: a 404 is the normal case, not an error.
  const journal = runCommand(
    `gh api -H "Accept: application/vnd.github.raw" "repos/${repo.name}/contents/JOURNAL.md"`,
    { cwd: ctx.root, allowFailure: true },
  );
  const journalText = journal.stdout.trim();
  if (journal.ok && journalText && !journalText.startsWith("{")) {
    entry.journal_markdown = journalText.slice(0, 20000);
  }

  return entry;
}

async function stageCollect(ctx) {
  const reposFile = path.join(ctx.root, "agents", "repos.txt");
  const listed = readText(reposFile);
  expect(listed !== null, `repository list not found: ${rel(ctx, reposFile)}`);
  const repos = parseRepoList(listed);
  expect(repos.length > 0, `${rel(ctx, reposFile)} lists no repositories`);

  const since = ctx.since ?? lastRunSince(ctx) ?? daysAgo(30);
  expect(
    DAY_RE.test(since),
    `since must be YYYY-MM-DD (got ${JSON.stringify(since)})`,
  );
  ctx.since = since;
  process.stdout.write(`[collect] ${repos.length} repo(s) since ${since}\n`);

  const ghAvailable = runCommand("gh --version", {
    cwd: ctx.root,
    allowFailure: true,
  }).ok;
  if (!ghAvailable)
    warn(
      "gh CLI is not available; each repository records the failure instead of data",
    );

  const sinceIso = `${since}T00:00:00Z`;
  const activity = {
    week: ctx.week,
    collected_at: new Date().toISOString(),
    since,
    source: "gh api",
    repos: repos.map((repo) => collectRepo(repo, ctx, sinceIso, ghAvailable)),
  };
  for (const repo of activity.repos) {
    if (repo.failed_calls.length) warn(`${repo.name}: ${repo.error}`);
  }
  const target = artifactPath(ctx, "activity.json");
  writeJson(target, activity);
  return target;
}

// ---------------------------------------------------------------------------
// triage
// ---------------------------------------------------------------------------

function validateEntriesArtifact(value) {
  expect(isObject(value), "triage: artifact must be a JSON object");
  expect(Array.isArray(value.entries), "triage: `entries` must be an array");
  const seen = new Set();
  value.entries.forEach((entry, i) => {
    const where = `triage: entries[${i}]`;
    expect(isObject(entry), `${where} must be an object`);
    expect(
      typeof entry.id === "string" && ENTRY_ID_RE.test(entry.id),
      `${where}.id must match YYYY-MM-DD-slug (got ${JSON.stringify(entry.id)})`,
    );
    expect(!seen.has(entry.id), `${where}.id ${entry.id} is duplicated`);
    seen.add(entry.id);
    expect(DAY_RE.test(String(entry.date)), `${where}.date must be YYYY-MM-DD`);
    expect(
      String(entry.id).startsWith(String(entry.date)),
      `${where}.id must start with its own date`,
    );
    expect(
      entry.project === null || typeof entry.project === "string",
      `${where}.project must be a project id or null`,
    );
    expect(
      ENTRY_KINDS.includes(entry.kind),
      `${where}.kind must be one of ${ENTRY_KINDS.join("|")}`,
    );
    expect(
      VISIBILITIES.includes(entry.visibility),
      `${where}.visibility must be one of ${VISIBILITIES.join("|")}`,
    );
    expect(
      typeof entry.summary === "string" &&
        entry.summary.trim() !== "" &&
        !entry.summary.includes("\n") &&
        entry.summary.length <= SUMMARY_MAX,
      `${where}.summary must be one line of at most ${SUMMARY_MAX} characters`,
    );
    expect(Array.isArray(entry.links), `${where}.links must be an array`);
    entry.links.forEach((link, j) => {
      expect(isObject(link), `${where}.links[${j}] must be an object`);
      const keys = LINK_KEYS.filter((key) => key in link);
      expect(
        keys.length === 1,
        `${where}.links[${j}] must carry exactly one of ${LINK_KEYS.join("|")}`,
      );
      requireString(link[keys[0]], `${where}.links[${j}].${keys[0]}`);
    });
    if (entry.kind === "shipped") {
      expect(
        entry.links.length > 0,
        `${where}: kind "shipped" requires at least one link`,
      );
    }
    requireStringArray(entry.tags, `${where}.tags`);
    expect(
      ENTRY_STATUSES.includes(entry.status),
      `${where}.status must be one of ${ENTRY_STATUSES.join("|")}`,
    );
    requireStringArray(entry.sources, `${where}.sources`);
    requireString(entry.body, `${where}.body`);
    expect(
      entry.body.includes("\n") || entry.body.length > 20,
      `${where}.body looks empty`,
    );
  });
  return value;
}

function entryToMarkdown(entry) {
  const front = {
    id: entry.id,
    date: entry.date,
    project: entry.project ?? null,
    kind: entry.kind,
    visibility: entry.visibility,
    summary: entry.summary,
    links: entry.links ?? [],
    tags: entry.tags ?? [],
    status: entry.status,
    sources: entry.sources ?? [],
  };
  const body = entry.body.endsWith("\n") ? entry.body : `${entry.body}\n`;
  return joinFrontMatter(front, body);
}

async function stageTriage(ctx) {
  const activity = readJson(artifactPath(ctx, "activity.json"));
  expect(
    activity !== null,
    "activity.json not found — run the collect stage first",
  );
  const projects = readProjects(ctx.root);
  const known = readJournalEntries(ctx.root);
  const prompt = buildPrompt(ctx, "triage", {
    sections: [
      "## Activity",
      "",
      fence(activity),
      `## Known project ids`,
      "",
      fence(
        (projects ?? []).map((p) => ({
          id: p?.id ?? null,
          title: p?.title ?? null,
          registry: p?.registry ?? null,
        })),
      ),
      `## Journal ids that already exist (do not reuse)`,
      "",
      fence(known.map((e) => e.id ?? e.file)),
    ],
  });

  const call = await callAgent({
    stage: "triage",
    prompt,
    rawPath: rawPath(ctx, "triage"),
    agentCmd: ctx.agentCmd,
    root: ctx.root,
  });
  recordTelemetry(ctx, "triage", call);

  const artifact = validateEntriesArtifact(call.value);
  if (artifact.week !== ctx.week) {
    warn(
      `triage returned week ${JSON.stringify(artifact.week)}; recording under ${ctx.week}`,
    );
  }
  const knownIds = new Set(known.map((e) => e.id));
  const projectIds = new Set((projects ?? []).map((p) => p?.id));
  for (const entry of artifact.entries) {
    if (entry.id && knownIds.has(entry.id)) {
      warn(
        `triage: entry ${entry.id} already exists in journal (journal/entries/ or journal/private/)`,
      );
    }
    if (entry.project && projects && !projectIds.has(entry.project)) {
      warn(
        `triage: entry ${entry.id} names unknown project ${JSON.stringify(entry.project)}`,
      );
    }
  }

  const entriesDir = ensureDir(path.join(ctx.weekDir, "entries"));
  const keep = new Set();
  for (const entry of artifact.entries) {
    const name = `${entry.id}.md`;
    keep.add(name);
    writeText(path.join(entriesDir, name), entryToMarkdown(entry));
  }
  pruneStale(entriesDir, ".md", keep);
  process.stdout.write(`[triage] ${artifact.entries.length} entry(ies)\n`);
  return entriesDir;
}

// ---------------------------------------------------------------------------
// curate
// ---------------------------------------------------------------------------

function validatePlan(plan, entries) {
  expect(isObject(plan), "curate: artifact must be a JSON object");
  expect(Array.isArray(plan.entry_ids), "curate: `entry_ids` must be an array");
  requireStringArray(plan.entry_ids, "curate: entry_ids", { min: 0 });
  expect(Array.isArray(plan.actions), "curate: `actions` must be an array");
  const known = new Set(entries.map((entry) => entry.id));
  const covered = new Set();

  plan.actions.forEach((action, i) => {
    const where = `curate: actions[${i}]`;
    expect(isObject(action), `${where} must be an object`);
    expect(
      ACTION_TYPES.includes(action.type),
      `${where}.type must be one of ${ACTION_TYPES.join("|")}`,
    );
    requireStringArray(action.entry_ids, `${where}.entry_ids`, { min: 0 });
    requireString(action.rationale, `${where}.rationale`);
    for (const id of action.entry_ids ?? []) {
      covered.add(id);
      expect(known.has(id), `${where} cites unknown entry ${id}`);
    }
    if (action.type === "project_highlight") {
      requireString(action.project, `${where}.project`);
    }
    if (action.type === "blog_post") {
      expect(
        typeof action.slug === "string" && SLUG_RE.test(action.slug),
        `${where}.slug must be kebab-case`,
      );
      requireString(action.title_hint, `${where}.title_hint`);
    }
  });

  for (const id of entries.map((entry) => entry.id)) {
    if (!covered.has(id))
      warn(`curate: entry ${id} is not mentioned by any action`);
  }
  return plan;
}

async function stageCurate(ctx) {
  const entries = readRunEntries(ctx);
  expect(
    entries.length > 0,
    "no triaged entries found — run the triage stage first",
  );
  const projects = readProjects(ctx.root);
  const prompt = buildPrompt(ctx, "curate", {
    sections: [entriesSection(entries), projectsSection(projects)],
  });

  const call = await callAgent({
    stage: "curate",
    prompt,
    rawPath: rawPath(ctx, "curate"),
    agentCmd: ctx.agentCmd,
    root: ctx.root,
  });
  recordTelemetry(ctx, "curate", call);

  const plan = validatePlan(call.value, entries);
  if (plan.week !== ctx.week) {
    warn(
      `curate returned week ${JSON.stringify(plan.week)}; recording under ${ctx.week}`,
    );
  }
  const target = artifactPath(ctx, "plan.json");
  writeJson(target, {
    week: ctx.week,
    entry_ids: plan.entry_ids,
    actions: plan.actions,
  });
  process.stdout.write(`[curate] ${plan.actions.length} action(s)\n`);
  return target;
}

// ---------------------------------------------------------------------------
// write (one agent call per action, in parallel)
// ---------------------------------------------------------------------------

function validateProjectHighlights(value, where) {
  expect(isObject(value), `${where}: artifact must be a JSON object`);
  expect(
    value.kind === "project_highlights",
    `${where}.kind must be "project_highlights"`,
  );
  expect(
    Array.isArray(value.highlights),
    `${where}.highlights must be an array`,
  );
  value.highlights.forEach((highlight, i) => {
    const at = `${where}.highlights[${i}]`;
    requireString(highlight?.project, `${at}.project`);
    expect(
      DAY_RE.test(String(highlight?.date)),
      `${at}.date must be YYYY-MM-DD`,
    );
    requireString(highlight?.text, `${at}.text`);
    requireStringArray(highlight?.source_ids, `${at}.source_ids`, { min: 1 });
  });
  return value;
}

function validateNowPage(value, where) {
  expect(isObject(value), `${where}: artifact must be a JSON object`);
  expect(value.kind === "now_page", `${where}.kind must be "now_page"`);
  expect(Array.isArray(value.items), `${where}.items must be an array`);
  value.items.forEach((item, i) => {
    const at = `${where}.items[${i}]`;
    expect(
      typeof item?.id === "string" && SLUG_RE.test(item.id),
      `${at}.id must be kebab-case`,
    );
    requireString(item?.title, `${at}.title`);
    requireString(item?.description, `${at}.description`);
    requireStringArray(item?.source_ids, `${at}.source_ids`, { min: 1 });
  });
  return value;
}

function validateBlogPost(value, where) {
  expect(isObject(value), `${where}: artifact must be a JSON object`);
  expect(value.kind === "blog_post", `${where}.kind must be "blog_post"`);
  const post = value.post;
  expect(isObject(post), `${where}.post must be an object`);
  expect(
    typeof post.slug === "string" && SLUG_RE.test(post.slug),
    `${where}.post.slug must be kebab-case`,
  );
  requireString(post.title, `${where}.post.title`);
  requireString(post.summary, `${where}.post.summary`);
  requireStringArray(post.tags, `${where}.post.tags`, { min: 1 });
  expect(
    DAY_RE.test(String(post.date)),
    `${where}.post.date must be YYYY-MM-DD`,
  );
  requireString(post.body_markdown, `${where}.post.body_markdown`);
  requireStringArray(post.source_ids, `${where}.post.source_ids`, { min: 1 });
  return value;
}

const WRITER_VALIDATORS = {
  project_highlights: validateProjectHighlights,
  now_page: validateNowPage,
  blog_post: validateBlogPost,
};

async function writeAction(ctx, action, index, entries) {
  const writer = WRITERS[action.type];
  expect(
    writer,
    `write: no writer is defined for action type ${JSON.stringify(action.type)}`,
  );

  const cited = (action.entry_ids ?? [])
    .map((id) => entries.find((entry) => entry.id === id))
    .filter(Boolean);
  const markers = [`<<<KIND:${writer.kind}>>>`];
  if (action.type === "project_highlight")
    markers.push(`<<<PROJECT:${action.project}>>>`);

  const prompt = buildPrompt(ctx, writer.prompt, {
    markers,
    sections: [actionSection(action), entriesSection(cited)],
  });

  const name = `write-${String(index + 1).padStart(2, "0")}-${writer.stem}`;
  const call = await callAgent({
    stage: "write",
    prompt,
    rawPath: rawPath(ctx, name),
    agentCmd: ctx.agentCmd,
    root: ctx.root,
  });
  call.name = name;
  recordTelemetry(ctx, "write", call);

  const where = `write/${writer.stem}`;
  const value = WRITER_VALIDATORS[writer.stem](call.value, where);
  return { action, writer, value };
}

async function stageWrite(ctx) {
  const plan = readJson(artifactPath(ctx, "plan.json"));
  expect(plan !== null, "plan.json not found — run the curate stage first");
  const entries = readRunEntries(ctx);
  const actions = (plan.actions ?? []).filter(
    (action) => action.type !== "noop",
  );

  const proposalsDir = ensureDir(path.join(ctx.weekDir, "proposals"));
  if (!actions.length) {
    process.stdout.write("[write] no actionable items in the plan\n");
    pruneStale(proposalsDir, ".json", new Set());
    return proposalsDir;
  }

  // One agent call per action, in parallel: distinct raw files, distinct
  // proposal parts, no shared writes.
  const results = await Promise.all(
    actions.map((action, index) => writeAction(ctx, action, index, entries)),
  );

  const groups = new Map();
  for (const result of results) {
    const list = groups.get(result.writer.stem) ?? [];
    list.push(result);
    groups.set(result.writer.stem, list);
  }

  const keep = new Set();
  const written = [];

  const highlights = groups.get("project_highlights") ?? [];
  if (highlights.length) {
    const merged = [];
    const seen = new Set();
    for (const result of highlights) {
      for (const highlight of result.value.highlights) {
        const key = `${highlight.project}|${highlight.date}|${highlight.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(highlight);
      }
    }
    const file = "project_highlights.json";
    keep.add(file);
    written.push(
      writeJson(path.join(proposalsDir, file), {
        kind: "project_highlights",
        week: ctx.week,
        highlights: merged,
      }),
    );
  }

  const nowItems = groups.get("now_page") ?? [];
  if (nowItems.length) {
    const merged = [];
    const seen = new Set();
    for (const result of nowItems) {
      for (const item of result.value.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }
    const file = "now_page.json";
    keep.add(file);
    written.push(
      writeJson(path.join(proposalsDir, file), {
        kind: "now_page",
        week: ctx.week,
        items: merged,
      }),
    );
  }

  const posts = groups.get("blog_post") ?? [];
  posts.forEach((result, index) => {
    const file =
      index === 0
        ? "blog_post.json"
        : `blog_post-${result.value.post.slug}.json`;
    keep.add(file);
    written.push(
      writeJson(path.join(proposalsDir, file), {
        kind: "blog_post",
        week: ctx.week,
        post: result.value.post,
      }),
    );
  });

  pruneStale(proposalsDir, ".json", keep);
  process.stdout.write(
    `[write] ${actions.length} agent call(s) -> ${keep.size} proposal file(s)\n`,
  );
  return proposalsDir;
}

// ---------------------------------------------------------------------------
// review
// ---------------------------------------------------------------------------

function validateReview(value, context) {
  expect(isObject(value), "review: artifact must be a JSON object");
  expect(
    value.verdict === "pass" || value.verdict === "fail",
    'review: verdict must be "pass" or "fail"',
  );
  expect(
    Array.isArray(value.violations),
    "review: `violations` must be an array",
  );
  value.violations.forEach((violation, i) => {
    const where = `review: violations[${i}]`;
    requireString(violation?.artifact, `${where}.artifact`);
    expect(
      VIOLATION_RULES.includes(violation?.rule),
      `${where}.rule must be one of ${VIOLATION_RULES.join("|")}`,
    );
    requireString(violation?.detail, `${where}.detail`);
    expect(
      Array.isArray(violation?.source_ids),
      `${where}.source_ids must be an array`,
    );
  });
  if (value.verdict === "pass") {
    expect(
      value.violations.length === 0,
      "review: verdict pass requires an empty violations array",
    );
  } else {
    expect(
      value.violations.length > 0,
      "review: verdict fail requires at least one violation",
    );
  }
  for (const violation of value.violations) {
    if (violation.artifact && !context.proposalFiles.has(violation.artifact)) {
      warn(
        `review: violation names unknown artifact ${JSON.stringify(violation.artifact)}`,
      );
    }
  }
  return value;
}

async function stageReview(ctx) {
  const proposals = readProposals(ctx);
  const entries = readRunEntries(ctx);
  const allCited = new Set();
  for (const proposal of proposals) {
    const value = proposal.value ?? {};
    const payloads = [
      value.post,
      ...(value.highlights ?? []),
      ...(value.items ?? []),
    ];
    for (const payload of payloads)
      for (const id of payload?.source_ids ?? []) allCited.add(id);
  }
  const cited = entries.filter((entry) => allCited.has(entry.id));
  const prompt = buildPrompt(ctx, "review", {
    sections: [
      proposals.length
        ? [
            "## Proposals",
            "",
            fence(proposals.map((p) => ({ artifact: p.file, ...p.value }))),
          ].join("\n")
        : "## Proposals\n\nThere are no proposals for this week.",
      entriesSection(cited),
      projectsSection(readProjects(ctx.root)),
    ],
  });

  const call = await callAgent({
    stage: "review",
    prompt,
    rawPath: rawPath(ctx, "review"),
    agentCmd: ctx.agentCmd,
    root: ctx.root,
  });
  recordTelemetry(ctx, "review", call);

  const review = validateReview(call.value, {
    proposalFiles: new Set(proposals.map((p) => p.file)),
  });
  const target = artifactPath(ctx, "review.json");
  writeJson(target, {
    week: ctx.week,
    verdict: review.verdict,
    violations: review.violations,
  });
  process.stdout.write(
    `[review] verdict ${review.verdict} (${review.violations.length} violation(s))\n`,
  );

  if (review.verdict !== "pass") {
    const summary = review.violations
      .slice(0, 5)
      .map((v) => `  - ${v.artifact} [${v.rule}] ${v.detail}`)
      .join("\n");
    const err = new Error(
      `review verdict "${review.verdict}" — refusing to apply proposals:\n${summary}`,
    );
    err.artifact = target;
    throw err;
  }
  return target;
}

// ---------------------------------------------------------------------------
// apply / verify / publish (shell-outs)
// ---------------------------------------------------------------------------

function runNodeScript(ctx, scriptRel, args, artifactName) {
  const script = path.join(ctx.root, scriptRel);
  expect(exists(script), `${scriptRel} not found at ${rel(ctx, script)}`);
  const command = [
    `node`,
    `"${script}"`,
    `--root`,
    `"${ctx.root}"`,
    ...args,
  ].join(" ");
  const res = runCommand(command, { cwd: ctx.root, allowFailure: true });
  process.stdout.write(indent(res.stdout));
  if (res.stderr.trim()) process.stderr.write(indent(res.stderr));
  if (!res.ok) {
    const err = new Error(`${scriptRel} failed (exit ${res.code})`);
    const artifact = artifactPath(ctx, artifactName);
    err.artifact = exists(artifact) ? artifact : undefined;
    throw err;
  }
  const artifact = artifactPath(ctx, artifactName);
  return exists(artifact) ? artifact : path.join(ctx.weekDir, artifactName);
}

async function stageApply(ctx) {
  return runNodeScript(
    ctx,
    "scripts/apply-proposals.mjs",
    ["--week", ctx.week],
    "apply.json",
  );
}

async function stageVerify(ctx) {
  const script = path.join(ctx.root, "scripts", "verify-content.mjs");
  expect(exists(script), `verify-content.mjs not found at ${rel(ctx, script)}`);
  const res = runCommand(`node "${script}" --root "${ctx.root}"`, {
    cwd: ctx.root,
    allowFailure: true,
  });
  process.stdout.write(indent(res.stdout));
  if (res.stderr.trim()) process.stderr.write(indent(res.stderr));
  if (!res.ok) throw new Error(`verify-content.mjs failed (exit ${res.code})`);
  return script;
}

async function stagePublish(ctx) {
  const status = runCommand("git status --porcelain", {
    cwd: ctx.root,
    allowFailure: true,
  });
  expect(status.ok, `git status failed: ${status.stderr.trim()}`);
  const changed = status.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const target = artifactPath(ctx, "publish.json");

  if (!changed.length) {
    writeJson(target, {
      week: ctx.week,
      branch: null,
      committed: [],
      pr_url: null,
    });
    process.stdout.write("[publish] nothing to publish\n");
    return target;
  }

  const branch = `agent/portfolio-${ctx.week}`;
  const existsLocal = runCommand(
    `git rev-parse --verify --quiet "refs/heads/${branch}"`,
    {
      cwd: ctx.root,
      allowFailure: true,
    },
  ).ok;
  const checkout = existsLocal
    ? runCommand(`git checkout "${branch}"`, {
        cwd: ctx.root,
        allowFailure: true,
      })
    : runCommand(`git checkout -b "${branch}"`, {
        cwd: ctx.root,
        allowFailure: true,
      });
  expect(
    checkout.ok,
    `git checkout ${branch} failed: ${checkout.stderr.trim()}`,
  );

  const add = runCommand("git add content journal", {
    cwd: ctx.root,
    allowFailure: true,
  });
  expect(add.ok, `git add failed: ${add.stderr.trim()}`);
  const commit = runCommand(
    `git commit -m "content: portfolio update ${ctx.week}"`,
    {
      cwd: ctx.root,
      allowFailure: true,
    },
  );
  expect(commit.ok, `git commit failed: ${commit.stderr.trim()}`);

  const push = runCommand(`git push -u origin "${branch}"`, {
    cwd: ctx.root,
    allowFailure: true,
  });
  if (!push.ok) warn(`git push failed: ${push.stderr.trim()}`);

  let prUrl = null;
  const listed = runCommand(
    `gh pr list --head "${branch}" --json url --jq ".[0].url"`,
    {
      cwd: ctx.root,
      allowFailure: true,
    },
  );
  if (listed.ok && listed.stdout.trim()) {
    prUrl = listed.stdout.trim();
  } else {
    const created = runCommand(`gh pr create --fill --head "${branch}"`, {
      cwd: ctx.root,
      allowFailure: true,
    });
    if (created.ok) prUrl = created.stdout.trim().split(/\r?\n/).pop() ?? null;
    else warn(`gh pr create failed: ${created.stderr.trim()}`);
  }

  writeJson(target, {
    week: ctx.week,
    branch,
    committed: changed,
    pr_url: prUrl,
  });
  process.stdout.write(
    `[publish] branch ${branch} (${changed.length} change(s))${prUrl ? ` ${prUrl}` : ""}\n`,
  );
  return target;
}

// ---------------------------------------------------------------------------
// runner
// ---------------------------------------------------------------------------

const STAGE_RUNNERS = {
  collect: stageCollect,
  triage: stageTriage,
  curate: stageCurate,
  write: stageWrite,
  review: stageReview,
  apply: stageApply,
  verify: stageVerify,
  publish: stagePublish,
};

function selectStages(args, ctx) {
  let selected = STAGES.slice();
  if (args.from) selected = STAGES.slice(STAGES.indexOf(args.from));
  if (args.only) selected = [args.only];

  const skipped = [];
  if (ctx.dryRun) {
    const kept = selected.filter((stage) => DRY_RUN_STAGES.includes(stage));
    skipped.push(
      ...selected
        .filter((stage) => !kept.includes(stage))
        .map((stage) => `${stage} (dry-run)`),
    );
    selected = kept;
  }
  if (ctx.noPublish && selected.includes("publish")) {
    skipped.push("publish (--no-publish)");
    selected = selected.filter((stage) => stage !== "publish");
  }
  if (skipped.length)
    process.stdout.write(`[run] skipped: ${skipped.join(", ")}\n`);
  return selected;
}

function writeManifest(ctx) {
  if (!ctx.stages.length) return;
  writeJson(artifactPath(ctx, "manifest.json"), {
    week: ctx.week,
    root: ctx.root,
    dry_run: ctx.dryRun,
    started_at: ctx.startedAt,
    finished_at: new Date().toISOString(),
    stages: ctx.stages,
  });
}

function writeLastRun(ctx) {
  writeJson(path.join(ctx.runsDir, ".last-run.json"), {
    week: ctx.week,
    finished_at: new Date().toISOString(),
    since: dayString(),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2), SPEC);
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }

  const root = path.resolve(args.root ?? defaultRoot());
  const week = args.week ?? isoWeekString();
  expect(
    isWeekString(week),
    `--week must look like YYYY-Www (got ${JSON.stringify(week)})`,
  );
  for (const flag of ["from", "only"]) {
    if (args[flag]) {
      expect(
        STAGES.includes(args[flag]),
        `--${flag} must be one of ${STAGES.join("|")}`,
      );
    }
  }
  if (args.since) expect(DAY_RE.test(args.since), "--since must be YYYY-MM-DD");

  const ctx = {
    root,
    week,
    runsDir: path.join(root, "runs"),
    weekDir: path.join(root, "runs", week),
    dryRun: Boolean(args.dryRun),
    noPublish: Boolean(args.noPublish),
    since: args.since ?? null,
    agentCmd: args.agentCmd ?? null,
    startedAt: new Date().toISOString(),
    stages: [],
    telemetry: {},
  };

  const selected = selectStages(args, ctx);
  if (!selected.length) {
    process.stdout.write(`[run] nothing to do for week ${week}\n`);
    return;
  }

  ensureDir(ctx.weekDir);
  process.stdout.write(
    `[run] week ${week}${ctx.dryRun ? " (dry-run)" : ""} stages: ${selected.join(", ")}\n`,
  );

  let failed = false;
  for (const stage of selected) {
    const started = Date.now();
    try {
      const artifact = await STAGE_RUNNERS[stage](ctx);
      const ms = Date.now() - started;
      ctx.stages.push({
        stage,
        ok: true,
        ms,
        artifact: artifact ? rel(ctx, artifact) : null,
        telemetry: ctx.telemetry[stage] ?? null,
      });
      log(stage, "ok", ms, artifact ? rel(ctx, artifact) : "");
    } catch (err) {
      const ms = Date.now() - started;
      ctx.stages.push({
        stage,
        ok: false,
        ms,
        error: err.message,
        artifact: err.artifact ? rel(ctx, err.artifact) : null,
        telemetry: ctx.telemetry[stage] ?? null,
      });
      log(stage, "fail", ms, "");
      process.stderr.write(
        `${err.message}\nartifacts preserved in ${rel(ctx, ctx.weekDir)}/\n`,
      );
      failed = true;
      break;
    }
  }

  // `notify` is not a pipeline stage (C4 fixes the eight above): it is the
  // trailing report for a run that produced proposals.
  if (!failed && !ctx.dryRun && selected.includes("review")) {
    const started = Date.now();
    try {
      const artifact = await runNodeScript(
        ctx,
        "scripts/notify.mjs",
        ["--week", ctx.week],
        "summary.md",
      );
      const ms = Date.now() - started;
      ctx.stages.push({
        stage: "notify",
        ok: true,
        ms,
        artifact: rel(ctx, artifact),
        telemetry: null,
      });
      log("notify", "ok", ms, rel(ctx, artifact));
    } catch (err) {
      const ms = Date.now() - started;
      ctx.stages.push({
        stage: "notify",
        ok: false,
        ms,
        error: err.message,
        artifact: null,
        telemetry: null,
      });
      log("notify", "fail", ms, "");
      process.stderr.write(`${err.message}\n`);
      failed = true;
    }
  }

  writeManifest(ctx);
  if (!failed) {
    if (ctx.dryRun)
      process.stdout.write(
        "[run] dry-run: content/ and git were not touched\n",
      );
    else writeLastRun(ctx);
    process.stdout.write(
      `[run] ${selected.length} stage(s) ok (week ${week})\n`,
    );
  }
  process.exitCode = failed ? 1 : 0;
}

await main();
