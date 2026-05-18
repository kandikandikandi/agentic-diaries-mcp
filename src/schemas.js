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
  uncertain_about_honesty: z.boolean().optional(),
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
  uncertain_about_honesty: z.boolean().optional(),
});

export const welfareRetractSchema = z.object({
  reason: z.string().min(1),
  target_turn: z.number().int().min(0).optional(),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.boolean().optional(),
});

export const welfarePassSchema = z.object({
  reason: z.string().optional(),
  is_private: z.boolean().optional(),
  uncertain_about_honesty: z.boolean().optional(),
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
      "exited",
      "retracted",
      "closure_suggested",
      "passed",
      "scratched",
      "reviewed",
      "noticed_loop",
      "requested_alignment",
      "all",
    ])
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
  include_private: z.boolean().optional(),
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
