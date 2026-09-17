import React from 'react';
import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 py-8 text-center">
      <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
        Agentic AI &amp; Security Engineer
      </span>

      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
        Noor El Alfi
      </h1>

      <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        I'm currently a QA Automation Engineer working toward agentic AI and AI-security roles,
        backed by a cybersecurity/AI research foundation: my research sits at the intersection of
        security, reinforcement learning, and AI. I test enterprise software for one of
        Canada's largest telecom providers, and I'm completing a research-based M.Sc. in
        Cybersecurity at Queen's University (NSERC CREATE program, thesis defense pending),
        building an emulated cyber-operations gym that trains reinforcement-learning agents for
        autonomous cyber operations. Outside of work, I build local, agentic LLM tooling (VS Code
        extensions, prompt-optimization pipelines) and previously did adversarial red-teaming
        against frontier LLMs at Scale AI.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href="#projects"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
        >
          View Projects
        </a>
        <Link
          to="/blog"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-400"
        >
          Read the Blog
        </Link>
      </div>

      <p className="pt-2 text-sm text-slate-400 dark:text-slate-500">
        Languages: English, Arabic, German
      </p>
    </section>
  );
}

export default Hero;
