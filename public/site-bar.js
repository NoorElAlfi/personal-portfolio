/*
 * A slim "back to the write-up" bar for the standalone pages under /public (explainers,
 * dashboards, visualizers). Those pages are separate documents with their own layouts and no
 * link back to the site. Usage, before </body>:
 *
 *   <script src="/site-bar.js" data-post="/blog/some-post" defer></script>
 *
 * - Shadow DOM, so page CSS cannot restyle it and it cannot restyle the page.
 * - position:absolute, so it takes no part in the page's own layout (some pages centre their
 *   body in a flex box); the document gets 40px of top padding to make room, and the bar scrolls
 *   away with the content instead of covering sticky headers.
 * - "Back" uses the browser's history when the reader came from this site (so the post is
 *   restored where they left it); in a new tab, or from elsewhere, it links to the post.
 * - Colours follow prefers-color-scheme, like the pages themselves.
 */
(function () {
  var script = document.currentScript;
  var post = (script && script.getAttribute("data-post")) || "/blog";
  var BAR_HEIGHT = 40;

  document.documentElement.style.paddingTop = BAR_HEIGHT + "px";

  var host = document.createElement("div");
  host.setAttribute("data-site-bar", "");
  host.style.cssText = "position:absolute;top:0;left:0;right:0;height:" + BAR_HEIGHT + "px;z-index:2147483000;";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "nav{box-sizing:border-box;height:" + BAR_HEIGHT + "px;display:flex;align-items:center;gap:10px;padding:0 16px;" +
    "font:500 14px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff;color:#334155;border-bottom:1px solid #e2e8f0}" +
    "a{color:#4338ca;text-decoration:none;padding:10px 0}" +
    "a:hover{text-decoration:underline}a:focus-visible{outline:2px solid #4338ca;outline-offset:2px;border-radius:2px}" +
    ".site{margin-left:auto;color:#334155}" +
    "@media (prefers-color-scheme:dark){nav{background:#0b1120;color:#cbd5e1;border-bottom-color:#1e293b}" +
    "a{color:#a5b4fc}a:focus-visible{outline-color:#a5b4fc}.site{color:#cbd5e1}}" +
    "</style>" +
    '<nav aria-label="Back to the site">' +
    '<a class="back" href="' + post + '">← Back to the write-up</a>' +
    '<a class="site" href="/">Noor El Alfi</a>' +
    "</nav>";

  var back = root.querySelector(".back");
  back.addEventListener("click", function (event) {
    var cameFromSite = false;
    try {
      cameFromSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch (e) {}
    if (cameFromSite && history.length > 1) {
      event.preventDefault();
      history.back();
    }
  });

  document.body.appendChild(host);
})();
