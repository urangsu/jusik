import { z } from "zod";
import { ProviderRealDataSmokeCapability } from "../../domain/ops/provider-readiness";
import { SourceUsagePolicy } from "../../domain/source/provider-tier";

// ── Canonical provenance map ───────────────────────────────────────────────
// The source string and tier must exactly match these values.
// Substring matching (e.g. "contains 'kis'") is explicitly rejected.
export const PROVIDER_PROVENANCE = {
  kis: { source: "KIS Open API", sourceTier: "official" as SourceUsagePolicy },
  opendart: { source: "OpenDART", sourceTier: "official" as SourceUsagePolicy },
  finnhub_free: { source: "Finnhub Free", sourceTier: "free_limited" as SourceUsagePolicy },
} as const;

// ── Capability Zod schemas ─────────────────────────────────────────────────

const quoteSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  price: z.number().finite(),
  currency: z.enum(["KRW", "USD"]),
  updatedAt: z.string().datetime(),
  source: z.string().min(1),
});

const ohlcvSchema = z.object({
  assetId: z.string().min(1),
  candles: z.array(
    z.object({
      timestamp: z.string().datetime(),
      open: z.number().finite(),
      high: z.number().finite(),
      low: z.number().finite(),
      close: z.number().finite(),
      volume: z.number().finite().nonnegative(),
    })
  ).min(1),
});

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

const financialsSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  corpCode: z.string().length(8),
  bsnsYear: z.string().regex(/^\d{4}$/),
  receiptNo: z.string().min(1),
  currency: z.literal("KRW"),
  basis: z.enum(["CFS", "OFS"]),
  updatedAt: z.string().datetime(),
});

type SupportedCapability = Exclude<ProviderRealDataSmokeCapability, "news">;

const VALUE_SCHEMAS: Record<SupportedCapability, z.ZodType> = {
  quote: quoteSchema,
  ohlcv: ohlcvSchema,
  filings: filingsSchema,
  financials: financialsSchema,
};

/**
 * Validate a smoke result value against its capability's typed schema.
 * Returns a Zod SafeParseResult — success=false means evidence is invalid.
 */
export function validateSmokeValue(
  capability: SupportedCapability,
  value: unknown,
): z.ZodSafeParseSuccess<unknown> | z.ZodSafeParseError<unknown> {
  return VALUE_SCHEMAS[capability].safeParse(value);
}

export type ProvenanceValidationResult =
  | { success: true }
  | { success: false; expected: { source: string; sourceTier: string }; got: { source: string | null; sourceTier: string | null } };

/**
 * Validate that the smoke result's source and sourceTier exactly match
 * the canonical provenance for the given provider.
 *
 * Substring / contains matching is NOT accepted — a source that merely
 * "contains" the provider name is rejected to prevent spoofing.
 */
export function validateSmokeProvenance(
  providerId: keyof typeof PROVIDER_PROVENANCE,
  source: string | null,
  sourceTier: string | null,
): ProvenanceValidationResult {
  const expected = PROVIDER_PROVENANCE[providerId];
  if (source === expected.source && sourceTier === expected.sourceTier) {
    return { success: true };
  }
  return {
    success: false,
    expected,
    got: { source, sourceTier },
  };
}

/**
 * Validate that updatedAt is a parseable ISO datetime and not older than maxAgeMs.
 */
export function validateSmokeFreshness(
  updatedAt: string | null,
  maxAgeMs: number,
  nowMs: number = Date.now(),
): { valid: boolean; ageMs: number | null } {
  if (!updatedAt) return { valid: false, ageMs: null };
  const parsed = Date.parse(updatedAt);
  if (isNaN(parsed)) return { valid: false, ageMs: null };
  const ageMs = nowMs - parsed;
  return { valid: ageMs >= 0 && ageMs <= maxAgeMs, ageMs };
}
