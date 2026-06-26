import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import crypto from "crypto";
import { POST } from "./route";
import { registerPassport, _reset as resetStore } from "../../../../../src/lib/passport/webhook-store";
import { _reset as resetNotifications, getNotifications } from "../../../../../src/lib/notifications/notification-store";
import { POST as subscribeRoute } from "../webhooks/route";
import { NextRequest } from "next/server";

interface RequestInitWithHeaders extends RequestInit {
  headers?: Record<string, string>;
}

let fetchCalls: { url: string; init?: RequestInitWithHeaders }[] = [];
let fetchResponses: (() => Response)[] = [];

vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
        const headers = new Headers(init?.headers);
        return {
          status: init?.status ?? 200,
          headers,
          json: async () => body,
        } as unknown as Response;
      },
    },
    NextRequest: class {},
  };
});

// Stub global fetch to capture webhook requests
vi.stubGlobal("fetch", async (url: string, init?: RequestInitWithHeaders) => {
  fetchCalls.push({ url, init });
  if (fetchResponses.length > 0) {
    const nextResponse = fetchResponses.shift()!;
    return nextResponse();
  }
  return { ok: true, status: 200 } as Response;
});

function createJsonRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("https://example.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/protocol/passport/revoke-batch", () => {
  beforeEach(() => {
    resetStore();
    resetNotifications();
    fetchCalls = [];
    fetchResponses = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("revokes 2 valid and lists 1 unknown passport ID", async () => {
    // 1. Setup active passports in the store
    registerPassport("pp_aaa", "agent-1");
    registerPassport("pp_bbb", "agent-2");

    // 2. Call batch revoke
    const req = createJsonRequest({
      passportIds: ["pp_aaa", "pp_bbb", "pp_ccc"],
      reason: "fleet_decommission",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      ok: boolean;
      revoked: string[];
      notFound: string[];
      alreadyRevoked: string[];
      total: number;
    };

    expect(data.ok).toBe(true);
    expect(data.revoked).toEqual(["pp_aaa", "pp_bbb"]);
    expect(data.notFound).toEqual(["pp_ccc"]);
    expect(data.alreadyRevoked).toEqual([]);
    expect(data.total).toBe(2);

    // 3. Verify audit log (notification) entries were created
    const notifs1 = getNotifications("agent-1");
    expect(notifs1).toHaveLength(1);
    expect(notifs1[0].title).toBe("Passport Revoked");
    expect(notifs1[0].message).toBe("Passport pp_aaa has been revoked");

    const notifs2 = getNotifications("agent-2");
    expect(notifs2).toHaveLength(1);
    expect(notifs2[0].title).toBe("Passport Revoked");
    expect(notifs2[0].message).toBe("Passport pp_bbb has been revoked");
  });

  it("returns 400 when over 50 IDs are provided", async () => {
    const passportIds = Array.from({ length: 51 }, (_, i) => `pp_${i}`);
    const req = createJsonRequest({ passportIds });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = (await res.json()) as { error: string; max: number };
    expect(data.error).toBe("batch_too_large");
    expect(data.max).toBe(50);
  });

  it("lists already-revoked passports in alreadyRevoked and does not re-revoke them", async () => {
    // 1. Setup active passport
    registerPassport("pp_aaa", "agent-1");

    // 2. Revoke it once
    const req1 = createJsonRequest({ passportIds: ["pp_aaa"] });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Reset captured webhooks and audit logs
    fetchCalls = [];
    resetNotifications();

    // 3. Try to revoke it again
    const req2 = createJsonRequest({ passportIds: ["pp_aaa"] });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);

    const data2 = (await res2.json()) as {
      ok: boolean;
      revoked: string[];
      notFound: string[];
      alreadyRevoked: string[];
      total: number;
    };

    expect(data2.ok).toBe(true);
    expect(data2.revoked).toEqual([]);
    expect(data2.alreadyRevoked).toEqual(["pp_aaa"]);
    expect(data2.total).toBe(0);

    // 4. Verify no new webhooks or audit logs were created
    expect(fetchCalls).toHaveLength(0);
    expect(getNotifications("agent-1")).toHaveLength(0);
  });

  it("fires a passport.revoked webhook event for each revoked passport", async () => {
    // 1. Subscribe to passport.revoked event
    const subReq = createJsonRequest({
      url: "https://myservice.com/webhook",
      events: ["passport.revoked"],
      secret: "my_shared_secret",
    });
    await subscribeRoute(subReq);

    // 2. Register and revoke
    registerPassport("pp_aaa", "agent-1");
    registerPassport("pp_bbb", "agent-2");

    fetchCalls = [];

    const req = createJsonRequest({
      passportIds: ["pp_aaa", "pp_bbb"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // 3. Verify webhook delivery
    expect(fetchCalls).toHaveLength(2);

    const call1 = fetchCalls.find((c) => {
      const payload = JSON.parse(c.init?.body as string);
      return payload.passportId === "pp_aaa";
    });
    expect(call1).toBeDefined();
    const payload1 = JSON.parse(call1!.init?.body as string);
    expect(payload1.event).toBe("passport.revoked");
    expect(payload1.agentId).toBe("agent-1");

    const call2 = fetchCalls.find((c) => {
      const payload = JSON.parse(c.init?.body as string);
      return payload.passportId === "pp_bbb";
    });
    expect(call2).toBeDefined();
    const payload2 = JSON.parse(call2!.init?.body as string);
    expect(payload2.event).toBe("passport.revoked");
    expect(payload2.agentId).toBe("agent-2");
  });
});
