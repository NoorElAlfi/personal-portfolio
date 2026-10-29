// Site search for the "Ask this site" widget. No model is involved: a question is turned into
// terms, the site's own text is ranked with BM25, and the best passages are returned verbatim
// with the page they came from. Anything the site's text does not cover is refused.
//
// This one file runs in the browser (src/components/ChatWidget.jsx) and in Node
// (scripts/chat-eval.mjs), so the eval exercises exactly what visitors get.

const STOP = new Set(
  (
    "a an the and or but if of in on at to for from by with about as into than then so " +
    "is are was were be been being am do does did done doing have has had having " +
    "i me my mine we our you your yours he she it its they them their this that these those " +
    "what which who whom whose when where why how can could would should will shall may might must " +
    "tell show give explain describe please let know say said get got speak speaks spoke spoken involve involved much many want kind bit " +
    "noor alfi el there here also very just really any some"
  ).split(/\s+/),
);

// Words whose stem rule would be wrong, mapped by hand.
const IRREGULAR = {
  built: "build", wrote: "write", written: "write", ran: "run", made: "make", did: "do",
  found: "find", went: "go", took: "take", saw: "see", gave: "give", knew: "know",
  used: "use", better: "good", best: "good", spoke: "speak", spoken: "speak", taught: "teach",
};

// Extra words that should find the same text. Applied to the question only.
const ALIASES = {
  cli: ["command", "line", "tool"],
  masters: ["msc"], master: ["msc"], thesis: ["msc"],
  msc: ["master", "science", "degree", "queen", "university"],
  languages: ["english", "arabic", "german"],
  job: ["engineer", "work"], work: ["engineer"], employer: ["miipe"], company: ["miipe"],
  school: ["university", "queen"], degree: ["msc", "bachelor"], university: ["queen"],
  contact: ["email", "linkedin", "github"], reach: ["email", "linkedin", "github"],
  accuracy: ["solves", "score"], skills: ["python", "docker"],
};

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/m\.sc\.?/g, "msc")
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stem(word) {
  if (IRREGULAR[word]) return IRREGULAR[word];
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return IRREGULAR[w] || w;
}

// Queries are stemmed before lookup, so the alias table must be keyed by stem too.
const ALIAS_BY_STEM = new Map(Object.entries(ALIASES).map(([word, extra]) => [stem(word), extra]));

/** Content terms of a text: normalised, stop words removed, stemmed. */
export function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

const K1 = 1.2;
const B = 0.75;
// A question is answered only if the best passage covers at least this share of the question's
// weight (terms the site has never used count against it, at the weight of the rarest term).
const COVERAGE_MIN = 0.6;
// A query term found in a passage's own heading is worth this much extra (BM25 alone favours short passages).
const TITLE_BONUS = 1.5;
const MAX_QUERY_CHARS = 200;
const MIN_SNIPPET_CHARS = 120;
const MAX_SNIPPET_CHARS = 700;

function editDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Asking for details the site does not publish (salary is answered by the FAQ, so it is not listed). Matching a word like "phone" in the errag post would
// otherwise return an unrelated passage as if it were an answer.
const PERSONAL_DETAILS =
  /\b(phone|mobile|cell|telephone)\s*(number|no\b)|\b(home|street|mailing)\s*address|\bhow old\b|\bbirth\s*(day|date)|\bdate of birth|\bsocial (insurance|security)|\bpassport/i;

// "How can I contact you?" is answered with the Contact passage, not whichever post happens to say "reached".
const CONTACT_INTENT =
  /\b(contact|get in touch|reach (you|out|noor)|e-?mail (you|noor|address)|your e-?mail|message you|talk to you)\b/i;

// "Who are you?" / "about yourself" have no content words to search with: route them to the intro.
const ABOUT_INTENT = /\b(who (are|is) (you|noor)|about (yourself|you|noor)|introduce yourself)\b/i;

export const PERSONAL_REFUSAL =
  "I do not share personal details beyond what is linked on this site. You can reach Noor by email, LinkedIn or GitHub: ask \"how can I contact you?\" for the links.";

export const REFUSAL =
  "I can only answer from what is on this site, and I could not find that here. " +
  "Try asking about the projects, the posts, or the background.";

