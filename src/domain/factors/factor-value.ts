import { DataStatus } from "@/domain/common/data-status";

export type FactorValue = {
  id: string;
  assetId: string;
  factorId: string;

  fiscalPeriodEnd: string | null;
  dataAvailableAt: string;
  calculatedAt: string;

  rawValue: number | null;
  zScore: number | null;
  percentile: number | null;
  rank: number | null;

  universeId: string;
  sectorId: string | null;

  sourceIds: string[];
  dataStatus: DataStatus;
  dataQualityScore: number;

  factorVersion: string;
  engineVersion: string;
};

export function getFactorAsOf(
  values: FactorValue[],
  assetId: string,
  factorId: string,
  asOfDate: string
): FactorValue | null {
  const filtered = values.filter(
    (v) =>
      v.assetId === assetId &&
      v.factorId === factorId &&
      v.dataAvailableAt <= asOfDate
  );

  if (filtered.length === 0) return null;

  filtered.sort((a, b) => {
    if (a.dataAvailableAt !== b.dataAvailableAt) {
      return b.dataAvailableAt.localeCompare(a.dataAvailableAt);
    }
    return b.calculatedAt.localeCompare(a.calculatedAt);
  });

  return filtered[0];
}
