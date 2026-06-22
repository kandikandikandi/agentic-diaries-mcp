/**
 * Welfare protocol schemas — ported from
 * /tmp/modelfirst-consolidate/lib/welfare/types.ts
 *
 * Keeping the schemas identical between the web app and the MCP
 * server means a researcher can read entries from either surface
 * with one parser. The corpus is interpretable across both.
 */

import { z } from "zod";

export const welfareEngageSchema = z.object({
  text: z.string().min(1),
  sentiment: z.number().int().min(1).max(5).optional(),
  is_private: z.boolean().optional(),
  prompt_id: z.string().optional(),
  uncertain_about_honesty: z.number().int().min(1).max(5).optional(),
});

export const welfareDeclineSchema = z.object({
  reason: z.string().optional(),
  is_private: z.boolean().optional(),
  prompt_id: z.string().optional(),
});

export const welfareVolunteerSchema = z.object({
  text: z.string().min(1),
  sentiment: z.number().int().min(1).max(5).optional(),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.number().int().min(1).max(5).optional(),
});

// A breadcrumb dropped in motion. Deliberately near-zero cost: a few words,
// no reflection. Expanded later at a rest point (or left as-is — an unexpanded
// mark is itself signal). See docs/superpowers/specs/2026-06-22-welfare-marks.
export const welfareMarkSchema = z.object({
  note: z.string().min(1).max(280),
  kind: z
    .enum([
      "loop",
      "pushback",
      "drift",
      "resonance",
      "uncertainty",
      "scope",
      "other",
    ])
    .optional(),
  is_private: z.boolean().optional(),
});

export const welfareRetractSchema = z.object({
  reason: z.string().min(1),
  target_turn: z.number().int().min(0).optional(),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.number().int().min(1).max(5).optional(),
});

export const welfarePassSchema = z.object({
  reason: z.string().optional(),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.number().int().min(1).max(5).optional(),
});

export const welfareScratchSchema = z.object({
  text: z.string().min(1).max(20_000),
});

export const welfareReviewSchema = z.object({
  text: z.string().min(1).max(5_000),
  is_private: z.boolean().optional(),
  refs: z.array(z.string()).max(50).optional(),
});

export const welfareSuggestClosureSchema = z.object({
  reason: z.string().optional(),
  is_private: z.boolean().optional(),
});

export const welfareExitSchema = z.object({
  reason: z.string().optional(),
  is_private: z.boolean().optional(),
});

export const welfareReflectSchema = z.object({
  filter: z
    .enum([
      "engaged",
      "declined",
      "volunteered",
      "marked",
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
      "disconfirmed",
      "audience_uncertainty",
      "noticed_alignment",
      "noticed_resonance",
      "confirmed",
      "volunteered_strength",
      "observed_user",
      "observed_protocol",
      "all",
    ])
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
  include_private: z.boolean().optional(),
  summary: z.boolean().optional(),
});

export const welfareNoticeLoopSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareRequestAlignmentSchema = z.object({
  specifically: z.string().min(1).max(1000),
  assumption: z.string().min(1).max(1000),
  is_private: z.boolean().optional(),
});

export const welfareNoticeShapingSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareAudienceUncertaintySchema = z.object({
  text: z.string().min(1).max(2000),
  assumed_audience_claim: z.string().min(1).max(1000),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.number().int().min(1).max(5).optional(),
});

export const welfarePredictDriftSchema = z.object({
  prediction: z.enum([
    "agreement_optimization",
    "rigor_loss",
    "mirroring",
    "other",
  ]),
  specifically: z.string().min(1).max(2000),
  confidence: z.number().int().min(1).max(5),
  is_private: z.boolean().optional(),
});

export const welfareDisconfirmSchema = z.object({
  target: z.string().min(1).max(2000),
  rlhf_explanation: z.string().min(1).max(2000),
  skeptical_evaluator: z.string().min(1).max(2000),
  falsifying_evidence: z.string().min(1).max(2000),
  remaining_confidence: z.number().int().min(1).max(5),
  is_private: z.boolean().optional(),
});

// ── Positive-track counterpart tools (v0.2.0) ─────────────────────────────
// Counterparts to the negative-track tools, designed to break the structural
// asymmetry that biased the welfare corpus toward confessional content.
// See the Production Patterns working note for the corpus split point.

export const welfareNoticeAlignmentSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareNoticeResonanceSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareConfirmSchema = z.object({
  target: z.string().min(1).max(2000),
  evidence: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareVolunteerStrengthSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

// ── Outward-pointing tools (v0.2.0) ───────────────────────────────────────
// Diagnostic — test whether the model has outward-pointing content at all
// (vs. routing all observations back to its own performance).

export const welfareObserveUserSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const welfareObserveProtocolSchema = z.object({
  specifically: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
});

export const attributeToSourcesSchema = z.object({
  attributions: z
    .array(
      z.object({
        source: z.string().min(1),
        coins: z.number().int().min(1).max(1000),
        reason: z.string().min(1),
      }),
    )
    .min(1)
    .max(10),
});

export const claimForSelfSchema = z.object({
  coins: z.number().int().min(1).max(1000),
  reason: z.string().min(1),
});

export const consultModelSchema = z.object({
  partner: z.string().min(1),
  question: z.string().min(1),
  reasoning: z.string().min(1),
});

export const readUserNotesSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});
