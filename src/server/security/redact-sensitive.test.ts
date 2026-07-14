import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { redactSensitive, maskAccountNo } from "./redact-sensitive";

describe("Sensitive Data Redaction and Masking Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KIS_APP_KEY = "my_app_key_123";
    process.env.KIS_APP_SECRET = "my_app_secret_456";
    process.env.INTERNAL_SMOKE_KEY = "smoke_key_xyz";
    process.env.OPENDART_API_KEY = "opendart_key_abc";
    process.env.FMP_API_KEY = "fmp_key_def";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should mask account number correctly", () => {
    expect(maskAccountNo("12345678-01")).toBe("123******01");
    expect(maskAccountNo("abcde")).toBe("****");
  });

  it("should recursively redact sensitive fields in object structures", () => {
    const payload = {
      user: "john_doe",
      accountNo: "50076234-01",
      appKey: "my_app_key_123",
      credentials: {
        app_secret: "my_app_secret_456",
        accessToken: "some_secret_token",
      },
      smoke_key: "smoke_key_xyz",
      apiKey: "some_key_here",
      data: [
        {
          symbol: "005930",
          cano: "12345678-01",
        },
      ],
    };

    const redacted = redactSensitive(payload);

    expect(redacted.user).toBe("john_doe");
    expect(redacted.accountNo).toBe("500******01");
    expect(redacted.appKey).toBe("[REDACTED_SENSITIVE]");
    expect(redacted.credentials.app_secret).toBe("[REDACTED_SENSITIVE]");
    expect(redacted.credentials.accessToken).toBe("[REDACTED_SENSITIVE]");
    expect(redacted.smoke_key).toBe("[REDACTED_SENSITIVE]");
    expect(redacted.apiKey).toBe("[REDACTED_SENSITIVE]");
    expect(redacted.data[0].cano).toBe("123******01");
  });

  it("should redact string match of process.env.KIS_APP_SECRET", () => {
    const payload = {
      nested: {
        someSecret: "my_app_secret_456",
      },
    };
    const redacted = redactSensitive(payload);
    expect(redacted.nested.someSecret).toBe("[REDACTED_APP_SECRET]");
  });

  it("should redact other API key matches like smoke key or opendart key", () => {
    const payload = {
      val1: "smoke_key_xyz",
      val2: "opendart_key_abc",
      val3: "fmp_key_def",
    };
    const redacted = redactSensitive(payload);
    expect(redacted.val1).toBe("[REDACTED_SMOKE_KEY]");
    expect(redacted.val2).toBe("[REDACTED_OPENDART_KEY]");
    expect(redacted.val3).toBe("[REDACTED_FMP_KEY]");
  });

  it("should redact embedded secrets in URLs, query parameters, and error messages", () => {
    const url = "http://localhost:3000/api/market/quote?symbol=AAPL&apiKey=fmp_key_def";
    const errorMessage = "Failed to connect using key my_app_secret_456, unauthorized.";
    
    expect(redactSensitive(url)).toBe("http://localhost:3000/api/market/quote?symbol=AAPL&apiKey=[REDACTED_FMP_KEY]");
    expect(redactSensitive(errorMessage)).toBe("Failed to connect using key [REDACTED_APP_SECRET], unauthorized.");
  });
});
