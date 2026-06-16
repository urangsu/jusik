import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KisConfig } from "./kis-config";

describe("KIS Config Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KIS_APP_KEY = "my_key";
    process.env.KIS_APP_SECRET = "my_secret";
    process.env.KIS_ACCOUNT_NO = "my_account";
    process.env.KIS_APP_TYPE = "real";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should load configuration from process.env", () => {
    const config = new KisConfig();
    expect(config.appKey).toBe("my_key");
    expect(config.appSecret).toBe("my_secret");
    expect(config.accountNo).toBe("my_account");
    expect(config.appType).toBe("real");
    expect(config.isConfigured).toBe(true);
  });
});
