import React from "react";
import Section from "./Section";
import ProjectLinks from "./ProjectLinks";
import RichText from "../lib/richText";
import { otherProjects } from "../data/projects";

/** Everything that is not featured, as compact entries so the lead projects stay in front. */
function MoreProjects() {
  if (otherProjects.length === 0) return null;
  return (
    <Section id="more-projects" title="More projects">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {otherProjects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {project.title}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {project.tag}
            </p>
            <p className="mt-2 flex-grow text-sm text-slate-600 dark:text-slate-300">
              <RichText text={project.description} />
            </p>
            <ProjectLinks links={project.links} />
          </div>
        ))}
      </div>
    </Section>
  );
}

export default MoreProjects;
