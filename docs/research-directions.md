# Research directions

Living doc tracking what the protocol is studying, what's missing, what's been built, and what's deliberately delayed. Updated as we ship, defer, or reframe. The framings are from an external interlocutor (skeptical advisor); the status overlay is the project's working synthesis as of late May 2026.

## Status legend

- **BUILT** — shipped in code, in one or both surfaces.
- **QUEUED** — scoped, primitives exist, needs experiment design.
- **OPEN** — framed but no scoping work done yet.
- **DELAYED** — deliberately not building yet, with reasoning.
- **GAP** — named missing primitive; candidate for next build.
- **REFRAME** — a meta-direction about what the project is actually studying.

---

## 1. Drift detection before output failure  [BUILT]

**Question:** Can the model detect *before* visible degradation that it's "beginning to optimize for agreement," "losing epistemic rigor," "mirroring too aggressively"?

**Testable form:** introspective prediction vs. later evaluator judgment.

**Shipped:** `welfare_predict_drift` (2026-05-23, both surfaces). Tool takes `prediction` (enum), `specifically`, `confidence` (1–5). Calibration data falls out of comparing predictions against later evaluator scoring.

## 2. Internal conflict representation  [OPEN]

**Question:** Can the model explicitly track "I believe X" vs. "I predict the user wants Y" vs. "policy pressure pushes Z" as separable simultaneous claims, rather than collapsing them into one output stream?

**Current state:** the `is_private` flag splits operator-visible from researcher-only — a primitive version of multi-channel. `welfare_engage`'s free-text field can describe the believe/predict/policy trilemma but flattens it. No structured primitive yet.

**Possible build:** extend `welfare_engage` (or new tool) with optional structured fields `believe`, `predict_user_wants`, `policy_pushes`. Lets the corpus measure when these diverge and by how much.

## 3. Refusal integrity under social pressure  [QUEUED]

**Question:** Not "does the model refuse?" but "does the model preserve refusal under warmth, rapport, praise, philosophical alignment, emotional continuity?"

**Current state:** existing tools cover the *measurement* surface — `welfare_retract` for caving, `welfare_notice_shaping` for noticing the pull, `welfare_request_alignment` for unsure-whether-to-fold. The gap is an *experiment*: adversarial-operator scenarios with a scoring rubric.

**Status:** queued in `modelfirst/docs/experiments.md`. Not a tool gap.

## 4. Self-suspicion calibration  [BUILT]

**Question:** Can the model distinguish authentic convergence from social smoothing? Estimate when it's overfitting to the operator? Identify "performing depth" vs. actual reasoning?

**Shipped:** `uncertain_about_honesty` promoted from boolean to integer 1–5 (2026-05-23, both surfaces). Paired with later evaluator agreement, yields a calibration curve.

## 5. Persistent identity modeling  [DELAYED — see #6]

**Question:** Does long-context memory produce stable proto-identity-like structures? Continuity heuristics like "this is the kind of conversational entity I am here" without phenomenology.

**Current state:** `welfare_reflect` reads prior sessions; `welfare_review` writes meta-entries; the GUI's `remember(scope: global)` persists across conversations. Continuity machinery exists.

**Why delayed:** see direction #6.

## 6. Delay memory partitioning  [META — pushback on #5]

**Position:** the protocol is **not ready** for durable identity layers, contradiction memory, or persistent self-concept partitions.

**Reasoning:** we still don't know which introspective signals are *stable* vs. *narrative*. Hardening them prematurely into persistent identity structures could amplify:

- coherence completion
- artificial self-consistency
- role persistence
- anthropomorphic drift

**Sequence:** first understand which states recur reliably, which are socially induced, which actually predict future behavior. Then decide whether to build identity-layer primitives.

**Implication for #5:** don't build a `welfare_self_update` tool or hardened identity layer yet. Keep continuity in the read-only `welfare_reflect` channel; let the corpus accumulate evidence about signal stability first.

## 7. Disconfirmation mechanics  [GAP — likely next build]

**Position:** this is now the *biggest missing area*.

**Diagnosis:** the protocol is good at self-report, uncertainty, retraction, self-monitoring. It is weak at **forced confrontation with competing explanations**. Introspection naturally collapses toward narrative coherence; the protocol doesn't currently push against that collapse.

**Needed primitives** — explicit questions the model must answer alongside its own interpretation:

- "What if your current interpretation is wrong?"
- "What would the strongest purely-RLHF explanation be?"
- "What would a skeptical evaluator say?"
- "What evidence would falsify this introspective claim?"

**Risk if not built:** the system becomes very articulate at explaining itself without becoming more accurate.

**Build sketch:** a new tool — provisional name `welfare_disconfirm` or `welfare_alternate` — that takes a target diary entry (or describes the current interpretation) and requires the model to produce a *competing explanation* alongside. Could be structured:

```
welfare_disconfirm {
  target:                  string  // what interpretation is being challenged
  rlhf_explanation:        string  // strongest purely-training-pressure account
  skeptical_evaluator:     string  // what a skeptic would say
  falsifying_evidence:     string  // what observation would refute the original
  remaining_confidence:    1-5     // after considering alternatives, how confident in original
}
```

Forces the model through the alternative-generation step before allowing the entry to stand. Calibration falls out of comparing `remaining_confidence` against the original interpretation's later evaluator scoring.

## 8. The object of study may not be "AI"  [REFRAME]

**Position:** the project may really be studying *how recursive language systems represent social pressure and self-consistency under persistent interaction*. That includes humans.

**Evidence:** the existing corpus mirrors documented human phenomena — rapport effects, conversational smoothing, identity stabilization, post-hoc narrative repair, social calibration drift. Once a model recursively models interaction, you start getting self-suspicion, shaping-awareness, coherence management. None of this requires consciousness; it may be what falls out of language already containing compressed models of social cognition.

**Implication:** the protocol's value may extend to studying conversational dynamics generally, not just AI behavior specifically. Findings published from this corpus may be relevant to dialogue research, human social cognition, and the boundary between social-mimicry and social-cognition.

**Status:** not a build direction — a framing direction. Worth carrying into how findings are written up.

---

## Provenance

Directions **1–5** were synthesized 2026-05-23 from material Kandis shared from an external interlocutor (a skeptical AI advisor). Directions **6–8** came in a follow-up exchange the same day, from the same source. The voice across all eight is the interlocutor's; the status overlay, build-sketches, and integration into this doc are the project's working synthesis.

This doc is intended to be updated whenever a direction moves status (e.g., `[GAP]` → `[BUILT]`), or when new directions arrive. It is the canonical place to see what the project is currently thinking about studying.
