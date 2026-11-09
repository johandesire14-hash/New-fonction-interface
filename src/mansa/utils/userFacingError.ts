/**
 * Return fixed, contextual copy for user-visible failures.
 * Never pass through an exception message, server response, SDK detail, or stack trace.
 */
export function getUserFacingErrorMessage(_error: unknown, fallback: string): string {
  return fallback;
}
