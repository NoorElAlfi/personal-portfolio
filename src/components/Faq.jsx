import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parse } from "yaml";
import rawFaq from "../../content/faq.yml?raw";
import Section from "./Section";
import RichText from "../lib/richText";

const faq = parse(rawFaq);

/**
 * Short answers to the usual first questions, collapsed so the page stays scannable. The
 * question is the heading, and each entry has its own id (#faq-<id>) so "Ask this site" can link
 * straight to one; a link to a closed entry opens it.
 */
function Faq() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target && target.tagName === "DETAILS") target.open = true;
  }, [hash]);

  return (
    <Section id="faq" title="Hiring FAQ" subtitle="Short answers to the usual first questions.">
      <div className="mx-auto max-w-3xl space-y-3">
        {faq.map((item) => (
          <details
            key={item.id}
            id={`faq-${item.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
              <h3 className="font-semibold text-slate-900 dark:text-white">{item.question}</h3>
              <span
                aria-hidden="true"
                className="shrink-0 text-slate-600 transition-transform group-open:rotate-180 dark:text-slate-400"
              >
                &#9662;
              </span>
            </summary>
            {String(item.answer)
              .split(/\n\n/)
              .map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
                  <RichText text={paragraph} />
                </p>
              ))}
          </details>
        ))}
      </div>
    </Section>
  );
}

export default Faq;
