/**
 * Receipt Categoriser — request orchestrator.
 *
 * This is the whole feature seen from outside: it returns the exact status and
 * body that `POST /claims/{id}/receipts/categorise` returns, so every
 * acceptance criterion can be asserted without reaching into internals.
 *
 * Order of operations, and why:
 *
 *   1. feature flag   — the kill switch must short-circuit everything, including
 *                       validation, so that turning the feature off makes the
 *                       endpoint behave as if it were never deployed (AC-08).
 *   2. validation     — cheap, local, no spend. 400 before 413 for a request
 *                       that is both wrong-typed and oversized.
 *   3. OCR            — a dead service is a 502; an unreadable page is not.
 *   4. LLM            — failure here degrades, it does not fail the request.
 *   5. telemetry      — emitted on every path that produced a suggestion.
 *
 * SPEC AMBIGUITY (resolved here, raised in the review):
 * spec.md 3 says 502 when "OCR service is unavailable", while acceptance.md
 * AC-04 says 200 + "Other" when Document Intelligence "cannot parse" the image.
 * Those are two different failures wearing one name. This implementation splits
 * them: OcrUnavailableError -> 502, OcrFailedError -> 200 + "Other".
 */

import { withDeadline } from './deadline.ts';
import { categoriseByLlm } from './llm-categoriser.ts';
import { categoriseByRules } from './rule-based-categoriser.ts';
import { emitSuggested } from './telemetry.ts';
import {
  ALLOWED_MIME_TYPES,
  FEATURE_FLAG_NAME,
  LLM_TIMEOUT_MS,
  LlmUnavailableError,
  MAX_FILE_SIZE_BYTES,
  MAX_LLM_INPUT_LINES,
  NEEDS_REVIEW_THRESHOLD,
  OCR_TIMEOUT_MS,
  OcrFailedError,
  OcrUnavailableError,
  SUGGESTION_BUDGET_MS,
  type CategoriseRequest,
  type CategoriseResponse,
  type CategoriserDeps,
  type OcrResult,
  type Suggestion,
} from './types.ts';

const OCR_FAILURE_MESSAGE = 'Unable to read receipt. Please upload a valid receipt image.';

export async function categorise(
  request: CategoriseRequest,
  deps: CategoriserDeps,
): Promise<CategoriseResponse> {
  const clock = deps.clock ?? { now: () => Date.now() };
  const startedAt = clock.now();

  // NFR budgets. Defaults are the spec's; the service overrides them from
  // Azure App Configuration.
  const totalMs = deps.timeouts?.totalMs ?? SUGGESTION_BUDGET_MS;
  const ocrMs = deps.timeouts?.ocrMs ?? OCR_TIMEOUT_MS;
  const llmMs = deps.timeouts?.llmMs ?? LLM_TIMEOUT_MS;

  // 1. Kill switch (Azure App Configuration).
  if (!(await deps.featureFlags.isEnabled(FEATURE_FLAG_NAME))) {
    return { status: 204, body: null };
  }

  // 2. Input validation.
  const validationError = validate(request);
  if (validationError) return validationError;

  // 3. OCR via Azure AI Document Intelligence.
  let ocr: OcrResult;
  try {
    ocr = await withDeadline(
      (signal) => deps.ocr.extractText(request.file, request.content, signal),
      ocrMs,
      () => new OcrUnavailableError(`Document Intelligence exceeded ${ocrMs}ms`),
    );
  } catch (error) {
    if (error instanceof OcrFailedError) {
      // The claimant uploaded something we genuinely cannot read. Still a
      // successful request: they get "Other", a message, and can pick a
      // category themselves. spec.md 3 / acceptance.md AC-04.
      const suggestion: Suggestion = {
        category: 'Other',
        confidence: 0.0,
        source: 'rule-based',
      };
      emit(deps, request, suggestion, 0, clock.now() - startedAt, 'ocr-failed');
      return {
        status: 200,
        body: { ...suggestion, needs_review: true, message: OCR_FAILURE_MESSAGE },
      };
    }
    if (error instanceof OcrUnavailableError) {
      return { status: 502, body: { error: 'Receipt processing service unavailable' } };
    }
    throw error;
  }

  // 4. Classification: LLM first, rules as the degraded path.
  //
  // The model only ever sees a bounded slice of the receipt (cost NFR), and
  // only gets whatever is left of the end-to-end budget after OCR (latency
  // NFR). If OCR was slow, the model gets less time, not the request more.
  const prompt = ocr.lines.slice(0, MAX_LLM_INPUT_LINES);
  const remainingMs = Math.max(0, totalMs - (clock.now() - startedAt));

  let suggestion: Suggestion;
  let outcome = 'ok';
  try {
    suggestion = await categoriseByLlm(deps.llm, prompt, Math.min(llmMs, remainingMs));
  } catch (error) {
    if (!(error instanceof LlmUnavailableError)) throw error;
    suggestion = categoriseByRules(ocr.lines);
    outcome = 'llm-fallback';
  }

  // 5. Telemetry + response.
  const latencyMs = clock.now() - startedAt;
  emit(deps, request, suggestion, ocr.lines.length, latencyMs, outcome);

  return {
    status: 200,
    body: {
      ...suggestion,
      needs_review: suggestion.confidence < NEEDS_REVIEW_THRESHOLD,
    },
  };
}

function validate(request: CategoriseRequest): CategoriseResponse | null {
  if (!request.claimId || !request.file) {
    return { status: 400, body: { error: 'Invalid receipt image' } };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(request.file.mimeType)) {
    return { status: 400, body: { error: 'Invalid receipt image' } };
  }
  if (request.file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { status: 413, body: { error: 'Receipt image exceeds maximum file size' } };
  }
  return null;
}

function emit(
  deps: CategoriserDeps,
  request: CategoriseRequest,
  suggestion: Suggestion,
  ocrLineCount: number,
  latencyMs: number,
  outcome: string,
): void {
  emitSuggested(deps.telemetry, {
    claimId: request.claimId,
    category: suggestion.category,
    confidence: suggestion.confidence,
    source: suggestion.source,
    needsReview: suggestion.confidence < NEEDS_REVIEW_THRESHOLD,
    latencyMs,
    ocrLineCount,
    outcome,
  });
}
