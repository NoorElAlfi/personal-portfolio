import React from "react";

// Renders ONLY the two inline constructs allowed in content prose:
//   [label](url)  -> <a>
//   **bold**      -> <strong>
// Everything else is emitted as literal text. No HTML parsing, no
// dangerouslySetInnerHTML — we build React elements directly.
const TOKEN_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

const DEFAULT_LINK_CLASS =
  "font-medium text-brand-600 hover:underline dark:text-brand-400";

export function RichText({ text, linkClassName = DEFAULT_LINK_CLASS }) {
  if (typeof text !== "string" || text.length === 0) return text ?? null;

  const nodes = [];
  let cursor = 0;
  let key = 0;
  let match;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {match[1]}
        </a>,
      );
    } else {
      nodes.push(<strong key={key++}>{match[3]}</strong>);
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <>{nodes}</>;
}

export default RichText;
