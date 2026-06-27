export interface AdminAuditEntry {
  id: string;
  action: string;
  actorId: string;
  credentialId: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

const log: AdminAuditEntry[] = [];

export function recordAdminAction(
  action: string,
  actorId: string,
  credentialId: string,
  metadata: Record<string, unknown> = {},
): AdminAuditEntry {
  const entry: AdminAuditEntry = {
    id: crypto.randomUUID(),
    action,
    actorId,
    credentialId,
    metadata,
    timestamp: Date.now(),
  };
  log.push(entry);
  return entry;
}

export function getAuditLog(credentialId?: string): AdminAuditEntry[] {
  if (credentialId !== undefined) {
    return log.filter((e) => e.credentialId === credentialId);
  }
  return [...log];
}

/** For testing only. */
export function _reset(): void {
  log.length = 0;
}
