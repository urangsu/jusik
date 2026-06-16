import { vi, describe, it, expect, beforeEach } from "vitest";
import { AlertDeduper } from "./alert-deduper";
import { alertCooldownManager } from "./alert-cooldown";

vi.mock("./alert-cooldown", () => {
  return {
    alertCooldownManager: {
      generateFingerprint: vi.fn().mockReturnValue("mock-fingerprint"),
      checkCooldown: vi.fn(),
      updateCooldown: vi.fn(),
    },
  };
});

describe("AlertDeduper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return false if event is NOT a duplicate (cooldown allows trigger)", async () => {
    const deduper = new AlertDeduper();
    (alertCooldownManager.checkCooldown as any).mockResolvedValue(true);

    const isDup = await deduper.isDuplicate("rule1", "return_zscore", "KR:005930");
    expect(isDup).toBe(false);
  });

  it("should return true if event IS a duplicate (cooldown blocks trigger)", async () => {
    const deduper = new AlertDeduper();
    (alertCooldownManager.checkCooldown as any).mockResolvedValue(false);

    const isDup = await deduper.isDuplicate("rule1", "return_zscore", "KR:005930");
    expect(isDup).toBe(true);
  });

  it("should register trigger", async () => {
    const deduper = new AlertDeduper();
    await deduper.registerTrigger("rule1", "return_zscore", "KR:005930");
    expect(alertCooldownManager.updateCooldown).toHaveBeenCalledWith("mock-fingerprint");
  });
});
