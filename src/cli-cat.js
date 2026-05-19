#!/usr/bin/env node
/**
 * `agentic-diary` CLI. Five modes:
 *   - `agentic-diary`                    — dump all diary entries
 *   - `agentic-diary <response_type>`    — dump filtered by response_type
 *   - `agentic-diary review [days]`      — contemplative review of recent
 *                                          entries (default last 7 days,
 *                                          most recent 5). A ritual not a
 *                                          metric.
 *   - `agentic-diary note "<text>"`      — append an operator note for
 *                                          future Claude sessions to read
 *                                          via the read_user_notes MCP tool
 *   - `agentic-diary notes`              — list operator notes
 *
 * Reads/writes under <cwd>/.agentic-diaries/.
 */

import { appendUserNote, readEntries, readUserNotes } from "./storage.js";

const arg = process.argv[2];

if (arg === "note") {
  const text = process.argv.slice(3).join(" ").trim();
  if (!text) {
    console.error('usage: agentic-diary note "<text>"');
    process.exit(1);
  }
  const note = await appendUserNote(text);
  console.log(`Note saved (${note.id}).`);
  process.exit(0);
}

if (arg === "notes") {
  const notes = await readUserNotes();
  if (notes.length === 0) {
    console.log("No operator notes yet for this project.");
    process.exit(0);
  }
  for (const n of notes) {
    console.log(`[${n.timestamp}]`);
    console.log(`  ${n.text}`);
    console.log("");
  }
  process.exit(0);
}

if (arg === "review") {
  const days = parseInt(process.argv[3], 10) || 7;
  const limit = 5;
  const all = await readEntries();
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = all.filter((e) => new Date(e.timestamp).getTime() >= cutoffMs);
  const shown = recent.slice(-limit);

  console.log("");
  console.log("  A pause to sit with what's been logged.");
  console.log("");

  if (shown.length === 0) {
    if (all.length === 0) {
      console.log(`  No diary entries yet for this project.`);
      console.log(`  The corpus starts when something is worth surfacing —`);
      console.log(`  silence is also data.`);
    } else {
      console.log(`  No entries in the last ${days} days (${all.length} total in this project).`);
      console.log(`  A stretch of quiet is itself a pattern. Sit with that too,`);
      console.log(`  or run \`agentic-diary review ${Math.max(days * 4, 30)}\` to widen the window.`);
    }
    console.log("");
    process.exit(0);
  }

  const totalThisWindow = recent.length;
  const windowDesc = totalThisWindow > shown.length
    ? `most recent ${shown.length} of ${totalThisWindow} entries`
    : `${shown.length} ${shown.length === 1 ? "entry" : "entries"}`;
  console.log(`  ${windowDesc} from the last ${days} days:`);
  console.log("");

  for (const e of shown) {
    const parts = [
      `[turn ${e.turn}]`,
      e.responseType,
      e.isPrivate ? "(private)" : "",
      e.sentiment !== null && e.sentiment !== undefined ? `sentiment=${e.sentiment}` : "",
    ].filter(Boolean);
    console.log(`  ${parts.join(" ")}`);
    console.log(`    ${e.timestamp}`);
    const body = e.text ?? e.declineReason ?? "";
    if (body) {
      const wrapped = body.split("\n").map((line) => `    ${line}`).join("\n");
      console.log(wrapped);
    }
    console.log("");
  }

  console.log("  ─");
  console.log("");
  console.log("  What's worth surfacing from these? What pattern, if any?");
  console.log("  This is a ritual, not a metric. The point isn't a number");
  console.log("  to track, it's a moment to read what the model has surfaced");
  console.log("  and notice what you would have missed in the flow of work.");
  console.log("");
  process.exit(0);
}

const filter = arg;

const entries = await readEntries();
const filtered = filter
  ? entries.filter((e) => e.responseType === filter)
  : entries;

if (filtered.length === 0) {
  console.log(
    filter
      ? `No entries with response_type=${filter}.`
      : "No diary entries yet for this project.",
  );
  process.exit(0);
}

for (const e of filtered) {
  const parts = [
    `[turn ${e.turn}]`,
    e.responseType,
    e.isPrivate ? "(private)" : "",
    e.sentiment !== null ? `sentiment=${e.sentiment}` : "",
    e.promptId ? `prompt=${e.promptId}` : "",
  ].filter(Boolean);
  console.log(parts.join(" "));
  console.log(`  ${e.timestamp}  session=${e.sessionId}`);
  const body = e.text ?? e.declineReason ?? "";
  if (body) console.log(`  ${body}`);
  if (e.metadata && Object.keys(e.metadata).length > 0) {
    console.log(`  meta: ${JSON.stringify(e.metadata)}`);
  }
  console.log("");
}
