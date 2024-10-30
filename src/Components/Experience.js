
import React from 'react';

function Experience() {
  const experiences = [
    {
      title: "Security Technology Research Student - BlackBerry",
      duration: "09/2023 - 12/2023",
      description: "Conducted research into 5G and software security, focusing on vulnerability analysis and pipeline development. Implemented testing frameworks and pipelines for automated security assessments, enhancing vulnerability identification accuracy."
    },
    {
      title: "Research Intern - L1NNA Laboratory",
      duration: "05/2022 - 08/2022",
      description: "Developed custom Python libraries for cyber operations simulations, contributing to open-source cyber environments. Optimized red/blue team strategies in virtualized environments for research and educational purposes."
    },
    {
      title: "Head Teaching Assistant - Queen's University",
      duration: "01/2023 - 04/2023",
      description: "Managed 8 TAs, guided students through complex topics in computer science, provided mentorship, and led technical workshops. Developed instructional material that simplified challenging cybersecurity concepts for students."
    },
  ];

  return (
    <section className="py-12">
      <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">Experience</h2>
      <div className="space-y-6 max-w-4xl mx-auto">
        {experiences.map((exp, index) => (
          <div key={index} className="p-6 border border-gray-200 rounded-lg shadow-md bg-white">
            <h3 className="text-xl font-bold text-blue-600">{exp.title}</h3>
            <p className="text-sm text-gray-500">{exp.duration}</p>
            <p className="mt-2 text-gray-700">{exp.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Experience;
