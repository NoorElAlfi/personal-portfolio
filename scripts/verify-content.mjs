#!/usr/bin/env node
/**
 * verify-content.mjs — content-contract gate for the portfolio agent pipeline.
 *
 * Usage: node scripts/verify-content.mjs [--root <dir>] [--json] [--strict-private]
 *
 * `--root` locates the DATA tree (journal/, content/, src/, agents/private-projects.yml); default is
 * the cwd. The JSON Schemas always resolve next to this script (agents/schemas/), so the gate can run
 * against a fixture tree.
 *
 * Entry locations: journal/entries/** (committed, public) and journal/private/** (gitignored,
 * local-only). Local runs read both; a `visibility: private` entry must never live in the committed
 * directory. All private project metadata lives in the local-only agents/private-projects.yml, never
 * in content/ — `?raw` inlines content/ verbatim into the client bundle, so anything there is
 * published.
 *
 * Absent local-only files (journal/private/, agents/private-projects.yml) are never findings: they
 * are reported as `NOTE` lines and the private joins are skipped, which keeps CI green. An
 * unresolvable `project` says explicitly whether the private registry was absent when it failed.
 *
 * Checks:
 *   a. journal entry front matter validates against agents/schemas/entry.schema.json
 *   b. entry ids are unique and equal the file name stem
 *   c. every entry `project` resolves in the id namespace of content/projects.yml joined with the
 *      local-only agents/private-projects.yml
 *   d. `kind: shipped` entries carry at least one link
 *   e. content/projects.yml + content/now.yml + content/posts.yml parse and satisfy contract C1
 *   f. provenance: every `source_ids` resolves to an entry, generated items cite something, and
 *      every numeric token in generated text appears in the cited evidence
 *   g. privacy: no private project's repo URL/handle appears in public content.
 *      HARD FAIL when a private entry's repo URL/handle leaks into pipeline-facing content: a
 *      public record in content/*.yml, a post with `generated: true`, any .mdx post body, a
 *      generated `source_ids`-bearing field, or a public journal entry. WARN only (reported with
 *      file:line, exit stays 0) when it appears solely inside hand-written authored content
 *      (`.jsx` site sources): pre-existing prose is the author's call, not the pipeline's failure.
 *      A `visibility: private` record's own repo/links/description fields are exempt — that record
 *      is the join target, not a leak — and agents/private-projects.yml is outside the scan targets
 *      entirely. A `visibility: private` entry found in the committed journal/entries/ directory is
 *      a hard failure: private evidence must not be committed. `--strict-private` promotes WARNs to
 *      failures.
 *   h. internal links: every `to:` resolves to an src/App.jsx route or a post slug
 *
 * Only dependency: `yaml` (JSON Schema validation is hand-rolled below; no ajv).
 * Unknown *extra* keys inside content YAML are tolerated (the contract fixes required keys, types
 * and enums, not an exhaustive field list); unknown keys in entry front matter are rejected
 * because entry.schema.json sets additionalProperties:false.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const SCHEMA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "agents",
  "schemas",
);

const CHECK_DEFS = [
  ["a", "journal entry front matter matches agents/schemas/entry.schema.json"],
  ["b", "entry ids are unique and match their file names"],
  [
    "c",
    "every entry project resolves in content/projects.yml + agents/private-projects.yml",
  ],
  ["d", "kind: shipped entries have at least one link"],
  ["e", "content YAML parses and satisfies contract C1"],
  ["f", "provenance: citations resolve and generated numbers are sourced"],
  ["g", "privacy: no private repo URL/handle in public content"],
  ["h", "internal links resolve to src/App.jsx routes or post slugs"],
];

// ---------------------------------------------------------------- CLI

function usage(message) {
  const text = [
    "usage: node scripts/verify-content.mjs [--root <dir>] [--json] [--strict-private]",
    "  --root <dir>       data tree to verify (default: cwd)",
    "  --json             emit a machine-readable report",
    "  --strict-private   treat privacy WARNs (hand-written content) as failures",
  ].join("\n");
  if (message) {
    console.error(`verify-content: ${message}\n\n${text}`);
    process.exit(2);
  }
  console.log(text);
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false, strictPrivate: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--"))
        usage("--root requires a directory path");
      opts.root = value;
      i += 1;
    } else if (arg.startsWith("--root=")) {
      opts.root = arg.slice("--root=".length);
      if (!opts.root) usage("--root requires a directory path");
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--strict-private") {
      opts.strictPrivate = true;
    } else if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    } else {
      usage(`unknown argument: ${arg}`);
    }
  }
  opts.root = path.resolve(opts.root);
  return opts;
}

// ---------------------------------------------------------------- report

class Report {
  constructor() {
    this.checks = CHECK_DEFS.map(([id, name]) => ({ id, name, findings: [] }));
    this.byId = new Map(this.checks.map((c) => [c.id, c]));
    this.warnings = [];
    this.notes = [];
  }

  /** Informational: absent local-only files, skipped joins. Never affects the exit code. */
  note(message) {
    this.notes.push(message);
  }

  finding(checkId, relPath, message, rule) {
    const check = this.byId.get(checkId);
    if (!check) throw new Error(`internal: unknown check ${checkId}`);
    const finding = { path: relPath, message };
    if (rule) finding.rule = rule;
    check.findings.push(finding);
  }

  /** Advisory: printed with file:line, never affects the exit code unless --strict-private. */
  warn(relPath, message, rule) {
    const warning = { path: relPath, message };
    if (rule) warning.rule = rule;
    this.warnings.push(warning);
  }

  get ok() {
    return this.checks.every((c) => c.findings.length === 0);
  }

  get findingCount() {
    return this.checks.reduce((n, c) => n + c.findings.length, 0);
  }
}

