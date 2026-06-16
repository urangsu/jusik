import { OhlcvCandle } from "./ohlcv";

export type OhlcvValidationResult = {
  valid: boolean;
  errors: string[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIsoLike(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function validateOhlcvCandle(candle: OhlcvCandle): OhlcvValidationResult {
  const errors: string[] = [];

  for (const field of ["open", "high", "low", "close", "volume"] as const) {
    if (!isFiniteNumber(candle[field])) {
      errors.push(`${field} must be a finite number.`);
    }
  }

  if (!isValidIsoLike(candle.timestamp)) {
    errors.push("timestamp must be a valid ISO-like datetime string.");
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
