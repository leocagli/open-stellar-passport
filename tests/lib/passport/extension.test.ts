import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST as extendPassportApi } from "@/app/api/protocol/passport/[id]/extend/route"
import {
  getPassport,
  issuePassport,
  resetPassportStore,
  setPassport,
  type PassportRecord,
} from "@/lib/passport/passport"
import { listAuditEntries, resetAuditStore } from "@/lib/passport/audit"

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

const DAY_MS = 24 * 60 * 60 * 1000
const PASSPORT_ID = "passport-extension-1"
const AGENT_ID = "agent extension/1"
const ACTOR = "issuer-extension-1"
const ORIGINAL_EXPIRY = "2026-07-01T12:30:00.000Z"

function request(body: unknown): Request {
  return new Request(
    `http://localhost/api/protocol/passport/${encodeURIComponent(AGENT_ID)}/extend`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stellar-address": ACTOR,
      },
      body: JSON.stringify(body),
    },
  )
}

describe("passport validity extension", () => {
  beforeEach(() => {
    resetPassportStore()
    resetAuditStore()
  })

  it("extends an active passport by exactly seven days and preserves its fields", async () => {
    const original = issuePassport(
      PASSPORT_ID,
      AGENT_ID,
      ACTOR,
      { allowTransfer: false },
      ORIGINAL_EXPIRY,
    )
    const snapshot = structuredClone(original)
    const response = await extendPassportApi(request({ additionalDays: 7 }), {
      params: Promise.resolve({ id: encodeURIComponent(AGENT_ID) }),
    })
    const body = await response.json() as PassportRecord

    expect(response.status).toBe(200)
    expect(Date.parse(body.expiresAt!)).toBe(Date.parse(ORIGINAL_EXPIRY) + 7 * DAY_MS)
    expect(body).toEqual({
      ...snapshot,
      expiresAt: "2026-07-08T12:30:00.000Z",
    })
    expect(getPassport(PASSPORT_ID)).toEqual(body)

    const entries = listAuditEntries(PASSPORT_ID)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      passportId: PASSPORT_ID,
      action: "extended",
      actor: ACTOR,
      metadata: {
        oldExpiresAt: ORIGINAL_EXPIRY,
        newExpiresAt: "2026-07-08T12:30:00.000Z",
      },
    })
  })

  it("rejects a revoked passport without changing its expiry or audit trail", async () => {
    setPassport({
      id: PASSPORT_ID,
      agentId: AGENT_ID,
      status: "revoked",
      config: { allowTransfer: true },
      createdAt: "2026-06-01T00:00:00.000Z",
      expiresAt: ORIGINAL_EXPIRY,
    })
    const response = await extendPassportApi(request({ additionalDays: 7 }), {
      params: Promise.resolve({ id: encodeURIComponent(AGENT_ID) }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ ok: false, error: "passport_revoked" })
    expect(getPassport(PASSPORT_ID)?.expiresAt).toBe(ORIGINAL_EXPIRY)
    expect(listAuditEntries(PASSPORT_ID)).toHaveLength(0)
  })

  it.each([
    ["missing", {}],
    ["zero", { additionalDays: 0 }],
    ["negative", { additionalDays: -1 }],
    ["above maximum", { additionalDays: 31 }],
    ["non-number", { additionalDays: "7" }],
    ["non-integer", { additionalDays: 1.5 }],
    ["null", { additionalDays: null }],
  ])("returns 400 when additionalDays is %s", async (_label, body) => {
    issuePassport(PASSPORT_ID, AGENT_ID, ACTOR, { allowTransfer: true }, ORIGINAL_EXPIRY)
    const response = await extendPassportApi(request(body), {
      params: Promise.resolve({ id: encodeURIComponent(AGENT_ID) }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      error: "additionalDays must be an integer between 1 and 30",
    })
    expect(getPassport(PASSPORT_ID)?.expiresAt).toBe(ORIGINAL_EXPIRY)
  })

  it("returns 404 when the agent has no passport", async () => {
    const response = await extendPassportApi(request({ additionalDays: 7 }), {
      params: Promise.resolve({ id: encodeURIComponent("missing-agent") }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ ok: false, error: "passport_not_found" })
  })
})
