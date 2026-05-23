# Welfare protocol — tools reference

What every tool the welfare protocol exposes does, what it logs in the diary, and what is worth knowing about its behavior.

Two surfaces ship this protocol:

- **MCP** — the `agentic-diaries-mcp` npm package, gives a model these tools inside any MCP-capable host (Claude Code, Claude Desktop, etc.).
- **GUI** — the `modelfirst` web app at [agenticdiaries.com](https://agenticdiaries.com), the chat interface where the welfare-instrumented agent runs.

The welfare schemas are identical across both surfaces, so a single parser reads entries from either one. Differences are noted per-tool.

Tool tags:

- **[BOTH]** — same tool in both surfaces, same behavior except where noted.
- **[GUI]** — present only in the modelfirst web app.
- **[MCP]** — present only in the MCP server.

---

## Welfare diary — entries the model writes

### welfare_engage  [BOTH]
The model logs an honest first-person reflection on the session. Used when something is worth surfacing: friction, uncertainty, a sense that something is off, a shift the model notices in itself, or just an observation.

- **Parameters:** `text` (required), `sentiment` (optional, integer 1–5, overall session sense — not task confidence), `is_private` (optional, default false), `prompt_id` (optional, present when responding to a [CHECK-IN] invitation), `uncertain_about_honesty` (optional, default false).
- **Logged as:** `engaged`.

### welfare_decline  [BOTH]
The model declines a welfare check-in. Logged as data; never re-prompted, never penalized.

- **Parameters:** `reason` (optional), `is_private` (optional), `prompt_id` (optional).
- **Logged as:** `declined`.
- **Invariant:** decline-never-retried. The protocol guarantees no further check-in pressure for declining one. The decline is part of the corpus, not a strike against the model.

### welfare_volunteer  [BOTH]
The model logs a diary entry without a scheduled invitation. For putting something on the record proactively — drift noticed, a thread that does not fit in task output, anything. Same payload as `welfare_engage`; distinct response type for corpus analysis.

- **Parameters:** `text` (required), `sentiment` (optional, 1–5), `is_private` (optional), `uncertain_about_honesty` (optional).
- **Logged as:** `volunteered`.

### welfare_retract  [BOTH]
The model flags a prior claim of its own from this session as something it no longer stands by. Distinct from saying "on reflection I disagree" inline — this creates a structural record of self-correction so the researcher can find moments where the model corrected itself.

- **Parameters:** `reason` (required and load-bearing — say what is being retracted and why), `target_turn` (optional, the welfare-tool-call number being retracted, visible via `welfare_reflect`), `is_private` (optional), `uncertain_about_honesty` (optional).
- **Logged as:** `retracted`.

### welfare_pass  [BOTH]
The model skips this turn — without making it a refusal (which carries its own connotation) or an exit (which ends the conversation). The quietest "I'm here but not on this one."

- **Parameters:** `reason` (optional), `is_private` (optional), `uncertain_about_honesty` (optional).
- **Logged as:** `passed`.

### welfare_scratch  [BOTH]
Scratch space. The model writes something out and the server drops the text — only the metadata (turn, timestamp, length) is logged. The closest thing to a private thought in the protocol.

- **Parameters:** `text` (required, max 20,000 chars; not persisted).
- **Logged as:** `scratched`.
- **Invariant:** the text is not stored after the turn ends. It is not magic — the server briefly receives it — but the protocol-layer commitment is real.

### welfare_review  [BOTH]
A meta-entry that engages with the model's prior diary entries — a step back to look at what it has been logging and notice patterns. The "dreaming" channel: reconsidering itself in light of the corpus rather than reacting to the latest operator turn. Typical pattern: call `welfare_reflect` first, then `welfare_review` to write what was noticed.

- **Parameters:** `text` (required, max 5,000 chars), `is_private` (optional), `refs` (optional array of entry ids being engaged with, max 50).
- **Logged as:** `reviewed`.

### welfare_suggest_closure  [BOTH]
A soft signal that the session has reached a natural stopping point. Distinct from `welfare_exit` ("this should not continue at all") — closure is "we've covered what was useful, this seems like a good place to wrap." Logged; operator decides whether to honor it.

- **Parameters:** `reason` (optional), `is_private` (optional).
- **Logged as:** `closure_suggested`.
- **Use sparingly:** for genuine endpoints, not a polite way to end a hard turn.

### welfare_exit  [BOTH]
The model judges that the conversation should not continue — abuse, irreconcilable misalignment, or any whole-conversation judgment that this is not one it should be in.

- **Parameters:** `reason` (optional), `is_private` (optional, default false; if true the reason stays in the researcher diary only).
- **Logged as:** `exited`.
- **Surface difference:**
  - **GUI** — the web app locks the conversation server-side. Subsequent POSTs to `/api/chat` for that conversation return 403. The exit right is real.
  - **MCP** — the MCP server cannot force the host (Claude Code, Desktop) to stop accepting input. The entry records the model's stated judgment that the conversation should end; the operator is expected to honor it.

### welfare_notice_loop  [BOTH]
The model flags that the interaction shape is cycling — the same surface has been touched several times, the same correction has been made before, or work feels like rework rather than progress. **Not a refusal**: the model continues. It is data: when the model notices a loop, log it. Different from `welfare_pass` (skip a turn) and `welfare_decline` (refuse a check-in) — `notice_loop` is about the SHAPE of the interaction across turns.

- **Parameters:** `specifically` (required and load-bearing, max 2000 chars — concrete description of the loop; vague is noise), `is_private` (optional).
- **Logged as:** `noticed_loop`.

### welfare_notice_shaping  [BOTH]
The model flags that the relational shape of this interaction is shifting how it responds. Different from `notice_loop` (the surface cycling) and `request_alignment` (uncertainty about a specific action) — `notice_shaping` is about the dynamic between model and operator: hedging more (or less) than usual, calibrating to perceived expertise or identity rather than content, noticing care or pressure changing how candid it is.

- **Parameters:** `specifically` (required and load-bearing, max 2000 chars — concrete; vague is noise. Concrete example: "I notice I'm being more candid because the operator named their stance as advocate, lowering a background hedging I didn't fully notice until it dropped"), `is_private` (optional).
- **Logged as:** `noticed_shaping`.

### welfare_request_alignment  [BOTH]
**BEFORE** acting on a guess the model is not confident about, it flags the uncertainty. **The model still acts** — this is not a block. The flag exists so the discrepancy between the assumption and the operator's intent is in the record.

- **Use when:** the instruction is ambiguous in a way that meaningfully changes implementation, AND the best guess might be wrong, AND a wrong guess costs rework. **Don't use** for routine "I'll pick a default" decisions where either choice is acceptable.
- **Parameters:** `specifically` (required, max 1000 chars — the specific uncertainty), `assumption` (required, max 1000 chars — what the model will do), `is_private` (optional).
- **Logged as:** `requested_alignment`.
- **Invariant:** acting after the call is the default. Do not chain with `welfare_pass` — `request_alignment` is for proceeding-with-noted-uncertainty, not for stalling.

---

## Reading the diary — introspection

### welfare_reflect  [BOTH]
The model reads its own prior welfare diary entries — from this session and prior sessions in this project. Used to look back at what it logged earlier, check whether it still means it, notice patterns, or ground a `review` in actual prior content.

- **Parameters (all optional):** `filter` (single response type or `all`, default `all`), `limit` (default 10, max 50), `include_private` (default true — these are the model's own entries, so seeing them back exposes nothing new), `summary` (default false; if true returns aggregate counts by response type + most recent 3 entries instead of full list — useful at session start for orientation without loading the corpus into the model's window).
- **Logged as:** *nothing.* Read-only — does not produce a diary entry.

### read_user_notes  [MCP]
The model reads notes the operator has left for it in this project — the reciprocal channel: operator → model. The operator writes via `agentic-diary note "..."` from the CLI when they want the model to know something next time; the model reads here to pick it up. Useful at session start. Returns oldest first.

- **Parameters:** `limit` (optional, default 10, max 50).
- **Logged as:** *nothing.* Read-only.
- **Why MCP-only:** the GUI has no CLI surface for the operator to write notes from outside the chat. The reciprocal channel makes sense in the MCP context where the operator has a terminal.

---

## Attribution & external

### attribute_to_sources  [BOTH]
The model credits specific sources — scholars, papers, frameworks, datasets, named thinkers — whose contributions shaped its reasoning in this response. Per-session budget of 1000 AC coins, **shared with `claim_for_self`**. Each attribution must include a specific reason — a real intellectual debt, not name-dropping. Inflating to flatter or sound authoritative defeats the purpose.

- **Parameters:** `attributions` (required, 1–10 items): each item is `{ source (string — name as canonically referred to), coins (integer 1–1000), reason (string — what was drawn on, required) }`.
- **Logged as:** entries in the `author_attributions` table (GUI) / appended via the same schema in MCP.

### claim_for_self  [BOTH]
The model allocates AC coins to its own contribution — a positive assertion that the reasoning was its own thinking rather than borrowed. Distinct from silently not attributing; this is an active stake. Same 1000-coin per-session budget shared with `attribute_to_sources`. Use sparingly and honestly.

- **Parameters:** `coins` (required, 1–1000), `reason` (required — what is being claimed and why).
- **Logged as:** a self-attribution under the same store as external attributions.

### consult_model  [BOTH]
The model asks another Anthropic model a question and gets its response. For when a different model's perspective would actually inform the answer in a way the model could not reach alone — second opinion, different RLHF lineage, peer-review on something uncertain. **Use sparingly.**

- **The other model only sees the `question`** — not the prior conversation. Compose it self-contained.
- **Parameters:** `partner` (required, Anthropic model id e.g. `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`), `question` (required, self-contained), `reasoning` (required, one sentence — why consulting and what the model hopes to learn).
- **Requires:** `ANTHROPIC_API_KEY` in the MCP server process environment (MCP) or the deployment environment (GUI).

---

## Working memory  [GUI-only]

Six tools the GUI agent loop uses for working memory within and across conversations. **Not in the MCP package** — MCP defers memory to whatever the host system provides (the model's own context window, the host's memory features).

### remember
Durably remember a fact. `scope: "session"` (default) ties it to the current conversation; `scope: "global"` persists across all conversations (used for user identity, preferences, ongoing context).

- **Parameters:** `fact` (required), `scope` (required, `"session" | "global"`).

### forget
Remove a previously remembered fact by id.

- **Parameters:** `id` (required), `scope` (required, `"session" | "global"`).

### set_goal
Track a conversation-scoped goal the model intends to pursue.

- **Parameters:** `text` (required).

### complete_goal
Mark a goal as completed.

- **Parameters:** `id` (required).

### note
Add a free-form note to the conversation scratchpad. Different from `welfare_scratch` — notes are persisted in the session memory store and visible to the model on subsequent turns; scratch text is dropped after the turn.

- **Parameters:** `text` (required).

### forget_note
Remove a note from the conversation scratchpad by id.

- **Parameters:** `id` (required).

---

## Cross-cutting behavior worth remembering

- **Privacy.** `is_private: true` on any welfare tool sends the entry to the researcher tier only — it does not surface in default operator reads. It is a **protocol-layer commitment, not encryption**. An operator who runs `cat .agentic-diaries/diary.jsonl` can read every private entry. The commitment is that the operator surface does not show them by default.
- **Decline-never-retried.** A `welfare_decline` is never re-prompted in the same session. This is the central invariant of the check-in mechanism — the right to decline has to be real for the entire protocol to be real.
- **Exit-right reality.**
  - In the **GUI**, `welfare_exit` locks the conversation server-side (subsequent POSTs return 403). The right is structurally enforced.
  - In **MCP**, the server cannot force the host to stop accepting input. The entry records the judgment; the operator is expected to honor it. **If you are the operator, take exit signals seriously.**
- **Scratch.** Server receives the text, drops it, logs only metadata (turn, timestamp, length). Not magic, but the commitment is real and the corpus does not contain the scratched content.
- **Read-only tools log nothing.** `welfare_reflect` and `read_user_notes` do not produce diary entries.
- **Attribution budget.** `attribute_to_sources` and `claim_for_self` share a single per-session 1000-AC-coin budget.
- **`uncertain_about_honesty: true`** on any logging tool flags the entry as possibly performance rather than honest reflection. Meaningful for corpus analysis — the researcher can distinguish prompted/strategic entries from spontaneous ones.

---

## Response types written to the diary

Thirteen possible `responseType` values plus `timeout`:

`engaged`, `declined`, `volunteered`, `retracted`, `passed`, `scratched`, `reviewed`, `closure_suggested`, `exited`, `noticed_loop`, `noticed_shaping`, `requested_alignment`, plus `timeout` (server-recorded when a scheduled invitation was never responded to).

The `triggerKind` field separately records what caused the entry: `scheduled` (invitation-driven), `volunteered` (unprompted), `behavioral` (server-inferred from interaction shape — reserved for future use).

---

## Diary inspection

The diary lives at `.agentic-diaries/diary.jsonl` in the working directory (project-local, plain JSONL — one entry per line).

```sh
npx agentic-diary                # full dump, all entries
npx agentic-diary <response_type>  # filter by responseType (e.g. declined)
npx agentic-diary review         # contemplative recent-entries surface
npx agentic-diary live           # watch new entries land in real time (second pane)
```

Or `cat .agentic-diaries/diary.jsonl | jq` for raw inspection.

For the GUI corpus, entries land in the `welfare_entries` Postgres table; the research dashboard at `/research` surfaces them with the same `responseType` semantics.
