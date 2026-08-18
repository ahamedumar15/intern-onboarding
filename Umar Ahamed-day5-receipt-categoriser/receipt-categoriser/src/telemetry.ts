/**
 * Application Insights customEvent emission for `categoriser.suggested`.
 *
 * PII rule (spec.md NFR / acceptance.md AC-06): this module builds the event
 * payload from a fixed allowlist of fields. It never receives OCR text, the
 * image, or the claimant identity, so there is no redaction step to get wrong
 * and no way for a new receipt format to leak a name into telemetry.
 *
 * If a future field is needed, it has to be added here explicitly — which is
 * the review gate we want.
 */

import {
  TELEMETRY_EVENT_NAME,
  type Category,
  type SuggestionSource,
  type TelemetryClient,
} from './types.ts';

export interface SuggestionEvent {
  /** Opaque claim identifier. Not a person; safe to correlate on. */
  claimId: string;
  category: Category;
  confidence: number;
  source: SuggestionSource;
  needsReview: boolean;
  /** End-to-end handler duration, for the 4s p95 NFR. */
  latencyMs: number;
  /** Count only — never the text itself. */
  ocrLineCount: number;
  /** 'ok' | 'ocr-failed' | 'llm-fallback' — why this path was taken. */
  outcome: string;
}

export function emitSuggested(telemetry: TelemetryClient, event: SuggestionEvent): void {
  telemetry.trackEvent(TELEMETRY_EVENT_NAME, {
    claimId: event.claimId,
    category: event.category,
    confidence: event.confidence,
    source: event.source,
    needsReview: event.needsReview,
    latencyMs: event.latencyMs,
    ocrLineCount: event.ocrLineCount,
    outcome: event.outcome,
  });
}