// ---------------------------------------------------------------- JSON Schema subset validator

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesType(value, type) {
  switch (type) {
    case "object":
      return isPlainObject(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return Number.isInteger(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function show(value) {
  if (typeof value === "string")
    return JSON.stringify(
      value.length > 60 ? `${value.slice(0, 57)}...` : value,
    );
  if (isPlainObject(value) || Array.isArray(value))
    return Array.isArray(value) ? "[array]" : "{object}";
  return String(value);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Validate `value` against the (draft 2020-12) subset used by agents/schemas/*.json. */
function validateNode(schema, value, pointer, errors) {
  if (schema === true || schema === undefined || schema === null) return errors;

  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push(
      `${pointer}: expected ${JSON.stringify(schema.const)}, got ${show(value)}`,
    );
    return errors;
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((allowed) => deepEqual(allowed, value))
  ) {
    errors.push(
      `${pointer}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")} — got ${show(value)}`,
    );
    return errors;
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(
        `${pointer}: expected type ${types.join(" | ")}, got ${typeName(value)}`,
      );
      return errors;
    }
  }

  if (typeof value === "string") {
    if (
      typeof schema.minLength === "number" &&
      value.length < schema.minLength
    ) {
      errors.push(
        `${pointer}: needs at least ${schema.minLength} character(s), got ${value.length}`,
      );
    }
    if (
      typeof schema.maxLength === "number" &&
      value.length > schema.maxLength
    ) {
      errors.push(
        `${pointer}: ${value.length} characters exceeds maxLength ${schema.maxLength} (${JSON.stringify(value)})`,
      );
    }
    if (typeof schema.pattern === "string") {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          errors.push(
            `${pointer}: ${JSON.stringify(value)} does not match /${schema.pattern}/`,
          );
        }
      } catch {
        /* invalid pattern in the schema itself: never a data failure */
      }
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(
        `${pointer}: needs at least ${schema.minItems} item(s), got ${value.length}`,
      );
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateNode(schema.items, item, `${pointer}/${index}`, errors),
      );
    }
  }

  if (isPlainObject(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, key))
        errors.push(`${pointer}: missing required key "${key}"`);
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      const propPointer = pointer ? `${pointer}/${key}` : `/${key}`;
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        validateNode(properties[key], child, propPointer, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${propPointer}: unexpected key (not in schema)`);
      } else if (isPlainObject(schema.additionalProperties)) {
        validateNode(schema.additionalProperties, child, propPointer, errors);
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) validateNode(sub, value, pointer, errors);
  }
  if (Array.isArray(schema.anyOf)) {
    const matched = schema.anyOf.some(
      (sub) => validateNode(sub, value, pointer, []).length === 0,
    );
    if (!matched) errors.push(`${pointer}: matches none of the allowed shapes`);
  }
  if (Array.isArray(schema.oneOf)) {
    const matched = schema.oneOf.filter(
      (sub) => validateNode(sub, value, pointer, []).length === 0,
    ).length;
    if (matched !== 1)
      errors.push(
        `${pointer}: must match exactly one allowed shape, matched ${matched}`,
      );
  }
  return errors;
}

function validate(schema, value) {
  return validateNode(schema, value, "", []);
}

function loadSchema(name, report, checkId) {
  const file = path.join(SCHEMA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    report.finding(
      checkId,
      `agents/schemas/${name}`,
      `cannot load schema: ${error.message}`,
    );
    return null;
  }
}

// ---------------------------------------------------------------- data loading

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/;

function rel(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join("/");
}

function readFrontMatterFile(absolutePath) {
  const raw = fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "");
  const match = FRONT_MATTER.exec(raw);
  if (!match)
    return {
      frontMatter: undefined,
      body: raw,
      error: "missing YAML front matter (file must start with ---)",
    };
  try {
    const parsed = parseYaml(match[1]);
    return { frontMatter: parsed, body: match[2] ?? "" };
  } catch (error) {
    return {
      frontMatter: undefined,
      body: match[2] ?? "",
      error: `invalid YAML front matter: ${error.message}`,
    };
  }
}

/** Committed entries; absence is a finding because the public journal must exist in the repo. */
const PUBLIC_ENTRY_DIR = "journal/entries";
/** Gitignored entries; absence is normal (CI checkouts, fresh clones) and only produces a NOTE. */
const PRIVATE_ENTRY_DIR = "journal/private";
const PRIVATE_PROJECTS_FILE = "agents/private-projects.yml";

function collectEntryFiles(dir, base, out) {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of items) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) collectEntryFiles(absolute, base, out);
    else if (item.isFile() && item.name.endsWith(".md"))
      out.push({ absolute, base });
  }
}

function loadEntries(root, report) {
  const entries = [];
  const sources = [
    { rel: PUBLIC_ENTRY_DIR, committed: true },
    { rel: PRIVATE_ENTRY_DIR, committed: false },
  ];
  for (const source of sources) {
    const dir = path.join(root, source.rel);
    if (!fs.existsSync(dir)) {
      if (source.committed) {
        report.finding("a", source.rel, `directory not found at ${dir}`);
      } else {
        report.note(
          `${source.rel}/ absent (local-only directory) — private journal entries skipped`,
        );
      }
      continue;
    }
    const found = [];
    collectEntryFiles(dir, dir, found);
    found.sort((a, b) => a.absolute.localeCompare(b.absolute));
    for (const { absolute, base } of found) {
      const name = path.basename(absolute);
      const relPath = rel(root, absolute);
      const parsed = readFrontMatterFile(absolute);
      if (parsed.error) {
        report.finding("a", relPath, parsed.error);
        continue;
      }
      entries.push({
        file: name,
        stem: name.replace(/\.md$/, ""),
        relPath,
        inCommittedDir:
          path.relative(base, absolute).split(path.sep).length === 1,
        dir: source.rel,
        committedDir: source.committed,
        frontMatter: parsed.frontMatter,
        body: parsed.body,
        frontMatterText:
          parsed.frontMatter === undefined
            ? ""
            : JSON.stringify(parsed.frontMatter),
      });
    }
  }
  return entries;
}

function loadYamlFile(root, relPath, report, checkId) {
  const absolute = path.join(root, relPath);
  if (!fs.existsSync(absolute)) {
    report.finding(
      checkId,
      relPath,
      `missing required content file: ${absolute}`,
    );
    return { missing: true };
  }
  let raw;
  try {
    raw = fs.readFileSync(absolute, "utf8");
  } catch (error) {
    report.finding(checkId, relPath, `cannot read file: ${error.message}`);
    return { missing: true };
  }
  try {
    const data = parseYaml(raw);
    if (data === null || data === undefined) {
      report.finding(
        checkId,
        relPath,
        "file parses to an empty document (expected a YAML list)",
      );
      return { missing: true };
    }
    return { data, raw };
  } catch (error) {
    report.finding(
      checkId,
      relPath,
      `YAML parse error: ${error.message.split("\n")[0]}`,
    );
    return { missing: true };
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isDate(value, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- checks

function checkEntries(entries, schemas, report) {
  const schema = schemas.entry;
  const seenIds = new Map();
  for (const entry of entries) {
    const fm = entry.frontMatter;
    if (!isPlainObject(fm)) {
      report.finding("a", entry.relPath, "front matter is not a YAML mapping");
      continue;
    }
    if (schema) {
      for (const message of validate(schema, fm)) {
        report.finding(
          "a",
          entry.relPath,
          `front matter${message.replace(/^\//, " → ")}`,
        );
      }
    }
    if (isNonEmptyString(fm.id)) {
      const previous = seenIds.get(fm.id);
      if (previous) {
        report.finding(
          "b",
          entry.relPath,
          `duplicate id "${fm.id}" (also in ${previous})`,
        );
      } else {
        seenIds.set(fm.id, entry.relPath);
      }
      if (fm.id !== entry.stem) {
        report.finding(
          "b",
          entry.relPath,
          `id "${fm.id}" does not match file name stem "${entry.stem}"`,
        );
      }
    }
    const links = Array.isArray(fm.links) ? fm.links : [];
    if (fm.kind === "shipped" && links.length === 0) {
      report.finding(
        "d",
        entry.relPath,
        "kind: shipped requires at least one link",
      );
    }
  }
}

