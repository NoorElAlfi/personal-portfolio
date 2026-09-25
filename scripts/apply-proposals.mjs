#!/usr/bin/env node
/**
 * Deterministic merge of `runs/<week>/proposals/*.json` into `content/`
 * (contract C4).
 *
 *   node scripts/apply-proposals.mjs [--root <dir>] [--week <YYYY-Www>] [--dry-run]
 *
 * What it does, in a fixed order:
 *   1. `proposals/project_highlights.json` -> append to the project's registry
 *      (`content/projects.yml` for public projects, the local-only
 *      `agents/private-projects.yml` for private ones), skipping a highlight
 *      whose date+text already exists, and advance the project's `last_activity`;
 *   2. `proposals/now_page.json`            -> merge items into `content/now.yml`
 *      by `id` (update in place, append new ids at the end);
 *   3. `proposals/blog_post*.json`          -> write `content/posts/<slug>.mdx`
 *      (body only) and insert the registry record into `content/posts.yml`,
 *      newest first;
 *   4. flip every journal entry consumed by (1)-(3) from `status: pending` to
 *      `status: published`, normalizing entries that only exist as run artifacts
 *      into `journal/entries/` (public) or `journal/private/` (private, local-only).
 *
 * Documents are parsed, mutated and re-serialized with stable `yaml` options,
 * and a file is only written when its serialized text actually changed, so
 * running this twice in a row produces no diff.
 */
import path from "node:path";
import {
  dayString,
  defaultRoot,
  ensureDir,
  exists,
  filesWithExt,
  isWeekString,
  isoWeekString,
  joinFrontMatter,
  maxDay,
  parseArgs,
  readJson,
  readText,
  readYaml,
  splitFrontMatter,
  stringifyYamlDoc,
  warn,
  weekDirs,
  writeJson,
  writeText,
} from "../agents/lib/util.mjs";

const USAGE = `Usage: node scripts/apply-proposals.mjs [options]

  --root <dir>        repository root (default: nearest package.json)
  --week <YYYY-Www>   run week (default: the newest runs/<week> with proposals)
  --dry-run           report the merge without writing anything
  --help              this text
`;

const SPEC = {
  value: ["root", "week"],
  bool: ["dry-run", "help"],
};

/**
 * Committed, public tier for journal entries.
 * Private entries live in the local-only, gitignored tier instead — they are
 * still citable locally, but they must never reach the committed directory.
 *
 * Paths are kept slash-normalized: they are reported in `apply.json` and in the
 * summary, so they must not depend on the host separator.
 */
const CONTENT_ENTRY_DIR = "journal/entries";
const PRIVATE_ENTRY_DIR = "journal/private";

/**
 * Project registries, in resolution order. `content/projects.yml` is public
 * bundle material; `agents/private-projects.yml` is local-only metadata for
 * private work, and is absent on CI.
 */
const PROJECT_FILES = ["content/projects.yml", "agents/private-projects.yml"];

function expect(condition, message) {
  if (!condition) throw new Error(message);
  return condition;
}

/** Write only when the text differs; returns true when the file changed. */
function writeIfChanged(root, file, text) {
  const target = path.join(root, file);
  if (readText(target) === text) return false;
  ensureDir(path.dirname(target));
  writeText(target, text);
  return true;
}

function loadList(root, file, required = false) {
  const target = path.join(root, file);
  if (!exists(target)) {
    if (required)
      throw new Error(
        `${file} does not exist (required by this week's proposals)`,
      );
    return null;
  }
  const doc = readYaml(target);
  expect(Array.isArray(doc), `${file} must hold a list`);
  return doc;
}

/**
 * Everything the merge needs to know about this week's journal entries, keyed by
 * entry id: the date (for `last_activity`/`updated`) and the project (for new
 * `content/posts.yml` records).
 */
function entryIndex(root, week) {
  const index = new Map();
  const dirs = [
    path.join(root, "runs", week, "entries"),
    path.join(root, CONTENT_ENTRY_DIR),
    path.join(root, PRIVATE_ENTRY_DIR),
  ];
  for (const dir of dirs) {
    for (const name of filesWithExt(dir, ".md")) {
      const { data } = splitFrontMatter(readText(path.join(dir, name)) ?? "");
      if (!data?.id) continue;
      const previous = index.get(data.id) ?? {};
      index.set(data.id, {
        date: maxDay(
          previous.date ?? null,
          typeof data.date === "string" ? data.date.slice(0, 10) : null,
        ),
        project: previous.project ?? data.project ?? null,
      });
    }
  }
  return index;
}

