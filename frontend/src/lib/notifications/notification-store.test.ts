import { describe, expect, it, beforeEach } from "vitest";
import {
  addNotification,
  getNotifications,
  markNotificationRead,
  markAllRead,
  _reset,
} from "./notification-store";

describe("notification-store", () => {
  const agentId = "test-agent";

  beforeEach(() => {
    _reset();
  });

  it("markNotificationRead sets readAt on only the target notification", () => {
    const n1 = addNotification(agentId, { title: "A", message: "a" });
    const n2 = addNotification(agentId, { title: "B", message: "b" });
    const n3 = addNotification(agentId, { title: "C", message: "c" });

    markNotificationRead(agentId, n2.id);

    const all = getNotifications(agentId);
    expect(all.find((n) => n.id === n1.id)!.readAt).toBeNull();
    expect(all.find((n) => n.id === n2.id)!.readAt).toEqual(expect.any(String));
    expect(all.find((n) => n.id === n3.id)!.readAt).toBeNull();
  });

  it("returns false for unknown notificationId", () => {
    expect(markNotificationRead(agentId, "nonexistent")).toBe(false);
  });

  it("markAllRead sets readAt on every notification", () => {
    addNotification(agentId, { title: "A", message: "a" });
    addNotification(agentId, { title: "B", message: "b" });

    markAllRead(agentId);

    for (const n of getNotifications(agentId)) {
      expect(n.readAt).toEqual(expect.any(String));
    }
  });
});
