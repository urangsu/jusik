export type PortfolioPosition = {
  assetId: string;
  symbol: string;

  /** 포트폴리오 내 비중 (0~1, equal-weight) */
  weight: number;

  /** 진입일 (T+1 이후 첫 bar) — YYYY-MM-DD */
  entryDate: string;
  /** null = 해당 날짜 bar 없음 */
  entryPrice: number | null;

  /** 청산일 — YYYY-MM-DD */
  exitDate: string | null;
  /** null = 해당 날짜 bar 없음 */
  exitPrice: number | null;

  /** 비용 차감 전 수익률 */
  grossReturn: number | null;
  /** 비용 차감 후 수익률 */
  netReturn: number | null;

  /** 진입 시 총 비용 (수수료 + 슬리피지, notional 대비) */
  entryCostBps: number;
  /** 청산 시 총 비용 (수수료 + 슬리피지 + 세금, notional 대비) */
  exitCostBps: number;

  /** 이 포지션의 근거가 된 신호 ID 목록 */
  sourceSignalIds: string[];
};
