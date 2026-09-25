#!/usr/bin/env node
/**
 * Run summary for the pipeline (contract C4).
 *
 *   node scripts/notify.mjs [--root <dir>] [--week <YYYY-Www>]
 *
 * Always writes `runs/<week>/summary.md` from whatever artifacts exist for the
 * week (activity, triage entries, plan, proposals, review, apply, publish).
 * When `$NOTIFY_WEBHOOK_URL` is set, the same text is POSTed as
 * `{"text": "<summary>"}`; when it is not set, nothing leaves the machine and
 * the exit code stays 0.
 */
import path from "node:path";
import {
  defaultRoot,
  filesWithExt,
  isWeekString,
  isoWeekString,
  parseArgs,
  readJson,
  readText,
  splitFrontMatter,
  weekDirs,
  writeText,
} from "../agents/lib/util.mjs";

const USAGE = `Usage: node scripts/notify.mjs [options]

  --root <dir>        repository root (default: nearest package.json)
  --week <YYYY-Www>   run week (default: the newest runs/<week> directory)
  --help              this text

Environment:
  NOTIFY_WEBHOOK_URL  when set, POST {"text": <summary>} to this URL.
`;

const SPEC = {
  value: ["root", "week"],
  bool: ["help"],
};

function bullets(lines, empty) {
  return lines.length
    ? lines.map((line) => `- ${line}`).join("\n")
    : `- ${empty}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2), SPEC);
  if (args.help) {
    process.stdout.write(USAGE);
    return null;
  }
  const root = path.resolve(args.root ?? defaultRoot());

  let week = args.week ?? null;
  if (week) {
    if (!isWeekString(week))
      throw new Error(
        `--week must look like YYYY-Www (got ${JSON.stringify(week)})`,
      );
  } else {
    const weeks = weekDirs(path.join(root, "runs"));
    week = weeks.length ? weeks[weeks.length - 1] : isoWeekString();
  }

  const runDir = path.join(root, "runs", week);
  const read = (name) => readJson(path.join(runDir, name));

  const activity = read("activity.json");
  const plan = read("plan.json");
  const review = read("review.json");
  const apply = read("apply.json");
  const publish = read("publish.json");
  const manifest = read("manifest.json");

  const entryFiles = filesWithExt(path.join(runDir, "entries"), ".md");
  const entries = entryFiles.map((name) => {
    const { data } = splitFrontMatter(
      readText(path.join(runDir, "entries", name)) ?? "",
    );
    return data ?? { id: name.replace(/\.md$/, "") };
  });

  const proposals = filesWithExt(path.join(runDir, "proposals"), ".json").map(
    (name) => ({
      name,
      value: readJson(path.join(runDir, "proposals", name)),
    }),
  );

  const changed = apply?.changes ?? [];
  const files = [
    ...new Set([...(apply?.files ?? []), ...changed.map((c) => c.file)]),
  ].sort();
  const repoNames = (activity?.repos ?? []).map(
    (repo) =>
      `${repo.name}${repo.private ? " (private)" : ""}${repo.error ? ` — ${repo.error}` : ""}`,
  );
  const actionLines = (plan?.actions ?? []).map(
    (action) =>
      `${action.type}${action.project ? ` ${action.project}` : ""}${action.slug ? ` ${action.slug}` : ""} — ${(action.entry_ids ?? []).length} entry(ies): ${action.rationale}`,
  );
  const proposalLines = proposals.map((proposal) => {
    const value = proposal.value ?? {};
    const count =
      value.highlights?.length ?? value.items?.length ?? (value.post ? 1 : 0);
    return `${proposal.name} (${value.kind ?? "unknown"}) — ${count} item(s)`;
  });

  const nothingChanged = changed.length === 0;
  const verdict = review?.verdict ?? "not reviewed";
  const violationLines = (review?.violations ?? []).map(
    (violation) =>
      `${violation.artifact} [${violation.rule}] ${violation.detail}`,
  );

  const sections = [
    `# Pipeline run ${week}`,
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Dry run: ${apply?.dry_run ?? manifest?.dry_run ?? "unknown"}`,
    `- Result: ${nothingChanged ? "nothing changed" : `${changed.length} change(s) in ${files.length} file(s)`}`,
    `- Review verdict: ${verdict}`,
    "",
    "## Collected",
    "",
    bullets(repoNames, "collect did not run"),
    "",
    ...(activity
      ? [
          `Since ${activity.since}; ${(activity.repos ?? []).length} repo(s).`,
          "",
        ]
      : []),
    "## Journal entries triaged",
    "",
    bullets(
      entries.map(
        (entry) =>
          `${entry.id} (${entry.kind ?? "?"}, ${entry.visibility ?? "?"})`,
      ),
      "no entries triaged",
    ),
    "",
    "## Plan",
    "",
    bullets(actionLines, "no plan for this week"),
    "",
    "## Proposals",
    "",
    bullets(proposalLines, "no proposals written"),
    "",
    "## Applied",
    "",
    bullets(
      changed.map(
        (change) => `${change.action} ${change.detail} -> ${change.file}`,
      ),
      "nothing applied",
    ),
    "",
    "## Files touched",
    "",
    bullets(files, "no files touched"),
    "",
    "## Published entries",
    "",
    bullets(
      apply?.entries_published ?? [],
      apply ? "none" : "apply did not run",
    ),
    "",
    "## Violations",
    "",
    bullets(violationLines, review ? "none" : "review did not run"),
    "",
    "## Pull request",
    "",
    publish?.pr_url
      ? publish.pr_url
      : `- none (${publish ? "publish found no changes" : "publish did not run"})`,
    "",
  ];

  const summary = `${sections.join("\n")}\n`;
  const summaryPath = path.join(runDir, "summary.md");
  writeText(summaryPath, summary);
  process.stdout.write(
    `notify: wrote ${path.relative(root, summaryPath).split(path.sep).join("/")}\n`,
  );

  return { summary, nothingChanged };
}

const result = main();

const webhook = process.env.NOTIFY_WEBHOOK_URL;
if (!result) {
  process.exitCode = 0;
} else if (!webhook) {
  process.stdout.write(
    result.nothingChanged
      ? "notify: nothing changed and NOTIFY_WEBHOOK_URL is not set (exit 0)\n"
      : "notify: NOTIFY_WEBHOOK_URL is not set; summary kept local\n",
  );
} else {
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: result.summary }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`webhook responded ${response.status}`);
    process.stdout.write(
      `notify: posted summary to the webhook (${response.status})\n`,
    );
  } catch (err) {
    process.stderr.write(`notify: webhook POST failed: ${err.message}\n`);
    process.exitCode = 1;
  }
}
