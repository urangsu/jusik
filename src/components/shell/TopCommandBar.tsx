"use client";

import React from "react";
import { AssetSearchBox } from "../search/AssetSearchBox";
import { Asset } from "@/domain/market/asset";
import { useI18n } from "@/i18n/use-i18n";
import { LocaleToggle } from "../settings/LocaleToggle";
import { AppPreferencesButton } from "../settings/AppPreferencesButton";
import { Activity } from "lucide-react";

interface TopCommandBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  activeTab,
  onTabChange,
  onSelectAsset,
}) => {
  const { locale } = useI18n();

  const tabs = [
    { id: "markets", label: locale === "ko" ? "시장 보드" : "Markets" },
    { id: "terminal", label: locale === "ko" ? "터미널" : "Terminal" },
    { id: "financials", label: locale === "ko" ? "재무분석" : "Financials" },
    { id: "strategy", label: locale === "ko" ? "전략 점수" : "Strategy" },
    { id: "backtest", label: locale === "ko" ? "백테스트" : "Backtest" },
    { id: "alerts", label: locale === "ko" ? "알림 설정" : "Alerts" },
    { id: "portfolio", label: locale === "ko" ? "포트폴리오" : "Portfolio" },
    { id: "research", label: locale === "ko" ? "리서치" : "Research" },
    { id: "ai", label: locale === "ko" ? "AI 분석" : "AI" },
  ];

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-kt-bg-overlay-300/40 backdrop-blur-md border-b border-kt-border-panel sticky top-0 z-40 max-lg:flex-wrap max-sm:px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Activity className="w-5 h-5 text-kt-positive-text flex-shrink-0" />
        <span className="text-md font-bold tracking-tight text-kt-text-primary tabular-nums">
          K-Terminal
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs max-lg:order-3 max-lg:max-w-none max-lg:basis-full">
        <AssetSearchBox onSelectAsset={onSelectAsset} />
      </div>

      {/* Nav tabs */}
      <nav
        className="flex items-center gap-1 overflow-x-auto bg-kt-bg-surface-100 p-0.5 rounded-kt-pill border border-kt-border-panel"
        aria-label={locale === "ko" ? "주요 메뉴" : "Main navigation"}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`whitespace-nowrap px-3 py-1 text-xs font-medium rounded-kt-pill transition-colors cursor-pointer ${
                isActive
                  ? "bg-kt-bg-body text-kt-text-primary border border-kt-border-panel"
                  : "text-kt-text-secondary hover:text-kt-text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right controls: Locale toggle + Preferences */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LocaleToggle />
        <AppPreferencesButton />
      </div>
    </header>
  );
};
