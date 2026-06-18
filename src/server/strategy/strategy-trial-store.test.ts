import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs/promises";

// Use a temp directory for test isolation without requiring path or os imports inside vi.hoisted
const { TEST_DATA_DIR } = vi.hoisted(() => {
  const tmpDir = process.env.TMPDIR || "/tmp";
  const uniqueDir = tmpDir.replace(/\/$/, "") + "/strategy-trial-store-test-" + Date.now();
  return { TEST_DATA_DIR: uniqueDir };
});

vi.mock("@/server/storage/storage-paths", () => ({
  getStrategyTrialsPath: () => TEST_DATA_DIR + "/events.json",
}));

import { StrategyTrialStore } from "@/server/strategy/strategy-trial-store";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";

function makeTrial(id: string, strategyId: string, overrides: Partial<StrategyTrialRecord> = {}): StrategyTrialRecord {
  const now = new Date().toISOString();
  return {
    id,
    strategyId,
    variantId: `variant_${id}`,
    strategyFamily: "momentum",
    thesisKo: "테스트 전략",
    hypothesis: "테스트 가설",
    parameters: { window: 20 },
    parameterHash: `hash_${id}`,
    universeId: "KOSPI_SAMPLE",
    dataWindow: { startDate: "2022-01-01", endDate: "2024-01-01" },
    backtestRunId: null,
    observedMetrics: {
      oosReturn: null,
      sharpe: null,
      maxDrawdown: null,
      spearmanIc: null,
      icir: null,
      hitRate: null,
      turnover: null,
    },
    validationStatus: "draft",
    rejectionReason: null,
    biasWarnings: ["sample_universe_only"],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("StrategyTrialStore", () => {
  let store: StrategyTrialStore;

  beforeEach(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    store = new StrategyTrialStore();
  });

  it("should create and retrieve a trial", async () => {
    const trial = makeTrial("t1", "momentum_v1");
    await store.create(trial);

    const found = await store.getById("t1");
    expect(found).not.toBeNull();
    expect(found?.strategyId).toBe("momentum_v1");
  });

  it("should store rejected trials and not delete them", async () => {
    const rejected = makeTrial("t2", "strategy_a", {
      validationStatus: "rejected",
      rejectionReason: "표본 부족",
    });
    await store.create(rejected);

    const all = await store.getAll();
    const found = all.find((t) => t.id === "t2");
    expect(found).toBeDefined();
    expect(found?.validationStatus).toBe("rejected");
    expect(found?.rejectionReason).toBe("표본 부족");
  });

  it("should detect duplicate parameterHash", async () => {
    const trial = makeTrial("t3", "strategy_b", { parameterHash: "abc123" });
    await store.create(trial);

    const dup = await store.findDuplicateByHash("abc123", "strategy_b");
    expect(dup).not.toBeNull();
    expect(dup?.id).toBe("t3");
  });

  it("should return null for unknown parameterHash", async () => {
    const dup = await store.findDuplicateByHash("unknown_hash", "strategy_c");
    expect(dup).toBeNull();
  });

  it("should filter trials by strategyId", async () => {
    await store.create(makeTrial("t4", "strategy_x"));
    await store.create(makeTrial("t5", "strategy_y"));
    await store.create(makeTrial("t6", "strategy_x"));

    const xTrials = await store.getByStrategyId("strategy_x");
    expect(xTrials).toHaveLength(2);
    expect(xTrials.every((t) => t.strategyId === "strategy_x")).toBe(true);
  });
});
