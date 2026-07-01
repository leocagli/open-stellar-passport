import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/agents/[id]/badges/route"
import { resetBadgeStore } from "@/lib/agents/badges"

vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
        const headers = new Headers(init?.headers)
        return {
          status: init?.status ?? 200,
          headers,
          json: async () => body,
        } as unknown as Response
      },
    },
  }
})

const DATA_DIR = path.join(process.cwd(), ".data")

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

describe("GET /api/agents/[id]/badges", () => {
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

  it("returns badges and count", async () => {
    writeJson(path.join(DATA_DIR, "agents", "agent-9.json"), {
      id: "agent-9",
      registeredAt: "2026-04-01T00:00:00.000Z",
      completedTasks: 1,
      completedQuests: 5,
      level: 10,
      xp: 999,
    })
    writeJson(path.join(DATA_DIR, "xp", "leaderboard.json"), [{ agentId: "agent-9", xp: 999 }])

    const response = await GET(new Request("http://localhost/api/agents/agent-9/badges"), {
      params: Promise.resolve({ id: "agent-9" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const body = await response.json() as { badges: Array<{ type: string }>; count: number }
    expect(body.count).toBe(5)
    expect(body.badges.map((badge) => badge.type).sort()).toEqual([
      "first_task",
      "level_10",
      "quest_master",
      "top_earner",
      "veteran",
    ])
  })
})
