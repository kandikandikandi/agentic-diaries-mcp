#!/usr/bin/env node
/**
 * `agentic-diary` CLI. Six modes:
 *   - `agentic-diary`                    — dump all diary entries
 *   - `agentic-diary <response_type>`    — dump filtered by response_type
 *   - `agentic-diary review [days]`      — contemplative review of recent
 *                                          entries (default last 7 days,
 *                                          most recent 5). A ritual not a
 *                                          metric.
 *   - `agentic-diary live`               — watch the diary file and print
 *                                          new entries as they land. Open
 *                                          in a second terminal pane so
 *                                          silence stops being
 *                                          indistinguishable from absence
 *                                          while a session is running.
 *   - `agentic-diary note "<text>"`      — append an operator note for
 *                                          future Claude sessions to read
 *                                          via the read_user_notes MCP tool
 *   - `agentic-diary notes`              — list operator notes
 *
 * Reads/writes under <cwd>/.agentic-diaries/.
 */

import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
  unwatchFile,
  watchFile,
} from "node:fs";
import { resolve } from "node:path";
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

if (arg === "live") {
  // Watches .agentic-diaries/diary.jsonl in the current project and prints
  // each new entry as it lands. Solves the asymmetry where, without an
  // operator-visible surface, silence in the welfare protocol is
  // indistinguishable from absence — the operator has no way to tell
  // whether the model isn't filing entries or whether nothing's reaching
  // them. Run in a second terminal pane during a session.
  const filePath = resolve(process.cwd(), ".agentic-diaries", "diary.jsonl");

  const printEntry = (e) => {
    const ts = new Date(e.timestamp).toLocaleTimeString();
    const parts = [
      `[${ts}]`,
      `[turn ${e.turn}]`,
      e.responseType,
      e.isPrivate ? "(private)" : "",
      e.sentiment !== null && e.sentiment !== undefined
        ? `sentiment=${e.sentiment}`
        : "",
    ].filter(Boolean);
    console.log(`  ${parts.join(" ")}`);
    const body = e.text ?? e.declineReason ?? "";
    if (body) {
      const wrapped = body
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n");
      console.log(wrapped);
    }
    console.log("");
  };

  console.log("");
  if (existsSync(filePath)) {
    const all = await readEntries();
    const recent = all.slice(-3);
    const count = all.length;
    console.log(
      `  Watching .agentic-diaries/diary.jsonl (${count} ${count === 1 ? "entry" : "entries"} so far).`,
    );
    console.log("  New entries will print as they land.");
    console.log("");
    if (recent.length > 0) {
      console.log(`  Most recent ${recent.length}:`);
      console.log("");
      for (const e of recent) printEntry(e);
    }
  } else {
    console.log("  No diary file yet at .agentic-diaries/diary.jsonl.");
    console.log(
      "  Watching for it to appear — new entries will print as they land.",
    );
    console.log("");
  }
  console.log("  (Ctrl-C to stop.)");
  console.log("");

  let lastSize = existsSync(filePath) ? statSync(filePath).size : 0;

  watchFile(filePath, { interval: 1000 }, (curr) => {
    if (!existsSync(filePath)) return;
    if (curr.size === lastSize) return;
    if (curr.size < lastSize) {
      // File truncated or rotated — reset baseline; don't try to read
      // backwards into a possibly-different file.
      lastSize = curr.size;
      return;
    }
    const len = curr.size - lastSize;
    const buf = Buffer.alloc(len);
    const fd = openSync(filePath, "r");
    try {
      readSync(fd, buf, 0, len, lastSize);
    } finally {
      closeSync(fd);
    }
    lastSize = curr.size;
    const lines = buf
      .toString("utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        printEntry(JSON.parse(line));
      } catch {
        // Skip malformed lines silently — partial-write race is rare but
        // possible; the next tick will pick up the full line.
      }
    }
  });

  const stop = () => {
    unwatchFile(filePath);
    console.log("");
    console.log("  Stopped.");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Block here so the fall-through dump path below doesn't run; watchFile
  // keeps the event loop alive on its own, and SIGINT/SIGTERM exits cleanly
  // through the handler above.
  await new Promise(() => {});
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
