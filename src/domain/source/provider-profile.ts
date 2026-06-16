import { SourceUsagePolicy } from "./provider-tier";

export type ProviderCapability =
  | "asset_search"
  | "quote"
  | "ohlcv"
  | "financials"
  | "filings"
  | "dividends"
  | "news"
  | "macro"
  | "flows"
  | "short_selling"
  | "index_constituents"
  | "market_map";

export type ProviderProfile = {
  id: string;
  displayName: string;
  tier: SourceUsagePolicy;
  markets: Array<"KR" | "US">;
  capabilities: ProviderCapability[];

  requiresApiKey: boolean;
  isOfficialSource: boolean;
  isUnofficial: boolean;

  freeLimitLabel: string;
  licenseRisk: "low" | "medium" | "high";
  commercialUseAllowed: "yes" | "no" | "unknown";

  priority: number;
  enabledByDefault: boolean;
};

export const PROVIDERS: ProviderProfile[] = [
  {
    id: "opendart",
    displayName: "OpenDART",
    tier: "official",
    markets: ["KR"],
    capabilities: ["filings", "financials", "dividends"],
    requiresApiKey: true,
    isOfficialSource: true,
    isUnofficial: false,
    freeLimitLabel: "official limit, verify on setup",
    licenseRisk: "low",
    commercialUseAllowed: "unknown",
    priority: 10,
    enabledByDefault: true,
  },
  {
    id: "sec_edgar",
    displayName: "SEC EDGAR",
    tier: "official",
    markets: ["US"],
    capabilities: ["filings", "financials"],
    requiresApiKey: false,
    isOfficialSource: true,
    isUnofficial: false,
    freeLimitLabel: "no API key, polite rate limit required",
    licenseRisk: "low",
    commercialUseAllowed: "unknown",
    priority: 10,
    enabledByDefault: true,
  },
  {
    id: "fmp_free",
    displayName: "Financial Modeling Prep Free",
    tier: "free_limited",
    markets: ["US"],
    capabilities: ["asset_search", "quote", "ohlcv", "financials", "dividends", "news"],
    requiresApiKey: true,
    isOfficialSource: false,
    isUnofficial: false,
    freeLimitLabel: "250 calls/day",
    licenseRisk: "medium",
    commercialUseAllowed: "unknown",
    priority: 30,
    enabledByDefault: true,
  },
  {
    id: "finnhub_free",
    displayName: "Finnhub Free",
    tier: "free_limited",
    markets: ["US"],
    capabilities: ["quote", "news", "asset_search"],
    requiresApiKey: true,
    isOfficialSource: false,
    isUnofficial: false,
    freeLimitLabel: "60 calls/minute",
    licenseRisk: "medium",
    commercialUseAllowed: "unknown",
    priority: 40,
    enabledByDefault: false,
  },
  {
    id: "alpha_vantage_free",
    displayName: "Alpha Vantage Free",
    tier: "free_limited",
    markets: ["US"],
    capabilities: ["quote", "ohlcv", "macro"],
    requiresApiKey: true,
    isOfficialSource: false,
    isUnofficial: false,
    freeLimitLabel: "25 requests/day",
    licenseRisk: "medium",
    commercialUseAllowed: "unknown",
    priority: 50,
    enabledByDefault: false,
  },
  {
    id: "yfinance_personal",
    displayName: "Yahoo Finance via yfinance",
    tier: "personal_fallback",
    markets: ["KR", "US"],
    capabilities: ["quote", "ohlcv", "financials", "dividends"],
    requiresApiKey: false,
    isOfficialSource: false,
    isUnofficial: true,
    freeLimitLabel: "unofficial, personal research only",
    licenseRisk: "high",
    commercialUseAllowed: "no",
    priority: 80,
    enabledByDefault: false,
  },
  {
    id: "stooq_personal",
    displayName: "Stooq",
    tier: "personal_fallback",
    markets: ["US"],
    capabilities: ["ohlcv"],
    requiresApiKey: false,
    isOfficialSource: false,
    isUnofficial: true,
    freeLimitLabel: "personal use only",
    licenseRisk: "high",
    commercialUseAllowed: "no",
    priority: 90,
    enabledByDefault: false,
  }
];
