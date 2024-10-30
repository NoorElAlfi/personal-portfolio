
import React from 'react';

function Skills() {
  const skills = [
    { name: "Python", description: "Proficient in scripting, data analysis, and ML implementations." },
    { name: "JavaScript", description: "Experienced in web development and interactive applications." },
    { name: "Docker", description: "Skilled in containerization and orchestration for cybersecurity." },
    { name: "AWS", description: "Knowledgeable in cloud infrastructure and deployment." },
    { name: "React", description: "Adept at building responsive and dynamic UI/UX." },
    { name: "Linux/Bash", description: "Expertise in system administration and shell scripting." },
  ];

  return (
    <section className="py-2">
      <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">Skills</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {skills.map((skill, index) => (
          <div key={index} className="p-6 border border-gray-200 rounded-lg shadow-md bg-white">
            <h3 className="text-xl font-bold text-blue-600">{skill.name}</h3>
            <p className="mt-2 text-gray-700">{skill.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Skills;
