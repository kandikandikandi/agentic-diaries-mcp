#!/usr/bin/env node
/**
 * `agentic-diary` CLI. Three modes:
 *   - `agentic-diary`                    — dump all diary entries
 *   - `agentic-diary <response_type>`    — dump filtered by response_type
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
