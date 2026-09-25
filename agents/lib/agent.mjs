// LLM invocation for the pipeline (contract C6).
//
// Two responsibilities:
//   1. run an agent CLI with the prompt on stdin and capture stdout verbatim;
//   2. turn whatever the CLI printed into the artifact object, tolerantly.
//
// The tolerance matters because the same code has to accept:
//   - `omp -p --mode=json`, which emits a JSONL *event stream* (one JSON object
//     per line) and only carries the model's answer inside the last assistant
//     `message_end` event;
//   - a single JSON document on stdout;
//   - plain text containing a fenced ```json block or a bare `{...}` object
//     (e.g. `claude -p --output-format text`, or `omp -p` without `--mode=json`).
import { spawn } from "node:child_process";
import { writeText } from "./util.mjs";

export const DEFAULT_AGENT_CMD = "omp -p --mode=json --no-session";

/** Top-level keys that only ever appear on a real pipeline artifact. */
const ARTIFACT_KEYS = [
  "week",
  "kind",
  "actions",
  "entry_ids",
  "highlights",
  "items",
  "post",
  "verdict",
  "violations",
  "entries",
  "repos",
  "proposals",
  "summaries",
];

/** Envelope fields that may hold the model's answer as text. */
const ENVELOPE_KEYS = [
  "result",
  "text",
  "content",
  "output",
  "response",
  "message",
];

// ---------------------------------------------------------------------------
// command line
// ---------------------------------------------------------------------------

/**
 * Default command, or `$AGENT_CMD` / `--agent-cmd`. `--cwd <root>` is appended
 * for `omp` so the invoked agent can read the repo files the prompt references;
 * other CLIs are used exactly as given.
 */
export function resolveAgentCommand({ agentCmd, root } = {}) {
  const base = String(
    agentCmd ?? process.env.AGENT_CMD ?? DEFAULT_AGENT_CMD,
  ).trim();
  if (!base) throw new Error("empty agent command");
  if (/\bomp\b/.test(base) && !/(^|\s)--cwd(\s|=)/.test(base))
    return `${base} --cwd "${root}"`;
  return base;
}

// ---------------------------------------------------------------------------
// tolerant extraction
// ---------------------------------------------------------------------------

/** Parse every line that is a complete JSON document (JSONL event streams). */
export function parseJsonLines(stdout) {
  const events = [];
  for (const line of String(stdout ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // a non-JSON line is simply not an event
    }
  }
  return events;
}

function isTypedEvent(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.type === "string"
  );
}

/** Event types an agent CLI's streaming mode emits (never envelope types). */
const STREAM_EVENT_TYPES = new Set([
  "session",
  "agent_start",
  "agent_end",
  "turn_start",
  "turn_end",
  "message_start",
  "message_update",
  "message_end",
  "tool_start",
  "tool_end",
  "tool_call",
  "tool_result",
  "step_start",
  "step_end",
  "error",
]);

/**
 * True when stdout is a JSONL event stream rather than a single document that
 * merely carries a `type` field (an envelope such as `{"type":"result"}`).
 */
function isStreamedEvents(events) {
  const typed = events.filter(isTypedEvent);
  if (!typed.length) return false;
  if (typed.some((event) => STREAM_EVENT_TYPES.has(event.type))) return true;
  return typed.length >= 2;
}

/** Flatten an Anthropic-style content value (string | block[] | object). */
function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .filter(
        (c) =>
          c &&
          typeof c === "object" &&
          c.type === "text" &&
          typeof c.text === "string",
      )
      .map((c) => c.text);
    return parts.length ? parts.join("\n") : "";
  }
  if (
    content &&
    typeof content === "object" &&
    typeof content.text === "string"
  )
    return content.text;
  return "";
}

/** Text of the last assistant `message_end` event in a JSONL stream. */
export function assistantTextFromEvents(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (!isTypedEvent(event) || event.type !== "message_end") continue;
    const message = event.message;
    if (!message || message.role !== "assistant") continue;
    const text = contentToText(message.content);
    if (text.trim()) return text;
  }
  return null;
}

/** Last complete top-level `{...}` in `text`, string/escape aware. */
export function lastBalancedObject(text) {
  const src = String(text ?? "");
  let depth = 0;
  let start = -1;
  let candidate = null;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          candidate = src.slice(start, i + 1);
          start = -1;
        }
      }
    }
  }
  return candidate;
}

/** Try `text` as the artifact: whole document, then fenced block, then `{...}`. */
function tryExtractJson(text) {
  const src = String(text ?? "").trim();
  if (!src) return { ok: false, error: "empty output" };
  if (src[0] === "{" || src[0] === "[") {
    try {
      return { ok: true, value: JSON.parse(src) };
    } catch {
      // fall through: the document may still contain a complete object
    }
  }
  const fences = [
    ...src.matchAll(/```(?:json|JSON)?[ \t]*\r?\n([\s\S]*?)```/g),
  ];
  for (let i = fences.length - 1; i >= 0; i -= 1) {
    try {
      return { ok: true, value: JSON.parse(fences[i][1].trim()) };
    } catch {
      // try the next fenced block
    }
  }
  const balanced = lastBalancedObject(src);
  if (balanced) {
    try {
      return { ok: true, value: JSON.parse(balanced) };
    } catch (err) {
      return {
        ok: false,
        error: `found a JSON object but could not parse it: ${err.message}`,
      };
    }
  }
  return { ok: false, error: "no JSON object found in output" };
}

function looksLikeArtifact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ARTIFACT_KEYS.some((key) => key in value);
}

