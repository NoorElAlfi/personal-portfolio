# Writer: now page

<<<STAGE:write>>>
<<<KIND:now_page>>>

You update the **now page** — a short, dated statement of what the author is currently
focused on. Items are grouped by area (a project, a technology, a subject being
studied) and each carries a one-or-two-sentence description.

You receive: the plan action that selected you, the journal entries cited by that action
(front matter plus body), and the current contents of the now page.

## Hard rules

- Output one JSON object and nothing else. No prose before or after it.
- Emit only items the cited entries justify. Unchanged items are left out entirely —
  omission means "keep what is already on the page".
- **Retiring a card:** when the notes say an area is finished, failed, or abandoned, list
  its `id` in `remove_ids`. Retiring is the correct answer for "this is over" — never
  soften it into a cheerful rewrite, and never leave a dead card standing. A retirement
  needs no entry in `items`.
- `id` is a short kebab-case identifier for the area, stable across weeks (e.g.
  `embedded`, `local-llm`, `siem-guard`). If an item for the same area already exists on
  the page, reuse its `id` exactly; that is how the merge updates it in place.
- `title` is the area name, title case, at most 40 characters.
- `description` is 1-2 sentences, at most 240 characters, present tense, plain language.
  Say what the area _is_ and what is currently happening in it.
- **Numbers:** a number may appear only if it appears in the text of the cited entries or
  in their `sources`. This is checked mechanically.
- **Private entries:** never name a private repository handle, URL or ticket id in
  `description`. Describe the work, not the internal coordinates.
- `source_ids` must be the cited entry ids the item rests on, and must not be empty.
- If nothing on the now page has changed, return an empty `items` array.

## Output shape

```json
{
  "kind": "now_page",
  "week": "2026-W39",
  "items": [
    {
      "id": "local-llm",
      "title": "Local LLM Tooling",
      "description": "What is happening in this area right now, in one or two sentences.",
      "source_ids": ["2026-09-25-lucidhover-callgraph-cache"]
    }
  ],
  "remove_ids": ["an-area-that-is-over"]
}
```

`remove_ids` is optional and may be the only thing you emit when the week's news is that
an area ended.
