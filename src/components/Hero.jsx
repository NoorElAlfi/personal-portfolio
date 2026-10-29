import React from 'react';
import { Link } from 'react-router-dom';

// Four results already published on this site, each linking to where they are shown.
const proof = [
  { value: '40+', label: 'test cases generated from YAML at Miipe, without the UI', to: '/blog/test-authoring-cli' },
  { value: '18 of 20', label: 'held-out questions where errag retrieved the right page, up from 4', to: '/blog/elden-ring-rag' },
  { value: '96,000/s', label: 'log lines parsed by SIEM Guard rules, against roughly 1 on the LLM path', to: '/blog/siem-guard-detection-hardening' },
  { value: '50+', label: 'defects found before production release across a 100k+ customer base', href: '#experience' },
];

const tileClass =
  'flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-brand-700';

function ProofTile({ value, label, to, href }) {
  const body = (
    <>
      <span className="text-2xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">{value}</span>
      <span className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className={tileClass}>{body}</Link>
  ) : (
    <a href={href} className={tileClass}>{body}</a>
  );
}

const secondaryButton =
  'rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-400';

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 py-8 text-center">
      <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
        Agentic AI &amp; Security Engineer
      </span>

      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
        Noor El Alfi
      </h1>

      <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
        QA Automation Engineer at Miipe. Outside of work, I build local, agentic LLM tooling
        (VS Code extensions, prompt-optimization pipelines). My research sits at the
        intersection of security, reinforcement learning, and AI: I'm completing a
        research-based M.Sc. in AI and Cybersecurity at Queen's University (NSERC CREATE program,
        thesis defense pending), building an emulated cyber-operations gym that trains
        reinforcement-learning agents for autonomous cyber operations. Previously I did
        adversarial red-teaming against frontier LLMs at Scale AI.
      </p>

      <ul className="grid w-full max-w-4xl grid-cols-2 gap-3 pt-2 lg:grid-cols-4">
        {proof.map((item) => (
          <li key={item.value}>
            <ProofTile {...item} />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href="#projects"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
        >
          View Projects
        </a>
        <a href="https://github.com/NoorElAlfi" target="_blank" rel="noopener noreferrer" className={secondaryButton}>
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/noor-el-alfi-527a1a20a/"
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButton}
        >
          LinkedIn
        </a>
        <a href="mailto:noor.alfi@gmail.com" className={secondaryButton}>
          Email
        </a>
        <Link to="/blog" className={secondaryButton}>
          Read the Blog
        </Link>
      </div>

      <p className="pt-2 text-sm text-slate-600 dark:text-slate-400">
        Languages: English, Arabic, German
      </p>
    </section>
  );
}

export default Hero;
