#!/usr/bin/env node
/**
 * Checks content/faq.yml (run by `npm run verify`, so CI runs it too):
 *   - valid shape: unique kebab-case ids, a question and an answer on every entry
 *   - nothing private: no private repo handle, registry entry or private journal marker
 *   - no drifting figures: every number in an answer also appears somewhere else on the site
 *     (project cards, posts, Experience, Skills...), so the FAQ cannot quote a figure the rest
 *     of the site does not support. Words ("Two weeks") are not checked, only digits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { privateMarkers, findLeaks } from "./build-chat-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

const faqPath = path.join(root, "content", "faq.yml");
let faq;
try {
  faq = parse(fs.readFileSync(faqPath, "utf8"));
} catch (error) {
  console.error(`FAIL  content/faq.yml does not parse: ${error.message}`);
  process.exit(1);
}
if (!Array.isArray(faq) || faq.length === 0) {
  console.error("FAIL  content/faq.yml must be a non-empty list");
  process.exit(1);
}

// Text the rest of the site is made of (everything except the FAQ itself).
function siteText() {
  const parts = [];
  const walk = (dir, accept) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, accept);
      else if (accept(entry.name, full)) parts.push(fs.readFileSync(full, "utf8"));
    }
  };
  walk(path.join(root, "content"), (name, full) => /\.yml$/.test(name) && full !== faqPath);
  walk(path.join(root, "src", "components"), (name) => /\.jsx$/.test(name) && name !== "Faq.jsx");
  walk(path.join(root, "src", "pages"), (name) => /\.(jsx|mdx)$/.test(name));
  return parts.join("\n");
}
const site = siteText();
const NUMBER = /\d+(?:[.,]\d+)*/g;
const containsNumber = (text, token) => {
  // digits, '.' and ',' only: wrapping the punctuation in a character class escapes it
  const literal = token.replace(/[.,]/g, (c) => `[${c}]`);
  return new RegExp(`(?<![0-9])${literal}(?![0-9])`).test(text);
};

const markers = privateMarkers();
const ids = new Set();
for (const [index, item] of faq.entries()) {
  const where = `content/faq.yml#${item?.id ?? index}`;
  if (!item || typeof item !== "object") { fail(where, "entry is not a mapping"); continue; }
  if (typeof item.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) fail(where, `id ${JSON.stringify(item.id)} is not kebab-case`);
  else if (ids.has(item.id)) fail(where, "duplicate id");
  else ids.add(item.id);
  if (typeof item.question !== "string" || !item.question.trim()) fail(where, "question is empty");
  else if (item.question.length > 120) fail(where, "question is longer than 120 characters");
  if (typeof item.answer !== "string" || !item.answer.trim()) { fail(where, "answer is empty"); continue; }

  if (item.also_asked_as !== undefined) {
    const list = item.also_asked_as;
    if (!Array.isArray(list) || list.length > 25 || list.some((p) => typeof p !== "string" || !p.trim() || p.length > 60 || /[0-9]/.test(p))) {
      fail(where, "also_asked_as must be a list of at most 25 short phrases without digits");
    } else {
      const found = findLeaks(list.join("\n"), markers);
      if (found.length) fail(where, `private marker in also_asked_as: ${found.join(", ")}`);
    }
  }
  const leaks = findLeaks(`${item.question}\n${item.answer}`, markers);
  if (leaks.length) fail(where, `private marker in the text: ${leaks.join(", ")}`);

  const unsupported = [...new Set(item.answer.match(NUMBER) ?? [])].filter((token) => !containsNumber(site, token));
  if (unsupported.length) fail(where, `number(s) ${unsupported.join(", ")} appear nowhere else on the site`);
}

if (problems.length) {
  console.error(`FAIL  faq: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`PASS  faq: ${faq.length} entries; ids unique; no private markers (${markers.length} checked); every number appears elsewhere on the site`);
