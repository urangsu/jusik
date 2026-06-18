import { describe, expect, it, vi, beforeEach } from "vitest";
import { strategySuitabilityService } from "./strategy-suitability-service";
import { regimeStore } from "../regime/regime-store";

vi.mock("../regime/regime-store", () => ({
  regimeStore: {
    getLatestSnapshot: vi.fn(),
  },
}));

describe("StrategySuitabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks score and sets insufficient_data when regime is panic", async () => {
    vi.mocked(regimeStore.getLatestSnapshot).mockResolvedValue({
      regime: "panic",
      gates: { allowsNewWatch: false, allowsRiskUpgrading: false, suppressesMomentumAlert: true },
      confidence: "high",
      warnings: ["Crash"],
    } as any);

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "strong_watch", 85);
    expect(suitability.suitabilityScore).toBeNull();
    expect(suitability.adjustedLabel).toBe("insufficient_data");
    expect(suitability.warnings.some(w => w.includes("패닉"))).toBe(true);
  });

  it("downgrades watch labels to caution when regime is risk_off", async () => {
    vi.mocked(regimeStore.getLatestSnapshot).mockResolvedValue({
      regime: "risk_off",
      gates: { allowsNewWatch: false, allowsRiskUpgrading: false, suppressesMomentumAlert: true },
      confidence: "high",
      warnings: ["Correction"],
    } as any);

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "strong_watch", 80);
    expect(suitability.adjustedLabel).toBe("caution");
    expect(suitability.suitabilityScore).toBe(80); // score itself is maintained but label downgraded
  });

  it("retains original label when regime is neutral or risk_on", async () => {
    vi.mocked(regimeStore.getLatestSnapshot).mockResolvedValue({
      regime: "neutral",
      gates: { allowsNewWatch: true, allowsRiskUpgrading: true, suppressesMomentumAlert: false },
      confidence: "high",
      warnings: [],
    } as any);

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "strong_watch", 85);
    expect(suitability.adjustedLabel).toBe("strong_watch");
  });
});
