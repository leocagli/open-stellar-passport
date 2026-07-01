import { awardXP } from "@/lib/gamification/xp";
import { pushToast } from "@/lib/notifications/notification-center";

export interface QuestCompletionInput {
  agentId: string;
  questId: string;
  questName: string;
  xpReward: number;
}

interface QuestCompletionRecord extends QuestCompletionInput {
  completedAt: string;
}

const completions = new Map<string, QuestCompletionRecord>();

function completionKey(agentId: string, questId: string): string {
  return `${agentId}:${questId}`;
}

export function completeQuest(input: QuestCompletionInput): QuestCompletionRecord {
  if (!input.agentId.trim()) throw new Error("agentId must not be empty");
  if (!input.questId.trim()) throw new Error("questId must not be empty");
  if (!input.questName.trim()) throw new Error("questName must not be empty");
  if (!Number.isFinite(input.xpReward) || input.xpReward <= 0) {
    throw new Error("xpReward must be a positive number");
  }

  const record: QuestCompletionRecord = {
    ...input,
    completedAt: new Date().toISOString(),
  };
  completions.set(completionKey(input.agentId, input.questId), record);

  pushToast({
    title: `Quest complete: ${input.questName}`,
    message: `+${input.xpReward} XP`,
  });
  awardXP(input.agentId, input.xpReward);

  return record;
}

export function resetQuestCompletions(): void {
  completions.clear();
}
