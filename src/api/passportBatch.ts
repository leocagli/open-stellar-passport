export interface BatchRevokeRequest {
  passportIds: string[];
  reason?: string;
}
export interface BatchRevokeResponse {
  ok: boolean;
  revoked: string[];
  notFound: string[];
  alreadyRevoked: string[];
  total: number;
}
export async function handleBatchRevocation(
  reqBody: any,
  passportMockDatabase: any[],
  auditLogAppend: (entry: any) => Promise<void>,
  queueWebhook: (event: string, data: any) => Promise<void>
): Promise<{ status: number; data: any }> {
  const { passportIds, reason } = reqBody;
  if (!passportIds || !Array.isArray(passportIds) || passportIds.length === 0) {
    return { status: 400, data: { error: 'invalid_request' } };
  }
  if (passportIds.length > 50) {
    return { status: 400, data: { error: 'batch_too_large', max: 50 } };
  }
  const revoked: string[] = [];
  const notFound: string[] = [];
  const alreadyRevoked: string[] = [];
  for (const id of passportIds) {
    const passport = passportMockDatabase.find((p) => p.id === id);
    if (!passport) {
      notFound.push(id);
      continue;
    }
    if (passport.status === 'revoked') {
      alreadyRevoked.push(id);
      continue;
    }
    passport.status = 'revoked';
    passport.revocationReason = reason || 'fleet_decommission';
    await auditLogAppend({
      action: 'passport.revoked',
      passportId: id,
      reason: passport.revocationReason,
      timestamp: new Date()
    });
    await queueWebhook('passport.revoked', {
      passportId: id,
      reason: passport.revocationReason
    });
    revoked.push(id);
  }
  return {
    status: 200,
    data: { ok: true, revoked, notFound, alreadyRevoked, total: revoked.length }
  };
}