import { parse } from "yaml";
import rawProjects from "../../content/projects.yml?raw";

const allProjects = parse(rawProjects);

/** Public projects only, in registry order (newest first). */
export const projects = allProjects.filter(
  (project) => project.visibility === "public",
);

export default projects;
