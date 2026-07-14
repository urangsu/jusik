/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Masks account number to avoid exposing sensitive information.
 * E.g., "12345678-01" -> "123***01"
 */
export function maskAccountNo(accountNo: string): string {
  if (!accountNo) return "";
  const cleaned = accountNo.trim();
  if (cleaned.length <= 5) {
    return "****";
  }
  const first = cleaned.substring(0, 3);
  const last = cleaned.substring(cleaned.length - 2);
  const middle = "*".repeat(cleaned.length - 5);
  return `${first}${middle}${last}`;
}

/**
 * Recursively redacts sensitive keys and values from objects, arrays, and strings.
 */
export function redactSensitive(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  const smokeKey = process.env.INTERNAL_SMOKE_KEY;
  const opendartKey = process.env.OPENDART_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (typeof obj === "string") {
    let redactedStr = obj;
    const hasMinLength = (k: string | undefined): k is string => typeof k === "string" && k.trim().length >= 4;

    if (hasMinLength(appKey) && redactedStr.includes(appKey)) {
      redactedStr = redactedStr.replaceAll(appKey, "[REDACTED_APP_KEY]");
    }
    if (hasMinLength(appSecret) && redactedStr.includes(appSecret)) {
      redactedStr = redactedStr.replaceAll(appSecret, "[REDACTED_APP_SECRET]");
    }
    if (hasMinLength(smokeKey) && redactedStr.includes(smokeKey)) {
      redactedStr = redactedStr.replaceAll(smokeKey, "[REDACTED_SMOKE_KEY]");
    }
    if (hasMinLength(opendartKey) && redactedStr.includes(opendartKey)) {
      redactedStr = redactedStr.replaceAll(opendartKey, "[REDACTED_OPENDART_KEY]");
    }
    if (hasMinLength(fmpKey) && redactedStr.includes(fmpKey)) {
      redactedStr = redactedStr.replaceAll(fmpKey, "[REDACTED_FMP_KEY]");
    }
    if (hasMinLength(finnhubKey) && redactedStr.includes(finnhubKey)) {
      redactedStr = redactedStr.replaceAll(finnhubKey, "[REDACTED_FINNHUB_KEY]");
    }
    if (hasMinLength(alphaVantageKey) && redactedStr.includes(alphaVantageKey)) {
      redactedStr = redactedStr.replaceAll(alphaVantageKey, "[REDACTED_ALPHAVANTAGE_KEY]");
    }
    return redactedStr;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  if (typeof obj === "object") {
    const redacted: any = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      const val = obj[key];

      // Match account numbers
      if (
        lowerKey.includes("account") ||
        lowerKey.includes("acct") ||
        lowerKey === "cano" ||
        lowerKey === "acnt_no"
      ) {
        if (typeof val === "string") {
          redacted[key] = maskAccountNo(val);
        } else {
          redacted[key] = val;
        }
      }
      // Match key secrets and credentials
      else if (
        lowerKey.includes("appkey") ||
        lowerKey.includes("app_key") ||
        lowerKey.includes("appsecret") ||
        lowerKey.includes("app_secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("approval") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("smoke_key") ||
        lowerKey.includes("smoke-key")
      ) {
        redacted[key] = "[REDACTED_SENSITIVE]";
      } else {
        redacted[key] = redactSensitive(val);
      }
    }
    return redacted;
  }

  return obj;
}
