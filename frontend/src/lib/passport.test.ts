import { describe, expect, it } from "vitest";
import { evaluatePaymentAuthorization, parseContractError } from "./passport";

describe("parseContractError", () => {
  it("maps Soroban contract error codes to generated validator names", () => {
    expect(
      parseContractError(new Error("simulation failed: Error(Contract, #4)")),
    ).toBe("NullifierUsed");
    expect(parseContractError("host trapped with #5")).toBe("InvalidProof");
  });

  it("truncates unknown verbose errors for display", () => {
    const longMessage = "x".repeat(180);

    expect(parseContractError(longMessage)).toHaveLength(141);
    expect(parseContractError(longMessage).endsWith("…")).toBe(true);
  });
});

describe("evaluatePaymentAuthorization", () => {
  it("authorizes an amount equal to the proven spend cap", () => {
    expect(evaluatePaymentAuthorization({ spend_cap: "500" }, "500")).toEqual({
      authorized: true,
      cap: "500",
      reason: "Within proven spend cap",
    });
  });

  it("rejects amounts above the proven spend cap", () => {
    expect(evaluatePaymentAuthorization({ spend_cap: "500" }, "501")).toEqual({
      authorized: false,
      cap: "500",
      reason: "Exceeds proven spend cap",
    });
  });

  it("rejects missing passports without exposing network details", () => {
    expect(evaluatePaymentAuthorization(undefined, "1")).toEqual({
      authorized: false,
      reason: "No passport — agent not verified",
    });
  });
});
