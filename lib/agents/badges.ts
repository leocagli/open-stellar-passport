import fs from "node:fs"
import path from "node:path"

export type BadgeType =
  | "first_task"
  | "quest_master"
  | "level_10"
  | "veteran"
  | "top_earner"

export interface Badge {
  agentId: string
  type: BadgeType
  title: string
  description: string
  icon: string
  awardedAt: string
}

interface AgentStats {
  registeredAt: string | null
  completedTasks: number
  completedQuests: number
  level: number
  xp: number | null
}

const DATA_DIR = path.join(process.cwd(), ".data")
const BADGES_DIR = path.join(DATA_DIR, "badges")

const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, "agentId" | "awardedAt">> = {
  first_task: {
    type: "first_task",
    title: "First Task",
    description: "Awarded after completing the first task.",
    icon: "check",
  },
  quest_master: {
    type: "quest_master",
    title: "Quest Master",
    description: "Awarded after completing 5 quests.",
    icon: "stamp",
  },
  level_10: {
    type: "level_10",
    title: "Level 10",
    description: "Awarded on reaching level 10.",
    icon: "shield",
  },
  veteran: {
    type: "veteran",
    title: "Veteran",
    description: "Awarded 30 days after registration.",
    icon: "clock",
  },
  top_earner: {
    type: "top_earner",
    title: "Top Earner",
    description: "Awarded for reaching the top 10% on the XP leaderboard.",
    icon: "coins",
  },
}

function badgeFilePath(agentId: string): string {
  return path.join(BADGES_DIR, `${normalizeAgentId(agentId)}.json`)
}

function normalizeAgentId(agentId: string): string {
  const trimmed = agentId.trim()
  if (!trimmed) throw new Error("agentId must not be empty")
  return trimmed.slice(0, 200)
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T
}

function readJsonCollection(dirPath: string): unknown[] {
  if (!fs.existsSync(dirPath)) return []
  const entries = fs.readdirSync(dirPath)
  return entries
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => readJsonFile<unknown>(path.join(dirPath, entry)))
    .filter((entry): entry is unknown => entry !== null)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function readNumberField(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return null
}

function readAgentRecord(agentId: string): Record<string, unknown> | null {
  const direct = readJsonFile<Record<string, unknown>>(path.join(DATA_DIR, "agents", `${agentId}.json`))
  if (direct) return direct

  const aggregate = readJsonFile<unknown>(path.join(DATA_DIR, "agents.json"))
  if (Array.isArray(aggregate)) {
    return aggregate
      .map(asRecord)
      .find((entry) => entry && readStringField(entry, ["id", "agentId"]) === agentId) ?? null
  }

  const aggregateRecord = asRecord(aggregate)
  if (aggregateRecord) {
    const nested = asRecord(aggregateRecord[agentId])
    if (nested) return nested
    const agents = aggregateRecord.agents
    if (Array.isArray(agents)) {
      return agents
        .map(asRecord)
        .find((entry) => entry && readStringField(entry, ["id", "agentId"]) === agentId) ?? null
    }
  }

  return null
}

function getCompletedTasksFromFiles(agentId: string): number {
  const tasks = readJsonCollection(path.join(DATA_DIR, "tasks"))
  let count = 0
  for (const task of tasks) {
    const record = asRecord(task)
    if (!record) continue
    const owner = readStringField(record, ["agentId", "assigneeId", "completedBy"])
    const status = readStringField(record, ["status"])
    const completed = record.completed
    if (owner === agentId && (status === "completed" || completed === true)) count += 1
  }
  return count
}

function getCompletedQuestsFromFiles(agentId: string): number {
  const quests = readJsonCollection(path.join(DATA_DIR, "quests"))
  let count = 0
  for (const quest of quests) {
    const record = asRecord(quest)
    if (!record) continue

    const owner = readStringField(record, ["agentId", "completedBy"])
    const status = readStringField(record, ["status"])
    if (owner === agentId && status === "completed") {
      count += 1
      continue
    }

    const completedBy = record.completedBy
    if (Array.isArray(completedBy) && completedBy.includes(agentId)) {
      count += 1
    }
  }
  return count
}

function getAgentStats(agentId: string): AgentStats {
  const record = readAgentRecord(agentId) ?? {}
  const registeredAt = readStringField(record, ["registeredAt", "createdAt", "joinedAt"])
  const completedTasks = readNumberField(record, ["completedTasks", "tasksCompleted"]) ?? getCompletedTasksFromFiles(agentId)
  const completedQuests =
    readNumberField(record, ["completedQuests", "questsCompleted"]) ?? getCompletedQuestsFromFiles(agentId)
  const level = readNumberField(record, ["level"]) ?? 0
  const xp = readNumberField(record, ["xp", "totalXp"])

  return { registeredAt, completedTasks, completedQuests, level, xp }
}

