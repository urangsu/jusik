import { describe, it, expect } from "vitest";
import { FactorValue, getFactorAsOf } from "./factor-value";

describe("getFactorAsOf Point-in-Time rules", () => {
  const sampleValues: FactorValue[] = [
    {
      id: "1",
      assetId: "A005930",
      factorId: "PER",
      fiscalPeriodEnd: "2026-03-31",
      dataAvailableAt: "2026-05-15",
      calculatedAt: "2026-05-15T09:00:00Z",
      rawValue: 15.2,
      zScore: 0.5,
      percentile: 70,
      rank: 3,
      universeId: "KOSPI",
      sectorId: "Semiconductors",
      sourceIds: ["KIS"],
      dataStatus: "eod",
      dataQualityScore: 95,
      factorVersion: "1.0",
      engineVersion: "1.0",
    },
    {
      id: "2",
      assetId: "A005930",
      factorId: "PER",
      fiscalPeriodEnd: "2026-03-31",
      dataAvailableAt: "2026-05-15",
      calculatedAt: "2026-05-15T12:00:00Z", // Same dataAvailableAt, newer calculatedAt
      rawValue: 15.3,
      zScore: 0.6,
      percentile: 72,
      rank: 2,
      universeId: "KOSPI",
      sectorId: "Semiconductors",
      sourceIds: ["KIS"],
      dataStatus: "eod",
      dataQualityScore: 95,
      factorVersion: "1.0",
      engineVersion: "1.0",
    },
    {
      id: "3",
      assetId: "A005930",
      factorId: "PER",
      fiscalPeriodEnd: "2026-06-30",
      dataAvailableAt: "2026-08-15", // Future dataAvailableAt
      calculatedAt: "2026-08-15T09:00:00Z",
      rawValue: 16.0,
      zScore: 0.8,
      percentile: 80,
      rank: 1,
      universeId: "KOSPI",
      sectorId: "Semiconductors",
      sourceIds: ["KIS"],
      dataStatus: "eod",
      dataQualityScore: 95,
      factorVersion: "1.0",
      engineVersion: "1.0",
    },
  ];

  it("1. getFactorAsOf은 dataAvailableAt <= asOfDate인 값만 반환한다", () => {
    // Querying at 2026-05-20 should only find values available on or before that
    const result = getFactorAsOf(sampleValues, "A005930", "PER", "2026-05-20");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2"); // Returns the one available by 2026-05-15
  });

  it("2. fiscalPeriodEnd만 과거이고 dataAvailableAt이 미래인 값은 반환하지 않는다", () => {
    // If we query at 2026-07-01, the second fiscal period ended on 2026-06-30 (which is past)
    // but dataAvailableAt is 2026-08-15 (future). So it should NOT return ID 3.
    const result = getFactorAsOf(sampleValues, "A005930", "PER", "2026-07-01");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2"); // Still returns the one available at 2026-05-15
  });

  it("3. 최신 dataAvailableAt이 같은 경우 calculatedAt이 최신인 값을 반환한다", () => {
    // At 2026-05-16, both ID 1 and ID 2 are available. They have the same dataAvailableAt.
    // ID 2 has a newer calculatedAt (12:00:00Z vs 09:00:00Z). It should return ID 2.
    const result = getFactorAsOf(sampleValues, "A005930", "PER", "2026-05-16");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2");
    expect(result!.rawValue).toBe(15.3);
  });

  it("returns null if no factor values match the query parameters", () => {
    const result = getFactorAsOf(sampleValues, "A005930", "PER", "2026-05-01");
    expect(result).toBeNull();
  });
});