/**
 * Local-only private project registry. Absence is normal (CI checkout, fresh clone) and yields only
 * a NOTE; a present-but-unparseable file is a finding, because it silently drops real join targets.
 */
function loadPrivateProjects(root, report) {
  const absolute = path.join(root, PRIVATE_PROJECTS_FILE);
  if (!fs.existsSync(absolute)) {
    report.note(
      `${PRIVATE_PROJECTS_FILE} absent (local-only file) — private project joins skipped`,
    );
    return { records: [], present: false };
  }
  let data;
  try {
    data = parseYaml(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    report.finding(
      "c",
      PRIVATE_PROJECTS_FILE,
      `YAML parse error: ${error.message.split("\n")[0]}`,
    );
    return { records: [], present: true };
  }
  if (!Array.isArray(data)) {
    report.finding(
      "c",
      PRIVATE_PROJECTS_FILE,
      `expected a YAML list of project records, got ${typeName(data)}`,
    );
    return { records: [], present: true };
  }
  const records = [];
  data.forEach((record, index) => {
    if (!isPlainObject(record)) {
      report.finding(
        "c",
        `${PRIVATE_PROJECTS_FILE}[${index}]`,
        `expected a mapping, got ${typeName(record)}`,
      );
      return;
    }
    if (!isNonEmptyString(record.id)) {
      report.finding(
        "c",
        `${PRIVATE_PROJECTS_FILE}[${index}].id`,
        "private project is missing a string id",
      );
      return;
    }
    if (record.visibility !== undefined && record.visibility !== "private") {
      report.finding(
        "c",
        `${PRIVATE_PROJECTS_FILE}#${record.id}.visibility`,
        `must be "private" in the local-only registry, got ${show(record.visibility)}`,
      );
      return;
    }
    if (record.visibility === undefined) {
      report.note(
        `${PRIVATE_PROJECTS_FILE}#${record.id} declares no visibility — treated as private`,
      );
    }
    records.push(record);
  });
  return { records, present: true };
}

function checkProjects(entries, projects, privateProjects, report) {
  const publicIds = new Set();
  const privateIds = new Set();
  if (Array.isArray(projects)) {
    projects.forEach((project, index) => {
      if (!isPlainObject(project)) return;
      if (!isNonEmptyString(project.id)) {
        report.finding(
          "e",
          `content/projects.yml[${index}].id`,
          "project is missing a string id",
        );
        return;
      }
      if (project.visibility === "private") privateIds.add(project.id);
      else publicIds.add(project.id);
    });
  }
  const contentIds = new Set([...publicIds, ...privateIds]);
  for (const record of privateProjects.records) {
    if (contentIds.has(record.id)) {
      report.note(
        `project id "${record.id}" is declared in both content/projects.yml and ${PRIVATE_PROJECTS_FILE}`,
      );
    }
    privateIds.add(record.id);
  }

  const ids = new Set([...publicIds, ...privateIds]);
  const known = [...ids].sort().join(", ") || "none";
  const absentClause = privateProjects.present
    ? ""
    : ` — note: ${PRIVATE_PROJECTS_FILE} is absent, so private project ids could not be resolved`;

  for (const entry of entries) {
    const fm = entry.frontMatter;
    if (!isPlainObject(fm)) continue;

    // Private evidence must never be committed to this public repository.
    if (fm.visibility === "private" && entry.committedDir) {
      report.finding(
        "g",
        entry.relPath,
        `entry is visibility: private but lives in the committed ${PUBLIC_ENTRY_DIR}/ directory — move it to ${PRIVATE_ENTRY_DIR}/, which is gitignored`,
        "private_leak",
      );
    }

    if (!isNonEmptyString(fm.project)) continue;
    if (!ids.has(fm.project)) {
      report.finding(
        "c",
        entry.relPath,
        `project "${fm.project}" not found in content/projects.yml (known ids: ${known})${absentClause}`,
      );
      continue;
    }
    // A committed (public) entry joined to a local-only private project would push the private
    // project's existence into generated public content. A private entry in the committed directory
    // is already reported as misplaced above, so it is not double-reported here.
    if (
      entry.committedDir &&
      fm.visibility !== "private" &&
      !publicIds.has(fm.project) &&
      privateIds.has(fm.project)
    ) {
      report.warn(
        entry.relPath,
        `public entry references "${fm.project}", an id that exists only in ${PRIVATE_PROJECTS_FILE} (private joins are local-only)`,
        "private_leak",
      );
    }
  }
}

function checkContentShape(content, report) {
  const { projects, now, posts } = content;

  if (projects) {
    if (!Array.isArray(projects)) {
      report.finding(
        "e",
        "content/projects.yml",
        `expected a YAML list, got ${typeName(projects)}`,
      );
    } else {
      const seen = new Map();
      projects.forEach((project, index) => {
        const at = `content/projects.yml[${index}]`;
        if (!isPlainObject(project)) {
          report.finding(
            "e",
            at,
            `expected a mapping, got ${typeName(project)}`,
          );
          return;
        }
        const label = isNonEmptyString(project.id)
          ? `content/projects.yml#${project.id}`
          : at;
        for (const key of [
          "id",
          "title",
          "tag",
          "description",
          "status",
          "visibility",
          "featured",
          "highlights",
          "links",
        ]) {
          if (!Object.prototype.hasOwnProperty.call(project, key))
            report.finding("e", label, `missing required key "${key}"`);
        }
        if (isNonEmptyString(project.id)) {
          if (!KEBAB.test(project.id))
            report.finding(
              "e",
              `${label}.id`,
              `"${project.id}" is not kebab-case`,
            );
          const previous = seen.get(project.id);
          if (previous)
            report.finding(
              "e",
              `${label}.id`,
              `duplicate project id "${project.id}" (also in projects[${previous}])`,
            );
          else seen.set(project.id, index);
        }
        for (const key of ["title", "tag", "description"]) {
          if (
            Object.prototype.hasOwnProperty.call(project, key) &&
            !isNonEmptyString(project[key])
          ) {
            report.finding(
              "e",
              `${label}.${key}`,
              `must be a non-empty string, got ${show(project[key])}`,
            );
          }
        }
        if (
          project.status !== undefined &&
          !["shipped", "active", "paused"].includes(project.status)
        ) {
          report.finding(
            "e",
            `${label}.status`,
            `must be one of shipped | active | paused — got ${show(project.status)}`,
          );
        }
        if (
          project.visibility !== undefined &&
          !["public", "private"].includes(project.visibility)
        ) {
          report.finding(
            "e",
            `${label}.visibility`,
            `must be one of public | private — got ${show(project.visibility)}`,
          );
        }
        if (
          project.featured !== undefined &&
          typeof project.featured !== "boolean"
        ) {
          report.finding(
            "e",
            `${label}.featured`,
            `must be a boolean, got ${typeName(project.featured)}`,
          );
        }
        if (
          project.repo !== undefined &&
          project.repo !== null &&
          !isNonEmptyString(project.repo)
        ) {
          report.finding(
            "e",
            `${label}.repo`,
            `must be "owner/name" or null, got ${show(project.repo)}`,
          );
        }
        if (
          project.started !== undefined &&
          project.started !== null &&
          !isDate(project.started, MONTH)
        ) {
          report.finding(
            "e",
            `${label}.started`,
            `must be YYYY-MM or null, got ${show(project.started)}`,
          );
        }
        if (
          project.last_activity !== undefined &&
          project.last_activity !== null &&
          !isDate(project.last_activity, DATE)
        ) {
          report.finding(
            "e",
            `${label}.last_activity`,
            `must be YYYY-MM-DD or null, got ${show(project.last_activity)}`,
          );
        }
        if (project.highlights !== undefined) {
          if (!Array.isArray(project.highlights)) {
            report.finding(
              "e",
              `${label}.highlights`,
              `must be a list, got ${typeName(project.highlights)}`,
            );
          } else {
            project.highlights.forEach((highlight, hi) => {
              const hat = `${label}.highlights[${hi}]`;
              if (!isPlainObject(highlight)) {
                report.finding(
                  "e",
                  hat,
                  `expected a mapping, got ${typeName(highlight)}`,
                );
                return;
              }
              if (!isDate(highlight.date, DATE))
                report.finding(
                  "e",
                  `${hat}.date`,
                  `must be YYYY-MM-DD, got ${show(highlight.date)}`,
                );
              if (!isNonEmptyString(highlight.text))
                report.finding(
                  "e",
                  `${hat}.text`,
                  `must be a non-empty string, got ${show(highlight.text)}`,
                );
              if (!Array.isArray(highlight.source_ids)) {
                report.finding(
                  "e",
                  `${hat}.source_ids`,
                  `must be a list of entry ids, got ${typeName(highlight.source_ids)}`,
                );
              }
            });
          }
        }
        if (project.links !== undefined) {
          if (!Array.isArray(project.links)) {
            report.finding(
              "e",
              `${label}.links`,
              `must be a list, got ${typeName(project.links)}`,
            );
          } else {
            project.links.forEach((link, li) => {
              checkLink(link, `${label}.links[${li}]`, report);
            });
          }
        }
      });
    }
  }

  if (now) {
    if (!Array.isArray(now)) {
      report.finding(
        "e",
        "content/now.yml",
        `expected a YAML list, got ${typeName(now)}`,
      );
    } else {
      const seen = new Map();
      now.forEach((item, index) => {
        const at = `content/now.yml[${index}]`;
        if (!isPlainObject(item)) {
          report.finding("e", at, `expected a mapping, got ${typeName(item)}`);
          return;
        }
        const label = isNonEmptyString(item.id)
          ? `content/now.yml#${item.id}`
          : at;
        for (const key of ["id", "title", "description", "source_ids"]) {
          if (!Object.prototype.hasOwnProperty.call(item, key))
            report.finding("e", label, `missing required key "${key}"`);
        }
        if (isNonEmptyString(item.id)) {
          if (!KEBAB.test(item.id))
            report.finding(
              "e",
              `${label}.id`,
              `"${item.id}" is not kebab-case`,
            );
          const previous = seen.get(item.id);
          if (previous)
            report.finding(
              "e",
              `${label}.id`,
              `duplicate now id "${item.id}" (also in now[${previous}])`,
            );
          else seen.set(item.id, index);
        }
        for (const key of ["title", "description"]) {
          if (
            Object.prototype.hasOwnProperty.call(item, key) &&
            !isNonEmptyString(item[key])
          ) {
            report.finding(
              "e",
              `${label}.${key}`,
              `must be a non-empty string, got ${show(item[key])}`,
            );
          }
        }
        if (!Array.isArray(item.source_ids)) {
          report.finding(
            "e",
            `${label}.source_ids`,
            `must be a list of entry ids, got ${typeName(item.source_ids)}`,
          );
        }
        if (
          item.updated !== undefined &&
          item.updated !== null &&
          !isDate(item.updated, DATE)
        ) {
          report.finding(
            "e",
            `${label}.updated`,
            `must be YYYY-MM-DD or null, got ${show(item.updated)}`,
          );
        }
      });
    }
  }

  if (posts) {
    if (!Array.isArray(posts)) {
      report.finding(
        "e",
        "content/posts.yml",
        `expected a YAML list, got ${typeName(posts)}`,
      );
    } else {
      const seen = new Map();
      posts.forEach((post, index) => {
        const at = `content/posts.yml[${index}]`;
        if (!isPlainObject(post)) {
          report.finding("e", at, `expected a mapping, got ${typeName(post)}`);
          return;
        }
        const label = isNonEmptyString(post.slug)
          ? `content/posts.yml#${post.slug}`
          : at;
        for (const key of [
          "slug",
          "title",
          "summary",
          "tags",
          "file",
          "date",
          "project",
          "source_ids",
          "generated",
        ]) {
          if (!Object.prototype.hasOwnProperty.call(post, key))
            report.finding("e", label, `missing required key "${key}"`);
        }
        if (isNonEmptyString(post.slug)) {
          if (!KEBAB.test(post.slug))
            report.finding(
              "e",
              `${label}.slug`,
              `"${post.slug}" is not kebab-case`,
            );
          const previous = seen.get(post.slug);
          if (previous)
            report.finding(
              "e",
              `${label}.slug`,
              `duplicate post slug "${post.slug}" (also in posts[${previous}])`,
            );
          else seen.set(post.slug, index);
        }
        for (const key of ["title", "summary"]) {
          if (
            Object.prototype.hasOwnProperty.call(post, key) &&
            !isNonEmptyString(post[key])
          ) {
            report.finding(
              "e",
              `${label}.${key}`,
              `must be a non-empty string, got ${show(post[key])}`,
            );
          }
        }
        if (!Array.isArray(post.tags)) {
          report.finding(
            "e",
            `${label}.tags`,
            `must be a list of strings, got ${typeName(post.tags)}`,
          );
        }
        if (
          Object.prototype.hasOwnProperty.call(post, "generated") &&
          typeof post.generated !== "boolean"
        ) {
          report.finding(
            "e",
            `${label}.generated`,
            `must be a boolean, got ${typeName(post.generated)}`,
          );
        }
        if (
          Object.prototype.hasOwnProperty.call(post, "project") &&
          post.project !== null &&
          !isNonEmptyString(post.project)
        ) {
          report.finding(
            "e",
            `${label}.project`,
            `must be a project id or null, got ${show(post.project)}`,
          );
        }
        if (!isDate(post.date, DATE))
          report.finding(
            "e",
            `${label}.date`,
            `must be YYYY-MM-DD, got ${show(post.date)}`,
          );
        if (!Array.isArray(post.source_ids)) {
          report.finding(
            "e",
            `${label}.source_ids`,
            `must be a list of entry ids, got ${typeName(post.source_ids)}`,
          );
        }
        if (post.file !== undefined) {
          if (
            !isNonEmptyString(post.file) ||
            post.file.includes("/") ||
            post.file.includes("\\")
          ) {
            report.finding(
              "e",
              `${label}.file`,
              `must be a bare file name, got ${show(post.file)}`,
            );
          } else if (!/\.(jsx|mdx)$/.test(post.file)) {
            report.finding(
              "e",
              `${label}.file`,
              `must end in .jsx or .mdx, got ${show(post.file)}`,
            );
          }
        }
      });
    }
  }
}

function checkLink(link, label, report) {
  if (!isPlainObject(link)) {
    report.finding("e", label, `expected a mapping, got ${typeName(link)}`);
    return;
  }
  if (!isNonEmptyString(link.label)) {
    report.finding(
      "e",
      `${label}.label`,
      `must be a non-empty string, got ${show(link.label)}`,
    );
  }
  const hasTo = Object.prototype.hasOwnProperty.call(link, "to");
  const hasHref = Object.prototype.hasOwnProperty.call(link, "href");
  if (hasTo === hasHref) {
    report.finding(
      "e",
      label,
      `must have exactly one of "to" (internal route) or "href" (external URL) — has ${hasTo ? "both" : "neither"}`,
    );
    return;
  }
  if (hasTo && !isNonEmptyString(link.to)) {
    report.finding(
      "e",
      `${label}.to`,
      `must be a non-empty route string, got ${show(link.to)}`,
    );
  }
  if (hasHref) {
    if (!isNonEmptyString(link.href) || !/^https?:\/\/\S+$/.test(link.href)) {
      report.finding(
        "e",
        `${label}.href`,
        `must be an http(s) URL, got ${show(link.href)}`,
      );
    }
  }
}

function checkPostFiles(root, posts, report) {
  if (!Array.isArray(posts)) return;
  const dir = path.join(root, "src", "pages", "blog");
  const registered = new Set();
  posts.forEach((post) => {
    if (!isPlainObject(post) || !isNonEmptyString(post.file)) return;
    registered.add(post.file);
    const label = isNonEmptyString(post.slug)
      ? `content/posts.yml#${post.slug}`
      : "content/posts.yml";
    const absolute = path.join(dir, post.file);
    if (!fs.existsSync(absolute)) {
      report.finding(
        "e",
        `${label}.file`,
        `post file not found: src/pages/blog/${post.file} (${absolute})`,
      );
    }
  });

  // The reverse direction matters too: `apply` writes the .mdx body and then the
  // registry record, so an interrupted run leaves an orphan that the .mdx glob
  // still bundles but no route reaches. Files prefixed `_` are treated as
  // partials, not posts.
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(mdx|jsx)$/.test(name) || name.startsWith("_")) continue;
    if (registered.has(name)) continue;
    report.finding(
      "e",
      `src/pages/blog/${name}`,
      "post file is not referenced by any content/posts.yml record (orphan from an interrupted apply, or a post that was never registered)",
    );
  }
}