function readLeaderboardEntries(): Array<{ agentId: string; xp: number }> {
  const filesToCheck = [
    path.join(DATA_DIR, "xp", "leaderboard.json"),
    path.join(DATA_DIR, "leaderboard.json"),
    path.join(DATA_DIR, "xp", "agents.json"),
  ]

  for (const filePath of filesToCheck) {
    const json = readJsonFile<unknown>(filePath)
    const entries = extractLeaderboardEntries(json)
    if (entries.length > 0) return entries
  }

  return []
}

function extractLeaderboardEntries(input: unknown): Array<{ agentId: string; xp: number }> {
  if (Array.isArray(input)) {
    return input
      .map(asRecord)
      .flatMap((record) => {
        if (!record) return []
        const agentId = readStringField(record, ["agentId", "id"])
        const xp = readNumberField(record, ["xp", "totalXp"])
        return agentId && xp !== null ? [{ agentId, xp }] : []
      })
  }

  const record = asRecord(input)
  if (!record) return []

  if (Array.isArray(record.leaderboard)) return extractLeaderboardEntries(record.leaderboard)
  if (Array.isArray(record.agents)) return extractLeaderboardEntries(record.agents)

  return Object.entries(record).flatMap(([key, value]) => {
    const nested = asRecord(value)
    if (!nested) return []
    const agentId = readStringField(nested, ["agentId", "id"]) ?? key
    const xp = readNumberField(nested, ["xp", "totalXp"])
    return xp !== null ? [{ agentId, xp }] : []
  })
}

function isTopEarner(agentId: string, stats: AgentStats): boolean {
  const leaderboard = readLeaderboardEntries()
  if (leaderboard.length === 0) return false

  const sorted = [...leaderboard].sort((a, b) => b.xp - a.xp)
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1))
  return sorted.slice(0, topCount).some((entry) => entry.agentId === agentId)
    || (stats.xp !== null && sorted.slice(0, topCount).some((entry) => entry.agentId === agentId && entry.xp === stats.xp))
}

function shouldAward(type: BadgeType, agentId: string, stats: AgentStats): boolean {
  switch (type) {
    case "first_task":
      return stats.completedTasks >= 1
    case "quest_master":
      return stats.completedQuests >= 5
    case "level_10":
      return stats.level >= 10
    case "veteran":
      return stats.registeredAt !== null
        && Date.now() - new Date(stats.registeredAt).getTime() >= 30 * 24 * 60 * 60 * 1000
    case "top_earner":
      return isTopEarner(agentId, stats)
  }
}

function writeBadges(agentId: string, badges: Badge[]): void {
  ensureDir(BADGES_DIR)
  fs.writeFileSync(badgeFilePath(agentId), JSON.stringify(badges, null, 2))
}

export function getBadges(agentId: string): Badge[] {
  const cleanId = normalizeAgentId(agentId)
  return readJsonFile<Badge[]>(badgeFilePath(cleanId)) ?? []
}

export function checkAndAwardBadges(agentId: string): Badge[] {
  const cleanId = normalizeAgentId(agentId)
  const existing = getBadges(cleanId)
  const awardedTypes = new Set(existing.map((badge) => badge.type))
  const stats = getAgentStats(cleanId)
  const now = new Date().toISOString()

  const newlyAwarded = (Object.keys(BADGE_DEFINITIONS) as BadgeType[])
    .filter((type) => !awardedTypes.has(type) && shouldAward(type, cleanId, stats))
    .map((type) => ({
      agentId: cleanId,
      awardedAt: now,
      ...BADGE_DEFINITIONS[type],
    }))

  if (newlyAwarded.length > 0) {
    writeBadges(cleanId, [...existing, ...newlyAwarded])
  }

  return newlyAwarded
}

export function getAllBadges(agentId: string): Badge[] {
  checkAndAwardBadges(agentId)
  return getBadges(agentId)
}

export function resetBadgeStore(agentId?: string): void {
  if (agentId) {
    const filePath = badgeFilePath(normalizeAgentId(agentId))
    if (fs.existsSync(filePath)) fs.rmSync(filePath)
    return
  }

  if (fs.existsSync(BADGES_DIR)) fs.rmSync(BADGES_DIR, { recursive: true, force: true })
}
