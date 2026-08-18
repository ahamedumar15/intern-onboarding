/**
 * Test doubles for the four Azure ports.
 *
 * Receipt "images" are represented by their OCR text. Azure AI Document
 * Intelligence is not callable from the test suite, so the fixture boundary is
 * the OCR output rather than a real JPEG — see README, "What is faked".
 */

import {
  LlmUnavailableError,
  OcrFailedError,
  OcrUnavailableError,
  type CategoriseRequest,
  type CategoriserDeps,
  type Category,
  type Clock,
  type FeatureFlagClient,
  type LlmClient,
  type OcrClient,
  type ReceiptFile,
  type TelemetryClient,
} from '../src/types.ts';

export const FIXTURES: Record<string, string[]> = {
  // AC-01 — restaurant bill totalling LKR 2,400.
  'meal-receipt.png': [
    'The Curry Leaf Restaurant',
    'Colombo 03',
    'Chicken Kottu          1,450.00',
    'Lime Juice               350.00',
    'Service Charge           600.00',
    'TOTAL              LKR 2,400.00',
  ],

  // AC-02 — mixed food + stationery.
  'ambiguous-receipt.png': [
    'ABC Superstore',
    'Coffee                   480.00',
    'Sandwich                 620.00',
    'A4 Printer Paper       1,200.00',
    'Notebook                 350.00',
    'TOTAL              LKR 2,650.00',
  ],

  // AC-03 — any valid receipt; used while the LLM is down.
  'travel-receipt.png': [
    'PickMe Taxi',
    'Trip: Colombo 07 to Katunayake',
    'Fuel Surcharge           250.00',
    'TOTAL              LKR 4,800.00',
  ],

  // AC-06 — receipt carrying PII that must not reach Application Insights.
  'pii-receipt.png': [
    'Hilton Colombo',
    'Guest: Nimal Perera',
    'Email: nimal.perera@example.com',
    'Room Charge — 1 Night  18,000.00',
    'VISA **** **** **** 4242',
    'TOTAL             LKR 18,000.00',
  ],
};

export const PII_STRINGS = ['Nimal Perera', 'nimal.perera@example.com', '4242'];

export function receipt(
  name: keyof typeof FIXTURES | string,
  overrides: Partial<ReceiptFile> = {},
): ReceiptFile {
  return {
    filename: String(name),
    mimeType: 'image/png',
    sizeBytes: 512 * 1024,
    ...overrides,
  };
}

export function request(
  file: ReceiptFile,
  claimId = 'CLM-2026-000412',
): CategoriseRequest {
  return { claimId, file, content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
}

/* ---------------------------------------------------------------- */

type OcrBehaviour = 'ok' | 'unparseable' | 'down' | 'hangs';

export function fakeOcr(behaviour: OcrBehaviour = 'ok'): OcrClient {
  return {
    async extractText(file) {
      if (behaviour === 'down') throw new OcrUnavailableError('503 from Document Intelligence');
      if (behaviour === 'unparseable') throw new OcrFailedError('no text detected');
      // Never settles: stands in for a request that is accepted and then
      // never answered, which a status-code check would not catch.
      if (behaviour === 'hangs') return new Promise<never>(() => {});
      const lines = FIXTURES[file.filename];
      if (!lines) throw new OcrFailedError(`no fixture for ${file.filename}`);
      return { lines };
    },
  };
}

/** A receipt far longer than anything in v0.1 scope, for the cost guard. */
export function longReceipt(lineCount = 500): OcrClient {
  const lines = Array.from({ length: lineCount }, (_, i) => `Line item ${i + 1}   100.00`);
  return {
    async extractText() {
      return { lines };
    },
  };
}

export interface FakeLlmOptions {
  /** What the model answers when it is up. */
  answer?: { category: Category; confidence: number };
  /** Simulated Azure OpenAI failure, e.g. 503. */
  status?: number;
  /** Lines the fake was asked to classify — asserted against for the PII test. */
  seen?: string[][];
}

export function fakeLlm(options: FakeLlmOptions = {}): LlmClient {
  const answer = options.answer ?? { category: 'Meals' as Category, confidence: 0.94 };
  return {
    async classify(lines) {
      options.seen?.push(lines);
      if (options.status && options.status >= 400) {
        throw new LlmUnavailableError(`Azure OpenAI returned ${options.status}`);
      }
      return answer;
    },
  };
}

export interface RecordedEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
}

export function fakeTelemetry(sink: RecordedEvent[]): TelemetryClient {
  return {
    trackEvent(name, properties) {
      sink.push({ name, properties });
    },
  };
}

export function fakeFlags(enabled = true): FeatureFlagClient {
  return { async isEnabled() { return enabled; } };
}

/** Deterministic clock so latency assertions do not depend on machine speed. */
export function fakeClock(stepMs = 120): Clock {
  let t = 1_000_000;
  return {
    now() {
      const current = t;
      t += stepMs;
      return current;
    },
  };
}

export function deps(overrides: Partial<CategoriserDeps> = {}): CategoriserDeps {
  return {
    ocr: fakeOcr(),
    llm: fakeLlm(),
    telemetry: fakeTelemetry([]),
    featureFlags: fakeFlags(),
    clock: fakeClock(),
    ...overrides,
  };
}
