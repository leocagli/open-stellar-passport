export type PassportStatus = "active" | "revoked" | "expired" | "suspended"

export interface PassportConfig {
  allowTransfer: boolean
}

export interface PassportRecord {
  id: string
  agentId: string
  status: PassportStatus
  config: PassportConfig
  createdAt: string
}

type PassportDb = Map<string, PassportRecord>
type AgentIndex = Map<string, string>

const globalState = globalThis as typeof globalThis & {
  __openStellarPassportDb__?: PassportDb
  __openStellarPassportAgentIndex__?: AgentIndex
}

function getDb(): PassportDb {
  if (!globalState.__openStellarPassportDb__) {
    globalState.__openStellarPassportDb__ = new Map()
  }
  return globalState.__openStellarPassportDb__
}

function getAgentIndex(): AgentIndex {
  if (!globalState.__openStellarPassportAgentIndex__) {
    globalState.__openStellarPassportAgentIndex__ = new Map()
  }
  return globalState.__openStellarPassportAgentIndex__
}

function normalizeId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed) throw new Error("passportId must not be empty")
  return trimmed.slice(0, 200)
}

export function getPassport(id: string): PassportRecord | null {
  const cleanId = normalizeId(id)
  return getDb().get(cleanId) ?? null
}

export function getPassportByAgentId(agentId: string): PassportRecord | null {
  const passportId = getAgentIndex().get(agentId)
  if (!passportId) return null
  return getDb().get(passportId) ?? null
}

export function setPassport(record: PassportRecord): void {
  const db = getDb()
  const index = getAgentIndex()
  const cleanId = normalizeId(record.id)
  db.set(cleanId, record)
  index.set(record.agentId, cleanId)
}

export function updatePassportAgentId(id: string, newAgentId: string): PassportRecord | null {
  const db = getDb()
  const index = getAgentIndex()
  const cleanId = normalizeId(id)
  const record = db.get(cleanId)
  if (!record) return null

  index.delete(record.agentId)
  record.agentId = newAgentId
  index.set(newAgentId, cleanId)

  return record
}

export function isPassportTransferable(id: string): { ok: true } | { ok: false; error: string } {
  const cleanId = normalizeId(id)
  const record = getDb().get(cleanId)
  if (!record) return { ok: false, error: "passport_not_found" }
  if (record.status !== "active") return { ok: false, error: `passport_${record.status}` }
  if (!record.config.allowTransfer) return { ok: false, error: "transfer_not_allowed" }
  return { ok: true }
}

export function resetPassportStore(): void {
  getDb().clear()
  getAgentIndex().clear()
}
