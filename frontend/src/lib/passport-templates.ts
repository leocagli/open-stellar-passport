import type { SpendLimits, CircuitBreakerConfig } from "./passport-store";

export const PASSPORT_TEMPLATES = {
  read_only: {
    spendLimits: { dailyMaxXlm: 0 },
    circuitBreaker: { maxConsecutiveFailures: 3 },
  },
  standard: {
    spendLimits: { dailyMaxXlm: 100 },
    circuitBreaker: { maxConsecutiveFailures: 10 },
  },
  full: { spendLimits: null, circuitBreaker: null },
} as const;

export type TemplateName = keyof typeof PASSPORT_TEMPLATES;

export interface IssuanceBody {
  template?: string;
  spendLimits?: Partial<SpendLimits>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
}

export interface ResolvedConfig {
  spendLimits: SpendLimits | null;
  circuitBreaker: CircuitBreakerConfig | null;
}

export function isTemplateName(name: string): name is TemplateName {
  return Object.prototype.hasOwnProperty.call(PASSPORT_TEMPLATES, name);
}

export function applyTemplate(
  body: IssuanceBody,
): { ok: true; config: ResolvedConfig } | { ok: false; error: string } {
  if (body.template !== undefined) {
    if (!isTemplateName(body.template)) {
      const valid = Object.keys(PASSPORT_TEMPLATES).join(", ");
      return {
        ok: false,
        error: `Unknown template "${body.template}". Valid templates: ${valid}`,
      };
    }

    const tmpl = PASSPORT_TEMPLATES[body.template];

    const spendLimits: SpendLimits | null =
      body.spendLimits !== undefined
        ? { ...(tmpl.spendLimits ?? {}), ...body.spendLimits }
        : (tmpl.spendLimits as SpendLimits | null);

    const circuitBreaker: CircuitBreakerConfig | null =
      body.circuitBreaker !== undefined
        ? { ...(tmpl.circuitBreaker ?? {}), ...body.circuitBreaker }
        : (tmpl.circuitBreaker as CircuitBreakerConfig | null);

    return { ok: true, config: { spendLimits, circuitBreaker } };
  }

  return {
    ok: true,
    config: {
      spendLimits: body.spendLimits ?? null,
      circuitBreaker: body.circuitBreaker ?? null,
    },
  };
}