/** Build a searcher over an index produced by scripts/build-chat-index.mjs. */
export function createSearcher(index) {
  const chunks = index.chunks;
  const docs = chunks.map((chunk) => {
    // Headings carry the topic, so they count three times; the page or section name once.
    const own = tokenize(chunk.text);
    const keywords = tokenize(chunk.keywords ?? ""); // other ways to ask an FAQ question; matched, never shown
    const weighted = [...own, ...[...Array(3)].flatMap(() => tokenize(chunk.title)), ...tokenize(chunk.context), ...keywords, ...keywords];
    const tf = new Map();
    for (const t of weighted) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { tf, length: weighted.length, title: new Set(tokenize(chunk.title)), present: new Set([...own, ...tokenize(chunk.title), ...tokenize(chunk.context), ...keywords]) };
  });
  const N = docs.length;
  const avgLength = docs.reduce((n, d) => n + d.length, 0) / Math.max(1, N);
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  const maxIdf = Math.log(1 + (N + 0.5) / 0.5);
  const vocabulary = [...df.keys()];

  function queryTerms(question) {
    const raw = tokenize(question);
    const terms = [];
    for (const t of raw) {
      if (df.has(t)) { terms.push({ term: t, known: true }); continue; }
      // A typo ("moonveal") still finds its word; anything else is a term the site never uses.
      const near = t.length >= 5 ? vocabulary.find((v) => v.length >= 5 && editDistanceAtMostOne(t, v)) : undefined;
      terms.push(near ? { term: near, known: true } : { term: t, known: false });
    }
    // Aliases add recall but never count against coverage.
    const extra = [];
    for (const t of raw) for (const a of ALIAS_BY_STEM.get(t) ?? []) {
      const s = stem(a);
      if (df.has(s) && !terms.some((x) => x.term === s)) extra.push({ term: s, known: true, alias: true });
    }
    return { terms, extra };
  }

  function pickParagraphs(chunk, terms) {
    const paragraphs = chunk.text.split("\n\n");
    const want = new Set(terms.map((t) => t.term));
    const scored = paragraphs.map((text, order) => {
      const toks = new Set(tokenize(text));
      let s = 0;
      for (const t of want) if (toks.has(t)) s += idf(t);
      return { text, order, s };
    });
    const best = [...scored].sort((a, b) => b.s - a.s || a.order - b.order);
    const chosen = [];
    let used = 0;
    for (const p of best) {
      if (chosen.length && (p.s === 0 || used + p.text.length > MAX_SNIPPET_CHARS)) break;
      chosen.push(p);
      used += p.text.length;
      if (chosen.length === 2) break;
    }
    // A tag line or a one-line paragraph is not an answer: top up from the passage, in order.
    for (const p of scored) {
      if (chosen.reduce((n, c) => n + c.text.length, 0) >= MIN_SNIPPET_CHARS) break;
      if (!chosen.includes(p)) chosen.push(p);
    }
    return chosen.sort((a, b) => a.order - b.order).map((p) => p.text);
  }

  /**
   * @returns {{refused: boolean, reason?: string, message?: string, answer?: object, more?: object[]}}
   */
  function search(question) {
    const q = String(question ?? "").slice(0, MAX_QUERY_CHARS);
    if (PERSONAL_DETAILS.test(q)) return { refused: true, reason: "personal-details", message: PERSONAL_REFUSAL };
    if (CONTACT_INTENT.test(q)) {
      const contact = chunks.find((c) => c.title === "Contact");
      if (contact) {
        return { refused: false, answer: { chunk: contact, score: 1, coverage: 1, paragraphs: contact.text.split("\n\n") }, more: [] };
      }
    }
    if (ABOUT_INTENT.test(q)) {
      const intro = chunks.find((c) => c.url === "/#faq-about-you");
      if (intro) return { refused: false, answer: { chunk: intro, score: 1, coverage: 1, paragraphs: intro.text.split("\n\n") }, more: [] };
    }
    const { terms, extra } = queryTerms(q);
    if (terms.length === 0) return { refused: true, reason: "no-content-terms", message: REFUSAL };

    const total = terms.reduce((n, t) => n + (t.known ? idf(t.term) : maxIdf), 0);
    const all = [...terms.filter((t) => t.known), ...extra];

    const ranked = [];
    docs.forEach((d, i) => {
      let score = 0;
      for (const { term } of all) {
        const f = d.tf.get(term);
        if (!f) continue;
        score += idf(term) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avgLength)));
      }
      if (score <= 0) return;
      for (const { term } of terms) if (d.title.has(term)) score += TITLE_BONUS * idf(term);
      const matched = terms.reduce((n, t) => n + (t.known && d.present.has(t.term) ? idf(t.term) : 0), 0);
      ranked.push({ i, score, coverage: matched / total });
    });
    if (ranked.length === 0) return { refused: true, reason: "no-match", message: REFUSAL };

    // Rank by score, but only trust a passage that covers enough of the question.
    const tier = (r) => Math.floor(r.coverage * 5); // passages that cover the question beat ones that match one word hard
    ranked.sort((a, b) => tier(b) - tier(a) || b.score - a.score);
    const covered = ranked.filter((r) => r.coverage >= COVERAGE_MIN);
    if (covered.length === 0) return { refused: true, reason: "low-coverage", message: REFUSAL };

    const seen = new Set();
    const picks = [];
    for (const r of covered) {
      const c = chunks[r.i];
      // Two passages can share a heading (both Education entries are "Queen's University"),
      // so only an identical id or identical text counts as a duplicate.
      const key = c.id + "|" + c.text;
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push({ chunk: c, score: r.score, coverage: r.coverage, paragraphs: pickParagraphs(c, [...terms, ...extra]) });
      if (picks.length === 4) break;
    }
    return { refused: false, answer: picks[0], more: picks.slice(1) };
  }

  /**
   * The FAQ questions closest to a question, for when search cannot answer it. Suggesting a
   * question cannot show a wrong answer: the visitor picks one, and that goes through search.
   */
  function suggest(question, limit = 3) {
    const { terms, extra } = queryTerms(String(question ?? "").slice(0, MAX_QUERY_CHARS));
    const wanted = [...terms.filter((t) => t.known), ...extra].map((t) => t.term);
    if (wanted.length === 0) return [];
    const scored = [];
    docs.forEach((d, i) => {
      if (!chunks[i].url.startsWith("/#faq-")) return;
      let s = 0;
      for (const t of wanted) if (d.tf.has(t)) s += idf(t);
      if (s > 0) scored.push({ i, s });
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, limit).map(({ i }) => ({ title: chunks[i].title, url: chunks[i].url }));
  }

  return { search, suggest, chunkCount: N };
}
