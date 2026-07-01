import { beforeEach, describe, expect, it } from "vitest";
import { getNotificationSnapshot, resetNotificationCenter } from "@/lib/notifications/notification-center";
import { awardXP, getXPState, resetXPStore } from "./xp";

describe("awardXP", () => {
  beforeEach(() => {
    resetXPStore();
    resetNotificationCenter();
  });

  it("fires a level-up toast when XP crosses a level boundary", () => {
    awardXP("agent-1", 90);
    awardXP("agent-1", 15);

    const state = getXPState("agent-1");
    const titles = getNotificationSnapshot().toasts.map((toast) => toast.title);

    expect(state.level).toBe(2);
    expect(titles).toContain("Level up! You're now Level 2");
  });
});
