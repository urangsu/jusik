import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { redactSensitive, maskAccountNo } from "./redact-sensitive";

describe("Sensitive Data Redaction and Masking Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KIS_APP_KEY = "my_app_key_123";
    process.env.KIS_APP_SECRET = "my_app_secret_456";
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
});
