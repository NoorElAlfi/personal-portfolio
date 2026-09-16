import React from 'react';
import Section from './Section';
import Card from './Card';

const skillGroups = [
  {
    category: 'AI / ML',
    description: 'PyTorch, Stable-Baselines3, reinforcement learning, LLM adversarial testing & red-teaming, prompt engineering.',
  },
  {
    category: 'Agentic AI Tooling',
    description: 'Claude Code, Pi, OpenCode, DSPy, GEPA, Ollama (local LLM deployment).',
  },
  {
    category: 'Security Tools & Methodologies',
    description: 'Metasploit, Nmap, Wireshark, Caldera, Velociraptor, X-Ways Forensics, Volatility, CybORG, MITRE ATT&CK.',
  },
  {
    category: 'Engineering Toolkit',
    description: 'Python, C/C++, JavaScript/TypeScript, Selenium, Docker, AWS, VMware, React.',
  },
];

function Skills() {
  return (
    <Section id="skills" title="Skills">
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {skillGroups.map((group) => (
          <Card key={group.category}>
            <h3 className="font-semibold text-brand-600 dark:text-brand-400">{group.category}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{group.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Skills;
