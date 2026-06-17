import { describe, it, expect } from "vitest";
import {
  KRX_KOSPI_COST_CONFIG,
  KRX_KOSDAQ_COST_CONFIG,
  US_COST_CONFIG,
  getCostConfigForUniverse,
} from "./transaction-cost";

describe("Transaction Cost Configs", () => {
  it("KRX_KOSPI has transaction tax and agricultural tax", () => {
    expect(KRX_KOSPI_COST_CONFIG.transactionTaxBps).toBeGreaterThan(0);
    expect(KRX_KOSPI_COST_CONFIG.agriculturalTaxBps).toBeGreaterThan(0);
  });

  it("KRX_KOSDAQ has transaction tax but no agricultural tax", () => {
    expect(KRX_KOSDAQ_COST_CONFIG.transactionTaxBps).toBeGreaterThan(0);
    expect(KRX_KOSDAQ_COST_CONFIG.agriculturalTaxBps).toBe(0);
  });

  it("US has no transaction tax or agricultural tax", () => {
    expect(US_COST_CONFIG.transactionTaxBps).toBe(0);
    expect(US_COST_CONFIG.agriculturalTaxBps).toBe(0);
  });

  it("getCostConfigForUniverse returns KRX_KOSPI for KOSPI_SAMPLE", () => {
    const config = getCostConfigForUniverse("KOSPI_SAMPLE");
    expect(config.venue).toBe("KRX_KOSPI");
  });

  it("getCostConfigForUniverse returns US for SP500_SAMPLE", () => {
    const config = getCostConfigForUniverse("SP500_SAMPLE");
    expect(config.venue).toBe("US");
  });

  it("KOSPI slippage should be higher than US", () => {
    expect(KRX_KOSPI_COST_CONFIG.slippageBps).toBeGreaterThan(US_COST_CONFIG.slippageBps);
  });
});
