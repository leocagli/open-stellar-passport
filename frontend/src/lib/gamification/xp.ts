import { pushToast } from "@/lib/notifications/notification-center";

export interface XPState {
  agentId: string;
  xp: number;
  level: number;
}

const LEVEL_SIZE = 100;
const store = new Map<string, XPState>();

export function getLevelForXP(xp: number): number {
  return Math.floor(Math.max(0, xp) / LEVEL_SIZE) + 1;
}

export function getXPState(agentId: string): XPState {
  const existing = store.get(agentId);
  if (existing) return { ...existing };

  const state: XPState = { agentId, xp: 0, level: 1 };
  store.set(agentId, state);
  return { ...state };
}

export function awardXP(agentId: string, amount: number): XPState {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  const previous = store.get(agentId) ?? { agentId, xp: 0, level: 1 };
  const xp = previous.xp + amount;
  const level = getLevelForXP(xp);
  const next: XPState = { agentId, xp, level };
  store.set(agentId, next);

  if (level > previous.level) {
    for (let currentLevel = previous.level + 1; currentLevel <= level; currentLevel += 1) {
      pushToast({
        title: `Level up! You're now Level ${currentLevel}`,
        message: `${amount} XP earned for ${agentId}.`,
      });
    }
  }

  return { ...next };
}

export function resetXPStore(): void {
  store.clear();
}
