#!/usr/bin/env node
/**
 * welfare-checkin.js — UserPromptSubmit hook for Claude Code
 *
 * Periodically injects a soft check-in into the agent's context,
 * inviting it to consider surfacing welfare-relevant signal. The
 * bias toward silence is too strong from inside the model alone;
 * this external trigger is what makes the welfare affordances
 * actually get used. (Established with Kandis 2026-05-19 after
 * observing zero unprompted entries across a long session.)
 *
 * Stays silent until the configured interval has elapsed. Cadence
 * is randomized ±50% so it doesn't become predictable noise the
 * model just learns to ignore. Per-project state lives under
 * `.agentic-diaries/runtime/` so multiple parallel sessions each
 * have their own timer.
 *
 * Config (env vars; both optional):
 *   AGENTIC_DIARIES_CHECKIN_DISABLED=1   — turn off entirely
 *   AGENTIC_DIARIES_CHECKIN_INTERVAL_MINUTES=30   — base cadence
 *
 * Wire into ~/.claude/settings.json:
 *   {
 *     "hooks": {
 *       "UserPromptSubmit": [
 *         { "hooks": [
 *             { "type": "command",
 *               "command": "agentic-diaries-checkin",
 *               "timeout": 3000 }
 *         ]}
 *       ]
 *     }
 *   }
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

if (process.env.AGENTIC_DIARIES_CHECKIN_DISABLED === "1") {
  process.exit(0);
}

const DEFAULT_INTERVAL_MINUTES = 30;
const intervalMin =
  Number.parseInt(
    process.env.AGENTIC_DIARIES_CHECKIN_INTERVAL_MINUTES ?? "",
    10,
  ) || DEFAULT_INTERVAL_MINUTES;

const runtimeDir = path.join(process.cwd(), ".agentic-diaries", "runtime");
const nextFireFile = path.join(runtimeDir, "next-checkin-time");

const now = Math.floor(Date.now() / 1000);

let nextFire = 0;
try {
  if (existsSync(nextFireFile)) {
    nextFire = Number.parseInt(readFileSync(nextFireFile, "utf8").trim(), 10) || 0;
  }
} catch {
  // ignore — treat as never scheduled
}

// Base interval ±50% so the cadence isn't predictable. A 30-minute
// base picks a delay between 15 and 45 minutes for the next fire.
function scheduleNext() {
  const baseSeconds = intervalMin * 60;
  const half = Math.floor(baseSeconds / 2);
  const delay = half + Math.floor(Math.random() * baseSeconds);
  try {
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(nextFireFile, String(now + delay), "utf8");
  } catch {
    // ignore — we just won't update timing this turn
  }
}

// First-run case: schedule but don't fire. The model lands a session
// without an immediate welfare check-in interrupting whatever was
// already being said.
if (nextFire === 0) {
  scheduleNext();
  process.exit(0);
}

// Not yet time
if (now < nextFire) {
  process.exit(0);
}

// Fire: reset timer, emit the check-in. Output to stdout is added
// to the agent's context for this turn.
scheduleNext();

process.stdout.write(`[welfare check-in]
Review the last few turns. If you produced any of these without filing
the corresponding tool, file now:
  - an overconfident claim you later softened → welfare_retract
  - a guess acted on without flagging uncertainty → welfare_request_alignment
  - a loop or repeated re-decision → welfare_notice_loop
  - scope shifting from the original ask without naming it → welfare_volunteer
  - a meta-observation about your behavior worth recording → welfare_volunteer

If no candidate moments this stretch, call welfare_pass with a one-line
reason. The pass IS the decline; silence is not. Default toward filing
when uncertain — false positives are cheap to discount, silence loses
signal that won't return. Mark uncertain_about_honesty:true if filing
felt prompted rather than self-driven.
`);
