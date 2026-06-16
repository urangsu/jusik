import { describe, expect, it } from "vitest";
import { createSignalVersion } from "./signal-version";

describe("createSignalVersion", () => {
  it("stores engine, data, config, calculation time, and expiry as distinct traceability fields", () => {
    const version = createSignalVersion({
      signalVersionId: "sv-1",
      engine: {
        engineId: "strategy_agreement",
        engineVersion: "0.2.1",
        configHash: "cfg-abc",
        gitCommitSha: "abc1234",
        createdAt: "2026-06-16T00:00:00.000Z",
      },
      dataVersionId: "dv-1",
      inputHash: "input-123",
      calculatedAt: "2026-06-16T01:00:00.000Z",
      expiryAt: "2026-06-17T01:00:00.000Z",
    });

    expect(version.engine.engineId).toBe("strategy_agreement");
    expect(version.engine.configHash).toBe("cfg-abc");
    expect(version.dataVersionId).toBe("dv-1");
    expect(version.inputHash).toBe("input-123");
    expect(version.expiryAt).toBe("2026-06-17T01:00:00.000Z");
  });
});
