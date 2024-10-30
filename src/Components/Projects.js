
import React from 'react';

function Projects() {
  const projects = [
    {
      title: "Emulated Cyber Operations Research Gym",
      description: "Developed a virtual environment using Docker for red/blue team training, enabling testing of autonomous offensive and defensive strategies. Implemented a dynamic environment that allows RL agents to train and develop offensive/defensive strategies."
    },
    {
      title: "SySeVR Vulnerability Detection Pipeline",
      description: "Designed custom scripts and data pipelines to assess the effectiveness of SySeVR in identifying software vulnerabilities. Developed scripts to automate dataset generation and analysis for software vulnerability detection research and experimentation with SySeVR."
    },
    {
      title: "Big Data Exposed",
      description: "Built a custom logging system for GPS data visualization, integrated with open-source navigation tools like OsmAnd. Developed data processing methods for large-scale spatial data analysis."
    },
  ];

  return (
    <section className="py-2">
      <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {projects.map((project, index) => (
          <div key={index} className="p-6 border border-gray-200 rounded-lg shadow-md bg-white">
            <h3 className="text-xl font-bold text-blue-600">{project.title}</h3>
            <p className="mt-2 text-gray-700">{project.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Projects;
