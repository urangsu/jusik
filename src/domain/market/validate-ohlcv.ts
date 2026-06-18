import { OhlcvCandle } from "./ohlcv";

export type OhlcvValidationResult = {
  valid: boolean;
  errors: string[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/;

function getMaxDays(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isStrictIsoDateOrDateTime(value: string): boolean {
  const dateMatch = value.match(ISO_DATE_RE);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > getMaxDays(year, month)) return false;

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return false;
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() + 1 === month &&
      parsed.getUTCDate() === day
    );
  }

  const dateTimeMatch = value.match(ISO_DATETIME_RE);
  if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const month = Number(dateTimeMatch[2]);
    const day = Number(dateTimeMatch[3]);
    const hour = Number(dateTimeMatch[4]);
    const minute = Number(dateTimeMatch[5]);
    const second = Number(dateTimeMatch[6]);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > getMaxDays(year, month)) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;
    if (second < 0 || second > 59) return false;

    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime());
  }

  return false;
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
