import { NextRequest, NextResponse } from "next/server";
import { getPassport, revokePassport } from "../../../../../../src/lib/passport/webhook-store";
import { notifyPassportEvent } from "../../../../../../src/lib/passport/webhook-notifier";
import { addNotification } from "../../../../../../src/lib/notifications/notification-store";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const passport = getPassport(id);
  if (!passport) {
    revokePassport(id);
    await notifyPassportEvent("passport.revoked", id, "unknown-agent");
    return NextResponse.json({ ok: true });
  }

  const agentId = passport.agentId;
  const wasAlreadyRevoked = passport.revoked;

  revokePassport(id);

  if (!wasAlreadyRevoked) {
    addNotification(agentId, {
      title: "Passport Revoked",
      message: `Passport ${id} has been revoked`,
    });
    await notifyPassportEvent("passport.revoked", id, agentId);
  }

  return NextResponse.json({ ok: true });
}
