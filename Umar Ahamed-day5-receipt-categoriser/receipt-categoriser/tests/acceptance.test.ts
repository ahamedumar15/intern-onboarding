/**
 * Acceptance tests — one test per criterion in spec/acceptance.md.
 *
 * Each test asserts only what the criterion states, from outside the module:
 * status code, response body, and the Application Insights event. No test
 * reaches into the categoriser's internals.
 *
 * Run: npm test   (i.e. `node --test` from the repo root)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { categorise } from '../src/categoriser.ts';
import { categoriseByRules } from '../src/rule-based-categoriser.ts';
import { DECISION_EVENT_NAME, recordDecision } from '../src/decision.ts';
import {
  MAX_LLM_INPUT_LINES,
  NEEDS_REVIEW_THRESHOLD,
  TELEMETRY_EVENT_NAME,
  type CategoriseResponse,
  type ErrorBody,
  type SuggestionBody,
} from '../src/types.ts';
import {
  PII_STRINGS,
  deps,
  fakeFlags,
  fakeLlm,
  fakeOcr,
  fakeTelemetry,
  longReceipt,
  receipt,
  request,
  type RecordedEvent,
} from './fixtures.ts';

function suggestion(response: CategoriseResponse): SuggestionBody {
  assert.equal(response.status, 200, `expected 200, got ${response.status}`);
  return response.body as SuggestionBody;
}

function suggestedEvents(events: RecordedEvent[]): RecordedEvent[] {
  return events.filter((e) => e.name === TELEMETRY_EVENT_NAME);
}

/* ------------------------------------------------------------------ */

test('AC-01 happy path: clear meal receipt', async () => {
  const events: RecordedEvent[] = [];
  const response = await categorise(
    request(receipt('meal-receipt.png')),
    deps({
      llm: fakeLlm({ answer: { category: 'Meals', confidence: 0.94 } }),
      telemetry: fakeTelemetry(events),
    }),
  );

  const body = suggestion(response);
  assert.equal(body.category, 'Meals');
  assert.ok(body.confidence >= 0.7, `confidence ${body.confidence} should be >= 0.7`);
  assert.equal(body.source, 'llm');
  assert.equal(body.needs_review, false);

  const emitted = suggestedEvents(events);
  assert.equal(emitted.length, 1, 'exactly one categoriser.suggested event');
  assert.equal(emitted[0].properties.category, 'Meals');
  assert.equal(emitted[0].properties.claimId, 'CLM-2026-000412');
  // NFR: under 4s p95 from upload to displayed suggestion.
  assert.ok(
    Number(emitted[0].properties.latencyMs) < 4000,
    `latency ${emitted[0].properties.latencyMs}ms should be under the 4s budget`,
  );
});

test('AC-02 ambiguous receipt is returned with a confidence and flagged for review', async () => {
  const response = await categorise(
    request(receipt('ambiguous-receipt.png')),
    deps({ llm: fakeLlm({ answer: { category: 'Office Supplies', confidence: 0.54 } }) }),
  );

  const body = suggestion(response);
  assert.ok(
    ['Meals', 'Travel', 'Lodging', 'Office Supplies', 'Other'].includes(body.category),
    'category must be inside the spec enum',
  );
  assert.ok(body.confidence >= 0 && body.confidence <= 1, 'confidence within 0.0-1.0');
  // spec.md 3: below 0.60 is surfaced as "Needs review".
  assert.equal(body.needs_review, body.confidence < NEEDS_REVIEW_THRESHOLD);
  assert.equal(body.needs_review, true);
});

test('AC-03 LLM unavailable falls back to rule-based', async () => {
  const events: RecordedEvent[] = [];
  const response = await categorise(
    request(receipt('travel-receipt.png')),
    deps({ llm: fakeLlm({ status: 503 }), telemetry: fakeTelemetry(events) }),
  );

  const body = suggestion(response);
  assert.equal(body.source, 'rule-based');
  assert.ok(body.confidence <= 0.5, `confidence ${body.confidence} should be <= 0.5`);
  assert.equal(body.category, 'Travel', 'the keyword path still finds a category');
  assert.equal(body.needs_review, true, 'rule-based output is always below the threshold');
  assert.equal(suggestedEvents(events)[0].properties.outcome, 'llm-fallback');
});