function latestDate(ids, index) {
  let latest = null;
  for (const id of ids ?? [])
    latest = maxDay(latest, index.get(id)?.date ?? null);
  return latest;
}

/** Most common project among the cited entries. */
function deriveProject(ids, index) {
  const counts = new Map();
  for (const id of ids ?? []) {
    const project = index.get(id)?.project;
    if (project) counts.set(project, (counts.get(project) ?? 0) + 1);
  }
  let best = null;
  for (const [project, count] of counts) {
    if (!best || count > best.count) best = { project, count };
  }
  return best?.project ?? null;
}

/** Insert a registry record, keeping the list newest-first. */
function insertByDateDesc(list, entry) {
  const index = list.findIndex((item) => String(item?.date ?? "") < entry.date);
  if (index === -1) list.push(entry);
  else list.splice(index, 0, entry);
}

/**
 * @param {{root: string, week: string, index: Map<string, {date: string|null, project: string|null}>,
 *          changes: any[], skipped: any[], consumed: Set<string>}} merge
 */
function applyProjectHighlights(merge, proposal) {
  const { root, index, changes, skipped, consumed } = merge;
  expect(
    Array.isArray(proposal.highlights),
    "proposals/project_highlights.json: `highlights` must be an array",
  );

  // A highlight lands in the registry that owns the project: public projects in
  // content/projects.yml, private ones in the local-only registry.
  const registries = PROJECT_FILES.filter((file) =>
    exists(path.join(root, file)),
  ).map((file) => ({ file, list: loadList(root, file, true), dirty: false }));
  expect(
    registries.length > 0,
    `no project registry found (looked for ${PROJECT_FILES.join(", ")})`,
  );
  const byId = new Map();
  for (const registry of registries) {
    for (const project of registry.list) {
      if (project?.id && !byId.has(project.id))
        byId.set(project.id, { registry, project });
    }
  }

  for (const highlight of proposal.highlights) {
    const found = byId.get(highlight?.project);
    if (!found) {
      skipped.push({
        artifact: "proposals/project_highlights.json",
        reason: "unknown_project",
        detail: `no project with id ${JSON.stringify(highlight?.project)} in ${registries.map((r) => r.file).join(" or ")}`,
      });
      continue;
    }
    const { registry, project } = found;
    if (!Array.isArray(project.highlights)) project.highlights = [];
    const duplicate = project.highlights.some(
      (existing) =>
        existing?.date === highlight.date && existing?.text === highlight.text,
    );
    if (duplicate) {
      skipped.push({
        artifact: "proposals/project_highlights.json",
        reason: "duplicate",
        detail: `${project.id} already has the highlight dated ${highlight.date}`,
      });
    } else {
      project.highlights.push({
        date: highlight.date,
        text: highlight.text,
        source_ids: highlight.source_ids ?? [],
      });
      changes.push({
        file: registry.file,
        action: "project_highlight",
        detail: project.id,
        date: highlight.date,
      });
      registry.dirty = true;
    }
    const lastActivity = maxDay(
      project.last_activity ?? null,
      highlight.date ?? null,
    );
    if (lastActivity !== (project.last_activity ?? null)) {
      project.last_activity = lastActivity;
      registry.dirty = true;
    }
    for (const id of highlight.source_ids ?? []) consumed.add(id);
  }

  const written = [];
  for (const registry of registries) {
    if (!registry.dirty) continue;
    if (writeIfChanged(root, registry.file, stringifyYamlDoc(registry.list))) {
      written.push(registry.file);
    }
  }
  return written;
}

function applyNowPage(merge, proposal) {
  const { root, index, changes, skipped, consumed } = merge;
  const file = "content/now.yml";
  expect(
    Array.isArray(proposal.items),
    "proposals/now_page.json: `items` must be an array",
  );
  const items = loadList(root, file, true);
  const byId = new Map(items.map((item) => [item?.id, item]));
  let touched = false;

  for (const item of proposal.items) {
    const sourceIds = item.source_ids ?? [];
    const updated = latestDate(sourceIds, index) ?? dayString();
    const existing = byId.get(item.id);
    if (existing) {
      const same =
        existing.title === item.title &&
        existing.description === item.description &&
        JSON.stringify(existing.source_ids ?? []) === JSON.stringify(sourceIds);
      if (same && existing.updated === updated) {
        skipped.push({
          artifact: "proposals/now_page.json",
          reason: "unchanged",
          detail: `now item ${item.id} already matches`,
        });
      } else {
        existing.title = item.title;
        existing.description = item.description;
        existing.source_ids = sourceIds;
        existing.updated = updated;
        changes.push({
          file,
          action: "now_item",
          detail: `${item.id} updated`,
        });
        touched = true;
      }
    } else {
      const record = {
        id: item.id,
        title: item.title,
        description: item.description,
        source_ids: sourceIds,
        updated,
      };
      items.push(record);
      byId.set(item.id, record);
      changes.push({ file, action: "now_item", detail: `${item.id} added` });
      touched = true;
    }
    for (const id of sourceIds) consumed.add(id);
  }

  if (!touched) return null;
  return writeIfChanged(root, file, stringifyYamlDoc(items)) ? file : null;
}