// ---------------------------------------------------------------- provenance

function entryEvidence(entry) {
  const fm = entry.frontMatter ?? {};
  const parts = [
    fm.summary ?? "",
    ...(Array.isArray(fm.sources) ? fm.sources : []),
    entry.body ?? "",
  ];
  return parts.filter((part) => typeof part === "string").join("\n");
}

const NUMBER = /\d+(?:[.,]\d+)*/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNumber(evidence, token) {
  try {
    return new RegExp(`(?<!\\d)${escapeRegExp(token)}(?!\\d)`).test(evidence);
  } catch {
    return evidence.includes(token);
  }
}

function checkProvenance(root, content, entryById, report) {
  const { projects, now, posts } = content;

  const resolve = (id, label, ids) => {
    if (typeof id !== "string" || !entryById.has(id)) {
      report.finding(
        "f",
        label,
        `${show(id)} does not resolve to an existing journal entry id`,
        "unresolvable_citation",
      );
      return false;
    }
    return true;
  };

  const requireCitations = (ids, label) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      report.finding(
        "f",
        label,
        "generated content requires at least one source_ids entry",
        "unresolvable_citation",
      );
      return false;
    }
    return true;
  };

  const checkNumbers = (text, ids, label) => {
    if (typeof text !== "string" || text.length === 0 || !Array.isArray(ids))
      return;
    const evidence = ids
      .filter((id) => entryById.has(id))
      .map((id) => entryEvidence(entryById.get(id)))
      .join("\n");
    const tokens = [...new Set(text.match(NUMBER) ?? [])];
    for (const token of tokens) {
      if (!containsNumber(evidence, token)) {
        report.finding(
          "f",
          label,
          `number "${token}" does not appear in the cited evidence (cited: ${ids.join(", ") || "none"})`,
          "unsourced_number",
        );
      }
    }
  };

  if (Array.isArray(projects)) {
    projects.forEach((project) => {
      if (!isPlainObject(project) || !Array.isArray(project.highlights)) return;
      const projectId = isNonEmptyString(project.id) ? project.id : "?";
      project.highlights.forEach((highlight, index) => {
        if (!isPlainObject(highlight)) return;
        const label = `content/projects.yml#${projectId}.highlights[${index}]`;
        const ids = Array.isArray(highlight.source_ids)
          ? highlight.source_ids
          : [];
        ids.forEach((id, i) => resolve(id, `${label}.source_ids[${i}]`));
        if (!requireCitations(ids, `${label}.source_ids`)) return;
        checkNumbers(highlight.text, ids, `${label}.text`);
      });
    });
  }

  if (Array.isArray(now)) {
    now.forEach((item, index) => {
      if (!isPlainObject(item)) return;
      const label = `content/now.yml#${isNonEmptyString(item.id) ? item.id : index}`;
      const ids = Array.isArray(item.source_ids) ? item.source_ids : [];
      ids.forEach((id, i) => resolve(id, `${label}.source_ids[${i}]`));
      // now items are not tagged as generated: hand-written seeds carry `source_ids: []` and have
      // no evidence to check numbers against, so numbers are only enforced once an item cites.
      if (ids.length === 0) return;
      checkNumbers(item.description, ids, `${label}.description`);
    });
  }

  if (Array.isArray(posts)) {
    posts.forEach((post) => {
      if (!isPlainObject(post)) return;
      const label = `content/posts.yml#${isNonEmptyString(post.slug) ? post.slug : "?"}`;
      const ids = Array.isArray(post.source_ids) ? post.source_ids : [];
      ids.forEach((id, i) => resolve(id, `${label}.source_ids[${i}]`));
      if (post.generated !== true) return;
      if (!requireCitations(ids, `${label}.source_ids`)) return;
      checkNumbers(post.summary, ids, `${label}.summary`);
      if (isNonEmptyString(post.file)) {
        const file = path.join(root, "src", "pages", "blog", post.file);
        if (fs.existsSync(file)) {
          let body = "";
          try {
            body = fs.readFileSync(file, "utf8");
          } catch {
            return;
          }
          checkNumbers(body, ids, `src/pages/blog/${post.file}`);
        }
      }
    });
  }
}

