export interface Credential {
  id: string;
  passportId: string;
  issuedBy: string;
  expiresAt: number;
  revokedAt: number | null;
  createdAt: number;
}

export type RenewError =
  | 'credential_not_found'
  | 'credential_revoked'
  | 'credential_already_expired'
  | 'expiry_too_soon'
  | 'expiry_not_extended'
  | 'unauthorized';

export type RenewResult =
  | { ok: true; credential: Credential; oldExpiresAt: number }
  | { ok: false; error: RenewError };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const credentials = new Map<string, Credential>();
const admins = new Set<string>();

export function issueCredential(
  passportId: string,
  issuedBy: string,
  expiresAt: number,
): Credential {
  const c: Credential = {
    id: crypto.randomUUID(),
    passportId,
    issuedBy,
    expiresAt,
    revokedAt: null,
    createdAt: Date.now(),
  };
  credentials.set(c.id, c);
  return c;
}

export function getCredential(credId: string): Credential | undefined {
  return credentials.get(credId);
}

export function revokeCredential(credId: string): boolean {
  const c = credentials.get(credId);
  if (!c) return false;
  c.revokedAt = Date.now();
  return true;
}

export function addAdmin(id: string): void {
  admins.add(id);
}

export function isAdmin(id: string): boolean {
  return admins.has(id);
}

export function renewCredential(
  credId: string,
  actorId: string,
  newExpiresAt: number,
  now = Date.now(),
): RenewResult {
  const c = credentials.get(credId);
  if (!c) return { ok: false, error: 'credential_not_found' };

  if (c.issuedBy !== actorId && !admins.has(actorId)) {
    return { ok: false, error: 'unauthorized' };
  }

  if (c.revokedAt !== null) {
    return { ok: false, error: 'credential_revoked' };
  }

  if (c.expiresAt <= now) {
    return { ok: false, error: 'credential_already_expired' };
  }

  if (newExpiresAt <= now + ONE_DAY_MS) {
    return { ok: false, error: 'expiry_too_soon' };
  }

  if (newExpiresAt <= c.expiresAt) {
    return { ok: false, error: 'expiry_not_extended' };
  }

  const oldExpiresAt = c.expiresAt;
  c.expiresAt = newExpiresAt;
  return { ok: true, credential: { ...c }, oldExpiresAt };
}

/** For testing only. */
export function _reset(): void {
  credentials.clear();
  admins.clear();
}