function applyBlogPost(merge, proposal) {
  const { root, index, changes, skipped, consumed } = merge;
  const post = proposal.post;
  expect(
    post && typeof post === "object",
    "proposals/blog_post.json: `post` must be an object",
  );
  const body = String(post.body_markdown ?? "");
  expect(
    body.trim() !== "",
    "proposals/blog_post.json: `post.body_markdown` must be non-empty",
  );

  const artifact = "proposals/blog_post.json";
  const bodyText = body.endsWith("\n") ? body : `${body}\n`;
  // `content/posts/<slug>.mdx` is the contract C4 location; the site's loader and
  // its content checks discover post bodies as basenames inside
  // `src/pages/blog/` (see content/posts.yml `file`). Both are written from the
  // same text in the same step so they cannot drift.
  const bodyFiles = [
    `content/posts/${post.slug}.mdx`,
    `src/pages/blog/${post.slug}.mdx`,
  ];
  const registryFile = "content/posts.yml";
  const registry = loadList(root, registryFile, true);
  const sourceIds = post.source_ids ?? [];
  const touched = [];

  for (const bodyFile of bodyFiles) {
    const current = readText(path.join(root, bodyFile));
    if (current === null) {
      if (writeIfChanged(root, bodyFile, bodyText)) {
        changes.push({
          file: bodyFile,
          action: "blog_body",
          detail: post.slug,
        });
        touched.push(bodyFile);
      }
    } else if (current !== bodyText) {
      skipped.push({
        artifact,
        reason: "body_exists",
        detail: `${bodyFile} already exists with different content; refusing to overwrite it`,
      });
      warn(`${bodyFile} kept as-is`);
    }
  }

  const existing = registry.findIndex((item) => item?.slug === post.slug);
  if (existing === -1) {
    insertByDateDesc(registry, {
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      tags: post.tags ?? [],
      file: `${post.slug}.mdx`,
      date: post.date,
      project: post.project ?? deriveProject(sourceIds, index),
      source_ids: sourceIds,
      generated: true,
    });
    if (writeIfChanged(root, registryFile, stringifyYamlDoc(registry))) {
      changes.push({
        file: registryFile,
        action: "blog_registry",
        detail: post.slug,
      });
      touched.push(registryFile);
    }
  } else {
    skipped.push({
      artifact,
      reason: "duplicate",
      detail: `${registryFile} already lists slug ${post.slug}`,
    });
  }

  for (const id of sourceIds) consumed.add(id);
  return touched;
}

/**
 * Publication step: the consumed entries become `published` in
 * `journal/entries/`.
 *
 * `triage` proposes entries under `runs/<week>/entries/` (the run artifact, and
 * `runs/` is gitignored because it carries private-repo evidence). A consumed
 * entry therefore has to be normalized into `journal/entries/<id>.md` — the file
 * the site's content checks resolve citations against — before it can be flipped.
 * Both paths are covered here so a run works whether the entry already exists in
 * the journal or is being promoted for the first time.
 */
