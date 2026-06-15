"use client";

import React, { useState, useEffect, useRef } from "react";
import { Asset } from "@/domain/market/asset";
import { normalizeAsset, matchAsset } from "@/domain/search/asset-search.normalizer";
import { SearchableAsset } from "@/domain/search/asset-search.types";
import { CommandInput } from "../ui/CommandInput";

const SEED_ASSETS: Asset[] = [
  {
    id: "KR:005930",
    region: "KR",
    symbol: "005930",
    exchange: "KOSPI",
    nameKo: "삼성전자",
    nameEn: "Samsung Electronics",
    currency: "KRW",
    sector: "정보기술",
    industry: "반도체 및 반도체 장비",
    identifiers: { dartCorpCode: "00126380", isin: "KR7005930003" },
  },
  {
    id: "US:AAPL",
    region: "US",
    symbol: "AAPL",
    exchange: "NASDAQ",
    nameKo: "애플",
    nameEn: "Apple",
    currency: "USD",
    sector: "Information Technology",
    industry: "Technology Hardware, Storage & Peripherals",
    identifiers: { secCik: "0000320193" },
  },
  {
    id: "KR:000660",
    region: "KR",
    symbol: "000660",
    exchange: "KOSPI",
    nameKo: "SK하이닉스",
    nameEn: "SK Hynix",
    currency: "KRW",
    sector: "정보기술",
    industry: "반도체 및 반도체 장비",
  },
  {
    id: "US:TSLA",
    region: "US",
    symbol: "TSLA",
    exchange: "NASDAQ",
    nameKo: "테슬라",
    nameEn: "Tesla",
    currency: "USD",
    sector: "Consumer Discretionary",
    industry: "Automobile Components",
  },
  {
    id: "US:MSFT",
    region: "US",
    symbol: "MSFT",
    exchange: "NASDAQ",
    nameKo: "마이크로소프트",
    nameEn: "Microsoft",
    currency: "USD",
    sector: "Information Technology",
    industry: "Software",
  },
  {
    id: "KR:035420",
    region: "KR",
    symbol: "035420",
    exchange: "KOSPI",
    nameKo: "네이버",
    nameEn: "NAVER",
    currency: "KRW",
    sector: "커뮤니케이션 서비스",
    industry: "인터넷 소프트웨어 및 서비스",
  }
];

const SEARCHABLE_SEEDS: SearchableAsset[] = SEED_ASSETS.map(normalizeAsset);

interface AssetSearchBoxProps {
  onSelectAsset: (asset: Asset) => void;
  placeholder?: string;
  className?: string;
}

export const AssetSearchBox: React.FC<AssetSearchBoxProps> = ({
  onSelectAsset,
  placeholder = "종목명, 티커(Symbol) 검색 (초성 검색 지원)...",
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute results synchronously during render to avoid cascading renders
  const results = query
    ? SEARCHABLE_SEEDS.filter((asset) => matchAsset(asset, query))
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (asset: SearchableAsset) => {
    // strip out search helpers and trigger callback
    const cleanAsset: Asset = {
      id: asset.id,
      region: asset.region,
      symbol: asset.symbol,
      exchange: asset.exchange,
      nameKo: asset.nameKo,
      nameEn: asset.nameEn,
      currency: asset.currency,
      sector: asset.sector,
      industry: asset.industry,
      identifiers: asset.identifiers,
    };
    
    onSelectAsset(cleanAsset);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <CommandInput
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onSearch={(val) => {
          setQuery(val);
          setIsOpen(true);
        }}
      />

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-card overflow-hidden z-50 max-h-60 overflow-y-auto">
          {results.map((asset) => (
            <button
              key={asset.id}
              onClick={() => handleSelect(asset)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-kt-bg-body hover:text-kt-text-primary text-kt-text-secondary border-b border-kt-border-panel/40 last:border-b-0 cursor-pointer flex justify-between items-center transition-colors"
            >
              <div>
                <span className="font-semibold text-kt-text-primary mr-2">{asset.symbol}</span>
                <span>{asset.nameKo || asset.nameEn}</span>
              </div>
              <span className="text-xs text-kt-text-muted bg-kt-bg-surface-100 px-2 py-0.5 rounded border border-kt-border-panel">
                {asset.exchange} · {asset.region}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-card p-4 text-center text-sm text-kt-text-muted z-50">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
};
export { SEED_ASSETS };
