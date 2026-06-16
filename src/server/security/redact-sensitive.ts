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

  if (typeof obj === "string") {
    // Redact direct occurrences of known secrets
    if (appKey && obj === appKey) {
      return "[REDACTED_APP_KEY]";
    }
    if (appSecret && obj === appSecret) {
      return "[REDACTED_APP_SECRET]";
    }
    return obj;
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
        lowerKey.includes("approval")
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
