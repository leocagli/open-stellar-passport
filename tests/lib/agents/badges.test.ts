import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkAndAwardBadges,
  getBadges,
  resetBadgeStore,
} from "@/lib/agents/badges"

const DATA_DIR = path.join(process.cwd(), ".data")
const AGENTS_DIR = path.join(DATA_DIR, "agents")
const TASKS_DIR = path.join(DATA_DIR, "tasks")
const QUESTS_DIR = path.join(DATA_DIR, "quests")
const XP_DIR = path.join(DATA_DIR, "xp")

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function agentFile(agentId: string): string {
  return path.join(AGENTS_DIR, `${agentId}.json`)
}

describe("badges", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"))
    fs.rmSync(DATA_DIR, { recursive: true, force: true })
    resetBadgeStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    fs.rmSync(DATA_DIR, { recursive: true, force: true })
    resetBadgeStore()
  })

  it("awards first_task once after one completed task", () => {
    writeJson(agentFile("agent-1"), {
      id: "agent-1",
      registeredAt: "2026-06-15T00:00:00.000Z",
      level: 1,
      completedTasks: 1,
      completedQuests: 0,
      xp: 10,
    })

    const first = checkAndAwardBadges("agent-1")
    const second = checkAndAwardBadges("agent-1")

    expect(first.map((badge) => badge.type)).toEqual(["first_task"])
    expect(second).toEqual([])
    expect(getBadges("agent-1")).toHaveLength(1)
  })

  it("awards quest_master, level_10, veteran, and top_earner when conditions are met", () => {
    writeJson(agentFile("agent-elite"), {
      id: "agent-elite",
      registeredAt: "2026-05-01T00:00:00.000Z",
      level: 12,
      completedTasks: 4,
      completedQuests: 5,
      xp: 900,
    })
    writeJson(agentFile("agent-mid"), { id: "agent-mid", registeredAt: "2026-06-10T00:00:00.000Z", level: 7, xp: 300 })
    writeJson(agentFile("agent-low"), { id: "agent-low", registeredAt: "2026-06-11T00:00:00.000Z", level: 4, xp: 100 })
    writeJson(path.join(XP_DIR, "leaderboard.json"), [
      { agentId: "agent-elite", xp: 900 },
      { agentId: "agent-mid", xp: 300 },
      { agentId: "agent-low", xp: 100 },
      { agentId: "agent-x", xp: 90 },
      { agentId: "agent-y", xp: 80 },
      { agentId: "agent-z", xp: 70 },
      { agentId: "agent-a", xp: 60 },
      { agentId: "agent-b", xp: 50 },
      { agentId: "agent-c", xp: 40 },
      { agentId: "agent-d", xp: 30 },
    ])

    const awarded = checkAndAwardBadges("agent-elite")

    expect(awarded.map((badge) => badge.type).sort()).toEqual([
      "first_task",
      "level_10",
      "quest_master",
      "top_earner",
      "veteran",
    ])
  })

  it("derives task and quest counts from data files when agent stats are absent", () => {
    writeJson(agentFile("agent-2"), {
      id: "agent-2",
      registeredAt: "2026-05-20T00:00:00.000Z",
      level: 10,
      xp: 120,
    })
    writeJson(path.join(TASKS_DIR, "task-1.json"), { id: "task-1", agentId: "agent-2", status: "completed" })
    for (let index = 1; index <= 5; index += 1) {
      writeJson(path.join(QUESTS_DIR, `quest-${index}.json`), {
        id: `quest-${index}`,
        completedBy: ["agent-2"],
      })
    }

    const awarded = checkAndAwardBadges("agent-2")

    expect(awarded.map((badge) => badge.type).sort()).toEqual([
      "first_task",
      "level_10",
      "quest_master",
      "veteran",
    ])
  })
})
