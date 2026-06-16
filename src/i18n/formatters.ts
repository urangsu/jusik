import { Locale } from "./locale";

/**
 * Formats market capitalization depending on market region (KR/US) and selected language locale.
 */
export function formatMarketCap(cap: number | null, isKr: boolean, locale: Locale): string {
  if (cap === null || cap === undefined) return "-";
  if (locale === "ko") {
    if (isKr) {
      return (cap / 1e12).toFixed(1) + "조 원";
    }
    return (cap / 1e9).toFixed(1) + "B USD";
  } else {
    if (isKr) {
      return (cap / 1e12).toFixed(1) + "T KRW";
    }
    return (cap / 1e9).toFixed(1) + "B USD";
  }
}

/**
 * Formats price value.
 */
export function formatPrice(price: number | null, isKr: boolean, locale: Locale): string {
  if (price === null || price === undefined) return "-";
  if (isKr) {
    return Math.round(price).toLocaleString() + (locale === "ko" ? "원" : " KRW");
  }
  return "$" + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats percentage change with leading + or -.
 */
export function formatPercent(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return (val > 0 ? "+" : "") + val.toFixed(2) + "%";
}

/**
 * Formats standard multiple (e.g. PER) with 1 decimal place.
 */
export function formatMultiple(val: number | null, locale: Locale): string {
  if (val === null || val === undefined) return "-";
  return val.toFixed(1) + (locale === "ko" ? "배" : "x");
}

/**
 * Formats standard multiple with 2 decimal places (e.g. PBR).
 */
export function formatMultipleTwoDecimals(val: number | null, locale: Locale): string {
  if (val === null || val === undefined) return "-";
  return val.toFixed(2) + (locale === "ko" ? "배" : "x");
}

/**
 * Formats general percentage (e.g. ROE, Dividend Yield) with 1 decimal place.
 */
export function formatPercentShort(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return val.toFixed(1) + "%";
}
