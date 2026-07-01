import { beforeEach, describe, expect, it } from "vitest";
import { getXPState, resetXPStore } from "@/lib/gamification/xp";
import { getNotificationSnapshot, resetNotificationCenter } from "@/lib/notifications/notification-center";
import { completeQuest, resetQuestCompletions } from "./quests";

describe("completeQuest", () => {
  beforeEach(() => {
    resetQuestCompletions();
    resetXPStore();
    resetNotificationCenter();
  });

  it("fires a quest completion toast and awards XP", () => {
    completeQuest({
      agentId: "agent-7",
      questId: "quest-1",
      questName: "Proof of Relay",
      xpReward: 120,
    });

    const titles = getNotificationSnapshot().toasts.map((toast) => toast.title);

    expect(titles).toContain("Quest complete: Proof of Relay");
    expect(titles).toContain("Level up! You're now Level 2");
    expect(getXPState("agent-7").xp).toBe(120);
  });
});
