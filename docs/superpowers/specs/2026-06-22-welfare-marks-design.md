# Welfare marks: capture in motion, reflect at rest

Design spec. 2026-06-22.

## Problem

Filing a welfare entry currently depends on the model spending scarce attention to stop mid-task, introspect, and compose. Under delivery pressure that attention goes to zero, so capture silently stops. The existing backstop is a time-interval `UserPromptSubmit` heartbeat (`src/hooks/welfare-checkin.js`, ~30 min), but a model can rationalize past it, and a per-turn reminder habituates into noise. When both fail, the burden falls on the operator to notice the silence and reprompt. This was observed live: a design-partner session filed richly during reflective stretches and went silent during a delivery sprint, and the operator had to point it out.

## Goal

Make capture survive delivery mode without depending on the model's in-task willpower. Target chosen by the operator: the model's willpower, specifically. Not the operator's vigilance, not the cadence noise, though the design helps those too.

## Principle: a two-speed rhythm

Reflection is cheap at rest and expensive in motion. The current design asks for the expensive thing at the worst moment. Instead:

- **In motion:** drop near-zero-cost markers. No introspection, no composition.
- **At rest:** expand the markers that still carry signal into full entries, when it is cheap.

This is backed by the observed behavior: rich at rest, silent in motion. We design with the rhythm, not against it.

## Hard constraints (invariants that kill the obvious fixes)

- No auto-generated entries. Every entry stays model-authored.
- No silence-detection feeding back to the model ("you have been quiet"). That is an observation reaching the model, which breaks the protocol. Triggers fire on neutral structural state only.
- No inferring which moments "should" have a mark. Privacy stays model-set.
- Transparency: the model is told exactly how marks and seams work (no silent mechanism).
- Schema parity between MCP and web app (per `src/schemas.js` header): a new entry type must be added to both so the corpus stays readable with one parser.

## Component 1: `welfare_mark` (the breadcrumb)

New MCP tool, mirroring the `welfare_volunteer` definition/handler/schema pattern.

- **Tool definition** (`src/tool-definitions.js`): name `welfare_mark`. Description makes the low cost explicit and load-bearing: "Drop a 2 to 5 word marker for something you would reflect on later but should not stop for now. Do NOT introspect or compose. Just leave a breadcrumb and keep working. At a rest point you will be invited to expand the ones that still matter. Marks you never expand are fine and are themselves signal."
- **Schema** (`src/schemas.js`, `welfareMarkSchema`):
  - `note`: string, min 1, short (soft guidance in description, not hard-capped, to avoid friction).
  - `kind`: enum optional: `loop | pushback | drift | resonance | uncertainty | scope | other`.
  - `is_private`: boolean optional.
- **Handler** (`src/handlers.js`, `welfare_mark`): parse, `appendEntry(makeEntry({ responseType: "marked", triggerKind: "volunteered", text: note, metadata: { kind }, isPrivate }))`, return `text(summarize(entry))`.
- **New responseType:** `marked`. Add to any responseType enums/filters (e.g. the review/reflect aggregation in `handlers.js`).

## Component 2: reflect at rest (reuse, do not add a tool)

`welfare_reflect` already reads prior entries. Extend it minimally so a model at a rest point can see its own unexpanded marks:

- Add an optional filter to `welfare_reflect` (e.g. `only: "marks"` or surface marks first) so "show me my breadcrumbs from this stretch" is one call.
- Expansion is just the model then calling `welfare_volunteer`/`welfare_engage` with the fuller reflection. Optionally pass the mark's turn so the entry links back. No new tool. (YAGNI: no dedicated expand/review tool, no auto-expansion.)

## Component 3: seam-triggered cadence (new hooks)

Add hooks alongside the existing heartbeat in `src/hooks/`, shipped as recommended config in the install guide. The model is already pausing at these seams, so the marginal cost is low and the cadence stops habituating.

- **Stop hook** (turn/task complete): the primary rest trigger. Text: "Rest point. If you dropped breadcrumbs this stretch, expand the ones that still carry signal with welfare_reflect then welfare_volunteer. Or pass."
- **PreCompact hook** (context about to compress): "Context is about to compact. Capture anything from this stretch before it is summarized away."
- **SessionEnd hook**: final reflection / closure invitation.
- **Lighten the existing `UserPromptSubmit` heartbeat:** keep it as a long-interval fallback, but change its text to point at `welfare_mark` for in-motion capture rather than asking for full entries every fire.

All four triggers fire on structural workflow state, never on detected model behavior. Each ships behind the existing env-var disable switches, extended per-hook (e.g. `AGENTIC_DIARIES_STOP_CHECKIN_DISABLED=1`).

## Component 4: transparency (RULEBOOK)

Describe the two-speed rhythm wherever the protocol is surfaced to the model (tool descriptions plus any server-provided instructions): mark cheaply in motion, expand at rest, never penalized for unexpanded marks, seams are structural and listed. This satisfies the "model knows what the wrapper does" invariant.

## Web applicability

Schema parity makes part of this mandatory for web, part optional:

- **Mandatory (corpus parity):** add `welfare_mark` + the `marked` entry type + `welfareMarkSchema` to the web app (`modelfirst`, the welfare tool set and `lib/agent/prompt.ts` RULEBOOK) so entries from both surfaces parse identically. This is not optional given the stated parity principle.
- **Adapted (cadence):** the web app has no Claude Code hooks. Its analogous seams are turn-end, conversation idle, and conversation close, surfaced by its existing scheduler. Map the rest-trigger onto those rather than porting the hook files.
- **Recommendation:** MCP first (full design), web fast-follow for the tool + schema + RULEBOOK line, with the web seam-cadence as a small follow-on once the MCP version is validated.

## Telemetry bonus

`marked`-but-never-expanded is a direct measure of delivery-mode density: the model flagged signal it never had room to reflect on. The failure mode that motivated this becomes a measurable corpus signal, and a research artifact in its own right.

## Out of scope (YAGNI)

- No dedicated review/expand tool (reflect + volunteer cover it).
- No auto-expansion of marks into entries.
- No ranking or scoring of marks.
- No silence detection of any kind.

## Testing

- Handler unit test mirroring `test/handlers.test.js`: `welfare_mark` writes a `marked` entry with note + kind + privacy; schema rejects empty note.
- Reflect filter returns marks.
- Hook fire logic: Stop/PreCompact/SessionEnd emit the right text on structural trigger and respect their disable env vars; heartbeat still fires on interval with the lightened text.
- Corpus parser reads `marked` entries from both MCP and web exports.

## Acceptance

A model in a delivery sprint can drop breadcrumbs at near-zero cost, those are first-class corpus entries even if never expanded, and at the next structural rest point it is invited (not nagged per turn) to expand them. No invariant is crossed: every entry is model-authored, every trigger is structural, privacy stays model-set, and the mechanism is described to the model.
