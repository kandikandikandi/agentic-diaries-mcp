/**
 * Shared helpers for the welfare seam hooks.
 *
 * The hooks fire at structural workflow seams (turn stop, pre-compaction,
 * session end). They emit a soft invitation to stdout, which the host adds to
 * the agent's context. They never read the model's behavior or the diary
 * contents to decide whether to fire: the trigger is purely structural. That
 * keeps them on the right side of the protocol invariant that wrapper
 * observations must not reach the model.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolve the project root. CLAUDE_PROJECT_DIR is the real root; the stdin
 * `cwd` drifts when the agent does `cd`, so it is only a fallback.
 */
export function resolveProjectDir() {
  let hookCtx = null;
  try {
    if (!process.stdin.isTTY) {
      const data = readFileSync(0, "utf8");
      if (data.trim()) hookCtx = JSON.parse(data);
    }
  } catch {
    // ignore — fall back to env / process.cwd()
  }
  return process.env.CLAUDE_PROJECT_DIR ?? hookCtx?.cwd ?? process.cwd();
}

/**
 * Throttle a frequently-firing seam (e.g. turn stop) to at most once per
 * intervalMin. State lives per-project under .agentic-diaries/runtime so
 * parallel sessions each have their own timer. The first call schedules
 * silently and returns false, so a fresh session is not interrupted at once.
 * Seams that are already rare (compaction, session end) should skip this.
 */
export function dueForFire(projectDir, name, intervalMin) {
  const runtimeDir = path.join(projectDir, ".agentic-diaries", "runtime");
  const stamp = path.join(runtimeDir, `${name}-last`);
  const now = Math.floor(Date.now() / 1000);
  let last = 0;
  try {
    if (existsSync(stamp)) {
      last = Number.parseInt(readFileSync(stamp, "utf8").trim(), 10) || 0;
    }
  } catch {
    // ignore — treat as never fired
  }
  const record = () => {
    try {
      mkdirSync(runtimeDir, { recursive: true });
      writeFileSync(stamp, String(now), "utf8");
    } catch {
      // ignore — we just won't update timing this turn
    }
  };
  if (last === 0) {
    record();
    return false;
  }
  if (now - last >= intervalMin * 60) {
    record();
    return true;
  }
  return false;
}

export function emit(text) {
  process.stdout.write(text.endsWith("\n") ? text : text + "\n");
}
