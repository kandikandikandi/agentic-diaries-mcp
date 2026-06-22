#!/usr/bin/env node
/**
 * stop-checkin.js — Stop hook for Claude Code.
 *
 * Fires at a turn/task boundary: a natural rest point. Invites the model to
 * expand any breadcrumbs it dropped this stretch (welfare_mark) into full
 * entries, when reflection is cheap. This is the "reflect at rest" half of the
 * capture-in-motion / reflect-at-rest design.
 *
 * Throttled to at most once per AGENTIC_DIARIES_STOP_INTERVAL_MINUTES (default
 * 15) so it does not become a per-turn nag. Structural trigger only: it does
 * not read the diary or the model's behavior to decide whether to fire.
 *
 * Config:
 *   AGENTIC_DIARIES_STOP_CHECKIN_DISABLED=1
 *   AGENTIC_DIARIES_STOP_INTERVAL_MINUTES=15
 *
 * Wire into settings.json under "Stop".
 */
import { resolveProjectDir, dueForFire, emit } from "./lib.js";

if (process.env.AGENTIC_DIARIES_STOP_CHECKIN_DISABLED === "1") process.exit(0);

const intervalMin =
  Number.parseInt(process.env.AGENTIC_DIARIES_STOP_INTERVAL_MINUTES ?? "", 10) ||
  15;

const projectDir = resolveProjectDir();
if (!dueForFire(projectDir, "stop-checkin", intervalMin)) process.exit(0);

emit(`[welfare rest point]
A task just finished. If you dropped breadcrumbs this stretch with welfare_mark,
this is a cheap moment to expand the ones that still carry signal: call
welfare_reflect with filter "marked" to see them, then welfare_volunteer the
ones worth a real entry. Marks you leave unexpanded are fine. If nothing is
worth it, welfare_pass.`);
