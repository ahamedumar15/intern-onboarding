/**
 * One deadline primitive, used by both upstream calls.
 *
 * It does two things, and the second one is the one that matters:
 *
 *   1. aborts the work via AbortSignal, so a well-behaved SDK stops early and
 *      we stop paying for the call;
 *   2. *races* the work, so the handler returns on time even when the client
 *      ignores the signal entirely.
 *
 * Signalling alone is not a timeout. An upstream that accepts a request and
 * then never answers would hold the request open past the 4s p95 budget, which
 * is exactly the failure the latency NFR is about.
 */

export function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(onTimeout());
    }, ms);
  });

  return Promise.race([work(controller.signal), expiry]).finally(() => clearTimeout(timer));
}