// ---------------------------------------------------------------- privacy

const URL_PATTERN = /https?:\/\/[^\s"'`)>\]]+/g;

function tidyUrl(url) {
  return url.replace(/[.,;:!?]+$/, "");
}

/** Tokens that must never appear in public content: full URLs, host+path, and owner/name handles. */
function privacyTokens(text) {
  const tokens = new Set();
  const withoutUrls = String(text ?? "").replace(URL_PATTERN, (match) => {
    const url = tidyUrl(match);
    tokens.add(url);
    const withoutScheme = url.replace(/^https?:\/\//, "");
    tokens.add(withoutScheme);
    const segments = withoutScheme.split("/");
    if (segments.length >= 3) tokens.add(`${segments[1]}/${segments[2]}`);
    return " ";
  });
  const handles =
    withoutUrls.match(
      /[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?\/[A-Za-z0-9_.-]+/g,
    ) ?? [];
  for (const handle of handles) if (handle.length >= 3) tokens.add(handle);
  const mentions =
    withoutUrls.match(/@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?/g) ?? [];
  for (const mention of mentions) tokens.add(mention);
  return [...tokens].filter((token) => token.length >= 3);
}

function containsToken(haystack, token) {
  try {
    return new RegExp(`(?<![\\w-])${escapeRegExp(token)}(?![\\w-])`).test(
      haystack,
    );
  } catch {
    return haystack.includes(token);
  }
}

function* walkStrings(value, label) {
  if (typeof value === "string") {
    yield { label, value };
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1)
      yield* walkStrings(value[i], `${label}[${i}]`);
  } else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value))
      yield* walkStrings(child, `${label}.${key}`);
  }
}

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".md",
  ".mdx",
  ".json",
  ".html",
  ".css",
  ".txt",
  ".yml",
  ".yaml",
]);

