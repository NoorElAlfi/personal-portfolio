
import React from 'react';

function Education() {
  const educationList = [
    {
      institution: "Queen's University",
      degree: "NSERC CREATE Cybersecurity Program, Research-Based Masters of Science",
      gpa: "GPA 3.9/4.3",
      duration: "2021 - Present"
    },
    {
      institution: "Queen's University",
      degree: "Bachelor of Computing (Hons.) with a specialization in Computer Science with Professional Internship",
      gpa: "GPA 3.32/4.3",
      duration: "2017 - 2021"
    }
  ];

  return (
    <section className="py-12">
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8 text-center">Education</h2>
      <div className="space-y-6 max-w-4xl mx-auto">
        {educationList.map((edu, index) => (
          <div key={index} className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800">
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{edu.institution}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{edu.duration}</p>
            <p className="mt-2 text-gray-700 dark:text-gray-300">{edu.degree} - {edu.gpa}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Education;
