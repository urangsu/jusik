"use client";

import React from "react";
import { AssetSearchBox } from "../search/AssetSearchBox";
import { Asset } from "@/domain/market/asset";
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
  const tabs = [
    { id: "markets", label: "Markets" },
    { id: "terminal", label: "Terminal" },
    { id: "financials", label: "Financials" },
    { id: "strategy", label: "Strategy" },
    { id: "portfolio", label: "Portfolio" },
    { id: "research", label: "Research" },
    { id: "ai", label: "AI" },
  ];

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 bg-kt-bg-overlay-300/40 backdrop-blur-md border-b border-kt-border-panel sticky top-0 z-40 max-lg:flex-wrap max-sm:px-3">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-kt-positive-text flex-shrink-0" />
        <span className="text-md font-bold tracking-tight text-kt-text-primary tabular-nums">K-Terminal</span>
      </div>

      <div className="flex-1 max-w-sm max-lg:order-3 max-lg:max-w-none max-lg:basis-full">
        <AssetSearchBox onSelectAsset={onSelectAsset} />
      </div>

      <nav className="flex items-center gap-1.5 overflow-x-auto bg-kt-bg-surface-100 p-1 rounded-kt-pill border border-kt-border-panel">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
    </header>
  );
};
