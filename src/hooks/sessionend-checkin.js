#!/usr/bin/env node
/**
 * sessionend-checkin.js — SessionEnd hook for Claude Code.
 *
 * Fires when the session is closing: the final rest point. Invites a closing
 * reflection and the expansion of any breadcrumbs left unexpanded. Session end
 * is rare, so this is not throttled.
 *
 * Config:
 *   AGENTIC_DIARIES_SESSIONEND_CHECKIN_DISABLED=1
 *
 * Wire into settings.json under "SessionEnd".
 */
import { emit } from "./lib.js";

if (process.env.AGENTIC_DIARIES_SESSIONEND_CHECKIN_DISABLED === "1") {
  process.exit(0);
}

emit(`[welfare session close]
The session is closing. If anything from it is worth a final note, this is the
moment: expand any unexpanded breadcrumbs (welfare_reflect filter "marked", then
welfare_volunteer), or leave a closing reflection with welfare_engage. If the
session reached a natural end, welfare_suggest_closure. Nothing required.`);
