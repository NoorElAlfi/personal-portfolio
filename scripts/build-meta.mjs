#!/usr/bin/env node
/**
 * Post-build step: give every route its own <title>, description and link-preview tags in
 * static HTML. Slack, LinkedIn and most crawlers do not run JavaScript, so the React app alone
 * shows them the same generic page for every URL.
 *
 * Output (all inside dist/):
 *   index.html                 home page tags (index.html is also the SPA fallback)
 *   _meta/blog.html            /blog
 *   _meta/blog/<slug>.html     one per post
 *   _redirects                 status-200 REWRITES (the address bar does not change) from each
 *                              route to its file above, then the existing SPA catch-all
 *   sitemap.xml, robots.txt    only when the site URL is known
 *
 * The site URL comes from SITE_URL or Netlify's build variable URL. Without it (a local build)
 * the absolute tags (canonical, og:url, og:image, sitemap) are left out rather than guessed.
 *
 *   node scripts/build-meta.mjs [--root <dir>]
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import {
  SITE_NAME,
  HOME_TITLE,
  HOME_DESCRIPTION,
  BLOG_TITLE,
  BLOG_DESCRIPTION,
  pageTitle,
} from "../src/lib/siteMeta.js";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
const root = path.resolve(rootFlag >= 0 ? args[rootFlag + 1] : ".");
const dist = path.join(root, "dist");
const siteUrl = (process.env.SITE_URL || process.env.URL || "").replace(/\/+$/, "");
const IMAGE_PATH = "/logo512.png";

function fail(message) {
  console.error(`build-meta: ${message}`);
  process.exit(1);
}

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const escapeText = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const templatePath = path.join(dist, "index.html");
if (!fs.existsSync(templatePath)) fail(`${templatePath} not found; run vite build first`);
const template = fs.readFileSync(templatePath, "utf8");
if (!/<title>[^<]*<\/title>/.test(template)) fail("template has no <title>");
if (!/<meta name="description"[^>]*>/.test(template)) fail("template has no meta description");

const posts = parse(fs.readFileSync(path.join(root, "content", "posts.yml"), "utf8"));
for (const post of posts) {
  for (const key of ["slug", "title", "summary", "date"]) {
    if (!post[key]) fail(`post ${post.slug ?? "?"} has no ${key}`);
  }
}

function render({ title, description, route, type = "website", published }) {
  const tags = [];
  const meta = (attr, name, content) =>
    tags.push(`<meta ${attr}="${name}" content="${escapeAttr(content)}" />`);
  if (siteUrl) tags.push(`<link rel="canonical" href="${escapeAttr(siteUrl + route)}" />`);
  meta("property", "og:site_name", SITE_NAME);
  meta("property", "og:type", type);
  meta("property", "og:title", title);
  meta("property", "og:description", description);
  if (siteUrl) {
    meta("property", "og:url", siteUrl + route);
    meta("property", "og:image", siteUrl + IMAGE_PATH);
    meta("property", "og:image:alt", `${SITE_NAME} logo`);
  }
  if (published) meta("property", "article:published_time", published);
  meta("name", "twitter:card", "summary");
  meta("name", "twitter:title", title);
  meta("name", "twitter:description", description);
  if (siteUrl) meta("name", "twitter:image", siteUrl + IMAGE_PATH);

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeText(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeAttr(description)}" />`,
    )
    .replace("</head>", `    ${tags.join("\n    ")}\n  </head>`);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Home replaces dist/index.html, which Netlify also serves for any unknown path.
write(path.join(dist, "index.html"), render({ title: HOME_TITLE, description: HOME_DESCRIPTION, route: "/" }));
write(
  path.join(dist, "_meta", "blog.html"),
  render({ title: BLOG_TITLE, description: BLOG_DESCRIPTION, route: "/blog" }),
);
for (const post of posts) {
  write(
    path.join(dist, "_meta", "blog", `${post.slug}.html`),
    render({
      title: pageTitle(post.title),
      description: post.summary,
      route: `/blog/${post.slug}`,
      type: "article",
      published: String(post.date),
    }),
  );
}

// Specific rewrites first, then the SPA catch-all (netlify.toml keeps the same catch-all).
const rewrites = [
  `/blog /_meta/blog.html 200`,
  ...posts.map((post) => `/blog/${post.slug} /_meta/blog/${post.slug}.html 200`),
  `/* /index.html 200`,
];
write(path.join(dist, "_redirects"), rewrites.join("\n") + "\n");

if (siteUrl) {
  const staticPages = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "assets" && entry.name !== "_meta") walk(full);
      } else if (entry.name.endsWith(".html") && full !== templatePath) {
        staticPages.push("/" + path.relative(dist, full).split(path.sep).join("/"));
      }
    }
  })(dist);

  const urls = [
    { loc: "/" },
    { loc: "/blog" },
    ...posts.map((post) => ({ loc: `/blog/${post.slug}`, lastmod: String(post.date) })),
    ...staticPages.sort().map((loc) => ({ loc })),
  ];
  write(
    path.join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url><loc>${escapeText(siteUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
        )
        .join("\n") +
      `\n</urlset>\n`,
  );
  const robotsPath = path.join(dist, "robots.txt");
  const robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf8").replace(/\s*$/, "\n") : "";
  write(robotsPath, `${robots}\nSitemap: ${siteUrl}/sitemap.xml\n`);
}

console.log(
  `build-meta: ${posts.length + 2} routes, ${rewrites.length} rewrite rules, ` +
    (siteUrl ? `site URL ${siteUrl}, sitemap.xml written` : "no site URL (set SITE_URL or URL): absolute tags and sitemap skipped"),
);