function* walkFiles(dir, skip) {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of items) {
    if (skip.has(item.name)) continue;
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) yield* walkFiles(absolute, skip);
    else if (item.isFile()) yield absolute;
  }
}

function checkPrivacy(root, content, entries, registries, report) {
  const privateEntries = entries.filter(
    (entry) =>
      isPlainObject(entry.frontMatter) &&
      entry.frontMatter.visibility === "private",
  );
  const privateRecords = Array.isArray(registries?.privateProjects?.records)
    ? registries.privateProjects.records
    : [];
  if (privateEntries.length === 0 && privateRecords.length === 0) return;

  const registriesAll = [
    ...(Array.isArray(registries?.projects) ? registries.projects : []),
    ...privateRecords,
  ];
  const tokenSources = new Map(); // token -> human-readable source
  const addTokens = (text, source) => {
    for (const token of privacyTokens(text)) {
      if (!tokenSources.has(token)) tokenSources.set(token, source);
    }
  };
  const repoOf = (id) => {
    const record = registriesAll.find(
      (candidate) => isPlainObject(candidate) && candidate.id === id,
    );
    return record && isNonEmptyString(record.repo) ? record.repo : null;
  };

  // 1) local-only private project registry: repo handles + link targets/URLs.
  for (const record of privateRecords) {
    const source = `${PRIVATE_PROJECTS_FILE}#${record.id}`;
    if (isNonEmptyString(record.repo)) addTokens(record.repo, source);
    for (const link of Array.isArray(record.links) ? record.links : []) {
      addTokens(
        typeof link === "string" ? link : JSON.stringify(link ?? ""),
        source,
      );
    }
  }

  // 2) every visibility: private entry, in either entry directory.
  for (const entry of privateEntries) {
    const fm = entry.frontMatter;
    const source = `private entry ${fm.id}`;
    const fragments = [
      ...(Array.isArray(fm.links) ? fm.links : []),
      ...(Array.isArray(fm.sources) ? fm.sources : []),
    ];
    for (const fragment of fragments) {
      addTokens(
        typeof fragment === "string"
          ? fragment
          : JSON.stringify(fragment ?? ""),
        source,
      );
    }
    const repo = isNonEmptyString(fm.project) ? repoOf(fm.project) : null;
    if (repo) addTokens(repo, source);
  }
  if (tokenSources.size === 0) return;

  const scan = (label, text, severity) => {
    const bySource = new Map();
    for (const [token, source] of tokenSources) {
      if (!containsToken(text, token)) continue;
      if (!bySource.has(source)) bySource.set(source, []);
      bySource.get(source).push(token);
    }
    for (const [source, tokens] of bySource) {
      const list = tokens.map((token) => `"${token}"`).join(", ");
      const message =
        tokens.length === 1
          ? `private leak: ${list} (${source}) appears in public content`
          : `private leak: ${tokens.length} tokens ${list} (${source}) appear in public content`;
      if (severity === "warn") report.warn(label, message, "private_leak");
      else report.finding("g", label, message, "private_leak");
    }
  };

  // 1) content/*.yml. A `visibility: private` record is the join target, not a leak, so its own
  // repo/links/description are exempt; every other record is pipeline-facing => hard. The one
  // carve-out is a hand-written `.jsx` post (not generated, not .mdx): authored prose => advisory.
  for (const [relPath, data] of content.files) {
    if (!Array.isArray(data)) continue;
    const isProjects = relPath === "content/projects.yml";
    const isPosts = relPath === "content/posts.yml";
    data.forEach((record, index) => {
      if (!isPlainObject(record)) return;
      if (isProjects && record.visibility === "private") return;
      const key = isNonEmptyString(record.id)
        ? record.id
        : isNonEmptyString(record.slug)
          ? record.slug
          : index;
      const authored =
        isPosts &&
        record.generated !== true &&
        !(isNonEmptyString(record.file) && record.file.endsWith(".mdx"));
      for (const { label, value } of walkStrings(record, `${relPath}#${key}`)) {
        scan(label, value, authored ? "warn" : "fail");
      }
    });
  }

  // 2) src/**. Pipeline-written post bodies (`.mdx`, or any body of a `generated: true` post) are
  // hard; hand-written .jsx/.js site sources are authored content, so those are advisory.
  const postsRegistry = (content.files.find(
    ([relPath]) => relPath === "content/posts.yml",
  ) ?? [])[1];
  const generatedBodyPaths = new Set();
  if (Array.isArray(postsRegistry)) {
    for (const post of postsRegistry) {
      if (!isPlainObject(post) || !isNonEmptyString(post.file)) continue;
      const generatedClass =
        post.generated === true || post.file.endsWith(".mdx");
      if (generatedClass) {
        generatedBodyPaths.add(
          path.join(root, "src", "pages", "blog", post.file),
        );
      }
    }
  }

  const skip = new Set(["node_modules", "dist", "build", ".git", "coverage"]);
  for (const absolute of walkFiles(path.join(root, "src"), skip)) {
    const extension = path.extname(absolute).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    let text;
    try {
      text = fs.readFileSync(absolute, "utf8");
    } catch {
      continue;
    }
    const severity =
      generatedBodyPaths.has(absolute) || extension === ".mdx"
        ? "fail"
        : "warn";
    const relPath = rel(root, absolute);
    text
      .split(/\r?\n/)
      .forEach((line, index) =>
        scan(`${relPath}:${index + 1}`, line, severity),
      );
  }

  // 3) journal entries: public entries are pipeline input (hard); the private entries' own files
  // are the token source, so they are never scanned.
  for (const entry of entries) {
    if (privateEntries.includes(entry)) continue;
    const text = [entry.frontMatterText, entry.body].join("\n");
    text
      .split(/\r?\n/)
      .forEach((line, index) =>
        scan(`${entry.relPath}:${index + 1}`, line, "fail"),
      );
  }
}

