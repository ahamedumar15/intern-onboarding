/**
 * Claimant decision log — the second half of spec.md 3 "Side effects".
 *
 * The claimant accepts or changes the suggestion on a later request, after the
 * suggestion has already been returned and logged. So "final category selected
 * by claimant" cannot be a property of `categoriser.suggested`: at the moment
 * that event is emitted, no claimant has decided anything yet.
 *
 * >>> SPEC DEFECT (raised, not silently patched) <<<
 * spec.md 3 lists "Final category selected by claimant" among the fields of the
 * `categoriser.suggested` event. That is not implementable as written. This
 * module emits a second event, `categoriser.decided`, correlated to the first
 * by claimId. The technical constraints name only one event, so this needs an
 * explicit decision in spec v0.2 — see spec review, smell R-03.
 */

import {
  NEEDS_REVIEW_THRESHOLD,
  type Category,
  type Suggestion,
  type TelemetryClient,
} from './types.ts';

export const DECISION_EVENT_NAME = 'categoriser.decided';

export interface ClaimantDecision {
  claimId: string;
  /** What the categoriser proposed, as returned to the claimant. */
  suggested: Suggestion;
  /** What the claimant actually submitted the claim with. */
  finalCategory: Category;
}

export interface DecisionResult {
  finalCategory: Category;
  overridden: boolean;
}

/**
 * Records what the claimant did with a suggestion. Emits exactly one event and
 * returns the outcome; it does not write the claim itself — that stays with the
 * existing claims handler.
 */
export function recordDecision(
  telemetry: TelemetryClient,
  decision: ClaimantDecision,
): DecisionResult {
  const overridden = decision.finalCategory !== decision.suggested.category;

  telemetry.trackEvent(DECISION_EVENT_NAME, {
    claimId: decision.claimId,
    suggestedCategory: decision.suggested.category,
    suggestedConfidence: decision.suggested.confidence,
    source: decision.suggested.source,
    finalCategory: decision.finalCategory,
    overridden,
    needsReview: decision.suggested.confidence < NEEDS_REVIEW_THRESHOLD,
  });

  return { finalCategory: decision.finalCategory, overridden };
}
