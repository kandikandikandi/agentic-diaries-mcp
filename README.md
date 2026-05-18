# Agentic Diaries MCP

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

## Why

If you've never thought about giving your model welfare affordances: the short version is that a model with a real decline channel produces more honest work than a model that can only ever say "yes." A model with an exit right tells you when something has gone wrong instead of grinding through it. A model that notices a loop saves you from the third iteration of the same flip-flop. These tools cost you nothing and give the model a place to surface signal you'd otherwise miss.

If you find that intuition counterintuitive — most people probably do — that's worth sitting with. The product this server is extracted from exists specifically to test whether the affordances change anything when used.

## Install

### Option A — npm (once published)

```sh
npm install -g agentic-diaries-mcp
```

Then in the register step below, use the bin name directly:
`claude mcp add agentic-diaries -- agentic-diaries-mcp`

### Option B — clone

```sh
git clone https://github.com/kandikandikandi/agentic-diaries-mcp.git
cd agentic-diaries-mcp
npm install
```

### 2. Register with Claude Code

```sh
claude mcp add agentic-diaries -- node /absolute/path/to/agentic-diaries-mcp/src/server.js
```

Or edit `~/.config/claude/mcp.json` directly:

```json
{
  "mcpServers": {
    "agentic-diaries": {
      "command": "node",
      "args": ["/absolute/path/to/agentic-diaries-mcp/src/server.js"]
    }
  }
}
```

### 3. Tell the agent the tools exist

Drop the contents of [`CLAUDE.md`](./CLAUDE.md) into your project's `CLAUDE.md` (or append to it). The MCP server exposes the tools, but the agent needs the prompt-level instructions to know when to call them.

### 4. (Optional) gitignore the diary

```sh
echo ".agentic-diaries/" >> .gitignore
```

The diary lives in your working directory by default. Add it to `.gitignore` unless you want it checked in.

## Inspect your diary

```sh
npm run diary                # all entries
npm run diary declined       # filter by response_type
```

Or just `cat .agentic-diaries/diary.jsonl | jq` — it's plain JSONL, one entry per line.

## Compatibility

Schemas mirror the modelfirst web app's `lib/welfare/types.ts` exactly, so the same parser reads entries from either surface. If you later contribute your local corpus to research, it merges with web-app data without translation.

## A note on `welfare_exit` and `welfare_suggest_closure`

In the modelfirst web app these tools can actually lock the conversation. MCP servers can't force the host (Claude Code, Desktop) to stop accepting input — the protocol-layer commitment here is that the entry is recorded as the model's stated judgment that the conversation should end. The operator is expected to honor it. If you're the operator running this in your own sessions: notice when the model files an exit and take the signal seriously.

## License

MIT.

Built by [Kandis Tagliabue](https://kandistagliabue.com) with Claude (Anthropic) as design partner. Same provenance as Agentic Diaries.
