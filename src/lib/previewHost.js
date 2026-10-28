/**
 * Where the "Ask this site" widget may appear: local development and Netlify previews (deploy
 * previews, branch deploys and per-deploy URLs all use "<name>--<site>.netlify.app"), never the
 * production address. Kept in its own file so the main bundle does not pull in the search code.
 */
export function isPreviewHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || /^[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/.test(h);
}
