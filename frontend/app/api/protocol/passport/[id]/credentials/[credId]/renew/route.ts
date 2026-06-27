import { NextRequest, NextResponse } from "next/server";
import {
  getCredential,
  renewCredential,
} from "../../../../../../../../src/lib/credentials/credential-store";
import { recordAdminAction } from "../../../../../../../../src/lib/credentials/audit-log";
import { fireWebhook } from "../../../../../../../../src/lib/credentials/webhook";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; credId: string } },
) {
  const { id: passportId, credId } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as Record<string, unknown>).expiresAt !== "number" ||
    typeof (body as Record<string, unknown>).actorId !== "string"
  ) {
    return NextResponse.json(
      { error: "expiresAt (number) and actorId (string) are required" },
      { status: 400 },
    );
  }

  const { expiresAt, actorId } = body as { expiresAt: number; actorId: string };

  const credential = getCredential(credId);
  if (!credential || credential.passportId !== passportId) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const result = renewCredential(credId, actorId, expiresAt);

  if (!result.ok) {
    const statusByError: Record<string, number> = {
      credential_revoked: 400,
      credential_already_expired: 400,
      expiry_too_soon: 400,
      expiry_not_extended: 400,
      unauthorized: 403,
      credential_not_found: 404,
    };
    return NextResponse.json(
      { error: result.error },
      { status: statusByError[result.error] ?? 400 },
    );
  }

  recordAdminAction("credential_renewed", actorId, credId, {
    oldExpiresAt: result.oldExpiresAt,
    newExpiresAt: expiresAt,
  });

  fireWebhook("credential.renewed", {
    credentialId: credId,
    oldExpiresAt: result.oldExpiresAt,
    newExpiresAt: expiresAt,
  });

  return NextResponse.json({ credential: result.credential });
}
