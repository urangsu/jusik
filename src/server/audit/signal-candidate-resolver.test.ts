import { describe, it, expect } from "vitest";
import { resolveSignalAuditCandidates } from "./signal-candidate-resolver";

describe("SignalCandidateResolver", () => {
  it("should return the list of momentum_v1 atomic signals and mark them as available", async () => {
    const candidates = await resolveSignalAuditCandidates({ universeId: "KOSPI_SAMPLE" });
    const available = candidates.filter((c) => c.available);

    expect(available.length).toBe(8);
    const ids = available.map((c) => c.signalId);
    expect(ids).toContain("momentum_return");
    expect(ids).toContain("momentum_ma_slope");
    expect(ids).toContain("momentum_weinstein");
    expect(ids).toContain("momentum_ichimoku");
    expect(ids).toContain("momentum_turtle");
    expect(ids).toContain("momentum_darvas");
    expect(ids).toContain("momentum_volatility");
    expect(ids).toContain("momentum_volume");

    const momentumReturn = available.find((c) => c.signalId === "momentum_return");
    expect(momentumReturn?.currentWeightInMomentumV1).toBe(0.20);
    expect(momentumReturn?.signalLabelKo).toBe("수익률 모멘텀");
  });

  it("should return raw sub-components as unavailable", async () => {
    const candidates = await resolveSignalAuditCandidates({ universeId: "KOSPI_SAMPLE" });
    const unavailable = candidates.filter((c) => !c.available);

    expect(unavailable.length).toBeGreaterThan(0);
    const ids = unavailable.map((c) => c.signalId);
    expect(ids).toContain("return_20d");
    expect(ids).toContain("ichimoku_cloud_position");

    const return20d = unavailable.find((c) => c.signalId === "return_20d");
    expect(return20d?.currentWeightInMomentumV1).toBeNull();
    expect(return20d?.unavailableReason).toBe("momentum_v1의 독립적인 atomic signal로 구성되지 않음");
  });
});
