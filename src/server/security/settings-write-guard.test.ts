import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkSettingsWriteEnabled } from "./settings-write-guard";

describe("Settings Write Guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should block with 405 if LOCAL_SETTINGS_WRITE_ENABLED is not set", () => {
    delete process.env.LOCAL_SETTINGS_WRITE_ENABLED;
    (process.env as any).NODE_ENV = "development";

    const res = checkSettingsWriteEnabled({ routeName: "test-route" });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(405);
  });

  it("should permit settings writes if LOCAL_SETTINGS_WRITE_ENABLED is true in development", () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";
    (process.env as any).NODE_ENV = "development";

    const res = checkSettingsWriteEnabled({ routeName: "test-route" });
    expect(res).toBeNull();
  });

  it("should block with 403 in production if LOCAL_SETTINGS_WRITE_ENABLED is false", () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";
    (process.env as any).NODE_ENV = "production";

    const res = checkSettingsWriteEnabled({ routeName: "test-route" });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });
});
