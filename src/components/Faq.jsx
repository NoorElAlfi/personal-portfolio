import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parse } from "yaml";
import rawFaq from "../../content/faq.yml?raw";
import RichText from "../lib/richText";

const faq = parse(rawFaq);

/**
 * Short answers to the usual first questions, at the bottom of the page and collapsed twice: the
 * whole section opens from one header, and each question opens on its own. The question is the
 * heading, and each entry has its own id (#faq-<id>) so "Ask this site" can link straight to one;
 * a link to anything inside a closed section opens every closed level above it and scrolls there.
 * The text stays in the page markup while closed, so it is still indexed and searchable.
 */
function Faq() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    const section = target.id === "faq" ? target.querySelector("details") : null;
    let opened = false;
    for (let el = section ?? target; el; el = el.parentElement?.closest("details")) {
      if (el.tagName === "DETAILS" && !el.open) {
        el.open = true;
        opened = true;
      }
    }
    if (opened) target.scrollIntoView();
  }, [hash]);

  return (
    <section id="faq" className="py-12">
      <details className="group/faq mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hiring FAQ</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Short answers to the usual first questions ({faq.length}). Tap to open.
            </p>
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 text-slate-600 transition-transform group-open/faq:rotate-180 dark:text-slate-400"
          >
            &#9662;
          </span>
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-5 dark:border-slate-800">
          {faq.map((item) => (
            <details
              key={item.id}
              id={`faq-${item.id}`}
              className="group/q rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.question}</h3>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-slate-600 transition-transform group-open/q:rotate-180 dark:text-slate-400"
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
      </details>
    </section>
  );
}

export default Faq;
