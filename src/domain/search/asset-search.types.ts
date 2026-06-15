import { Asset } from "../market/asset";

export type SearchableAsset = Asset & {
  choseongNameKo?: string;
  normalizedSymbol: string;
};
