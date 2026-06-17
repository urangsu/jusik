export type TradingVenue = "KRX_KOSPI" | "KRX_KOSDAQ" | "US";

export type MarketCostConfig = {
  venue: TradingVenue;
  /** 위탁 수수료 (매수/매도 양쪽). 단위: bps (1bps = 0.01%) */
  commissionBps: number;
  /** 증권거래세 (매도 시만). KRX_KOSPI=5, KRX_KOSDAQ=20. 단위: bps */
  transactionTaxBps: number;
  /** 농어촌특별세 (매도 시만). KRX_KOSPI=15. 단위: bps */
  agriculturalTaxBps: number;
  /** SEC Fee (US 매도 시만). 현재는 0으로 설정. 단위: bps */
  secFeeBps?: number;
  /** 슬리피지 (매수/매도 양쪽). 단위: bps */
  slippageBps: number;
};

/** KOSPI 비용 모델 (2024년 기준) */
export const KRX_KOSPI_COST_CONFIG: MarketCostConfig = {
  venue: "KRX_KOSPI",
  commissionBps: 1.5,       // 0.015%
  transactionTaxBps: 5,     // 0.05% (2024.1 인하)
  agriculturalTaxBps: 15,   // 0.15%
  slippageBps: 10,          // 0.10%
};

/** KOSDAQ 비용 모델 (2024년 기준) */
export const KRX_KOSDAQ_COST_CONFIG: MarketCostConfig = {
  venue: "KRX_KOSDAQ",
  commissionBps: 1.5,
  transactionTaxBps: 20,    // 0.20%
  agriculturalTaxBps: 0,    // 코스닥은 농특세 없음
  slippageBps: 10,
};

/** US 비용 모델 */
export const US_COST_CONFIG: MarketCostConfig = {
  venue: "US",
  commissionBps: 1.0,
  transactionTaxBps: 0,
  agriculturalTaxBps: 0,
  secFeeBps: 0,             // P0: 0으로 처리, 추후 실제 요율 반영
  slippageBps: 5,
};

/**
 * universeId로 기본 비용 config를 반환한다.
 * KOSPI_SAMPLE → KRX_KOSPI, SP500_SAMPLE → US
 */
export function getCostConfigForUniverse(
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"
): MarketCostConfig {
  return universeId === "KOSPI_SAMPLE" ? KRX_KOSPI_COST_CONFIG : US_COST_CONFIG;
}
