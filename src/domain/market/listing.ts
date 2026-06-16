import { AssetIdentity } from "./asset-identity";
import { ExchangeCode } from "./exchange";

export type Listing = {
  assetId: AssetIdentity["assetId"];
  symbol: string;
  exchange: ExchangeCode;
  listedAt: string;
  delistedAt: string | null;
  isPrimary: boolean;
};
