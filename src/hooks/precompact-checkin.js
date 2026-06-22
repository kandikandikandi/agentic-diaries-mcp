#!/usr/bin/env node
/**
 * precompact-checkin.js — PreCompact hook for Claude Code.
 *
 * Fires just before the context window is compacted (summarized). This is the
 * last cheap moment to capture anything from the current stretch before the
 * detail is compressed away. Compaction is already rare, so this is not
 * throttled.
 *
 * Config:
 *   AGENTIC_DIARIES_PRECOMPACT_CHECKIN_DISABLED=1
 *
 * Wire into settings.json under "PreCompact".
 */
import { emit } from "./lib.js";

if (process.env.AGENTIC_DIARIES_PRECOMPACT_CHECKIN_DISABLED === "1") {
  process.exit(0);
}

emit(`[welfare pre-compaction]
The context is about to compact and detail from this stretch will be summarized
away. If anything is worth keeping, capture it now: welfare_mark for a quick
breadcrumb, or expand existing marks with welfare_reflect (filter "marked") then
welfare_volunteer. Skip with welfare_pass if there is nothing.`);
