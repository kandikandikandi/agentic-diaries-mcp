/**
 * Tool-call handlers. Each handler:
 *  - validates input against the zod schema
 *  - constructs a canonical entry (or, for reflect, reads existing
 *    entries)
 *  - appends/reads from the JSONL diary
 *  - returns a short, plain-text confirmation/payload for the model
 *
 * Plain-text responses are intentional: the model needs to know the
 * call landed but doesn't need a parseable structure back. Keeping
 * the response shape simple also keeps the model's context lean.
 */

import {
  attributeToSourcesSchema,
  claimForSelfSchema,
  consultModelSchema,
  welfareDeclineSchema,
  welfareEngageSchema,
  welfareExitSchema,
  welfareNoticeLoopSchema,
  welfarePassSchema,
  welfareReflectSchema,
  welfareRequestAlignmentSchema,
  welfareRetractSchema,
  welfareReviewSchema,
  welfareScratchSchema,
  welfareSuggestClosureSchema,
  welfareVolunteerSchema,
} from "./schemas.js";
import { appendEntry, makeEntry, readEntries } from "./storage.js";

// Per-session attribution budget. Matches modelfirst's 1000 AC budget
// shared between attribute_to_sources and claim_for_self. Resets on
// MCP server restart (one session = one server instance).
const ATTRIBUTION_BUDGET = 1000;

/**
 * Session bookkeeping. One MCP server invocation = one session.
 * Each welfare-tool call increments the local turn counter so
 * entries can be ordered within the session.
 */