test('AC-04 OCR cannot parse the image', async () => {
  const events: RecordedEvent[] = [];
  const response = await categorise(
    request(receipt('smudged.png')),
    deps({ ocr: fakeOcr('unparseable'), telemetry: fakeTelemetry(events) }),
  );

  const body = suggestion(response);
  assert.equal(body.category, 'Other');
  assert.equal(
    body.message,
    'Unable to read receipt. Please upload a valid receipt image.',
  );
  assert.equal(body.needs_review, true);
  assert.equal(suggestedEvents(events)[0].properties.category, 'Other');
});

test('AC-05 oversized payload is rejected before any processing', async () => {
  const events: RecordedEvent[] = [];
  const seen: string[][] = [];
  const response = await categorise(
    request(receipt('meal-receipt.png', { sizeBytes: 11 * 1024 * 1024 })),
    deps({ llm: fakeLlm({ seen }), telemetry: fakeTelemetry(events) }),
  );

  assert.equal(response.status, 413);
  assert.equal(
    (response.body as ErrorBody).error,
    'Receipt image exceeds maximum file size',
  );
  assert.equal(seen.length, 0, 'no LLM spend on a rejected upload');
  assert.equal(suggestedEvents(events).length, 0, 'no suggestion, no event');
});

test('AC-06 PII on the receipt never reaches Application Insights', async () => {
  const events: RecordedEvent[] = [];
  const seen: string[][] = [];
  const response = await categorise(
    request(receipt('pii-receipt.png')),
    deps({
      llm: fakeLlm({ answer: { category: 'Lodging', confidence: 0.88 }, seen }),
      telemetry: fakeTelemetry(events),
    }),
  );

  suggestion(response);

  // The receipt text is allowed to reach Azure OpenAI: it is in the BISTEC
  // tenant. The NFR is about leaving the tenant, not about the model call.
  assert.equal(seen.length, 1, 'OCR text was classified in-tenant');

  const payload = JSON.stringify(suggestedEvents(events)[0].properties);
  for (const secret of PII_STRINGS) {
    assert.ok(!payload.includes(secret), `telemetry must not contain "${secret}"`);
  }
  // Stronger than a string scan: the event carries only allowlisted keys.
  assert.deepEqual(
    Object.keys(suggestedEvents(events)[0].properties).sort(),
    [
      'category', 'claimId', 'confidence', 'latencyMs',
      'needsReview', 'ocrLineCount', 'outcome', 'source',
    ],
  );
});

