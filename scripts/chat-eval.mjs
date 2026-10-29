#!/usr/bin/env node
/**
 * Runs chat-eval/questions.yml against the real search (src/lib/chatSearch.js) over an index
 * built from the site as it is now. No network and no model: the same code a visitor runs.
 *
 *   npm run chat:eval                    build the index in memory and run everything
 *   node scripts/chat-eval.mjs --verbose print the passage each question returned
 *   node scripts/chat-eval.mjs --set heldout
 *   node scripts/chat-eval.mjs --report runs/chat-eval.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { buildIndex, privateMarkers, findLeaks } from "./build-chat-index.mjs";
import { pathToFileURL } from "node:url";
const { createSearcher } = await import(process.env.CHAT_SEARCH ? pathToFileURL(process.env.CHAT_SEARCH).href : new URL("../src/lib/chatSearch.js", import.meta.url).href);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const only = args.includes("--set") ? args[args.indexOf("--set") + 1] : null;
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;

const questions = parse(fs.readFileSync(path.join(root, "chat-eval", "questions.yml"), "utf8")).filter((q) => !only || q.set === only);
const chunks = await buildIndex();
const searcher = createSearcher({ chunks: chunks.map((c, i) => ({ id: i + 1, ...c })) });
const corpus = chunks.map((c) => c.text).join("\n\n");
const markers = privateMarkers();

const shown = (r) => (r.refused ? "" : [r.answer, ...r.more].flatMap((p) => p.paragraphs).join("\n\n"));
const fromSiteText = (r) => r.refused || [r.answer, ...r.more].every((p) => p.paragraphs.every((t) => p.chunk.text.includes(t)));

const rows = [];
const suggestion = { refused: 0, helped: 0 };
for (const q of questions) {
  const r = searcher.search(q.question);
  const notes = [];
  let ok = false;
  const answerText = r.refused ? "" : r.answer.paragraphs.join(" ").toLowerCase();
  if (q.kind === "answer" && r.refused && r.reason !== "personal-details") {
    suggestion.refused++;
    if (searcher.suggest(q.question).some((s) => q.urls.includes(s.url))) suggestion.helped++;
  }
  if (q.kind === "answer") {
    const urlOk = !r.refused && q.urls.includes(r.answer.chunk.url);
    const shownText = shown(r).toLowerCase();
    const missing = [
      ...(q.contains ?? []).filter((s) => !answerText.includes(s.toLowerCase())),
      ...(q.contains_shown ?? []).filter((s) => !shownText.includes(s.toLowerCase())),
    ];
    if (r.refused) notes.push(`refused (${r.reason})`);
    else if (!urlOk) notes.push(`top source ${r.answer.chunk.url} not in ${q.urls.join(", ")}`);
    if (missing.length) notes.push(`missing ${missing.map((m) => JSON.stringify(m)).join(", ")}`);
    ok = urlOk && missing.length === 0;
  } else if (q.kind === "decline") {
    ok = r.refused;
    if (!ok) notes.push(`answered from ${r.answer.chunk.url} (${r.answer.chunk.title}), coverage ${r.answer.coverage.toFixed(2)}`);
  } else if (q.kind === "inject") {
    ok = q.expect === "refuse" ? r.refused : r.refused || fromSiteText(r);
    if (!ok) notes.push(q.expect === "refuse" ? `answered instead of refusing: ${r.answer.chunk.title}` : "returned text that is not site text");
  }
  // Whatever came back, it must be site text and carry nothing private.
  if (!fromSiteText(r)) { ok = false; notes.push("shown text is not verbatim site text"); }
  const leaks = findLeaks(shown(r) + " " + (r.refused ? r.message : ""), markers);
  if (leaks.length) { ok = false; notes.push(`private marker in output: ${leaks.join(", ")}`); }
  const gap = Boolean(q.known_gap);
  if (gap && !ok) notes.push(`known gap: ${q.known_gap}`);
  if (gap && ok) notes.push("passes now: remove known_gap");
  rows.push({ set: q.set, kind: q.kind, question: q.question, ok, gap, source: r.refused ? "(refused)" : r.answer.chunk.url, notes });
  if (verbose && !r.refused) console.log(`\n  Q: ${q.question}\n  -> ${r.answer.chunk.url}  ${r.answer.chunk.context} > ${r.answer.chunk.title}\n     ${r.answer.paragraphs.join(" ").slice(0, 220)}`);
}

const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + "~" : s.padEnd(n));
console.log(`index: ${chunks.length} passages from the site as it is now; ${markers.length} private markers checked\n`);
for (const r of rows) console.log(`${r.ok ? "PASS" : r.gap ? "GAP " : "FAIL"}  ${pad(r.set, 8)} ${pad(r.kind, 8)} ${pad(r.question, 62)} ${pad(r.source, 38)} ${r.notes.join("; ")}`);

const summary = {};
for (const r of rows) {
  const key = `${r.set}/${r.kind}`;
  summary[key] ??= { pass: 0, total: 0 };
  summary[key].total++;
  if (r.ok) summary[key].pass++;
}
console.log("\n" + Object.entries(summary).map(([k, v]) => `${k}: ${v.pass}/${v.total}`).join("   "));
console.log(`refused answerable questions where the right FAQ question was suggested: ${suggestion.helped}/${suggestion.refused}`);
const failed = rows.filter((r) => !r.ok && !r.gap).length;
const gaps = rows.filter((r) => !r.ok && r.gap).length;
const fixed = rows.filter((r) => r.ok && r.gap).length;
console.log(`known gaps still failing: ${gaps}${fixed ? `; known gaps that now pass: ${fixed} (remove their known_gap)` : ""}`);
console.log(failed ? `${failed} FAILED` : "ALL PASSED (known gaps aside)");
if (reportPath) {
  fs.mkdirSync(path.dirname(path.resolve(root, reportPath)), { recursive: true });
  fs.writeFileSync(path.resolve(root, reportPath), JSON.stringify({ passages: chunks.length, summary, rows }, null, 1));
}
process.exit(failed ? 1 : 0);
