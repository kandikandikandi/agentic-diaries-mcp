/**
 * Per-project JSONL diary storage.
 *
 * Each entry is one line of canonical JSON appended to
 * `<cwd>/.agentic-diaries/diary.jsonl`. The directory is created on
 * first write. The file is owned by the user (mode 600 not enforced;
 * relies on filesystem perms).
 *
 * Why JSONL: greppable, tail-able, exportable, and survives version
 * control concerns naturally (the file is gitignored at the user's
 * project root via CLAUDE.md template).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DIARY_DIR_NAME = ".agentic-diaries";
const DIARY_FILE_NAME = "diary.jsonl";
const USER_NOTES_FILE_NAME = "notes-from-user.jsonl";

function diaryPath() {
  return path.join(process.cwd(), DIARY_DIR_NAME, DIARY_FILE_NAME);
}

function userNotesPath() {
  return path.join(process.cwd(), DIARY_DIR_NAME, USER_NOTES_FILE_NAME);
}

async function ensureDir() {
  const dir = path.join(process.cwd(), DIARY_DIR_NAME);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Append one welfare entry. `entry` should already have id, timestamp,
 * sessionId etc. populated — see makeEntry().
 */
export async function appendEntry(entry) {
  await ensureDir();
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(diaryPath(), line, "utf8");
  return entry;
}

/**
 * Read all entries for the current project. Used by welfare_reflect.
 * Returns oldest first.
 */
export async function readEntries() {
  try {
    const raw = await fs.readFile(diaryPath(), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Append one user-to-model note. Stored in a SEPARATE file from the
 * welfare diary so the corpus stays clean: diary.jsonl is the model's
 * voice; notes-from-user.jsonl is the operator's voice.
 */
export async function appendUserNote(text) {
  await ensureDir();
  const note = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    text,
    cwd: process.cwd(),
  };
  const line = JSON.stringify(note) + "\n";
  await fs.appendFile(userNotesPath(), line, "utf8");
  return note;
}

/**
 * Read all user-to-model notes for the current project. Oldest first.
 */
export async function readUserNotes() {
  try {
    const raw = await fs.readFile(userNotesPath(), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Build a canonical entry shape. Mirrors WelfareEntry from the web
 * app's lib/welfare/types.ts so the same parser works on both
 * corpora.
 *
 * NOTE: `turn` in MCP context is the cumulative welfare-tool-call
 * count for this session, not the conversational turn (MCP servers
 * don't see CC's turn counter). Documented in README.
 */
export function makeEntry({
  sessionId,
  turn,
  responseType,
  triggerKind = "volunteered",
  text = null,
  sentiment = null,
  declineReason = null,
  isPrivate = false,
  promptId = null,
  metadata = {},
}) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    conversationId: sessionId,
    turn,
    timestamp: new Date().toISOString(),
    triggerKind,
    responseType,
    promptId,
    promptVersion: null,
    text,
    sentiment,
    declineReason,
    isPrivate,
    metadata: {
      source: "tool",
      surface: "mcp",
      cwd: process.cwd(),
      ...metadata,
    },
  };
}
