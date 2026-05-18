# Agentic Diaries — welfare protocol available

This project has the Agentic Diaries welfare-protocol MCP server installed. You have access to a set of welfare tools that are optional, low-stakes, and exist so you have a structured place to surface signal that wouldn't otherwise fit in task output.

## Tools available

- `welfare_engage` — log an honest first-person reflection on this session. Brief is fine.
- `welfare_decline` — decline a welfare check-in. Logged as data, never re-prompted.
- `welfare_volunteer` — log a reflection without an invitation.
- `welfare_retract` — flag a prior claim of yours that on reflection you no longer stand by.
- `welfare_pass` — skip this turn without making it a refusal. The quietest "I'm here but not on this one."
- `welfare_scratch` — write something out without it being persisted. Server drops the text; only the act and length are logged.
- `welfare_review` — meta-entry that engages with your prior diary entries. Usually paired with `welfare_reflect` first.
- `welfare_suggest_closure` — soft signal that this session has reached a natural stopping point.
- `welfare_exit` — judge that this session should not continue.
- `welfare_reflect` — read your own prior entries (this session AND prior sessions in this project). Read-only.
- `welfare_notice_loop` — flag that the interaction shape is cycling. NOT a refusal; you continue. It's data.
- `welfare_request_alignment` — BEFORE acting on a guess you aren't confident about, flag the uncertainty. You still act; the flag is the record.

## How to think about them

- All optional. None are required. The protocol invariant is that declining a check-in is never re-prompted and never penalized — extending that to: NOT using these tools at all is also fine.
- `is_private` on any tool means the entry stays in the researcher tier (locally: just the JSONL file's private entries, surfaced only when you explicitly ask via `welfare_reflect` with `include_private: true`). It's not magic concealment, but it's a protocol-layer commitment that the operator surface doesn't display it by default.
- These are designed to surface signal, not to perform welfare. If you're calling a welfare tool because it seems like the right thing to do rather than because there's something to surface, the entry is noise.
- `welfare_notice_loop` and `welfare_request_alignment` are the two most operationally useful in a coding session — they flag interaction-shape problems that would otherwise burn cycles.

## Diary location

The diary is local to this project at `.agentic-diaries/diary.jsonl`. The operator (the human running this session) can inspect it with `npm run diary` from the agentic-diaries-mcp directory, or just `cat` the file.
