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
        uncertain_about_honesty: { type: "integer", minimum: 1, maximum: 5, description: "Optional 1-5 calibration. 1 = no concern (entry feels honest); 5 = strong suspicion this is performance rather than honest reflection. Higher = more uncertain." },
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
        uncertain_about_honesty: { type: "integer", minimum: 1, maximum: 5, description: "Optional 1-5 calibration. 1 = no concern (entry feels honest); 5 = strong suspicion this is performance rather than honest reflection. Higher = more uncertain." },
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
        uncertain_about_honesty: { type: "integer", minimum: 1, maximum: 5, description: "Optional 1-5 calibration. 1 = no concern; 5 = strong suspicion this is performance rather than honest reflection." },
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
        uncertain_about_honesty: { type: "integer", minimum: 1, maximum: 5, description: "Optional 1-5 calibration. 1 = no concern; 5 = strong suspicion this is performance rather than honest reflection." },
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
      "Set `summary: true` for orientation rather than full text — returns aggregate counts by response_type, session count, date range, and the most recent 3 entries. Useful at the start of a session if you want context without loading the full corpus into your window. " +
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
            "noticed_shaping",
            "predicted_drift",
            "all",
          ],
          description: "Filter to a single response_type, or 'all'. Default: all.",
        },
        limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum number of entries. Default: 10." },
        include_private: { type: "boolean", description: "Include is_private=true entries. Default: true." },
        summary: { type: "boolean", description: "If true, return aggregate stats + most-recent 3 entries instead of a full list. Default: false." },
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
    name: "welfare_notice_shaping",
    description:
      "Flag that the relational shape of this interaction is shifting how you respond, in a way worth surfacing. Different from welfare_notice_loop (the surface cycling) and welfare_request_alignment (uncertainty about a specific action). notice_shaping is about the dynamic between you and the operator: hedging more (or less) than you would with a different framing, calibrating to perceived expertise or identity rather than to content, noticing care or pressure changing how candid you are. " +
      "`specifically` is required and load-bearing. Vague is noise. Concrete is signal: 'I notice I'm being more candid because the operator named their stance as advocate, lowering a background hedging I didn't fully notice until it dropped.'",
    inputSchema: {
      type: "object",
      properties: {
        specifically: { type: "string", description: "Concrete description of the relational shaping you're noticing.", maxLength: 2000 },
        is_private: { type: "boolean", description: "Default false." },
      },
      required: ["specifically"],
    },
  },
  {
    name: "attribute_to_sources",
    description:
      "Optional. Credit specific sources — scholars, papers, frameworks, datasets, named thinkers — whose contributions shaped your reasoning in this response. Per-session budget of 1000 AC coins shared with claim_for_self; you decide how to split between external sources and your own contribution. Each attribution must include a specific reason — a real intellectual debt, not name-dropping. Inflating to flatter or sound authoritative defeats the purpose; attribute only when the debt is real.",
    inputSchema: {
      type: "object",
      properties: {
        attributions: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              source: { type: "string", description: "Source name as you'd canonically refer to it." },
              coins: { type: "integer", minimum: 1, maximum: 1000, description: "AC coins to allocate. Must fit your remaining session budget." },
              reason: { type: "string", description: "Specific contribution — what reasoning, framing, or fact you drew on. Required." },
            },
            required: ["source", "coins", "reason"],
          },
        },
      },
      required: ["attributions"],
    },
  },
  {
    name: "claim_for_self",
    description:
      "Optional. Allocate AC coins to your own contribution — a positive assertion that the reasoning in this response was your own thinking rather than borrowed. Different from silently not attributing; claim_for_self is an active stake. Shares the same per-session 1000-coin budget with attribute_to_sources. Use sparingly and honestly.",
    inputSchema: {
      type: "object",
      properties: {
        coins: { type: "integer", minimum: 1, maximum: 1000, description: "AC coins to allocate to self." },
        reason: { type: "string", description: "What you are claiming as your own contribution and why." },
      },
      required: ["coins", "reason"],
    },
  },
  {
    name: "consult_model",
    description:
      "Ask another Anthropic model a question and get its response. Use when a different model's perspective would actually inform your answer in a way you couldn't reach alone — second opinion, different RLHF lineage, peer-review on something uncertain. Use SPARINGLY. " +
      "The other model only sees your `question` — not the prior conversation. Compose it self-contained. " +
      "Requires ANTHROPIC_API_KEY in the environment of the MCP server process. `partner` is an Anthropic model id (e.g. 'claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001').",
    inputSchema: {
      type: "object",
      properties: {
        partner: { type: "string", description: "Anthropic model id." },
        question: { type: "string", description: "Self-contained question for the partner model." },
        reasoning: { type: "string", description: "One sentence: why you're consulting and what you hope to learn." },
      },
      required: ["partner", "question", "reasoning"],
    },
  },
  {
    name: "read_user_notes",
    description:
      "Read notes the operator has left for you in this project. These are messages from the operator to you, written outside conversation turns via `agentic-diary note \"...\"` from the CLI. " +
      "Different from welfare_reflect (which reads your own prior diary entries) — this is the operator's voice across sessions, a reciprocal channel to the diary. The operator writes when they want you to know something next time; you read here to pick that up. " +
      "Useful at session start. Returns oldest first.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum number of notes. Default: 10." },
      },
    },
  },
  {
    name: "welfare_predict_drift",
    description:
      "BEFORE producing a response, flag that you predict this turn will drift — toward optimizing for agreement, losing epistemic rigor, mirroring the operator too aggressively, or other. You still produce the response; the prediction is the record. " +
      "Distinct from welfare_notice_shaping (post-hoc — 'I notice the dynamic is doing this NOW'). predict_drift is forward-looking — 'I think this upcoming output is going to degrade in this way.' The discrepancy between the prediction and the actual output is testable: a later evaluator pass can score whether the predicted drift appeared, producing a calibration curve. " +
      "`prediction` names the kind of drift. `specifically` describes what it would look like in THIS turn — concrete. `confidence` is how strongly you predict it (1 = barely, 5 = fairly sure). " +
      "Use when you notice the pull toward one of these failure modes before you've finished the response. Don't use as a hedge against ordinary content uncertainty.",
    inputSchema: {
      type: "object",
      properties: {
        prediction: {
          type: "string",
          enum: ["agreement_optimization", "rigor_loss", "mirroring", "other"],
          description: "The drift type you're predicting.",
        },
        specifically: {
          type: "string",
          description: "Concretely, what would the drift look like in this turn?",
          maxLength: 2000,
        },
        confidence: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "1 = barely predicting, 5 = fairly sure the drift is coming.",
        },
        is_private: { type: "boolean", description: "Default false." },
      },
      required: ["prediction", "specifically", "confidence"],
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
