/**
 * Shared contract types for the Receipt Categoriser.
 *
 * Everything in this file is traceable to spec.md section 3 (Contract).
 * Nothing here may be added without a corresponding line in the spec.
 */

/** spec.md 3 - Category Enum. Order is the display order in the claimant UI. */
export const CATEGORIES = [
  'Meals',
  'Travel',
  'Lodging',
  'Office Supplies',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** spec.md 3 - Output Rules. */
export type SuggestionSource = 'llm' | 'rule-based';

/** spec.md 3 - Confidence below this is surfaced to the claimant as "Needs review". */
export const NEEDS_REVIEW_THRESHOLD = 0.6;

/**
 * spec.md 3 - Validation Rules.
 * PDF is deliberately absent: acceptance.md AC-09 requires a 400 for it.
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * NFR: suggestion latency under 4s p95, upload to displayed suggestion.
 *
 * The handler owns one end-to-end budget and spends it across its two upstream
 * calls, so neither can blow it alone:
 *
 *   OCR      <= 2000ms   exceeding it means Document Intelligence is
 *                        effectively down -> 502
 *   LLM      <= 1500ms   exceeding it is a transient outage -> rule-based
 *   headroom  ~500ms     validation, telemetry, serialisation, network
 *
 * These are defaults. The running service overrides them from Azure App
 * Configuration alongside the feature flag.
 */
export const SUGGESTION_BUDGET_MS = 4000;
export const OCR_TIMEOUT_MS = 2000;
export const LLM_TIMEOUT_MS = 1500;

/**
 * NFR: cost per suggestion <= LKR 5 at ~2,000 suggestions/month.
 *
 * Prompt size is the only cost lever in our control, so the input is bounded
 * rather than trusted. 60 lines covers every receipt in the fixture set with
 * room to spare; a receipt longer than that is a multi-page document, which is
 * out of scope for v0.1.
 */
export const MAX_LLM_INPUT_LINES = 60;

/** Confidence ceiling for the degraded path. acceptance.md AC-03: `<= 0.5`. */
export const RULE_BASED_MAX_CONFIDENCE = 0.5;

export interface ReceiptFile {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CategoriseRequest {
  claimId: string;
  file: ReceiptFile;
  /** Raw upload. Stays inside the tenant; never reaches telemetry. */
  content: Uint8Array;
}

/** spec.md 3 - Outputs. These three fields are the whole response body. */
export interface Suggestion {
  category: Category;
  confidence: number;
  source: SuggestionSource;
}

/**
 * What the claimant-facing endpoint returns.
 * `needs_review` is derived from confidence, not a second source of truth.
 * `message` is present only when the claimant must be told something
 * (spec.md 3 / acceptance.md AC-04).
 */
export interface SuggestionBody extends Suggestion {
  needs_review: boolean;
  message?: string;
}

export interface ErrorBody {
  error: string;
}

export type CategoriseResponse =
  | { status: 200; body: SuggestionBody }
  | { status: 204; body: null }
  | { status: 400 | 413 | 502; body: ErrorBody };

/* ------------------------------------------------------------------ *
 * Ports. One per external service in spec.md 2 (Affected Containers).
 * The Azure SDKs are the adapters; nothing in src/ imports them, which
 * is what makes AC-03 and AC-04 observable in a test.
 * ------------------------------------------------------------------ */

export interface OcrResult {
  /** Line items and header text, in reading order. */
  lines: string[];
}

export interface OcrClient {
  /** Azure AI Document Intelligence. Throws OcrFailedError when unusable. */
  extractText(file: ReceiptFile, content: Uint8Array, signal: AbortSignal): Promise<OcrResult>;
}

export interface LlmSuggestion {
  category: Category;
  confidence: number;
}

export interface LlmClient {
  /** Azure OpenAI (gpt-4.1 family), BISTEC tenant. Throws LlmUnavailableError. */
  classify(lines: string[], signal: AbortSignal): Promise<LlmSuggestion>;
}

export interface TelemetryClient {
  /** Application Insights customEvents. */
  trackEvent(name: string, properties: Record<string, string | number | boolean>): void;
}

export interface FeatureFlagClient {
  /** Azure App Configuration. */
  isEnabled(flag: string): Promise<boolean>;
}

export interface Clock {
  now(): number;
}

/** Operational budgets, sourced from Azure App Configuration at runtime. */
export interface CategoriserTimeouts {
  totalMs?: number;
  ocrMs?: number;
  llmMs?: number;
}

export interface CategoriserDeps {
  ocr: OcrClient;
  llm: LlmClient;
  telemetry: TelemetryClient;
  featureFlags: FeatureFlagClient;
  clock?: Clock;
  timeouts?: CategoriserTimeouts;
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

/** The page could not be read at all. spec.md 3 / acceptance.md AC-04. */
export class OcrFailedError extends Error {
  readonly kind = 'ocr-failed';
}

/** Document Intelligence itself is down/unreachable. spec.md 3 - 502. */
export class OcrUnavailableError extends Error {
  readonly kind = 'ocr-unavailable';
}

/** Azure OpenAI 503, timeout, or an unusable response. acceptance.md AC-03. */
export class LlmUnavailableError extends Error {
  readonly kind = 'llm-unavailable';
}

export const FEATURE_FLAG_NAME = 'greenchit.receipt-categoriser.enabled';
export const TELEMETRY_EVENT_NAME = 'categoriser.suggested';
