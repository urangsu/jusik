import { describe, expect, it, vi, beforeEach } from "vitest";
import { regimeGate } from "./regime-gate";
import { regimeStore } from "./regime-store";
import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";

vi.mock("./regime-store", () => ({
  regimeStore: {
    getLatestSnapshot: vi.fn(),
  },
}));

describe("RegimeGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no snapshot is available", async () => {
    vi.mocked(regimeStore.getLatestSnapshot).mockResolvedValue(null);

    const decision = await regimeGate.getDecision("US");
    expect(decision.allowsNewWatch).toBe(true);
    expect(decision.allowsRiskUpgrading).toBe(true);
    expect(decision.suppressesMomentumAlert).toBe(false);
    expect(decision.reason).toContain("기본 규칙");
  });

  it("returns snapshot gate decision when snapshot is available", async () => {
    const mockSnap: Partial<RegimeSnapshot> = {
      regime: "risk_off",
      gates: {
        allowsNewWatch: false,
        allowsRiskUpgrading: false,
        suppressesMomentumAlert: true,
      },
      warnings: ["High VIX"],
    };

    vi.mocked(regimeStore.getLatestSnapshot).mockResolvedValue(mockSnap as any);

    const decision = await regimeGate.getDecision("US");
    expect(decision.allowsNewWatch).toBe(false);
    expect(decision.allowsRiskUpgrading).toBe(false);
    expect(decision.suppressesMomentumAlert).toBe(true);
    expect(decision.reason).toBe("High VIX");
  });
});