// ---------------------------------------------------------------- internal links

function checkInternalLinks(root, content, posts, report) {
  const targets = [];
  for (const [relPath, data] of content.files) {
    // Collect `to:` route values by walking the parsed structure with their paths.
    const collect = (value, label) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => collect(item, `${label}[${index}]`));
      } else if (isPlainObject(value)) {
        for (const [key, child] of Object.entries(value)) {
          if (key === "to" && typeof child === "string")
            targets.push({ label: `${label}.to`, to: child });
          else collect(child, `${label}.${key}`);
        }
      }
    };
    collect(data, relPath);
  }
  if (targets.length === 0) return;

  const appPath = path.join(root, "src", "App.jsx");
  let routeMatchers = [];
  if (!fs.existsSync(appPath)) {
    report.finding(
      "h",
      "src/App.jsx",
      `not found at ${appPath}; cannot resolve internal routes`,
    );
  } else {
    const source = fs.readFileSync(appPath, "utf8");
    const routes = [...source.matchAll(/\bpath\s*=\s*(["'])([^"']*)\1/g)].map(
      (match) => match[2],
    );
    routeMatchers = routes
      .filter((route) => route && route !== "*")
      .map(
        (route) =>
          new RegExp(
            `^${escapeRegExp(route).replace(/\\:[A-Za-z0-9_]+/g, "[^/]+")}/?$`,
          ),
      );
  }

  const slugs = new Set(
    (Array.isArray(posts) ? posts : [])
      .filter((post) => isPlainObject(post) && isNonEmptyString(post.slug))
      .map((post) => post.slug),
  );

  const matchesSlug = (route) => {
    const trimmed = route.replace(/^\//, "").replace(/\/$/, "");
    return (
      slugs.has(trimmed) ||
      [...slugs].some(
        (slug) => trimmed === `blog/${slug}` || trimmed === `posts/${slug}`,
      )
    );
  };

  for (const { label, to } of targets) {
    const at = `${label}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(to)) {
      report.finding(
        "h",
        at,
        `"${to}" is an absolute URL; external links belong in "href", not "to"`,
      );
      continue;
    }
    if (to.startsWith("#")) continue;
    const route = to.split("#")[0].split("?")[0] || "/";
    if (routeMatches(route)) continue;
    if (matchesSlug(route)) continue;
    const known = [...slugs].map((slug) => `/blog/${slug}`);
    report.finding(
      "h",
      at,
      `"${to}" matches no route in src/App.jsx and no post slug (post routes: ${known.join(", ") || "none"})`,
    );
  }

  function routeMatches(route) {
    const normalized = route.length > 1 ? route.replace(/\/$/, "") : route;
    return routeMatchers.some((matcher) => matcher.test(normalized));
  }
}

// ---------------------------------------------------------------- main

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = new Report();

  const schemas = {
    entry: loadSchema("entry.schema.json", report, "a"),
    plan: loadSchema("plan.schema.json", report, "f"),
    proposal: loadSchema("proposal.schema.json", report, "f"),
    review: loadSchema("review.schema.json", report, "f"),
  };

  const entries = loadEntries(opts.root, report);
  const entryById = new Map();
  for (const entry of entries) {
    if (
      isPlainObject(entry.frontMatter) &&
      isNonEmptyString(entry.frontMatter.id)
    )
      entryById.set(entry.frontMatter.id, entry);
  }

  checkEntries(entries, schemas, report);

  const projectsFile = loadYamlFile(
    opts.root,
    "content/projects.yml",
    report,
    "e",
  );
  const nowFile = loadYamlFile(opts.root, "content/now.yml", report, "e");
  const postsFile = loadYamlFile(opts.root, "content/posts.yml", report, "e");

  const projects = projectsFile.missing ? undefined : projectsFile.data;
  const now = nowFile.missing ? undefined : nowFile.data;
  const posts = postsFile.missing ? undefined : postsFile.data;

  const privateProjects = loadPrivateProjects(opts.root, report);

  checkProjects(entries, projects, privateProjects, report);
  checkContentShape({ projects, now, posts }, report);
  checkPostFiles(opts.root, posts, report);
  checkProvenance(opts.root, { projects, now, posts }, entryById, report);
  checkPrivacy(
    opts.root,
    {
      files: [
        ["content/projects.yml", projects],
        ["content/now.yml", now],
        ["content/posts.yml", posts],
      ].filter(([, data]) => data !== undefined),
    },
    entries,
    { projects, privateProjects },
    report,
  );
  checkInternalLinks(
    opts.root,
    {
      files: [
        ["content/projects.yml", projects],
        ["content/now.yml", now],
        ["content/posts.yml", posts],
      ].filter(([, data]) => data !== undefined),
    },
    posts,
    report,
  );

  // --strict-private turns the advisory hand-written leaks into failures.
  if (opts.strictPrivate && report.warnings.length > 0) {
    for (const warning of report.warnings) {
      report.finding(
        "g",
        warning.path,
        `[--strict-private] ${warning.message}`,
        warning.rule,
      );
    }
    report.warnings = [];
  }

  const ok = report.ok;
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          root: opts.root,
          ok,
          strictPrivate: opts.strictPrivate,
          checks: report.checks,
          warnings: report.warnings,
          notes: report.notes,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`verify-content: root ${opts.root}`);
    for (const check of report.checks) {
      console.log(
        `${check.findings.length ? "FAIL" : "PASS"}  ${check.id}. ${check.name}`,
      );
      for (const finding of check.findings) {
        console.log(`      ${finding.path}: ${finding.message}`);
      }
    }
    for (const note of report.notes) {
      console.log(`NOTE  ${note}`);
    }
    if (report.warnings.length > 0) {
      console.log(
        `WARN  g. privacy: ${report.warnings.length} advisory leak(s) in hand-written content (exit stays 0; add --strict-private to fail)`,
      );
      for (const warning of report.warnings) {
        console.log(`      ${warning.path}: ${warning.message}`);
      }
    }
    const failed = report.checks.filter(
      (check) => check.findings.length > 0,
    ).length;
    console.log(
      `${ok ? "OK" : "FAILED"}: ${failed} failing check(s), ${report.findingCount} finding(s), ${report.warnings.length} warning(s)`,
    );
  }
  process.exit(ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(
    `verify-content: unexpected error: ${error && error.stack ? error.stack : error}`,
  );
  process.exit(1);
}
