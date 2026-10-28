import React from "react";
import { Link } from "react-router-dom";

const linkClass =
  "py-1.5 font-semibold text-brand-600 hover:underline dark:text-brand-400";

/** A project's links: `to` stays in the app, `href` opens in a new tab. */
function ProjectLinks({ links }) {
  if (!links?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 text-sm">
      {links.map((link) =>
        link.to ? (
          <Link key={link.label} to={link.to} className={linkClass}>
            {link.label} &rarr;
          </Link>
        ) : (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {link.label} &rarr;
          </a>
        ),
      )}
    </div>
  );
}

export default ProjectLinks;
