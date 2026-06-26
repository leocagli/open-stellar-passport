import { NextRequest, NextResponse } from "next/server";
import { getPassport, revokePassport } from "../../../../../src/lib/passport/webhook-store";
import { notifyPassportEvent } from "../../../../../src/lib/passport/webhook-notifier";
import { addNotification } from "../../../../../src/lib/notifications/notification-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passportIds } = body;

    if (!passportIds || !Array.isArray(passportIds) || passportIds.length === 0) {
      return NextResponse.json(
        { error: "passportIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (passportIds.length > 50) {
      return NextResponse.json(
        { error: "batch_too_large", max: 50 },
        { status: 400 }
      );
    }

    const revoked: string[] = [];
    const notFound: string[] = [];
    const alreadyRevoked: string[] = [];

    for (const id of passportIds) {
      const passport = getPassport(id);
      if (!passport) {
        notFound.push(id);
      } else if (passport.revoked) {
        alreadyRevoked.push(id);
      } else {
        revokePassport(id);
        addNotification(passport.agentId, {
          title: "Passport Revoked",
          message: `Passport ${id} has been revoked`,
        });
        await notifyPassportEvent("passport.revoked", id, passport.agentId);
        revoked.push(id);
      }
    }

    return NextResponse.json({
      ok: true,
      revoked,
      notFound,
      alreadyRevoked,
      total: revoked.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