/** Unwrap `{result|text|content|...: "<json>"}` envelopes around the artifact. */
function unwrapEnvelope(value, depth = 0) {
  if (depth > 4) return { ok: false, error: "envelope nesting too deep" };
  if (looksLikeArtifact(value)) return { ok: true, value };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "not a JSON object" };
  }
  for (const key of ENVELOPE_KEYS) {
    if (!(key in value)) continue;
    const raw = value[key];
    const text = typeof raw === "string" ? raw : contentToText(raw);
    if (!text || !text.trim()) continue;
    const parsed = tryExtractJson(text);
    if (!parsed.ok) continue;
    const inner = unwrapEnvelope(parsed.value, depth + 1);
    if (inner.ok) return inner;
  }
  return { ok: false, error: "no artifact object found" };
}

/**
 * Resolve an artifact from raw agent stdout.
 *
 * @param {string} stdout
 * @returns {{ok: boolean, value?: any, via?: 'jsonl'|'stdout'|'text', error?: string}}
 */
export function extractArtifactDetailed(stdout) {
  const text = String(stdout ?? "");
  const events = parseJsonLines(text);
  const streamed = isStreamedEvents(events);

  // (a) JSONL event stream: the answer is the last assistant `message_end`.
  if (streamed) {
    const modelText = assistantTextFromEvents(events);
    if (modelText) {
      const parsed = tryExtractJson(modelText);
      if (parsed.ok) {
        const unwrapped = unwrapEnvelope(parsed.value);
        if (unwrapped.ok)
          return { ok: true, value: unwrapped.value, via: "jsonl" };
      }
    }
  }

  // (b) one JSON document on stdout, and (c) plain text holding a fenced block
  // or a bare `{...}` object. Both also cover a stream whose assistant event was
  // lost but whose envelope still carries the text.
  const whole = tryExtractJson(text);
  if (whole.ok) {
    const unwrapped = unwrapEnvelope(whole.value);
    if (unwrapped.ok)
      return {
        ok: true,
        value: unwrapped.value,
        via: streamed ? "jsonl" : "stdout",
      };
  }

  if (streamed) {
    return {
      ok: false,
      via: "jsonl",
      error: assistantTextFromEvents(events)
        ? "assistant text in the event stream held no artifact"
        : "JSONL event stream carried no assistant text",
    };
  }
  return { ok: false, via: "text", error: whole.error ?? "no artifact found" };
}

/**
 * The artifact object from raw agent stdout. Throws when nothing usable was
 * printed (callers retry once, then fail the stage).
 */
export function extractArtifact(stdout) {
  const result = extractArtifactDetailed(stdout);
  if (!result.ok) {
    const err = new Error(
      `could not extract an artifact from agent output: ${result.error}`,
    );
    err.code = "UNPARSEABLE_AGENT_OUTPUT";
    err.via = result.via;
    throw err;
  }
  return result.value;
}

/** Usage/cost telemetry of the last assistant message, when the CLI reports it. */
export function collectTelemetry(stdout) {
  const events = parseJsonLines(stdout);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (!isTypedEvent(event) || event.type !== "message_end") continue;
    const message = event.message;
    if (!message || message.role !== "assistant") continue;
    const usage = message.usage ?? null;
    if (!message.model && !message.provider && !usage) continue;
    return {
      model: message.model ?? null,
      provider: message.provider ?? null,
      usage: usage ?? null,
      cost: (usage && usage.cost) ?? null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// process
// ---------------------------------------------------------------------------

function runAgentProcess(command, { cwd, input }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.on("error", () => {
      /* the CLI may close stdin early; ignore EPIPE */
    });
    child.stdin.end(input ?? "");
  });
}

function attemptPath(rawPath) {
  return rawPath.endsWith(".txt")
    ? `${rawPath.slice(0, -4)}.attempt1.txt`
    : `${rawPath}.attempt1.txt`;
}

/**
 * Run one agent call: prompt on stdin, raw stdout saved before parsing, one
 * retry on unusable output, then a hard failure.
 *
 * @param {{stage: string, prompt: string, rawPath?: string, agentCmd?: string,
 *          root: string}} options
 * @returns {Promise<{value: any, via: string, attempts: number, command: string,
 *                    telemetry: object|null, stdout: string, stderr: string}>}
 */
export async function callAgent(options) {
  const { stage, prompt, rawPath, agentCmd, root } = options;
  const command = resolveAgentCommand({ agentCmd, root });
  let previousStdout = "";
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const run = await runAgentProcess(command, { cwd: root, input: prompt });
    if (rawPath) {
      // Raw stdout is preserved BEFORE parsing, and never overwritten by a retry.
      if (attempt > 1) writeText(attemptPath(rawPath), previousStdout);
      writeText(rawPath, run.stdout);
    }
    previousStdout = run.stdout;

    const detailed = extractArtifactDetailed(run.stdout);
    if (run.code === 0 && detailed.ok) {
      return {
        value: detailed.value,
        via: detailed.via,
        attempts: attempt,
        command,
        telemetry: collectTelemetry(run.stdout),
        stdout: run.stdout,
        stderr: run.stderr,
      };
    }

    const reason =
      run.code !== 0
        ? `exited ${run.code}`
        : `printed output with no artifact (${detailed.error ?? "unknown"})`;
    const stderrTail = run.stderr.trim().slice(0, 2000);
    lastError = new Error(
      `agent stage "${stage}" ${reason}${stderrTail ? `\nstderr: ${stderrTail}` : ""}`,
    );
    lastError.attempt = attempt;
    lastError.stdout = run.stdout;
  }

  lastError.message += " (failed after retry)";
  throw lastError;
}
