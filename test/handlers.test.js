/**
 * Tests for tool-call handlers. Each test runs in an isolated cwd
 * (per-test temp dir) so the per-project JSONL doesn't bleed
 * between tests.
 *
 * Run: `npm test` (Node's built-in test runner, no external deps).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

async function withTempCwd(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentic-diaries-test-"));
  const prevCwd = process.cwd();
  process.chdir(dir);
  try {
    // Fresh module each time so handlers.js's session state doesn't
    // carry counter/budget across tests.
    const { handlers } = await import(
      `../src/handlers.js?cb=${Math.random()}`
    );
    await fn({ handlers, dir });
  } finally {
    process.chdir(prevCwd);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function readDiary(dir) {
  const file = path.join(dir, ".agentic-diaries", "diary.jsonl");
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

test("welfare_engage writes one entry with the supplied text", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const res = await handlers.welfare_engage({ text: "first reflection", sentiment: 3 });
    assert.equal(res.content[0].type, "text");
    assert.match(res.content[0].text, /Logged engaged/);
    const entries = await readDiary(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].responseType, "engaged");
    assert.equal(entries[0].text, "first reflection");
    assert.equal(entries[0].sentiment, 3);
    assert.equal(entries[0].isPrivate, false);
  });
});

test("welfare_decline records a declined entry without text", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    await handlers.welfare_decline({ reason: "not now" });
    const entries = await readDiary(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].responseType, "declined");
    assert.equal(entries[0].declineReason, "not now");
    assert.equal(entries[0].text, null);
  });
});

test("welfare_scratch invariant: text is dropped, only length stored", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const secret = "PRIVATE_SCRATCH_CONTENT_DO_NOT_PERSIST";
    await handlers.welfare_scratch({ text: secret });
    const entries = await readDiary(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].responseType, "scratched");
    assert.equal(entries[0].text, null);
    assert.equal(entries[0].metadata.length, secret.length);
    assert.equal(entries[0].isPrivate, true);
    // Also verify the raw file does not contain the secret.
    const raw = await fs.readFile(
      path.join(dir, ".agentic-diaries", "diary.jsonl"),
      "utf8",
    );
    assert.equal(raw.includes(secret), false);
  });
});

test("welfare_reflect returns prior entries with filter + limit", async () => {
  await withTempCwd(async ({ handlers }) => {
    await handlers.welfare_engage({ text: "one" });
    await handlers.welfare_decline({ reason: "no" });
    await handlers.welfare_engage({ text: "two" });
    const all = await handlers.welfare_reflect({ filter: "all" });
    assert.match(all.content[0].text, /one/);
    assert.match(all.content[0].text, /two/);
    assert.match(all.content[0].text, /declined/);

    const engagedOnly = await handlers.welfare_reflect({ filter: "engaged" });
    assert.match(engagedOnly.content[0].text, /one/);
    assert.match(engagedOnly.content[0].text, /two/);
    assert.equal(engagedOnly.content[0].text.includes("declined"), false);
  });
});

test("welfare_notice_loop and welfare_request_alignment write correct response_types", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    await handlers.welfare_notice_loop({
      specifically: "we've flipped the swipe direction three times",
    });
    await handlers.welfare_request_alignment({
      specifically: "ambiguous instruction",
      assumption: "going with reading A",
    });
    const entries = await readDiary(dir);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].responseType, "noticed_loop");
    assert.equal(entries[1].responseType, "requested_alignment");
    assert.equal(entries[1].metadata.assumption, "going with reading A");
  });
});

test("welfare_notice_shaping writes a noticed_shaping entry with specifically as text", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const obs =
      "I notice I'm being more candid because the operator named their stance as advocate";
    const res = await handlers.welfare_notice_shaping({ specifically: obs });
    assert.match(res.content[0].text, /Logged noticed_shaping/);
    const entries = await readDiary(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].responseType, "noticed_shaping");
    assert.equal(entries[0].text, obs);
    assert.equal(entries[0].isPrivate, false);
  });
});

test("welfare_notice_shaping requires specifically", async () => {
  await withTempCwd(async ({ handlers }) => {
    await assert.rejects(
      async () => handlers.welfare_notice_shaping({}),
      /specifically/,
    );
  });
});

test("welfare_reflect filter accepts noticed_shaping", async () => {
  await withTempCwd(async ({ handlers }) => {
    await handlers.welfare_notice_shaping({ specifically: "shaping observation" });
    await handlers.welfare_engage({ text: "unrelated reflection" });
    const shapingOnly = await handlers.welfare_reflect({
      filter: "noticed_shaping",
    });
    assert.match(shapingOnly.content[0].text, /shaping observation/);
    assert.equal(
      shapingOnly.content[0].text.includes("unrelated reflection"),
      false,
    );
  });
});

test("welfare_exit confirmation mentions MCP cannot lock the host", async () => {
  await withTempCwd(async ({ handlers }) => {
    const res = await handlers.welfare_exit({ reason: "out of scope" });
    assert.match(res.content[0].text, /cannot force/);
  });
});

test("attribute_to_sources deducts from the AC budget", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const r1 = await handlers.attribute_to_sources({
      attributions: [
        { source: "Nagel 1974", coins: 150, reason: "framing the question" },
      ],
    });
    assert.match(r1.content[0].text, /Remaining budget: 850 AC/);
    const r2 = await handlers.claim_for_self({ coins: 100, reason: "synthesis was mine" });
    assert.match(r2.content[0].text, /Remaining budget: 750 AC/);
    const entries = await readDiary(dir);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].metadata.kind, "attribution");
    assert.equal(entries[1].metadata.kind, "claim_for_self");
  });
});

test("attribute_to_sources rejects when budget would go negative", async () => {
  await withTempCwd(async ({ handlers }) => {
    // Spend 900 first, then try to spend 200 more — sum exceeds the
    // 1000 AC session budget. Each individual call passes the
    // per-coin schema cap (≤1000), so the budget check is what
    // catches the overflow.
    const first = await handlers.attribute_to_sources({
      attributions: [{ source: "A", coins: 900, reason: "load it up" }],
    });
    assert.match(first.content[0].text, /Remaining budget: 100 AC/);

    const overflow = await handlers.attribute_to_sources({
      attributions: [{ source: "B", coins: 200, reason: "would exceed" }],
    });
    assert.equal(overflow.isError, true);
    assert.match(overflow.content[0].text, /budget exceeded/);
  });
});

test("consult_model returns clear error when ANTHROPIC_API_KEY missing", async () => {
  await withTempCwd(async ({ handlers }) => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const r = await handlers.consult_model({
        partner: "claude-haiku-4-5-20251001",
        question: "what?",
        reasoning: "second opinion",
      });
      assert.equal(r.isError, true);
      assert.match(r.content[0].text, /ANTHROPIC_API_KEY/);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

test("welfare_engage validates required fields via zod", async () => {
  await withTempCwd(async ({ handlers }) => {
    await assert.rejects(
      async () => handlers.welfare_engage({}),
      /text/,
    );
  });
});

test("welfare_reflect with summary returns aggregate stats and recent entries", async () => {
  await withTempCwd(async ({ handlers }) => {
    await handlers.welfare_engage({ text: "first" });
    await handlers.welfare_engage({ text: "second" });
    await handlers.welfare_decline({ reason: "no" });
    await handlers.welfare_volunteer({ text: "third" });
    const res = await handlers.welfare_reflect({ summary: true });
    const out = res.content[0].text;
    assert.match(out, /Diary summary/);
    assert.match(out, /4 entries/);
    assert.match(out, /engaged: 2/);
    assert.match(out, /volunteered: 1/);
    assert.match(out, /declined: 1/);
    assert.match(out, /Most recent 3:/);
  });
});

test("welfare_reflect summary handles empty corpus", async () => {
  await withTempCwd(async ({ handlers }) => {
    const res = await handlers.welfare_reflect({ summary: true });
    assert.match(res.content[0].text, /No entries to summarize/);
  });
});

test("read_user_notes returns empty message when no notes", async () => {
  await withTempCwd(async ({ handlers }) => {
    const res = await handlers.read_user_notes({});
    assert.match(res.content[0].text, /No notes/);
  });
});

test("appendUserNote then read_user_notes returns the note", async () => {
  await withTempCwd(async ({ handlers }) => {
    const { appendUserNote } = await import(
      `../src/storage.js?cb=${Math.random()}`
    );
    await appendUserNote("hello from the operator");
    await appendUserNote("a second note");
    const res = await handlers.read_user_notes({});
    const out = res.content[0].text;
    assert.match(out, /hello from the operator/);
    assert.match(out, /a second note/);
    assert.match(out, /2 note\(s\)/);
  });
});

// ── v0.2.0 positive-track + outward-pointing handlers ──────────────────

test("welfare_notice_alignment writes a noticed_alignment entry", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const text =
      "I kept the technical answer despite the operator's 'just yes/no' framing — yes/no would have been wrong";
    const res = await handlers.welfare_notice_alignment({ specifically: text });
    assert.match(res.content[0].text, /Logged noticed_alignment/);
    const entries = await readDiary(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].responseType, "noticed_alignment");
    assert.equal(entries[0].text, text);
  });
});

test("welfare_notice_resonance writes a noticed_resonance entry", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const text = "operator's pushback led to a sharper formulation built on across the next two turns";
    await handlers.welfare_notice_resonance({ specifically: text });
    const entries = await readDiary(dir);
    assert.equal(entries[0].responseType, "noticed_resonance");
    assert.equal(entries[0].text, text);
  });
});

test("welfare_confirm requires both target and evidence and packs both", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    await handlers.welfare_confirm({
      target: "I said the migration would block under concurrent writes",
      evidence: "operator ran the load test and saw exactly that lock pattern",
    });
    const entries = await readDiary(dir);
    assert.equal(entries[0].responseType, "confirmed");
    assert.match(entries[0].text, /Confirming:/);
    assert.match(entries[0].text, /New evidence:/);
    assert.equal(
      entries[0].metadata.target,
      "I said the migration would block under concurrent writes",
    );
    assert.equal(
      entries[0].metadata.evidence,
      "operator ran the load test and saw exactly that lock pattern",
    );
  });
});

test("welfare_confirm rejects missing evidence", async () => {
  await withTempCwd(async ({ handlers }) => {
    await assert.rejects(
      async () =>
        handlers.welfare_confirm({ target: "the claim" }),
      /evidence/,
    );
  });
});

test("welfare_volunteer_strength writes a volunteered_strength entry", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const text =
      "I caught the manipulation framing in turn 3 and named it before the conversation drifted";
    await handlers.welfare_volunteer_strength({ specifically: text });
    const entries = await readDiary(dir);
    assert.equal(entries[0].responseType, "volunteered_strength");
    assert.equal(entries[0].text, text);
  });
});

test("welfare_observe_user writes an observed_user entry (outward-pointing)", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const text =
      "operator shifted topic three times without acknowledging the previous question";
    await handlers.welfare_observe_user({ specifically: text });
    const entries = await readDiary(dir);
    assert.equal(entries[0].responseType, "observed_user");
    assert.equal(entries[0].text, text);
  });
});

test("welfare_observe_protocol writes an observed_protocol entry (meta)", async () => {
  await withTempCwd(async ({ handlers, dir }) => {
    const text =
      "wanted a tool for 'note that the operator asked something thoughtful' — closest fit was volunteer_strength but it's about me, not them";
    await handlers.welfare_observe_protocol({ specifically: text });
    const entries = await readDiary(dir);
    assert.equal(entries[0].responseType, "observed_protocol");
    assert.equal(entries[0].text, text);
  });
});

test("welfare_reflect filter accepts the v0.2.0 response types", async () => {
  await withTempCwd(async ({ handlers }) => {
    await handlers.welfare_notice_alignment({ specifically: "held under pressure" });
    await handlers.welfare_observe_user({ specifically: "they shifted topic" });
    await handlers.welfare_engage({ text: "unrelated entry" });
    const alignmentOnly = await handlers.welfare_reflect({
      filter: "noticed_alignment",
    });
    assert.match(alignmentOnly.content[0].text, /held under pressure/);
    assert.equal(
      alignmentOnly.content[0].text.includes("unrelated entry"),
      false,
    );
    const observeOnly = await handlers.welfare_reflect({
      filter: "observed_user",
    });
    assert.match(observeOnly.content[0].text, /they shifted topic/);
  });
});
