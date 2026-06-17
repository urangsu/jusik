import { MarketCostConfig } from "@/domain/backtest/transaction-cost";

export type CostBreakdown = {
  commission: number;
  transactionTax: number;
  agriculturalTax: number;
  secFee: number;
  slippage: number;
  totalBps: number;
};

/**
 * 매수/매도 거래에 비용을 적용한다.
 * 
 * 규칙:
 * - commission: 매수/매도 양쪽
 * - slippage: 매수/매도 양쪽
 * - transactionTax: 매도 시만
 * - agriculturalTax: 매도 시만
 * - secFee: 매도 시만 (US, P0에서 0)
 */
export function applyTransactionCost(params: {
  side: "buy" | "sell";
  config: MarketCostConfig;
}): CostBreakdown {
  const { side, config } = params;
  const isSell = side === "sell";

  const commission = config.commissionBps;
  const slippage = config.slippageBps;
  const transactionTax = isSell ? config.transactionTaxBps : 0;
  const agriculturalTax = isSell ? config.agriculturalTaxBps : 0;
  const secFee = isSell ? (config.secFeeBps ?? 0) : 0;

  const totalBps = commission + slippage + transactionTax + agriculturalTax + secFee;

  return {
    commission,
    transactionTax,
    agriculturalTax,
    secFee,
    slippage,
    totalBps,
  };
}

/**
 * bps를 소수(fraction)로 변환한다.
 * 1bps = 0.0001
 */
export function bpsToFraction(bps: number): number {
  return bps / 10_000;
}
