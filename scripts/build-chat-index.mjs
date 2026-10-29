#!/usr/bin/env node
/**
 * Builds the search index behind the "Ask this site" widget (see README, "Ask this site").
 *
 * The corpus is the site itself: the home page and every post are rendered to HTML with the
 * site's own React components (through Vite's server-side module loader), so what is indexed is
 * exactly what a visitor can read, and there is no second copy of the Hero, Experience, Skills
 * or post text to drift. The HTML is split into passages at each heading and written to JSON.
 *
 *   node scripts/build-chat-index.mjs --out dist/chat-index.json [--force]
 *   node scripts/build-chat-index.mjs --check        build in memory, print a summary, write nothing
 *
 * The index is only written when chat is enabled: CHAT_ENABLED=true|false decides if set,
 * otherwise Netlify's CONTEXT must be deploy-preview or branch-deploy. A production build, a CI
 * build and a plain local build therefore write nothing (and remove a stale file at --out).
 * --force writes regardless (used by `npm run chat:index` for local development).
 *
 * Private material never enters the index: the script reads the private-repo list, the local
 * private registry and the private journal, and fails the build if any of their names appear
 * in the output.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

export function chatEnabled(env = process.env) {
  if (env.CHAT_ENABLED === "true") return true;
  if (env.CHAT_ENABLED === "false") return false;
  return env.CONTEXT === "deploy-preview" || env.CONTEXT === "branch-deploy";
}

// ---------------------------------------------------------------- HTML to passages

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rarr: "→", larr: "←", mdash: "—", ndash: "–", hellip: "…" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return NAMED[e.toLowerCase()] ?? m;
  });

const BLOCKS = new Set(["h1", "h2", "h3", "h4", "p", "li", "figcaption", "blockquote", "td", "th", "dt", "dd"]);
const SKIP = new Set(["script", "style", "svg", "noscript"]);

/** HTML (as written by renderToStaticMarkup) to [{tag, text, sectionId}]. */
export function htmlToBlocks(html) {
  const blocks = [];
  const ids = []; // stack of ids from enclosing <section id="..."> / <article id="...">
  let skip = 0;
  let current = null;
  const token = /<(\/?)([a-z][a-z0-9]*)([^>]*?)(\/?)>|([^<]+)/gi;
  let m;
  while ((m = token.exec(html))) {
    const [, closing, rawTag, attrs, , text] = m;
    if (text !== undefined) {
      if (!skip && current) current.text += text;
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (SKIP.has(tag)) { skip += closing ? -1 : 1; continue; }
    if (skip) continue;
    if (tag === "section" || tag === "article") {
      if (closing) ids.pop();
      else ids.push((attrs.match(/\sid="([^"]+)"/) ?? [])[1] ?? null);
      continue;
    }
    if (tag === "br" && current) { current.text += " "; continue; }
    if (BLOCKS.has(tag)) {
      if (!closing) {
        current = { tag, text: "", sectionId: [...ids].reverse().find(Boolean) ?? null };
      } else if (current) {
        const text = decode(current.text).replace(/\s+/g, " ").trim();
        if (text) blocks.push({ ...current, text });
        current = null;
      }
    }
  }
  return blocks;
}

const MAX_WORDS = 220;
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const isChangelogLine = (text) => /^\d{4}-\d{2}-\d{2}\b/.test(text); // dated card "highlights"

/** Blocks of one page to passages, one per heading, long ones split at paragraph boundaries. */
export function blocksToChunks(blocks, page) {
  const chunks = [];
  let h2 = null;
  let chunk = null;

  const flush = () => {
    if (!chunk || chunk.paragraphs.length === 0) { chunk = null; return; }
    let part = [];
    let count = 0;
    const parts = [];
    for (const p of chunk.paragraphs) {
      if (part.length && count + words(p) > MAX_WORDS) { parts.push(part); part = []; count = 0; }
      part.push(p);
      count += words(p);
    }
    if (part.length) parts.push(part);
    parts.forEach((paragraphs) =>
      chunks.push({
        url: chunk.sectionId ? `${page.url}#${chunk.sectionId}` : page.url,
        title: chunk.title,
        context: chunk.context,
        kind: chunk.kind,
        text: paragraphs.join("\n\n"),
      }),
    );
    chunk = null;
  };

  const start = (title, context, sectionId) => {
    flush();
    chunk = { title, context, sectionId, kind: page.kind(context), paragraphs: [] };
  };

  for (const b of blocks) {
    if (b.tag === "h1") { start(page.title ?? b.text, page.title ?? b.text, b.sectionId); continue; }
    if (b.tag === "h2") { h2 = b.text; start(b.text, page.title ?? b.text, b.sectionId); continue; }
    if (b.tag === "h3" || b.tag === "h4") { start(b.text, page.title ?? h2 ?? b.text, b.sectionId ?? chunk?.sectionId ?? null); continue; }
    if (isChangelogLine(b.text) || /^← Back to Blog$/.test(b.text)) continue;
    if (!chunk) start(page.title ?? "Noor El Alfi", page.title ?? "Noor El Alfi", b.sectionId);
    if (!chunk.paragraphs.includes(b.text)) chunk.paragraphs.push(b.text);
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------- private-data guard

function readIfExists(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

function publicText() {
  const parts = [];
  const add = (dir, re) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) if (re.test(f)) parts.push(readIfExists(path.join(dir, f)));
  };
  add(path.join(root, "content"), /\.yml$/);
  add(path.join(root, "src", "pages", "blog"), /\.(mdx|jsx)$/);
  add(path.join(root, "src", "components"), /\.jsx$/);
  return parts.join("\n").toLowerCase();
}

/**
 * Strings that must never appear in the index, from every private source this machine has:
 * private repo handles, the local private registry, and private journal entries (id, repos,
 * commit hashes, summary, and distinctive slug words). A slug word that the public site already
 * uses ("isolation" in "Isolation Forest") cannot identify private work, so it is not a marker.
 */
export function privateMarkers() {
  const markers = new Set();
  for (const line of readIfExists(path.join(root, "agents", "repos.txt")).split("\n")) {
    const m = line.trim().match(/^([\w.-]+)\/([\w.-]+)\s+private\b/i);
    if (m) markers.add(`${m[1]}/${m[2]}`);
  }
  const pub = publicText();
  const registry = readIfExists(path.join(root, "agents", "private-projects.yml"));
  if (registry) {
    try {
      for (const p of parse(registry) ?? []) {
        // An id is only a join key; one the public site already uses (a post slug) names nothing private.
        if (typeof p.id === "string" && p.id.length >= 4 && !pub.includes(p.id.toLowerCase())) markers.add(p.id);
        for (const v of [p.title, p.repo]) if (typeof v === "string" && v.length >= 4) markers.add(v);
      }
    } catch { /* an unreadable registry adds no markers */ }
  }
  const privateDirs = [path.join(root, "journal", "private"), path.join(root, "agents", "fixtures", "journal", "private")];
  for (const dir of privateDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const text = readIfExists(path.join(dir, f));
      const front = (text.match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? "";
      let meta = {};
      try { meta = parse(front) ?? {}; } catch { /* no front matter, no markers from it */ }
      if (meta.id) markers.add(String(meta.id));
      if (typeof meta.summary === "string" && meta.summary.length >= 20) markers.add(meta.summary);
      for (const l of meta.links ?? []) if (l?.repo) markers.add(String(l.repo));
      for (const s of meta.sources ?? []) {
        const hash = String(s).match(/^commit:([0-9a-f]{7,40})\b/i);
        if (hash) markers.add(hash[1]);
      }
      for (const w of f.replace(/\.md$/, "").split("-").slice(3)) if (w.length >= 7 && !pub.includes(w.toLowerCase())) markers.add(w);
    }
  }
  return [...markers].filter((m) => m.length >= 4);
}

const isWordChar = (ch) => ch !== undefined && /[A-Za-z0-9_-]/.test(ch);

/** Markers found in `text`, matched as whole tokens ("owner/siem-guard" does not match "owner/siem-guard-code"). */
export function findLeaks(text, markers) {
  const hay = text.toLowerCase();
  return markers.filter((marker) => {
    const needle = marker.toLowerCase();
    for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
      if (!isWordChar(hay[at - 1]) && !isWordChar(hay[at + needle.length])) return true;
    }
    return false;
  });
}

// ---------------------------------------------------------------- build

export async function buildIndex() {
  const { createServer } = await import("vite");
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { StaticRouter } = await import("react-router-dom/server.js");

  const vite = await createServer({ root, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const render = async (modulePath, url, exportName = "default") => {
      const mod = await vite.ssrLoadModule(modulePath);
      return renderToStaticMarkup(React.createElement(StaticRouter, { location: url }, React.createElement(mod[exportName])));
    };

    const chunks = [];
    const homeHtml = await render("/src/pages/Home.jsx", "/");
    const projectish = (context) => (/project/i.test(context) ? "project" : "profile");
    chunks.push(...blocksToChunks(htmlToBlocks(homeHtml), { url: "/", title: null, kind: projectish }));

    // Contact details live only in link targets, which the text index never sees, so the footer's
    // links become one passage (the footer already publishes exactly these).
    const footerHtml = await render("/src/components/Footer.jsx", "/");
    const links = [...footerHtml.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [decode(m[2]).trim(), decode(m[1]).replace(/^mailto:/, "")]);
    if (links.length) {
      chunks.push({ url: "/", title: "Contact", context: "Contact", kind: "profile", text: links.map(([label, target]) => `${label}: ${target}`).join("\n\n") });
    }

    const { posts, postRoutes } = await vite.ssrLoadModule("/src/data/posts.js");
    for (const post of posts) {
      const Component = postRoutes[post.slug];
      const html = renderToStaticMarkup(React.createElement(StaticRouter, { location: `/blog/${post.slug}` }, React.createElement(Component)));
      chunks.push(...blocksToChunks(htmlToBlocks(html), { url: `/blog/${post.slug}`, title: post.title, kind: () => "post" }));
    }
    return chunks.map((c, i) => ({ id: i + 1, ...c }));
  } finally {
    await vite.close();
  }
}

async function main() {
  const out = option("--out");
  const enabled = flag("--force") || flag("--check") || chatEnabled();
  if (!enabled) {
    if (out && fs.existsSync(path.resolve(root, out))) fs.rmSync(path.resolve(root, out));
    console.log(`build-chat-index: chat is off for this build (CONTEXT=${process.env.CONTEXT ?? "unset"}, CHAT_ENABLED=${process.env.CHAT_ENABLED ?? "unset"}); no index written.`);
    return;
  }

  const chunks = await buildIndex();
  if (chunks.length === 0) throw new Error("no passages were produced; refusing to write an empty index");

  const index = { version: 1, chunks };
  const json = JSON.stringify(index);
  const leaks = findLeaks(json, privateMarkers());
  if (leaks.length) {
    console.error(`build-chat-index: FAILED, private material found in the index: ${leaks.join(", ")}`);
    process.exit(1);
  }

  const summary = `${chunks.length} passages, ${chunks.reduce((n, c) => n + words(c.text), 0)} words, ${(json.length / 1024).toFixed(0)} kB`;
  if (flag("--check") || !out) {
    console.log(`build-chat-index (check): ${summary}; no private markers found (${privateMarkers().length} checked)`);
    return;
  }
  const target = path.resolve(root, out);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);
  console.log(`build-chat-index: wrote ${path.relative(root, target)}: ${summary}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
