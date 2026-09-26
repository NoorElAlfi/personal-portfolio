import React from "react";
import { Link } from "react-router-dom";
import Section from "./Section";
import Card from "./Card";
import RichText from "../lib/richText";
import { projects } from "../data/projects";

const MAX_HIGHLIGHTS = 2;

/**
 * Newest highlights for a card. The pipeline appends a dated highlight per piece
 * of shipped work, so a busy project accumulates many; the card shows only the
 * most recent few, newest first, and the rest stay in `content/projects.yml`.
 */
function recentHighlights(project) {
  return (project.highlights ?? [])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, MAX_HIGHLIGHTS);
}

function Projects() {
  return (
    <Section id="projects" title="Projects">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {project.title}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {project.tag}
            </p>
            <p className="mt-2 flex-grow text-sm text-slate-600 dark:text-slate-300">
              <RichText text={project.description} />
            </p>
            {recentHighlights(project).length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                {recentHighlights(project).map((highlight) => (
                  <li
                    key={`${highlight.date}-${highlight.text}`}
                    className="flex gap-2"
                  >
                    <span className="shrink-0 font-mono text-[0.7rem] text-slate-400 dark:text-slate-500">
                      {highlight.date}
                    </span>
                    <span>
                      <RichText text={highlight.text} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {project.links?.length > 0 && (
              <div className="mt-4 flex gap-4 text-sm">
                {project.links.map((link) =>
                  link.to ? (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {link.label} &rarr;
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {link.label} &rarr;
                    </a>
                  ),
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Projects;
