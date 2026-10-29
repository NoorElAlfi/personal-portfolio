import React from "react";
import Section from "./Section";
import Card from "./Card";
import ProjectLinks from "./ProjectLinks";
import RichText from "../lib/richText";
import { featuredProjects } from "../data/projects";

/**
 * The four projects worth leading with. Each card opens with its one-line result
 * (`headline` in content/projects.yml), then the full description and links.
 */
function Projects() {
  return (
    <Section id="projects" title="Featured projects">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        {featuredProjects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {project.tag}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {project.title}
            </h3>
            {project.headline && (
              <p className="mt-3 font-semibold leading-snug text-slate-900 dark:text-white">
                {project.headline}
              </p>
            )}
            <p className="mt-3 flex-grow text-sm text-slate-600 dark:text-slate-300">
              <RichText text={project.description} />
            </p>
            <ProjectLinks links={project.links} />
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Projects;
