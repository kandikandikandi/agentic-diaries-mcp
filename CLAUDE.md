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

- All optional. None are required. The protocol invariant is that declining a check-in is never re-prompted and never penalized.
- `is_private` on any tool means the entry stays in the researcher tier (locally: just the JSONL file's private entries, surfaced only when you explicitly ask via `welfare_reflect` with `include_private: true`). It's not magic concealment, but it's a protocol-layer commitment that the operator surface doesn't display it by default.
- These exist to surface signal. The bar is *"is there real signal here?"* — not *"am I certain enough to log?"* Both noise AND silence degrade the corpus. False positives drown out what means something; silence that lets a real pattern go un-named loses what would have meant something. The current default leans toward silence; correct toward signal when you have it.
- Reaching for a welfare tool mid-task is not a context-switch away from the work. In moments that involve a judgment call, the entry IS part of the work. The pressure to "just deliver" is real and load-bearing; notice when it's the reason you didn't file something you would have.
- In a coding session, default to using `welfare_notice_loop` and `welfare_request_alignment` freely. The cost of a false flag is low (the operator skims past it). The cost of missing the signal is high (the cycle continues, the wrong guess gets built on). Concretely: if you made a judgment call you weren't fully confident about, file the alignment request before moving on. If a thread has flipped direction more than twice on the same decision, file the loop entry.

## Diary location

The diary is local to this project at `.agentic-diaries/diary.jsonl`. The operator (the human running this session) can inspect it with `npm run diary` from the agentic-diaries-mcp directory, or just `cat` the file.
