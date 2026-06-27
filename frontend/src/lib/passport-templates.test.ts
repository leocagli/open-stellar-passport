import { describe, expect, it } from "vitest";
import {
  PASSPORT_TEMPLATES,
  applyTemplate,
  isTemplateName,
} from "./passport-templates";

describe("PASSPORT_TEMPLATES", () => {
  it("read_only has dailyMaxXlm: 0 and maxConsecutiveFailures: 3", () => {
    expect(PASSPORT_TEMPLATES.read_only.spendLimits.dailyMaxXlm).toBe(0);
    expect(PASSPORT_TEMPLATES.read_only.circuitBreaker.maxConsecutiveFailures).toBe(3);
  });

  it("standard has dailyMaxXlm: 100 and maxConsecutiveFailures: 10", () => {
    expect(PASSPORT_TEMPLATES.standard.spendLimits.dailyMaxXlm).toBe(100);
    expect(PASSPORT_TEMPLATES.standard.circuitBreaker.maxConsecutiveFailures).toBe(10);
  });

  it("full has null spendLimits and null circuitBreaker", () => {
    expect(PASSPORT_TEMPLATES.full.spendLimits).toBeNull();
    expect(PASSPORT_TEMPLATES.full.circuitBreaker).toBeNull();
  });
});

describe("isTemplateName", () => {
  it("returns true for valid template names", () => {
    expect(isTemplateName("read_only")).toBe(true);
    expect(isTemplateName("standard")).toBe(true);
    expect(isTemplateName("full")).toBe(true);
  });

  it("returns false for unknown names", () => {
    expect(isTemplateName("admin")).toBe(false);
    expect(isTemplateName("")).toBe(false);
  });
});

describe("applyTemplate", () => {
  describe("read_only template", () => {
    it("issues passport with dailyMaxXlm: 0", () => {
      const result = applyTemplate({ template: "read_only" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits?.dailyMaxXlm).toBe(0);
    });

    it("uses circuitBreaker maxConsecutiveFailures: 3", () => {
      const result = applyTemplate({ template: "read_only" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.circuitBreaker?.maxConsecutiveFailures).toBe(3);
    });
  });

  describe("standard template", () => {
    it("uses dailyMaxXlm: 100 by default", () => {
      const result = applyTemplate({ template: "standard" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits?.dailyMaxXlm).toBe(100);
    });

    it("explicit dailyMaxXlm overrides template (50, not 100)", () => {
      const result = applyTemplate({
        template: "standard",
        spendLimits: { dailyMaxXlm: 50 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits?.dailyMaxXlm).toBe(50);
    });

    it("explicit circuitBreaker overrides template value", () => {
      const result = applyTemplate({
        template: "standard",
        circuitBreaker: { maxConsecutiveFailures: 5 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.circuitBreaker?.maxConsecutiveFailures).toBe(5);
    });

    it("non-overridden template fields remain (circuitBreaker preserved when only spendLimits overridden)", () => {
      const result = applyTemplate({
        template: "standard",
        spendLimits: { dailyMaxXlm: 50 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.circuitBreaker?.maxConsecutiveFailures).toBe(10);
    });
  });

  describe("full template", () => {
    it("produces null spendLimits and null circuitBreaker", () => {
      const result = applyTemplate({ template: "full" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits).toBeNull();
      expect(result.config.circuitBreaker).toBeNull();
    });

    it("explicit spendLimits override null template", () => {
      const result = applyTemplate({
        template: "full",
        spendLimits: { dailyMaxXlm: 200 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits?.dailyMaxXlm).toBe(200);
    });
  });

  describe("unknown template", () => {
    it("returns ok: false with error message", () => {
      const result = applyTemplate({ template: "superadmin" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("superadmin");
      expect(result.error).toContain("read_only");
      expect(result.error).toContain("standard");
      expect(result.error).toContain("full");
    });
  });

  describe("no template", () => {
    it("uses body values directly when no template specified", () => {
      const result = applyTemplate({
        spendLimits: { dailyMaxXlm: 75 },
        circuitBreaker: { maxConsecutiveFailures: 7 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits?.dailyMaxXlm).toBe(75);
      expect(result.config.circuitBreaker?.maxConsecutiveFailures).toBe(7);
    });

    it("returns null fields when body has no limits", () => {
      const result = applyTemplate({});
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.spendLimits).toBeNull();
      expect(result.config.circuitBreaker).toBeNull();
    });
  });
});
