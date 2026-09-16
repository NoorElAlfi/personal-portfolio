import React from 'react';
import Section from './Section';
import Card from './Card';

const experiences = [
  {
    title: 'QA Automation Engineer I',
    org: 'Miipe',
    duration: '06/2025 - Present',
    description:
      "Earned promotion from QA Automation Analyst I to Engineer I by proactively pursuing automation opportunities beyond assigned scope. Use AI-assisted (GitHub Copilot, Google AI) selector generation to accelerate Selenium/PyAutoGUI test-script authoring across 30+ automated enterprise workflows spanning web, desktop, and API layers. Validated Amdocs and Oracle Siebel CRM for one of Canada's largest telecom providers, identifying 50+ defects prior to production release across a 100k+ customer base.",
  },
  {
    title: 'AI Trainer, Adversarial Prompting (Contract)',
    org: 'Scale AI',
    duration: '03/2024 - 06/2025',
    description:
      'Performed systematic adversarial testing on frontier LLMs across 10+ projects and 50+ engineered prompts, spanning mathematics, programming, RLHF, guardrail-bypass, and model-stumping evaluations. Elicited restricted or unsafe outputs using narrative-reframing and authority-context jailbreak techniques to surface real safety gaps.',
  },
  {
    title: 'Security Technology Research Student',
    org: 'BlackBerry Limited',
    duration: '09/2023 - 12/2023',
    description:
      'Designed a testing framework evaluating SySeVR (deep-learning vulnerability detection) on C/C++ code, benchmarking precision/recall on CVE-linked datasets. Tested primarily against PuTTY (Git-diff analysis on unpatched builds, plus injected synthetic vulnerabilities) on AWS EC2, cutting dataset integration time by 60% and increasing model-evaluation throughput 3x.',
  },
  {
    title: 'Software Developer Intern',
    org: "Queen's Centre for Advanced Computing",
    duration: '05/2020 - 08/2021',
    description:
      "Led front-end development of a full-stack genetic variant database web application (React, MongoDB, email-based MFA) under faculty supervision, adopted by Queen's Biology/DNA research labs for real research use. Conducted a privacy audit of GPS sensor data via OsmAnd (Kotlin), identifying data-leakage vectors; credited in the acknowledgements of a peer-reviewed publication (Environment and Planning F, 2025/2026).",
  },
  {
    title: 'Head Teaching Assistant',
    org: "Queen's University",
    duration: '01/2023 - 04/2023',
    description:
      'Managed 8 TAs for Introduction to Computer Programming II, guided 100+ students through complex topics in computer science, and led office hours. Developed instructional material that simplified challenging programming concepts for students.',
  },
];

function Experience() {
  return (
    <Section id="experience" title="Experience">
      <div className="mx-auto max-w-3xl space-y-4">
        {experiences.map((exp) => (
          <Card key={`${exp.title}-${exp.org}`}>
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {exp.title} <span className="font-normal text-slate-500 dark:text-slate-400">— {exp.org}</span>
              </h3>
              <span className="shrink-0 text-sm font-medium text-brand-600 dark:text-brand-400">{exp.duration}</span>
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{exp.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Experience;
