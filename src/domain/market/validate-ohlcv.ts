import { OhlcvCandle } from "./ohlcv";

export type OhlcvValidationResult = {
  valid: boolean;
  errors: string[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isStrictIsoDateOrDateTime(value: string): boolean {
  if (!ISO_DATE_RE.test(value) && !ISO_DATETIME_RE.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;

  if (ISO_DATE_RE.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() + 1 === month &&
      parsed.getUTCDate() === day
    );
  }

  return true;
}

export function validateOhlcvCandle(candle: OhlcvCandle): OhlcvValidationResult {
  const errors: string[] = [];

  for (const field of ["open", "high", "low", "close", "volume"] as const) {
    if (!isFiniteNumber(candle[field])) {
      errors.push(`${field} must be a finite number.`);
    }
  }

  if (!isStrictIsoDateOrDateTime(candle.timestamp)) {
    errors.push("timestamp must be a strict ISO date or datetime string.");
  }

  if (!candle.assetId.startsWith(`${candle.market}:`)) {
    errors.push("assetId prefix must match market.");
  }

  if (errors.length === 0) {
    if (candle.high < candle.low) errors.push("high must be greater than or equal to low.");
    if (candle.high < candle.open) errors.push("high must be greater than or equal to open.");
    if (candle.high < candle.close) errors.push("high must be greater than or equal to close.");
    if (candle.low > candle.open) errors.push("low must be less than or equal to open.");
    if (candle.low > candle.close) errors.push("low must be less than or equal to close.");
    if (candle.volume < 0) errors.push("volume must be greater than or equal to 0.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
