import { parse } from "yaml";
import rawProjects from "../../content/projects.yml?raw";

const allProjects = parse(rawProjects);

/** Public projects only, in registry order (newest first). */
export const projects = allProjects.filter(
  (project) => project.visibility === "public",
);

/** The projects worth leading with: public, `featured`, ordered by `rank` (then registry order). */
export const featuredProjects = projects
  .map((project, index) => ({ project, index }))
  .filter(({ project }) => project.featured)
  .sort(
    (a, b) =>
      (a.project.rank ?? Infinity) - (b.project.rank ?? Infinity) ||
      a.index - b.index,
  )
  .map(({ project }) => project);

/** Everything else, in registry order. */
export const otherProjects = projects.filter((project) => !project.featured);

export default projects;
