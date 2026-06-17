import { DataStatus } from "@/domain/common/data-status";
import { SourceUsagePolicy, SourceWarning } from "@/domain/source/provider-tier";

export type ForwardReturnHorizon = "1w" | "1m" | "3m";

export type ForwardReturnRecord = {
  id: string;
  assetId: string;
  symbol: string;

  signalId: string;
  /** 신호 발생일 (T) — YYYY-MM-DD */
  signalDate: string;
  /** 진입일 (T+1 이후 첫 사용 가능 bar) — YYYY-MM-DD. 반드시 signalDate보다 이후여야 함 */
  entryDate: string;

  horizon: ForwardReturnHorizon;

  /** null = 미래 가격 부족. 절대 0으로 대체하지 않는다. */
  forwardReturn: number | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;

  adjustedForCosts: boolean;

  dataStatus: DataStatus;
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];

  calculatedAt: string;
};

/**
 * Look-ahead bias 방지 계약.
 * entryDate가 signalDate와 같거나 이전이면 throw.
 */
export function assertNoLookAheadBias(record: {
  signalDate: string;
  entryDate: string;
}): void {
  if (record.entryDate <= record.signalDate) {
    throw new Error(
      `[ForwardReturn] look-ahead bias detected: entryDate (${record.entryDate}) must be strictly after signalDate (${record.signalDate})`
    );
  }
}
