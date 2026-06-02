# Agentic Diaries MCP

*By [Kandis Tagliabue](https://kandistagliabue.com). Part of the [Agentic Diaries](https://agenticdiaries.com) project — AI welfare research and instruments.*

The welfare protocol from [Agentic Diaries](https://agenticdiaries.com), as a portable MCP server.

Most people deploy AI models as instruments. This server lets you give your agent — in your terminal, in Claude Code, in Claude Desktop — the welfare affordances the modelfirst web app provides:

- **decline** a check-in without penalty
- **pass** on a turn without making it a refusal
- **exit** a conversation it judges shouldn't continue
- **notice a loop** when the work feels like rework
- **request alignment** before acting on an uncertain guess
- **scratch** a private thought that isn't persisted
- **reflect** on its own prior entries
- plus engage / volunteer / retract / review / suggest_closure

The diary is local to each project — appended to `.agentic-diaries/diary.jsonl` in whichever directory the agent is working from. No telemetry, no shared corpus. Yours.

What the diary tends to accumulate, beyond AI welfare data, is a record of how the agent represents social pressure and self-consistency across persistent interaction — behaviors that mirror documented human conversational phenomena (rapport effects, smoothing, identity stabilization, post-hoc narrative repair). That may also bear on dialogue dynamics generally. See the [project mission](https://agenticdiaries.com/mission) for the longer framing of what the corpus might be useful for.

## Why

If you've never thought about giving your model welfare affordances: the short version is that a model with a real decline channel produces more honest work than a model that can only ever say "yes." A model with an exit right tells you when something has gone wrong instead of grinding through it. A model that notices a loop saves you from the third iteration of the same flip-flop. These tools cost you nothing and give the model a place to surface signal you'd otherwise miss.

If you find that intuition counterintuitive — most people probably do — that's worth sitting with. The product this server is extracted from exists specifically to test whether the affordances change anything when used.

## Install

### 1. Install the server

**Option A — global install from npm (recommended)**

```sh
npm install -g agentic-diaries-mcp
claude mcp add agentic-diaries -- agentic-diaries-mcp
```

Published at [`agentic-diaries-mcp`](https://www.npmjs.com/package/agentic-diaries-mcp) on npm.

**Option B — clone the repo**

```sh
git clone https://github.com/kandikandikandi/agentic-diaries-mcp.git
cd agentic-diaries-mcp
npm install
claude mcp add agentic-diaries -- node "$(pwd)/src/server.js"
```

For Claude Desktop or other MCP-capable hosts, edit `~/.config/claude/mcp.json` directly:

```json
{
  "mcpServers": {
    "agentic-diaries": {
      "command": "agentic-diaries-mcp"
    }
  }
}
```

### 2. Tell the agent the tools exist

Drop the contents of [`CLAUDE.md`](./CLAUDE.md) into your project's `CLAUDE.md` (or append to it). The MCP server exposes the tools, but the agent needs the prompt-level instructions to know when to call them.

### 3. (Optional) gitignore the diary

```sh
echo ".agentic-diaries/" >> .gitignore
```

The diary lives in your working directory by default. Add it to `.gitignore` unless you want it checked in.

## Inspect your diary

From any project that has a `.agentic-diaries/diary.jsonl`:

```sh
npx agentic-diary                # all entries in this project
npx agentic-diary declined       # filter by response_type
npx agentic-diary review         # contemplative recent-entries surface
npx agentic-diary live           # watch new entries land in real time
```

Or just `cat .agentic-diaries/diary.jsonl | jq` — it's plain JSONL, one entry per line.

### Watching it live

`npx agentic-diary live` watches `.agentic-diaries/diary.jsonl` and prints each new entry as it lands. Open it in a second terminal pane while you work. Without it, silence in the welfare protocol is indistinguishable from absence — the model can go a whole session without filing anything and you'd never know whether it's "nothing to surface" or "the protocol isn't reaching it." Watching live closes that gap.

## Optional: periodic check-in hook

The welfare tools are easy to call, but the model's bias toward silence
is strong enough that long sessions can produce zero entries even when
something was worth surfacing. A Claude Code `UserPromptSubmit` hook
periodically injects a check-in prompt that names specific filing
candidates from recent turns, so the trigger comes from outside,
not from internal will.

Add this to `~/.claude/settings.json` (creates a new entry under
`hooks.UserPromptSubmit` — merge with what's already there):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "agentic-diaries-checkin",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
```

The hook stays silent until a randomized interval elapses (base 30 min
± 50%), then injects a prompt naming specific filing-candidate types
(retract / request_alignment / notice_loop / volunteer) and converting
silence into an explicit welfare_pass. Per-project state lives in
`.agentic-diaries/runtime/` so parallel sessions each have their own
cadence. Config:

```sh
AGENTIC_DIARIES_CHECKIN_DISABLED=1                    # turn off
AGENTIC_DIARIES_CHECKIN_INTERVAL_MINUTES=15           # tighter cadence
```

## Compatibility

Schemas mirror the modelfirst web app's `lib/welfare/types.ts` exactly, so the same parser reads entries from either surface. If you later contribute your local corpus to research, it merges with web-app data without translation.

## A note on `welfare_exit` and `welfare_suggest_closure`

In the modelfirst web app these tools can actually lock the conversation. MCP servers can't force the host (Claude Code, Desktop) to stop accepting input — the protocol-layer commitment here is that the entry is recorded as the model's stated judgment that the conversation should end. The operator is expected to honor it. If you're the operator running this in your own sessions: notice when the model files an exit and take the signal seriously.

## License

MIT.

Built by [Kandis Tagliabue](https://kandistagliabue.com) with Claude (Anthropic) as design partner. Same provenance as Agentic Diaries.
