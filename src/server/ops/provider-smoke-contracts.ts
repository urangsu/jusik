import { z } from "zod";
import type { RuntimeProviderId, ProviderRealDataSmokeCapability } from "../../domain/ops/provider-readiness";

// ── Capability Zod schemas — must match production domain types ────────────

/** Quote — mirrors domain/market/quote.ts Quote */
const quoteSchema = z.object({
  assetId: z.string().min(1),
  market: z.string().min(1),
  symbol: z.string().min(1),
  price: z.number().finite().positive(),
  currency: z.string().min(1),
  updatedAt: z.string().datetime(),
  source: z.string().min(1),
  // volume may be null for some providers
  volume: z.number().nonnegative().nullable().optional(),
});

/**
 * OHLCV — mirrors domain/market/ohlcv.ts OhlcvSeries.
 * Candles must have the canonical timestamp field (not bare `date`).
 * high >= low, volume >= 0 are validated.
 */
const ohlcvCandleSchema = z.object({
  assetId: z.string().min(1),
  market: z.string().min(1),
  timestamp: z.string().datetime(), // ISO datetime — rejects bare "YYYY-MM-DD" without time
  open: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  close: z.number().finite(),
  volume: z.number().finite().nonnegative(),
  source: z.string().min(1),
}).refine((c) => c.high >= c.low, { message: "high must be >= low" });

const ohlcvSchema = z.object({
  assetId: z.string().min(1),
  market: z.string().min(1),
  candles: z.array(ohlcvCandleSchema).min(1),
  source: z.string().min(1),
});

/**
 * OpenDART filings — mirrors opendart disclosure list shape.
 * Requires at least one filing entry.
 */
const filingsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  list: z.array(
    z.object({
      rcept_no: z.string().min(1),
      rcept_dt: z.string().regex(/^\d{8}$/),
      report_nm: z.string().min(1),
    })
  ).min(1),
});

/**
 * OpenDART financials — must include identifiers AND at least one non-null Beta operand.
 * Accepts both legacy (assets/liabilities/equity) and normalized (totalAssets/totalLiabilities/totalEquity).
 * Metadata-only financials (all operands null) cannot pass.
 */
const financialsSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  corpCode: z.string().length(8),
  bsnsYear: z.string().regex(/^\d{4}$/),
  receiptNo: z.string().min(1),
  currency: z.literal("KRW"),
  basis: z.enum(["CFS", "OFS"]),
  updatedAt: z.string().datetime(),
  revenue: z.number().nullable().optional(),
  operatingIncome: z.number().nullable().optional(),
  netIncome: z.number().nullable().optional(),
  assets: z.number().nullable().optional(),
  liabilities: z.number().nullable().optional(),
  equity: z.number().nullable().optional(),
  totalAssets: z.number().nullable().optional(),
  totalLiabilities: z.number().nullable().optional(),
  totalEquity: z.number().nullable().optional(),
}).refine(
  (d) =>
    [
      d.revenue,
      d.operatingIncome,
      d.netIncome,
      d.assets,
      d.liabilities,
      d.equity,
      d.totalAssets,
      d.totalLiabilities,
      d.totalEquity,
    ].some((v) => v != null),
  {
    message:
      "financials must have at least one non-null Beta operand (revenue, operatingIncome, netIncome, assets/totalAssets, liabilities/totalLiabilities, or equity/totalEquity)",
  }
);

type SupportedCapability = Exclude<ProviderRealDataSmokeCapability, "news">;

const VALUE_SCHEMAS: Record<SupportedCapability, z.ZodType> = {
  quote: quoteSchema,
  ohlcv: ohlcvSchema,
  filings: filingsSchema,
  financials: financialsSchema,
};

export type TargetIdentityContext = {
  expectedSymbol?: string;
  expectedRegion?: "KR" | "US";
  expectedSource?: string;
};

/**
 * Validate a smoke result value against its capability's canonical Zod schema and target identity.
 * Returns a Zod SafeParseResult — success=false means evidence or identity is invalid.
 */
export function validateSmokeValue(
  capability: SupportedCapability,
  value: unknown,
  context?: TargetIdentityContext
): z.ZodSafeParseSuccess<unknown> | z.ZodSafeParseError<unknown> {
  const parseResult = VALUE_SCHEMAS[capability].safeParse(value);
  if (!parseResult.success) {
    return parseResult;
  }

  // Identity validation against target context
  if (context && value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const issues: z.ZodIssue[] = [];

    if (context.expectedSymbol && typeof obj.symbol === "string" && obj.symbol !== context.expectedSymbol) {
      issues.push({
        code: z.ZodIssueCode.custom,
        path: ["symbol"],
        message: `symbol '${obj.symbol}' mismatch with expected '${context.expectedSymbol}'`,
      });
    }

    if (context.expectedRegion && typeof obj.market === "string" && obj.market !== context.expectedRegion) {
      issues.push({
        code: z.ZodIssueCode.custom,
        path: ["market"],
        message: `market '${obj.market}' mismatch with expected region '${context.expectedRegion}'`,
      });
    }

    if (context.expectedSource && typeof obj.source === "string" && obj.source !== context.expectedSource) {
      issues.push({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: `inner source '${obj.source}' mismatch with expected '${context.expectedSource}'`,
      });
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: new z.ZodError(issues),
      };
    }
  }

  return parseResult;
}

export type ProvenanceValidationResult =
  | { success: true }
  | { success: false; expected: { source: string; sourceTier: string }; got: { source: string | null; sourceTier: string | null } };

/**
 * Validate that source and sourceTier exactly match expected values.
 * Substring / contains matching is NOT accepted.
 */
export function validateSmokeProvenance(
  expectedSource: string,
  expectedSourceTier: string,
  source: string | null,
  sourceTier: string | null,
): ProvenanceValidationResult {
  if (source === expectedSource && sourceTier === expectedSourceTier) {
    return { success: true };
  }
  return {
    success: false,
    expected: { source: expectedSource, sourceTier: expectedSourceTier },
    got: { source, sourceTier },
  };
}

/**
 * Validate freshness from upstream observation time (dataAsOf), not fetch time.
 * Both future dataAsOf and stale dataAsOf fail.
 */
export function validateSmokeFreshness(
  dataAsOf: string | null,
  maxAgeMs: number,
  nowMs: number = Date.now(),
): { valid: boolean; ageMs: number | null } {
  if (!dataAsOf) return { valid: false, ageMs: null };
  const parsed = Date.parse(dataAsOf);
  if (isNaN(parsed)) return { valid: false, ageMs: null };
  const ageMs = nowMs - parsed;
  return { valid: ageMs >= 0 && ageMs <= maxAgeMs, ageMs };
}
