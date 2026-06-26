import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  markNotificationRead,
} from "../../../../src/lib/notifications/notification-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();
  const { agentId } = body;

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required" },
      { status: 400 },
    );
  }

  const found = markNotificationRead(agentId, id);
  if (!found) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 },
    );
  }

  const [notification] = getNotifications(agentId).filter(
    (n) => n.id === id,
  );
  return NextResponse.json(notification);
}
