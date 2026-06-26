/**
 * Revocation registry for agent passports.
 *
 * Keys are agentId strings normalized to lower-case trimmed form so that
 * revocations are case-insensitive and whitespace-tolerant.
 *
 * The registry is module-level (singleton) so it is shared across all
 * API route handlers in the same process.  Tests must call `_reset()`
 * in `beforeEach` / `afterEach` to prevent cross-test pollution.
 */

const revokedPassports = new Set<string>();

function normalize(agentId: string): string {
  return agentId.trim().toLowerCase();
}

/**
 * Marks a passport as revoked.  Safe to call more than once (idempotent).
 */
export function revokePassport(agentId: string): void {
  revokedPassports.add(normalize(agentId));
}

/**
 * Returns `true` if the passport has been explicitly revoked.
 * The check is case-insensitive and trims surrounding whitespace.
 */
export function isRevoked(agentId: string): boolean {
  return revokedPassports.has(normalize(agentId));
}

/** Clears the registry.  Intended for test isolation only. */
export function _reset(): void {
  revokedPassports.clear();
}