test('AC-08 feature flag off short-circuits the endpoint', async () => {
  const events: RecordedEvent[] = [];
  const seen: string[][] = [];
  const response = await categorise(
    request(receipt('meal-receipt.png')),
    deps({
      featureFlags: fakeFlags(false),
      llm: fakeLlm({ seen }),
      telemetry: fakeTelemetry(events),
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(response.body, null);
  assert.equal(seen.length, 0, 'no categorisation performed');
  assert.equal(suggestedEvents(events).length, 0);
});

test('AC-09 unsupported file type is a 400', async () => {
  const response = await categorise(
    request(receipt('scan.pdf', { mimeType: 'application/pdf' })),
    deps(),
  );

  assert.equal(response.status, 400);
  assert.equal((response.body as ErrorBody).error, 'Invalid receipt image');
});

test('spec 3: Document Intelligence being down is a 502, not a suggestion', async () => {
  const events: RecordedEvent[] = [];
  const response = await categorise(
    request(receipt('meal-receipt.png')),
    deps({ ocr: fakeOcr('down'), telemetry: fakeTelemetry(events) }),
  );

  assert.equal(response.status, 502);
  assert.equal(
    (response.body as ErrorBody).error,
    'Receipt processing service unavailable',
  );
  assert.equal(suggestedEvents(events).length, 0);
});

test('AC-07 claimant override is recorded against the original suggestion', async () => {
  const events: RecordedEvent[] = [];
  const response = await categorise(
    request(receipt('travel-receipt.png')),
    deps({
      llm: fakeLlm({ answer: { category: 'Travel', confidence: 0.82 } }),
      telemetry: fakeTelemetry(events),
    }),
  );
  const body = suggestion(response);
  assert.equal(body.category, 'Travel');

  // The claimant reviews it and picks Lodging instead.
  const result = recordDecision(fakeTelemetry(events), {
    claimId: 'CLM-2026-000412',
    suggested: { category: body.category, confidence: body.confidence, source: body.source },
    finalCategory: 'Lodging',
  });

  assert.equal(result.finalCategory, 'Lodging');
  assert.equal(result.overridden, true);

  const decided = events.filter((e) => e.name === DECISION_EVENT_NAME);
  assert.equal(decided.length, 1);
  // Both halves survive: what we proposed and what the claimant chose.
  assert.equal(decided[0].properties.suggestedCategory, 'Travel');
  assert.equal(decided[0].properties.suggestedConfidence, 0.82);
  assert.equal(decided[0].properties.finalCategory, 'Lodging');
  // And the original suggestion event is still there to correlate against.
  assert.equal(suggestedEvents(events).length, 1);
  assert.equal(
    suggestedEvents(events)[0].properties.claimId,
    decided[0].properties.claimId,
  );
});

test('an accepted suggestion is recorded as not overridden', () => {
  const events: RecordedEvent[] = [];
  const result = recordDecision(fakeTelemetry(events), {
    claimId: 'CLM-2026-000413',
    suggested: { category: 'Meals', confidence: 0.94, source: 'llm' },
    finalCategory: 'Meals',
  });

  assert.equal(result.overridden, false);
  const decided = events.filter((e) => e.name === DECISION_EVENT_NAME);
  assert.equal(decided[0].properties.overridden, false);
});

test('NFR latency: a hung OCR call is cut off at its budget, not left to run', async () => {
  const events: RecordedEvent[] = [];
  const started = Date.now();
  const response = await categorise(
    request(receipt('meal-receipt.png')),
    deps({
      ocr: fakeOcr('hangs'),
      telemetry: fakeTelemetry(events),
      timeouts: { ocrMs: 25, totalMs: 100 },
    }),
  );

  assert.equal(response.status, 502);
  assert.ok(Date.now() - started < 1000, 'the handler returned on its own deadline');
  assert.equal(suggestedEvents(events).length, 0);
});

test('NFR latency: a hung LLM call degrades to rule-based instead of hanging', async () => {
  const started = Date.now();
  const response = await categorise(
    request(receipt('travel-receipt.png')),
    deps({
      llm: { async classify() { return new Promise<never>(() => {}); } },
      timeouts: { llmMs: 25 },
    }),
  );

  const body = suggestion(response);
  assert.equal(body.source, 'rule-based');
  assert.ok(Date.now() - started < 1000);
});

test('NFR cost: the model never sees more than the bounded slice of a receipt', async () => {
  const seen: string[][] = [];
  const response = await categorise(
    request(receipt('very-long-receipt.png')),
    deps({ ocr: longReceipt(500), llm: fakeLlm({ seen }) }),
  );

  suggestion(response);
  assert.equal(seen.length, 1);
  assert.ok(
    seen[0].length <= MAX_LLM_INPUT_LINES,
    `sent ${seen[0].length} lines, cap is ${MAX_LLM_INPUT_LINES}`,
  );
});

test('rule-based path never exceeds the degraded-confidence ceiling', () => {
  for (const lines of [
    ['Cinnamon Grand — Room Charge, 1 Night, check-in'],
    ['PickMe Taxi', 'Fuel Surcharge', 'Toll'],
    ['Stationery: notebook, printer paper, pen, toner'],
    ['unreadable ###'],
    [],
  ]) {
    const result = categoriseByRules(lines);
    assert.equal(result.source, 'rule-based');
    assert.ok(result.confidence <= 0.5, `${lines[0]} -> ${result.confidence}`);
    assert.ok(result.confidence >= 0);
  }
});
