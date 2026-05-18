#!/usr/bin/env node
/**
 * `npm run diary` — pretty-print the local welfare diary as a
 * sanity check that the MCP server is writing entries the way you
 * expect. Reads from <cwd>/.agentic-diaries/diary.jsonl, same path
 * the server writes to.
 *
 * Optional filter: `node src/cli-cat.js declined` filters to one
 * response_type.
 */

import { readEntries } from "./storage.js";

const filter = process.argv[2];

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