function publishEntries(root, week, ids) {
  const published = [];
  const added = [];
  const missing = [];
  const runEntries = path.join(root, "runs", week, "entries");

  for (const id of ids) {
    // Look in both tiers (a private entry may already live in the local-only
    // tier), then fall back to this run's proposal under runs/<week>/entries/.
    const candidates = [
      path.join(CONTENT_ENTRY_DIR, `${id}.md`),
      path.join(PRIVATE_ENTRY_DIR, `${id}.md`),
    ];
    const existingFile = candidates.find(
      (file) => readText(path.join(root, file)) !== null,
    );
    const source = existingFile
      ? readText(path.join(root, existingFile))
      : readText(path.join(runEntries, `${id}.md`));
    if (source === null) {
      missing.push(id);
      continue;
    }
    const { data, body, hasFrontMatter } = splitFrontMatter(source);
    if (!hasFrontMatter || !data) {
      missing.push(id);
      continue;
    }
    const promoting = existingFile === undefined;
    if (!promoting && data.status !== "pending") continue; // already published
    // Promoted private entries go to the local-only tier; public ones to the
    // committed tier. An entry that already exists is flipped where it lives.
    const expected = path.join(
      data.visibility === "private" ? PRIVATE_ENTRY_DIR : CONTENT_ENTRY_DIR,
      `${id}.md`,
    );
    const file = existingFile ?? expected;
    if (!promoting && existingFile !== expected) {
      warn(
        `${existingFile} is misplaced: a ${data.visibility ?? "public"} entry belongs at ${expected}`,
      );
    }
    data.status = "published";
    if (writeIfChanged(root, file, joinFrontMatter(data, body))) {
      published.push(id);
      if (promoting) added.push(id);
    }
  }
  return { published, added, missing };
}

function main() {
  const args = parseArgs(process.argv.slice(2), SPEC);
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }
  const root = path.resolve(args.root ?? defaultRoot());
  const dryRun = Boolean(args.dryRun);

  let week = args.week ?? null;
  if (week) {
    expect(
      isWeekString(week),
      `--week must look like YYYY-Www (got ${JSON.stringify(week)})`,
    );
  } else {
    const candidates = weekDirs(path.join(root, "runs")).filter((name) =>
      exists(path.join(root, "runs", name, "proposals")),
    );
    week = candidates.length
      ? candidates[candidates.length - 1]
      : isoWeekString();
  }

  const proposalsDir = path.join(root, "runs", week, "proposals");
  const proposalFiles = filesWithExt(proposalsDir, ".json");
  const report = {
    week,
    dry_run: dryRun,
    applied_at: new Date().toISOString(),
    files: [],
    changes: [],
    skipped: [],
    entries_published: [],
    entries_promoted: [],
  };

  if (!proposalFiles.length) {
    process.stdout.write(`apply: no proposals for ${week}\n`);
    writeJson(path.join(root, "runs", week, "apply.json"), report);
    return;
  }

  const merge = {
    root,
    week,
    index: entryIndex(root, week),
    changes: report.changes,
    skipped: report.skipped,
    consumed: new Set(),
  };
  const files = new Set();

  for (const name of proposalFiles) {
    const value = readJson(path.join(proposalsDir, name));
    const kind = value?.kind;
    if (kind === "project_highlights") {
      const written = applyProjectHighlights(merge, value);
      for (const file of written) files.add(file);
    } else if (kind === "now_page") {
      const file = applyNowPage(merge, value);
      if (file) files.add(file);
    } else if (kind === "blog_post") {
      for (const file of applyBlogPost(merge, value)) files.add(file);
    } else {
      report.skipped.push({
        artifact: `proposals/${name}`,
        reason: "unknown_kind",
        detail: `kind ${JSON.stringify(kind)} is not handled`,
      });
    }
  }

  if (dryRun) {
    report.entries_published = [...merge.consumed].sort();
    process.stdout.write(
      `apply (dry-run): ${report.changes.length} change(s), ${report.skipped.length} skip(s)\n`,
    );
    for (const change of report.changes) {
      process.stdout.write(
        `  would ${change.action} ${change.detail} -> ${change.file}\n`,
      );
    }
  } else {
    const outcome = publishEntries(root, week, merge.consumed);
    report.entries_published = outcome.published;
    report.entries_promoted = outcome.added;
    for (const id of outcome.missing) {
      report.skipped.push({
        artifact: "journal/entries",
        reason: "unresolvable_citation",
        detail: `${id} is cited but exists neither in journal/entries/ nor in runs/${week}/entries/`,
      });
    }
    for (const change of report.changes) {
      process.stdout.write(
        `  ${change.action} ${change.detail} -> ${change.file}\n`,
      );
    }
    process.stdout.write(
      `apply: ${report.changes.length} change(s), ${report.skipped.length} skip(s), ` +
        `${report.entries_published.length} entr(ies) marked published\n`,
    );
  }
  for (const skip of report.skipped) {
    process.stdout.write(`  skip ${skip.reason} ${skip.detail}\n`);
  }
  report.files = [...files].sort();
  writeJson(path.join(root, "runs", week, "apply.json"), report);
}

try {
  main();
} catch (err) {
  process.stderr.write(`apply-proposals: ${err.message}\n`);
  process.exitCode = 1;
}
