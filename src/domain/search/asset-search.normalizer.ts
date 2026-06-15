import { Asset } from "../market/asset";
import { SearchableAsset } from "./asset-search.types";

const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];

// Robust local fallback for Choseong (initial sound) extraction
export function getChoseong(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11172) {
      result += CHOSEONG[Math.floor(code / 588)];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

export function normalizeAsset(asset: Asset): SearchableAsset {
  return {
    ...asset,
    choseongNameKo: asset.nameKo ? getChoseong(asset.nameKo) : undefined,
    normalizedSymbol: asset.symbol.toLowerCase(),
  };
}

export function matchAsset(searchable: SearchableAsset, query: string): boolean {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return false;

  // 1. Symbol/Ticker Match
  if (searchable.normalizedSymbol.includes(cleanQuery)) {
    return true;
  }

  // 2. English Name Match
  if (searchable.nameEn && searchable.nameEn.toLowerCase().includes(cleanQuery)) {
    return true;
  }

  // 3. Korean Name Match
  if (searchable.nameKo && searchable.nameKo.toLowerCase().includes(cleanQuery)) {
    return true;
  }

  // 4. Choseong Match
  if (searchable.choseongNameKo && searchable.choseongNameKo.includes(cleanQuery)) {
    return true;
  }

  return false;
}
