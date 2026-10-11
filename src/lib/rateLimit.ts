/**
 * Minimal in-memory fixed-window rate limiter for the login endpoint.
 *
 * shortcut: state lives in process memory, so limits are per-instance and reset
 * on restart. Fine for the single-user, single-container deployment model; swap
 * for a shared store if BookQuotr ever runs behind multiple replicas.
 */

const attempts = new Map<string, number[]>();

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** True when the key has reached the attempt limit within the window. */
export function isRateLimited(
  key: string,
  limit: number = LOGIN_MAX_ATTEMPTS,
  windowMs: number = LOGIN_WINDOW_MS,
  now: number = Date.now()
): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length === 0) {
    attempts.delete(key);
    return false;
  }
  attempts.set(key, recent);
  return recent.length >= limit;
}

/** Records a failed attempt. */
export function recordFailedAttempt(
  key: string,
  windowMs: number = LOGIN_WINDOW_MS,
  now: number = Date.now()
): void {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
}

/** Clears attempts for a key (called after a successful login). */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}
