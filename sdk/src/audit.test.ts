import { describe, expect, it, vi } from "vitest"

import { type AuditRecord } from "../bindings/src/index.js"
import { AgentPassport } from "./passport"

// Mock the Client class from bindings
vi.mock("../bindings/src/index.js", () => {
  return {
    networks: {
      testnet: {
        networkPassphrase: "Test SDF Network ; September 2015",
        contractId: "CDNSZUNEWFCGSPWLPDSWTENR2WPHKC34RGZQG7RJA54OPGTZGVVRFYBA",
      },
    },
    Client: vi.fn().mockImplementation(() => {
      const mockDatabase = new Map<bigint, AuditRecord>()
      const mockActor = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      const mockRoot = Buffer.alloc(32)

      mockDatabase.set(0n, {
        action: "issue",
        actor: mockActor,
        ledger: 100,
        root: mockRoot,
        success: true,
      })
      mockDatabase.set(1n, {
        action: "verify_ok",
        actor: mockActor,
        ledger: 101,
        root: mockRoot,
        success: true,
      })
      mockDatabase.set(2n, {
        action: "verify_fail",
        actor: mockActor,
        ledger: 102,
        root: mockRoot,
        success: false,
      })
      mockDatabase.set(3n, {
        action: "revoke",
        actor: mockActor,
        ledger: 103,
        root: mockRoot,
        success: true,
      })

      return {
        audit_count: vi.fn().mockResolvedValue({
          result: BigInt(mockDatabase.size),
        }),
        get_audit_entry: vi.fn().mockImplementation(async ({ seq }: { seq: bigint }) => {
          return {
            result: mockDatabase.get(seq) ?? undefined,
          };
        }),
      }
    }),
  }
})

describe("AgentPassport SDK auditLog", () => {
  const passport = new AgentPassport({
    rpcUrl: "https://localhost:8000",
    artifacts: {
      wasm: new Uint8Array(),
      zkey: new Uint8Array(),
      vkey: {},
    },
  })

  it("auditLog.count() returns the total number of logs", async () => {
    const count = await passport.auditLog.count()
    expect(count).toBe(4n)
  })

  it("auditLog.get(seq) returns the record or null if not found", async () => {
    const log = await passport.auditLog.get(0n)
    expect(log).toBeDefined()
    expect(log?.action).toBe("issue")
    expect(log?.success).toBe(true)

    const missingLog = await passport.auditLog.get(99n)
    expect(missingLog).toBeNull()
  })

  it("auditLog.range(from, to) returns slice capped to max 50 entries", async () => {
    const slice = await passport.auditLog.range(0n, 2n)
    expect(slice).toHaveLength(3)
    expect(slice[0].action).toBe("issue")
    expect(slice[1].action).toBe("verify_ok")
    expect(slice[2].action).toBe("verify_fail")
  })
})
