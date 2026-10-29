// Shared by the app (document titles) and scripts/build-meta.mjs (static per-route HTML),
// so a tab title and a link preview always say the same thing.

export const SITE_NAME = "Noor El Alfi";

export const HOME_TITLE = `${SITE_NAME}: Agentic AI & Security Engineer`;

export const HOME_DESCRIPTION =
  "QA Automation Engineer building local agentic AI tooling, with security and reinforcement-learning research at Queen's University. Projects with measured results.";

export const BLOG_TITLE = `Blog | ${SITE_NAME}`;

export const BLOG_DESCRIPTION =
  "Technical write-ups on personal projects: approach, what broke, and what actually worked.";

/** "Page title | Noor El Alfi" */
export function pageTitle(title) {
  return `${title} | ${SITE_NAME}`;
}
