import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  addCredential,
  findExpiringSoon,
  getLastWarned,
  setLastWarned,
  _reset,
} from "./credential-expiry-store";

// ─── helpers ──────────────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function makeCredential(
  id: string,
  passportId: string,
  expiresInDays: number,
) {
  return addCredential({
    id,
    passportId,
    expiresAt: NOW + expiresInDays * DAY_MS,
  });
}

// ─── store tests ──────────────────────────────────────────────────────────────

describe("credential-expiry-store", () => {
  beforeEach(() => _reset());

  it("findExpiringSoon returns credentials within the window", () => {
    makeCredential("cred-3d", "passport-1", 3);   // expires in 3 days ✓
    makeCredential("cred-7d", "passport-2", 7);   // expires in 7 days ✓
    makeCredential("cred-8d", "passport-3", 8);   // expires in 8 days — outside 7d window ✗
    makeCredential("cred-0d", "passport-4", 0);   // already expired ✗

    const result = findExpiringSoon(NOW, NOW + 7 * DAY_MS);

    expect(result.map((c) => c.id).sort()).toEqual(["cred-3d", "cred-7d"]);
  });

  it("getLastWarned returns undefined when no warning has been recorded", () => {
    makeCredential("cred-new", "passport-1", 3);
    expect(getLastWarned("cred-new")).toBeUndefined();
  });

  it("setLastWarned and getLastWarned round-trip correctly", () => {
    setLastWarned("cred-1", NOW);
    const entry = getLastWarned("cred-1");
    expect(entry).toEqual({ credentialId: "cred-1", warnedAt: NOW });
  });
});

// ─── cron route tests ─────────────────────────────────────────────────────────

// We import after the mocks so vi.mock hoisting works
vi.mock("../../../../src/lib/notifications/notification-store", () => ({
  addNotification: vi.fn(),
}));

import { GET } from "./route";
import { addNotification } from "../../../../src/lib/notifications/notification-store";

describe("GET /api/cron/credential-expiry-warning", () => {
  beforeEach(() => {
    _reset();
    vi.clearAllMocks();
  });

  it("emits one notification per expiring credential → { warned: 2, skipped: 0 }", async () => {
    makeCredential("cred-a", "passport-a", 3);
    makeCredential("cred-b", "passport-b", 5);

    const res = await GET();
    const body = await res.json();

    expect(addNotification).toHaveBeenCalledTimes(2);
    expect(body).toEqual({ warned: 2, skipped: 0 });
  });

  it("payload contains credentialId, passportId, expiresAt, daysRemaining", async () => {
    const cred = makeCredential("cred-x", "passport-x", 3);

    await GET();

    const [passportId, fields] = (addNotification as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(passportId).toBe("passport-x");
    expect(fields.title).toBe("credential.expiring_soon");

    const payload = JSON.parse(fields.message);
    expect(payload).toMatchObject({
      credentialId: "cred-x",
      passportId: "passport-x",
      expiresAt: cred.expiresAt,
      daysRemaining: 3,
    });
  });

  it("skips a credential warned less than 24 h ago → { warned: 0, skipped: 1 }", async () => {
    makeCredential("cred-recent", "passport-1", 3);
    setLastWarned("cred-recent", Date.now() - 2 * 60 * 60 * 1000); // 2 h ago

    const res = await GET();
    const body = await res.json();

    expect(addNotification).not.toHaveBeenCalled();
    expect(body).toEqual({ warned: 0, skipped: 1 });
  });

  it("does not include already-expired credentials", async () => {
    makeCredential("cred-expired", "passport-1", 0); // expires now / already past

    const res = await GET();
    const body = await res.json();

    expect(addNotification).not.toHaveBeenCalled();
    expect(body).toEqual({ warned: 0, skipped: 0 });
  });
});
