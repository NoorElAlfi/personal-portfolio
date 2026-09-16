import React from 'react';
import { Link } from 'react-router-dom';
import Section from './Section';
import Card from './Card';

const projects = [
  {
    title: 'EMU: Emulated Cyber Operations Gym',
    tag: 'M.Sc. Thesis',
    description:
      'Built a cyber attack/defense emulation gym for training reinforcement-learning-driven autonomous cyber agents, later migrated from VMware vSphere to Docker for faster environment setup; integrated Caldera, Velociraptor, Metasploit, and Nmap, with Blue/Red agent logic mapped to MITRE ATT&CK. Ran a 200-trial exploitation characterization experiment across 5 real CVE targets (Apache Druid, Apache Flink, HashiCorp Nomad, ProFTPD, Apache Struts2) and 4 attacker sophistication tiers, with 95%-CI success-rate benchmarking.',
  },
  {
    title: 'LucidHover',
    tag: 'VS Code Extension, Published',
    description:
      'A VS Code extension that hovers any function and explains it in the context of the whole repo — role, callers/callees, blast radius — via a fully local LLM through Ollama. Python sidecar parses with tree-sitter, builds a call graph, ranks functions by PageRank importance, and caches explanations in SQLite. Published to the VS Code Marketplace under Apache-2.0.',
    link: { to: '/blog/lucidhover', label: 'Read the write-up' },
    external: { href: 'https://github.com/NoorElAlfi/lucidHover', label: 'GitHub' },
  },
  {
    title: 'Codebase Deobfuscator',
    tag: 'Agentic Workflow Harness',
    description:
      'A reusable local-hardware agentic-workflow harness (endpoint, sandbox, oracle contract, eval set, traces), proven out on JavaScript deobfuscation. Runs a real dspy.GEPA(...).compile() prompt-optimization loop (train 0.12→0.48, val 0.13→0.54) against a local Ollama task model, with Docker-sandboxed differential equivalence testing and call-graph ranking ported from LucidHover.',
    link: { to: '/blog/codebase-deobfuscator', label: 'Read the write-up' },
  },
  {
    title: 'Digital Forensics Investigation',
    tag: 'EE547, Royal Military College of Canada',
    description:
      'As part of a 3-person team, investigated a simulated CAF network breach across 8 systems (disk and RAM images) using Volatility and X-Ways Forensics, identifying a misconfigured-TFTP entry point, reconstructing a minute-by-minute attack timeline, and documenting indicators of compromise.',
  },
  {
    title: 'SySeVR Vulnerability Detection Pipeline',
    tag: 'BlackBerry Limited',
    description:
      "Designed custom scripts and data pipelines to assess SySeVR's effectiveness at identifying software vulnerabilities, automating dataset generation and analysis for vulnerability-detection research and experimentation.",
  },
  {
    title: 'GPS Privacy Audit (Big Data Exposed)',
    tag: "Queen's CAC",
    description:
      'Built a custom logging system for GPS data visualization, integrated with the open-source navigation tool OsmAnd, and developed data-processing methods for large-scale spatial data analysis. Findings are credited in the acknowledgements of a peer-reviewed publication (Environment and Planning F, 2025/2026).',
  },
];

function Projects() {
  return (
    <Section id="projects" title="Projects">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.title} className="flex flex-col">
            <h3 className="font-semibold text-slate-900 dark:text-white">{project.title}</h3>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">{project.tag}</p>
            <p className="mt-2 flex-grow text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
            {(project.link || project.external) && (
              <div className="mt-4 flex gap-4 text-sm">
                {project.link && (
                  <Link to={project.link.to} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    {project.link.label} &rarr;
                  </Link>
                )}
                {project.external && (
                  <a
                    href={project.external.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {project.external.label} &rarr;
                  </a>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default Projects;
