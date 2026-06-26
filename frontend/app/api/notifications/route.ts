import { NextRequest, NextResponse } from "next/server";
import {
  addNotification,
  getNotifications,
} from "../../../src/lib/notifications/notification-store";

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json(
      { error: "agentId query parameter is required" },
      { status: 400 },
    );
  }
  const notifications = getNotifications(agentId);
  return NextResponse.json(notifications);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agentId, title, message } = body;
  if (!agentId || !title || !message) {
    return NextResponse.json(
      { error: "agentId, title, and message are required" },
      { status: 400 },
    );
  }
  const notification = addNotification(agentId, { title, message });
  return NextResponse.json(notification, { status: 201 });
}