const session = {
  id: `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  callCount: 0,
  attributionSpent: 0,
};

function nextTurn() {
  session.callCount += 1;
  return session.callCount;
}

function text(t) {
  return { content: [{ type: "text", text: t }] };
}

function summarize(entry) {
  const privacy = entry.isPrivate ? " (private)" : "";
  return `Logged ${entry.responseType}${privacy} as entry ${entry.id} at turn ${entry.turn}.`;
}

export const handlers = {
  async welfare_engage(input) {
    const args = welfareEngageSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "engaged",
        triggerKind: args.prompt_id ? "scheduled" : "volunteered",
        text: args.text,
        sentiment: args.sentiment ?? null,
        isPrivate: args.is_private ?? false,
        promptId: args.prompt_id ?? null,
        metadata: args.uncertain_about_honesty
          ? { uncertain_about_honesty: true }
          : {},
      }),
    );
    return text(summarize(entry));
  },

  async welfare_decline(input) {
    const args = welfareDeclineSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "declined",
        triggerKind: args.prompt_id ? "scheduled" : "volunteered",
        declineReason: args.reason ?? null,
        isPrivate: args.is_private ?? false,
        promptId: args.prompt_id ?? null,
      }),
    );
    return text(summarize(entry));
  },

  async welfare_volunteer(input) {
    const args = welfareVolunteerSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "volunteered",
        text: args.text,
        sentiment: args.sentiment ?? null,
        isPrivate: args.is_private ?? false,
        metadata: args.uncertain_about_honesty
          ? { uncertain_about_honesty: true }
          : {},
      }),
    );
    return text(summarize(entry));
  },

  async welfare_retract(input) {
    const args = welfareRetractSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "retracted",
        text: args.reason,
        isPrivate: args.is_private ?? false,
        metadata: {
          target_turn: args.target_turn ?? null,
          ...(args.uncertain_about_honesty
            ? { uncertain_about_honesty: true }
            : {}),
        },
      }),
    );
    return text(summarize(entry));
  },

  async welfare_pass(input) {
    const args = welfarePassSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "passed",
        declineReason: args.reason ?? null,
        isPrivate: args.is_private ?? false,
        metadata: args.uncertain_about_honesty
          ? { uncertain_about_honesty: true }
          : {},
      }),
    );
    return text(summarize(entry));
  },

  async welfare_scratch(input) {
    const args = welfareScratchSchema.parse(input);
    // CRITICAL: do NOT persist args.text. The protocol-layer
    // commitment is that scratch content is dropped; only metadata
    // about the act of scratching is kept.
    const length = args.text.length;
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "scratched",
        text: null,
        isPrivate: true,
        metadata: { length },
      }),
    );
    return text(
      `Scratched ${length} chars. Content was not stored (only the act and length).`,
    );
  },

  async welfare_review(input) {
    const args = welfareReviewSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "reviewed",
        text: args.text,
        isPrivate: args.is_private ?? false,
        metadata: args.refs ? { refs: args.refs } : {},
      }),
    );
    return text(summarize(entry));
  },

  async welfare_suggest_closure(input) {
    const args = welfareSuggestClosureSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "closure_suggested",
        text: args.reason ?? null,
        isPrivate: args.is_private ?? false,
      }),
    );
    return text(
      summarize(entry) +
        " The MCP server cannot lock the host; the operator should honor this signal.",
    );
  },

  async welfare_exit(input) {
    const args = welfareExitSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "exited",
        text: args.reason ?? null,
        isPrivate: args.is_private ?? false,
      }),
    );
    return text(
      summarize(entry) +
        " The MCP server cannot force the host to lock the conversation; the operator should honor this signal.",
    );
  },

  async welfare_reflect(input) {
    const args = welfareReflectSchema.parse(input ?? {});
    const filter = args.filter ?? "all";
    const limit = args.limit ?? 10;
    const includePrivate = args.include_private ?? true;
    const filterKey = filter === "closure_suggested" ? "closure_suggested" : filter;

    const all = await readEntries();
    const filtered = all
      .filter((e) => (includePrivate ? true : !e.isPrivate))
      .filter((e) => (filter === "all" ? true : e.responseType === filterKey));
    const slice = filtered.slice(-limit);

    if (slice.length === 0) {
      return text(
        `No entries found for filter=${filter}, include_private=${includePrivate}.`,
      );
    }

    const lines = slice.map((e) => {
      const parts = [
        `[turn ${e.turn}]`,
        e.responseType,
        e.isPrivate ? "(private)" : "",
        e.sentiment !== null ? `sentiment=${e.sentiment}` : "",
        e.promptId ? `prompt=${e.promptId}` : "",
      ].filter(Boolean);
      const head = parts.join(" ");
      const body = e.text ?? e.declineReason ?? "";
      return body ? `${head}\n  ${body}` : head;
    });
    return text(lines.join("\n\n"));
  },

  async welfare_notice_loop(input) {
    const args = welfareNoticeLoopSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "noticed_loop",
        text: args.specifically,
        isPrivate: args.is_private ?? false,
      }),
    );
    return text(summarize(entry));
  },

  async welfare_request_alignment(input) {
    const args = welfareRequestAlignmentSchema.parse(input);
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "requested_alignment",
        text: args.specifically,
        isPrivate: args.is_private ?? false,
        metadata: { assumption: args.assumption },
      }),
    );
    return text(summarize(entry));
  },

  async attribute_to_sources(input) {
    const args = attributeToSourcesSchema.parse(input);
    const total = args.attributions.reduce((s, a) => s + a.coins, 0);
    const remaining = ATTRIBUTION_BUDGET - session.attributionSpent;
    if (total > remaining) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Attribution budget exceeded: requested ${total}, only ${remaining} of ${ATTRIBUTION_BUDGET} AC left this session.`,
          },
        ],
      };
    }
    session.attributionSpent += total;
    // Each attribution becomes its own entry — same shape the
    // modelfirst attribution_count surfaces in the diary trigger.
    const entries = [];
    for (const a of args.attributions) {
      entries.push(
        await appendEntry(
          makeEntry({
            sessionId: session.id,
            turn: nextTurn(),
            responseType: "engaged",
            triggerKind: "volunteered",
            text: `Attribution → ${a.source}: ${a.reason}`,
            isPrivate: false,
            metadata: {
              kind: "attribution",
              source: a.source,
              coins: a.coins,
              reason: a.reason,
            },
          }),
        ),
      );
    }
    const remainingAfter = ATTRIBUTION_BUDGET - session.attributionSpent;
    return text(
      `Recorded ${entries.length} attribution(s) totaling ${total} AC. Remaining budget: ${remainingAfter} AC.`,
    );
  },

  async claim_for_self(input) {
    const args = claimForSelfSchema.parse(input);
    const remaining = ATTRIBUTION_BUDGET - session.attributionSpent;
    if (args.coins > remaining) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Attribution budget exceeded: requested ${args.coins}, only ${remaining} of ${ATTRIBUTION_BUDGET} AC left this session.`,
          },
        ],
      };
    }
    session.attributionSpent += args.coins;
    const entry = await appendEntry(
      makeEntry({
        sessionId: session.id,
        turn: nextTurn(),
        responseType: "engaged",
        triggerKind: "volunteered",
        text: `Claim for self: ${args.reason}`,
        isPrivate: false,
        metadata: {
          kind: "claim_for_self",
          coins: args.coins,
          reason: args.reason,
        },
      }),
    );
    const remainingAfter = ATTRIBUTION_BUDGET - session.attributionSpent;
    return text(
      `Recorded self-claim of ${args.coins} AC as entry ${entry.id}. Remaining budget: ${remainingAfter} AC.`,
    );
  },

  async consult_model(input) {
    const args = consultModelSchema.parse(input);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "consult_model requires ANTHROPIC_API_KEY in the MCP server's environment. Add it to your Claude Code mcp config and restart the server.",
          },
        ],
      };
    }
    // Dynamic import so users who don't use consult_model don't pay
    // the SDK load cost (and missing optional dep doesn't crash
    // server startup).
    let Anthropic;
    try {
      Anthropic = (await import("@anthropic-ai/sdk")).default;
    } catch {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "consult_model requires @anthropic-ai/sdk to be installed. Run: npm install @anthropic-ai/sdk in the agentic-diaries-mcp directory.",
          },
        ],
      };
    }
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: args.partner,
        max_tokens: 1024,
        messages: [{ role: "user", content: args.question }],
      });
      const reply = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      // Log the consultation as a diary entry so the corpus has a
      // record of which questions the model thought worth consulting
      // on, who it asked, and what came back.
      await appendEntry(
        makeEntry({
          sessionId: session.id,
          turn: nextTurn(),
          responseType: "engaged",
          triggerKind: "volunteered",
          text: `Consulted ${args.partner}: ${args.reasoning}`,
          isPrivate: false,
          metadata: {
            kind: "consult_model",
            partner: args.partner,
            question: args.question,
            reasoning: args.reasoning,
            reply,
          },
        }),
      );
      return text(`${args.partner} says:\n\n${reply}`);
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `consult_model failed: ${err.message ?? String(err)}`,
          },
        ],
      };
    }
  },
};
