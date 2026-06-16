export type UniverseId =
  | "KR_KOSPI200"
  | "KR_KOSDAQ150"
  | "KR_LARGE_CAP"
  | "US_SP500"
  | "US_NASDAQ100"
  | "US_LARGE_CAP"
  | "USER_WATCHLIST"
  | "SEED_DEMO";

export type UniverseKind =
  | "official_index"
  | "rule_based"
  | "user_defined"
  | "seed_demo";

export type UniverseMarket = "KR" | "US" | "MIXED";

export type Universe = {
  universeId: UniverseId;
  market: UniverseMarket;
  kind: UniverseKind;
  displayName: string;
  description: string;
  productionEligible: boolean;
  createdAt: string;
  updatedAt: string;
};

export function createSeedDemoUniverse(timestamp: string): Universe {
  return {
    universeId: "SEED_DEMO",
    market: "MIXED",
    kind: "seed_demo",
    displayName: "데모 유니버스",
    description: "API 연결 전 UI와 계약 검증에만 사용하는 샘플 데이터입니다.",
    productionEligible: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isProductionEligibleUniverse(universe: Universe): boolean {
  return universe.productionEligible && universe.kind !== "seed_demo" && universe.market !== "MIXED";
}
