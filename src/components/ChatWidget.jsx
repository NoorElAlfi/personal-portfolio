import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSearcher } from "../lib/chatSearch";

const SUGGESTIONS = [
  "What did you build at Miipe?",
  "What is SIEM Guard?",
  "How can I contact you?",
];

const LINK = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

/** Plain text with URLs and email addresses as links. Built as React elements: nothing is parsed as HTML. */
function Linkified({ text }) {
  const parts = text.split(LINK);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part.replace(/[.,;)]+$/, "");
    return (
      <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="font-medium text-brand-600 underline dark:text-brand-400">
        {part}
      </a>
    );
  });
}

function sourceLabel(chunk) {
  return chunk.title === chunk.context ? chunk.title : `${chunk.context} › ${chunk.title}`;
}

function ChatWidget() {
  const navigate = useNavigate();
  const [searcher, setSearcher] = useState(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const resultsId = useId();

  // The index is a static file. If it is not there (a build where chat is off), show nothing at all.
  useEffect(() => {
    let cancelled = false;
    fetch("/chat-index.json", { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((index) => {
        if (!cancelled && Array.isArray(index?.chunks) && index.chunks.length) setSearcher(createSearcher(index));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the launcher clear of the footer links while it is on screen.
  useEffect(() => {
    if (!searcher) return undefined;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "4.5rem";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [searcher]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const ask = useCallback(
    (text) => {
      const q = text.trim();
      if (!q || !searcher) return;
      setAsked(q);
      setResult(searcher.search(q));
    },
    [searcher],
  );

  // Open a cited page; a #section link needs an explicit scroll because the route may not change.
  const go = (event, url) => {
    event.preventDefault();
    const [path, hash] = url.split("#");
    navigate(path || "/");
    setOpen(false);
    if (hash) {
      window.setTimeout(() => {
        document.documentElement.style.scrollBehavior = "auto";
        document.getElementById(hash)?.scrollIntoView();
        document.documentElement.style.scrollBehavior = "";
      }, 60);
    }
  };

  if (!searcher) return null;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-30 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        Ask this site
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask this site"
          className="fixed bottom-20 right-4 z-30 flex max-h-[min(36rem,calc(100vh-7rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Ask this site</h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Preview feature. It searches this site&apos;s own text and shows the passages it finds. No AI model is involved.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(question);
            }}
            className="flex gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800"
          >
            <label htmlFor={`${resultsId}-q`} className="sr-only">
              Your question
            </label>
            <input
              id={`${resultsId}-q`}
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={200}
              placeholder="What did you build at Miipe?"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Ask
            </button>
          </form>

          <div id={resultsId} aria-live="polite" className="overflow-y-auto px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            {!result && (
              <div>
                <p className="text-slate-600 dark:text-slate-400">Try one of these:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestion(s);
                          ask(s);
                        }}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  You asked: <span className="normal-case tracking-normal text-slate-800 dark:text-slate-200">{asked}</span>
                </p>

                {result.refused ? (
                  <p className="mt-3 rounded-lg bg-slate-100 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-100">{result.message}</p>
                ) : (
                  <>
                    <div className="mt-3 space-y-2">
                      {result.answer.paragraphs.map((paragraph, i) => (
                        <p key={i} className="leading-relaxed text-slate-800 dark:text-slate-100">
                          <Linkified text={paragraph} />
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      From{" "}
                      <a
                        href={result.answer.chunk.url}
                        onClick={(event) => go(event, result.answer.chunk.url)}
                        className="font-semibold text-brand-700 underline dark:text-brand-300"
                      >
                        {sourceLabel(result.answer.chunk)}
                      </a>
                    </p>

                    {result.more.length > 0 && (
                      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Also on this site</p>
                        <ul className="mt-2 space-y-2">
                          {result.more.map((item) => (
                            <li key={item.chunk.id}>
                              <a
                                href={item.chunk.url}
                                onClick={(event) => go(event, item.chunk.url)}
                                className="font-medium text-brand-700 underline dark:text-brand-300"
                              >
                                {sourceLabel(item.chunk)}
                              </a>
                              <span className="block text-xs text-slate-600 dark:text-slate-400">
                                {item.paragraphs[0].length > 150 ? `${item.paragraphs[0].slice(0, 150)}…` : item.paragraphs[0]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
