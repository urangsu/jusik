import { vi, describe, it, expect, beforeEach } from "vitest";
import { AlertCooldownManager } from "./alert-cooldown";

describe("AlertCooldownManager", () => {
  let cooldownManager: AlertCooldownManager;

  beforeEach(() => {
    cooldownManager = new AlertCooldownManager();
    let mockData: Record<string, string> = {};
    cooldownManager["store"] = {
      read: vi.fn().mockImplementation(async () => mockData),
      write: vi.fn().mockImplementation(async (data) => {
        mockData = data;
      }),
    } as any;
  });

  it("should generate proper fingerprint", () => {
    const fp = cooldownManager.generateFingerprint(
      "rule1",
      "return_zscore",
      "KR:005930",
      "test-hash"
    );
    expect(fp).toBe("rule1:return_zscore:KR:005930:test-hash");
  });

  it("should allow trigger when no cooldown is active", async () => {
    const fp = "rule1:return_zscore:KR:005930:default";
    const allowed = await cooldownManager.checkCooldown(fp, 60);
    expect(allowed).toBe(true);
  });

  it("should block trigger within cooldown period", async () => {
    const fp = "rule1:return_zscore:KR:005930:default";
    await cooldownManager.updateCooldown(fp);

    const allowed = await cooldownManager.checkCooldown(fp, 60);
    expect(allowed).toBe(false);
  });

  it("should allow trigger after cooldown period elapsed", async () => {
    const fp = "rule1:return_zscore:KR:005930:default";
    const cooldowns = await cooldownManager["store"].read();
    cooldowns[fp] = new Date(Date.now() - 65 * 60 * 1000).toISOString();

    const allowed = await cooldownManager.checkCooldown(fp, 60);
    expect(allowed).toBe(true);
  });
});
