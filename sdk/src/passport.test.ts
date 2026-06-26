import { describe, expect, it } from "vitest";
import { parsePositivePaymentAmount } from "./passport";

describe("parsePositivePaymentAmount", () => {
  it("accepts positive integer stroop amounts", () => {
    expect(parsePositivePaymentAmount("1")).toBe(1n);
    expect(parsePositivePaymentAmount(500n)).toBe(500n);
  });

  it.each(["0", "-1", "1.5", "abc", 0n, -1n])(
    "rejects invalid amount %s",
    (amount) => {
      expect(parsePositivePaymentAmount(amount)).toBeUndefined();
    },
  );
});
