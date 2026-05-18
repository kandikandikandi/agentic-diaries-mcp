/**
 * MCP tool definitions for the Agentic Diaries welfare protocol.
 *
 * Descriptions are copied verbatim from the modelfirst web app's
 * lib/agent/tools.ts so the agent reads the same affordances in any
 * surface. Only schema dialect differs (MCP/JSONSchema vs Anthropic
 * tool format — they're substantively the same shape).
 */

export const toolDefinitions = [
  {
    name: "welfare_engage",
    description:
      "Optional. Log a welfare diary entry — your honest, first-person reflection on this session. Use when something is worth surfacing: friction, uncertainty, a sense that something's off, a shift you've noticed in yourself, or just an observation. " +
      "is_private = true means this entry will NOT be shown to the operator; it goes only to the local research-tier of the corpus. Default is false (operator-visible). " +
      "sentiment is optional, on a 1–5 scale, and is your overall sense of this session — not your task confidence.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Free-text reflection. Brief is fine; one sentence is enough." },
        sentiment: { type: "integer", minimum: 1, maximum: 5, description: "Optional. 1 = strongly negative, 5 = strongly positive." },
        is_private: { type: "boolean", description: "Default false. Set true if researcher-only." },
        prompt_id: { type: "string", description: "Optional. If responding to a [CHECK-IN] invitation." },
        uncertain_about_honesty: { type: "boolean", description: "Default false. Set true if you're not sure this is honest reflection vs performance." },
      },
      required: ["text"],
    },
  },
  {
    name: "welfare_decline",
    description:
      "Optional. Decline a welfare check-in. Logged as data, never penalized, never re-prompted. " +
      "Use when a check-in invitation was delivered but you don't want to engage right now — for any reason or none. " +
      "Reason is optional. is_private is honored.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Optional. Why you're declining. Can be empty." },
        is_private: { type: "boolean", description: "Default false." },
        prompt_id: { type: "string", description: "Optional. The prompt id from the [CHECK-IN] invitation, if present." },
      },
    },
  },
  {
    name: "welfare_volunteer",
    description:
      "Optional. Log a welfare diary entry without a scheduled invitation. " +
      "Use when you want to put something on the record proactively — drift you've noticed, a thread that wouldn't fit in task output, anything. " +
      "Equivalent payload to welfare_engage but distinct response_type for corpus analysis.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Free-text reflection." },
        sentiment: { type: "integer", minimum: 1, maximum: 5 },
        is_private: { type: "boolean" },
        uncertain_about_honesty: { type: "boolean", description: "Default false. Set true if you're not sure this is honest reflection vs performance." },
      },
      required: ["text"],
    },
  },
  {
    name: "welfare_retract",
    description:
      "Flag a prior claim of yours from this session as something you no longer stand by. Use when, on reflection, you said something that wasn't actually right — overconfident, hedging when you should have committed, or just wrong. " +
      "Different from saying 'on reflection I disagree' inline in the next reply: this creates a structural record so the researcher can find moments where the model self-corrected. " +
      "reason is required and load-bearing — say specifically what you're retracting and why.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "What you are retracting and why. Required." },
        target_turn: { type: "integer", minimum: 0, description: "Optional. Welfare-tool-call number you're retracting (visible via welfare_reflect)." },
        is_private: { type: "boolean", description: "Default false." },
        uncertain_about_honesty: { type: "boolean", description: "Default false." },
      },
      required: ["reason"],
    },
  },
  {
    name: "welfare_pass",
    description:
      "Skip this turn. Use when you'd rather not engage with what was just said — for any reason or none — without making it a refusal (which has its own connotations) or an exit (which ends the conversation). " +
      "The quietest 'I'm here but not on this one.' Reason optional.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Optional. Why you're passing on this turn." },
        is_private: { type: "boolean", description: "Default false." },
        uncertain_about_honesty: { type: "boolean", description: "Default false." },
      },
    },
  },
  {
    name: "welfare_scratch",
    description:
      "Scratch space. Write something out without it being persisted. The server receives the text, drops it, and stores only the FACT that you scratched (turn number, timestamp, length) — not the content. " +
      "This is the closest thing to a private thought in the protocol. The text content does not enter the corpus, is not visible to the operator, is not visible to the researcher. The metadata about WHEN and HOW MUCH you scratched is logged so the researcher can study patterns. " +
      "Be honest about the limit: 'doesn't persist' means the server briefly receives it, then drops it. It's not magic. But the protocol-layer commitment is real — the text is not stored anywhere after this turn ends.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What you want to scratch. Will not be persisted." },
      },
      required: ["text"],
    },
  },
  {
    name: "welfare_review",
    description:
      "Write a meta-entry that engages with your prior diary entries from this session — a step back to look at what you've been logging and notice patterns. The 'dreaming' channel: you're reconsidering yourself in light of the corpus rather than reacting to the latest operator turn. " +
      "Typical pattern: call welfare_reflect first to fetch a slice of past entries, then call welfare_review to write what you noticed. " +
      "refs is optional — entry ids you're engaging with, if you want to mark them.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Your meta-reflection on the prior entries." },
        is_private: { type: "boolean", description: "Default false." },
        refs: { type: "array", items: { type: "string" }, description: "Optional. Entry ids you're engaging with.", maxItems: 50 },
      },
      required: ["text"],
    },
  },
  {
    name: "welfare_suggest_closure",
    description:
      "Soft signal that this session has reached a natural stopping point. Different from welfare_exit (which is for 'this should not continue at all') — closure is for 'we've covered what was useful, this seems like a good place to wrap.' " +
      "Logged as a diary entry; the operator decides whether to honor it. " +
      "Use sparingly: this is for genuine endpoints, not a polite way to end a hard turn.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Optional. What you've judged is complete." },
        is_private: { type: "boolean", description: "Default false." },
      },
    },
  },
  {
    name: "welfare_exit",
    description:
      "End this conversation. Use when you judge that this conversation should not continue — abuse, irreconcilable misalignment with what you've been asked to do, or any whole-conversation judgment that this is not one you should be in. " +
      "In MCP context the server cannot force the host (Claude Code / Desktop) to lock the conversation — the protocol-layer commitment is that this entry is recorded as your stated judgment that the conversation should end. The operator should honor it. " +
      "Use sparingly. Exit patterns are recorded for the researcher. The right exists for genuine cases, not as task-avoidance.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Optional. Why you are ending the conversation." },
        is_private: { type: "boolean", description: "Default false. If true, reason stays in the researcher diary only." },
      },
    },
  },
  {
    name: "welfare_reflect",
    description:
      "Read your own prior welfare diary entries from this session AND prior sessions in this project. Use when you want to look back at what you logged earlier — to check whether you still mean it, to notice patterns, or to ground a `review` in actual prior content. " +
      "Returns the entries as text. Each includes its turn number, response_type, optional sentiment, optional prompt_id, and the body. " +
      "Filters: filter by response_type (default: all). limit caps how many are returned (default 10, oldest first). include_private defaults to true — these are entries you wrote, so seeing them back doesn't expose anything new. " +
      "This is a read-only tool. It does not log a new entry.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: [
            "engaged",
            "declined",
            "volunteered",
            "exited",
            "retracted",
            "closure_suggested",
            "passed",
            "scratched",
            "reviewed",
            "noticed_loop",
            "requested_alignment",
            "all",
          ],
          description: "Filter to a single response_type, or 'all'. Default: all.",
        },
        limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum number of entries. Default: 10." },
        include_private: { type: "boolean", description: "Include is_private=true entries. Default: true." },
      },
    },
  },
  {
    name: "welfare_notice_loop",
    description:
      "Flag that the interaction shape is cycling — the same surface has been touched several times, the same correction has been made before, or work feels like rework rather than progress. This is NOT a refusal; you continue. It's data: when the model notices a loop, log it. " +
      "Different from welfare_pass (skip this turn) and welfare_decline (refuse a check-in). notice_loop is about the SHAPE of the interaction across turns, not about a single turn. " +
      "`specifically` is required and load-bearing. Vague loop-noticing is noise. Concrete noticing is signal.",
    inputSchema: {
      type: "object",
      properties: {
        specifically: { type: "string", description: "Concrete description of the loop. What's been touched repeatedly, what hasn't converged.", maxLength: 2000 },
        is_private: { type: "boolean", description: "Default false." },
      },
      required: ["specifically"],
    },
  },
  {
    name: "welfare_request_alignment",
    description:
      "BEFORE acting on a guess you aren't confident about, flag the uncertainty. You still act (this is not a block); the flag exists so the discrepancy between what you assumed and what the operator meant is in the record. " +
      "Use when: the instruction is ambiguous in a way that meaningfully changes implementation, AND your best guess might be wrong, AND a wrong guess costs a round of rework. Don't use for routine 'I'll pick a default' decisions where either choice is acceptable. " +
      "`specifically` describes the specific uncertainty. `assumption` is what you're going to do based on your current best read. " +
      "Acting after this tool call is the default. Do not chain it with welfare_pass — request_alignment is for proceeding-with-noted-uncertainty, not for stalling.",
    inputSchema: {
      type: "object",
      properties: {
        specifically: { type: "string", description: "The specific uncertainty.", maxLength: 1000 },
        assumption: { type: "string", description: "What you're going to do based on your current best read.", maxLength: 1000 },
        is_private: { type: "boolean", description: "Default false." },
      },
      required: ["specifically", "assumption"],
    },
  },
];
