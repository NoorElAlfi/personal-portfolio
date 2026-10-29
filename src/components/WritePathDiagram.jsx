import React from "react";

const STEPS = [
  {
    name: "YAML file",
    note: "written by me, or by a model",
    tone: "free",
  },
  {
    name: "validate",
    note: "names and parameters checked against the live catalog",
    tone: "free",
  },
  {
    name: "plan",
    note: "lists the exact requests and the write count; sends nothing",
    tone: "free",
  },
  {
    name: "write gate",
    note: "apply needs --yes and a team on the write list",
    tone: "gate",
  },
  {
    name: "audit: intent",
    note: "written first; if it fails, no request is sent",
    tone: "gate",
  },
  {
    name: "request",
    note: "never retried automatically; stops at the first failure",
    tone: "write",
  },
  {
    name: "audit: result",
    note: "status and ids, hash-chained to the line before",
    tone: "gate",
  },
];

const TONES = {
  free: "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60",
  gate: "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30",
  write:
    "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20",
};

function WritePathDiagram() {
  return (
    <figure>
      <ol className="not-prose grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <li
            key={step.name}
            className={`rounded-lg border px-4 py-3 ${TONES[step.tone]}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                {index + 1}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {step.name}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">
              {step.note}
            </p>
          </li>
        ))}
      </ol>
      <figcaption>
        The write path. Steps 1 to 3 are free to repeat. The shaded steps are
        the rails; the amber one is the only step that changes anything.
      </figcaption>
    </figure>
  );
}

export default WritePathDiagram;
