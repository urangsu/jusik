import { Locale } from "./locale";

export type MetricLabel = {
  short: string;
  full: string;
  description: string;
};

export const KO_METRIC_LABELS: Record<string, MetricLabel> = {
  PER: {
    short: "PER",
    full: "PER(주가수익비율)",
    description: "주가가 주당순이익의 몇 배인지 나타내는 지표",
  },
  PBR: {
    short: "PBR",
    full: "PBR(주가순자산비율)",
    description: "주가가 주당순자산의 몇 배인지 나타내는 지표",
  },
  ROE: {
    short: "ROE",
    full: "ROE(자기자본이익률)",
    description: "투입한 자기자본이 얼마의 당기순이익을 냈는지 나타내는 지표",
  },
  DEBT_RATIO: {
    short: "부채비율",
    full: "부채비율(Debt Ratio)",
    description: "타인자본과 자기자본의 관계를 나타내는 비율",
  },
  DIVIDEND_YIELD: {
    short: "배당률",
    full: "배당수익률(Dividend Yield)",
    description: "주가 대비 1주당 배당금의 비율",
  },
  MARKET_CAP: {
    short: "시총",
    full: "시가총액(Market Cap)",
    description: "발행주식수와 현재 주가를 곱한 기업의 총가치",
  },
  VOLUME: {
    short: "거래량",
    full: "거래량(Volume)",
    description: "특정 기간 동안 거래된 주식의 총 수량",
  },
  PRICE: {
    short: "현재가",
    full: "현재가(Price)",
    description: "주식 시장에서 가장 최근에 체결된 거래 가격",
  },
  CHANGE_PERCENT: {
    short: "등락률",
    full: "등락률(Change %)",
    description: "이전 종가 대비 현재 가격의 변동 비율",
  },
};

export const EN_METRIC_LABELS: Record<string, MetricLabel> = {
  PER: {
    short: "PER",
    full: "PER (Price Earnings Ratio)",
    description: "Ratio of stock price to earnings per share.",
  },
  PBR: {
    short: "PBR",
    full: "PBR (Price Book Ratio)",
    description: "Ratio of stock price to book value per share.",
  },
  ROE: {
    short: "ROE",
    full: "ROE (Return on Equity)",
    description: "Measure of financial performance calculated by dividing net income by shareholders' equity.",
  },
  DEBT_RATIO: {
    short: "Debt %",
    full: "Debt to Equity Ratio",
    description: "Financial ratio that measures the extent of a company's leverage.",
  },
  DIVIDEND_YIELD: {
    short: "Div %",
    full: "Dividend Yield",
    description: "Financial ratio that shows how much a company pays out in dividends each year relative to its stock price.",
  },
  MARKET_CAP: {
    short: "Mkt Cap",
    full: "Market Capitalization",
    description: "Total value of a company's shares of stock.",
  },
  VOLUME: {
    short: "Volume",
    full: "Trading Volume",
    description: "Number of shares traded during a given period.",
  },
  PRICE: {
    short: "Price",
    full: "Current Price",
    description: "The most recent trading price of the stock.",
  },
  CHANGE_PERCENT: {
    short: "Change %",
    full: "Change Percentage",
    description: "The percentage change in price compared to the previous close.",
  },
};

export function getMetricLabel(key: string, locale: Locale): MetricLabel {
  const dict = locale === "ko" ? KO_METRIC_LABELS : EN_METRIC_LABELS;
  return dict[key] || { short: key, full: key, description: "" };
}
