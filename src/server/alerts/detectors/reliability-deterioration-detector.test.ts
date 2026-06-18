import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectReliabilityDeterioration } from "./reliability-deterioration-detector";
import { getLatestReliabilitySummary } from "../../reliability/reliability-store";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";

// Mock the reliability store
vi.mock("../../reliability/reliability-store", () => ({
  getLatestReliabilitySummary: vi.fn(),
}));

// Mock fs/promises
const mockFiles: Record<string, string> = {};
vi.mock("fs/promises", () => {
  return {
    default: {
      readdir: vi.fn(async () => Object.keys(mockFiles)),
      readFile: vi.fn(async (filePath: string) => {
        const key = Object.keys(mockFiles).find((k) => filePath.endsWith(k));
        if (key && mockFiles[key]) {
          return mockFiles[key];
        }
        throw new Error("File not found");
      }),
    },
  };
});

describe("reliability-deterioration-detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockFiles)) {
      delete mockFiles[key];
    }
  });

  it("should return empty array when no current summary exists", async () => {
    vi.mocked(getLatestReliabilitySummary).mockResolvedValue(null);

    const events = await detectReliabilityDeterioration({ universeId: "KOSPI_SAMPLE" });
    expect(events).toEqual([]);
  });

  it("should detect reliability deterioration changes (fallback, robust->low, negative IC, score drop)", async () => {
    // Current summary on 2026-06-18
    const currentSummary: ReliabilitySummary = {
      universeId: "KOSPI_SAMPLE",
      calculatedAt: "2026-06-18T09:00:00Z",
      engineVersion: "1.0.0",
      warnings: [],
      aggregate: {
        personalFallbackAffectedSignals: 3, // increased from 1
      } as any,
      records: [
        {
          signalId: "ichimoku",
          horizon: "short",
          sampleStatus: "robust",
          reliabilityLabel: "low", // downgraded from medium
          reliabilityScore: 50, // dropped from 75 (drop of 25)
          warnings: ["negative_ic"], // newly triggered
        },
      ] as any,
    };

    // Previous summary on 2026-06-17
    const prevSummary: ReliabilitySummary = {
      universeId: "KOSPI_SAMPLE",
      calculatedAt: "2026-06-17T09:00:00Z",
      engineVersion: "1.0.0",
      warnings: [],
      aggregate: {
        personalFallbackAffectedSignals: 1,
      } as any,
      records: [
        {
          signalId: "ichimoku",
          horizon: "short",
          sampleStatus: "robust",
          reliabilityLabel: "medium",
          reliabilityScore: 75,
          warnings: [],
        },
      ] as any,
    };

    vi.mocked(getLatestReliabilitySummary).mockResolvedValue(currentSummary);
    mockFiles["run-prev.json"] = JSON.stringify(prevSummary);

    const events = await detectReliabilityDeterioration({ universeId: "KOSPI_SAMPLE" });

    // We expect 4 events:
    // 1. fallback increase (1 -> 3)
    // 2. robust -> low deterioration
    // 3. negative IC newly triggered
    // 4. reliability score drop (75 -> 50, drop of 25 >= 20)
    expect(events).toHaveLength(4);

    const fallbackEvent = events.find((e) => e.id.includes("fallback"));
    expect(fallbackEvent).toBeDefined();
    expect(fallbackEvent?.severity).toBe("info");
    expect(fallbackEvent?.messageKo).toContain("비공식 개인 백업 데이터");

    const robustLowEvent = events.find((e) => e.id.includes("robust-low"));
    expect(robustLowEvent).toBeDefined();
    expect(robustLowEvent?.severity).toBe("warning");
    expect(robustLowEvent?.messageKo).toContain("robust 등급 신호의 신뢰성 라벨이 'low'로 하락");

    const negativeIcEvent = events.find((e) => e.id.includes("negative-ic"));
    expect(negativeIcEvent).toBeDefined();
    expect(negativeIcEvent?.severity).toBe("warning");
    expect(negativeIcEvent?.messageKo).toContain("음의 상관성(역방향) 경고(negative_ic)가 검출");

    const scoreDropEvent = events.find((e) => e.id.includes("score-drop"));
    expect(scoreDropEvent).toBeDefined();
    expect(scoreDropEvent?.severity).toBe("warning");
    expect(scoreDropEvent?.messageKo).toContain("신뢰도 점수가 이전 75에서 현재 50로 급감");
  });
});
