import { CountryCode, CurrencyCode, ExchangeCode, Market } from "./exchange";

export type AssetType =
  | "common_stock"
  | "preferred_stock"
  | "etf"
  | "etn"
  | "adr"
  | "index"
  | "cash"
  | "unknown";

export type AssetIdentity = {
  assetId: string;
  market: Market;
  symbol: string;
  exchange: ExchangeCode;
  assetType: AssetType;
  nameKo?: string;
  nameEn?: string;
  currency: CurrencyCode;
  country: CountryCode;
  isin?: string;
  cik?: string;
  figi?: string;
  isActive: boolean;
  listedAt?: string;
  delistedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function hasMatchingAssetPrefix(asset: Pick<AssetIdentity, "assetId" | "market">): boolean {
  return asset.assetId.startsWith(`${asset.market}:`);
}
