import React, { useEffect } from "react";
import { Link } from "react-router-dom";

function NotFound() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | Noor El Alfi";
    // The host serves this app with HTTP 200 for any path, so tell crawlers not to index it.
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, []);

  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        404
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        That page does not exist
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        The link may be old or mistyped. The projects and write-ups are one click away.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
        >
          Go to the home page
        </Link>
        <Link
          to="/blog"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-400"
        >
          Read the blog
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
