import { describe, it, expect } from "vitest";
import { applyTransactionCost, bpsToFraction } from "./transaction-cost-model";
import {
  KRX_KOSPI_COST_CONFIG,
  KRX_KOSDAQ_COST_CONFIG,
  US_COST_CONFIG,
} from "@/domain/backtest/transaction-cost";

describe("applyTransactionCost", () => {
  it("KRX KOSPI buy: commission + slippage only (no tax)", () => {
    const result = applyTransactionCost({ side: "buy", config: KRX_KOSPI_COST_CONFIG });
    expect(result.commission).toBe(1.5);
    expect(result.slippage).toBe(10);
    expect(result.transactionTax).toBe(0);  // 매수 시 없음
    expect(result.agriculturalTax).toBe(0); // 매수 시 없음
  });

  it("KRX KOSPI sell: commission + slippage + transactionTax + agriculturalTax", () => {
    const result = applyTransactionCost({ side: "sell", config: KRX_KOSPI_COST_CONFIG });
    expect(result.commission).toBe(1.5);
    expect(result.slippage).toBe(10);
    expect(result.transactionTax).toBe(5);   // 0.05%
    expect(result.agriculturalTax).toBe(15); // 0.15%
    expect(result.totalBps).toBe(1.5 + 10 + 5 + 15);
  });

  it("KRX KOSDAQ sell: no agricultural tax", () => {
    const result = applyTransactionCost({ side: "sell", config: KRX_KOSDAQ_COST_CONFIG });
    expect(result.agriculturalTax).toBe(0);
    expect(result.transactionTax).toBe(20); // 0.20%
  });

  it("US sell: no transaction or agricultural tax", () => {
    const result = applyTransactionCost({ side: "sell", config: US_COST_CONFIG });
    expect(result.transactionTax).toBe(0);
    expect(result.agriculturalTax).toBe(0);
    expect(result.secFee).toBe(0);
  });

  it("US buy is cheaper than KRX buy", () => {
    const krBuy = applyTransactionCost({ side: "buy", config: KRX_KOSPI_COST_CONFIG });
    const usBuy = applyTransactionCost({ side: "buy", config: US_COST_CONFIG });
    expect(krBuy.totalBps).toBeGreaterThan(usBuy.totalBps);
  });

  it("bpsToFraction converts correctly", () => {
    expect(bpsToFraction(100)).toBe(0.01);   // 1%
    expect(bpsToFraction(10)).toBe(0.001);   // 0.1%
    expect(bpsToFraction(1.5)).toBeCloseTo(0.00015, 6); // 0.015%
  });

  it("sell total cost is higher than buy cost for KRX", () => {
    const buy = applyTransactionCost({ side: "buy", config: KRX_KOSPI_COST_CONFIG });
    const sell = applyTransactionCost({ side: "sell", config: KRX_KOSPI_COST_CONFIG });
    expect(sell.totalBps).toBeGreaterThan(buy.totalBps);
  });
});
