import React from 'react';
import Section from './Section';
import Card from './Card';

const educationList = [
  {
    institution: "Queen's University",
    degree: 'NSERC CREATE Cybersecurity Program, Research-Based Masters of Science',
    gpa: 'GPA 3.9/4.3',
    duration: '2022 - Present',
  },
  {
    institution: "Queen's University",
    degree: 'Bachelor of Computing (Hons.) with a specialization in Computer Science with Professional Internship',
    gpa: 'GPA 3.32/4.3',
    duration: '2017 - 2022',
  },
];

function Education() {
  return (
    <Section id="education" title="Education">
      <div className="mx-auto max-w-3xl space-y-4">
        {educationList.map((edu) => (
          <Card key={edu.degree} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{edu.institution}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{edu.degree}</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{edu.gpa}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-brand-600 dark:text-brand-400">{edu.duration}</span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Education;
