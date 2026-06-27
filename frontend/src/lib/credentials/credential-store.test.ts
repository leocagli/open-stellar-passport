import { describe, expect, it, beforeEach } from "vitest";
import {
  issueCredential,
  getCredential,
  revokeCredential,
  renewCredential,
  addAdmin,
  _reset,
} from "./credential-store";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("credential-store", () => {
  const passportId = "passport-abc";
  const issuerId = "issuer-1";

  beforeEach(() => {
    _reset();
  });

  describe("renewCredential", () => {
    it("renew active credential → updates expiresAt and returns old value", () => {
      const now = Date.now();
      const original = now + ONE_DAY_MS * 10;
      const next = now + ONE_DAY_MS * 30;

      const cred = issueCredential(passportId, issuerId, original);
      const result = renewCredential(cred.id, issuerId, next, now);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.credential.expiresAt).toBe(next);
      expect(result.oldExpiresAt).toBe(original);
      expect(getCredential(cred.id)!.expiresAt).toBe(next);
    });

    it("admin can renew a credential issued by someone else", () => {
      const now = Date.now();
      const cred = issueCredential(passportId, issuerId, now + ONE_DAY_MS * 10);
      const adminId = "admin-root";
      addAdmin(adminId);

      const result = renewCredential(cred.id, adminId, now + ONE_DAY_MS * 30, now);

      expect(result.ok).toBe(true);
    });

    it("renew already-expired credential → credential_already_expired", () => {
      const now = Date.now();
      const expired = now - 1;
      const cred = issueCredential(passportId, issuerId, expired);

      const result = renewCredential(cred.id, issuerId, now + ONE_DAY_MS * 30, now);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("credential_already_expired");
    });

    it("renew revoked credential → credential_revoked", () => {
      const now = Date.now();
      const cred = issueCredential(passportId, issuerId, now + ONE_DAY_MS * 10);
      revokeCredential(cred.id);

      const result = renewCredential(cred.id, issuerId, now + ONE_DAY_MS * 30, now);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("credential_revoked");
    });

    it("new expiresAt less than 1 day from now → expiry_too_soon", () => {
      const now = Date.now();
      const cred = issueCredential(passportId, issuerId, now + ONE_DAY_MS * 10);
      const tooSoon = now + ONE_DAY_MS - 1;

      const result = renewCredential(cred.id, issuerId, tooSoon, now);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("expiry_too_soon");
    });

    it("new expiresAt not beyond current expiresAt → expiry_not_extended", () => {
      const now = Date.now();
      const original = now + ONE_DAY_MS * 10;
      const cred = issueCredential(passportId, issuerId, original);

      const result = renewCredential(cred.id, issuerId, original, now);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("expiry_not_extended");
    });

    it("non-issuer non-admin actor → unauthorized", () => {
      const now = Date.now();
      const cred = issueCredential(passportId, issuerId, now + ONE_DAY_MS * 10);

      const result = renewCredential(cred.id, "stranger", now + ONE_DAY_MS * 30, now);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("unauthorized");
    });

    it("unknown credential ID → credential_not_found", () => {
      const result = renewCredential("no-such-id", issuerId, Date.now() + ONE_DAY_MS * 5);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("credential_not_found");
    });
  });
});
