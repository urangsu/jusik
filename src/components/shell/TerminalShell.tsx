"use client";

import React, { useState, useEffect } from "react";
import { TopCommandBar } from "./TopCommandBar";
import { MarketStrip } from "./MarketStrip";
import { LeftRail } from "./LeftRail";
import { RightRail } from "./RightRail";
import { BottomStatusBar } from "./BottomStatusBar";
import { StrategyWorkspace } from "../strategy/StrategyWorkspace";
import { AlertSettingsPage } from "../alerts/AlertSettingsPage";
import { BacktestWorkspace } from "../backtest/BacktestWorkspace";
import { ReliabilityWorkspace } from "../reliability/ReliabilityWorkspace";
import { ProviderApiSettingsPanel } from "../settings/ProviderApiSettingsPanel";
import { ResearchWorkspace } from "../research/ResearchWorkspace";
import { WatchlistPage } from "../watchlist/WatchlistPage";
import { AssetOverview } from "../asset/AssetOverview";
import { AssetChart } from "../asset/AssetChart";
import { AssetFinancialSnapshot } from "../asset/AssetFinancialSnapshot";
import { AssetFilings } from "../asset/AssetFilings";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { Asset } from "@/domain/market/asset";
import { useI18n } from "@/i18n/use-i18n";
import { getMetricLabel } from "@/i18n/metric-labels";
import { AreaChart, TrendingUp, BarChart3, Newspaper, Info } from "lucide-react";

export const TerminalShell: React.FC = () => {
  const { t, tSector, locale } = useI18n();
  const [activeTab, setActiveTab] = useState("markets");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>({
    id: "KR:005930",
    region: "KR",
    symbol: "005930",
    exchange: "KOSPI",
    nameKo: "삼성전자",
    nameEn: "Samsung Electronics",
    currency: "KRW",
    sector: "정보기술",
    industry: "반도체 및 반도체 장비",
  });

  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [unreadWatchlistReportsCount, setUnreadWatchlistReportsCount] = useState(0);
  const [watchlistCriticalCount, setWatchlistCriticalCount] = useState(0);
  const [watchlistWarningCount, setWatchlistWarningCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/alerts/events?unreadOnly=true&limit=100");
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data.value) ? data.value.length : 0;
        setUnreadAlertsCount(count);
      }
    } catch {
      // Ignore
    }
  };

  const fetchUnreadWatchlistCount = async () => {
    try {
      const res = await fetch("/api/watchlist/reports/unread-count");
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          setUnreadWatchlistReportsCount(data.value.unreadCount || 0);
          setWatchlistCriticalCount(data.value.criticalCount || 0);
          setWatchlistWarningCount(data.value.warningCount || 0);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fetchUnreadCount();
      fetchUnreadWatchlistCount();
    };

    refresh();

    const interval = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const perLabel = getMetricLabel("PER", locale).full;
  const pbrLabel = getMetricLabel("PBR", locale).full;
  const roeLabel = getMetricLabel("ROE", locale).full;
  const debtLabel = getMetricLabel("DEBT_RATIO", locale).full;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-kt-bg-body text-kt-text-primary">
      {/* Top Bar */}
      <TopCommandBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectAsset={handleSelectAsset}
        unreadAlertsCount={unreadAlertsCount}
        unreadWatchlistReportsCount={unreadWatchlistReportsCount}
        watchlistCriticalCount={watchlistCriticalCount}
        watchlistWarningCount={watchlistWarningCount}
      />

      {/* Market Indices Strip */}
      <MarketStrip />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden max-lg:flex-col">
        {/* Left Rail */}
        <LeftRail onSelectAsset={handleSelectAsset} />

        {/* Central Dashboard */}
        <main className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
          {activeTab === "strategy" ? (
            <StrategyWorkspace selectedAsset={selectedAsset} />
          ) : activeTab === "research" ? (
            <ResearchWorkspace
              assetId={selectedAsset ? selectedAsset.id.replace(/:/g, "_") : null}
              universeId={
                selectedAsset
                  ? selectedAsset.exchange === "KOSPI" || selectedAsset.exchange === "KOSDAQ"
                    ? "KOSPI_SAMPLE"
                    : "SP500_SAMPLE"
                  : null
              }
            />
          ) : activeTab === "alerts" ? (
            <AlertSettingsPage />
          ) : activeTab === "backtest" ? (
            <BacktestWorkspace />
          ) : activeTab === "reliability" ? (
            <ReliabilityWorkspace />
          ) : activeTab === "settings" ? (
            <ProviderApiSettingsPanel />
          ) : activeTab === "watchlist" ? (
            <WatchlistPage onRefreshUnreadCount={fetchUnreadWatchlistCount} />
          ) : (
            <>
              {/* Active Asset Info Block */}
              {selectedAsset && <AssetOverview selectedAsset={selectedAsset} />}

              {/* Upper row: Chart Frame */}
              {selectedAsset && <AssetChart selectedAsset={selectedAsset} />}

              {/* Lower row: Financials & News */}
              <div className="flex-1 grid grid-cols-2 gap-4 min-h-[300px] max-xl:grid-cols-1">
                {selectedAsset && <AssetFinancialSnapshot selectedAsset={selectedAsset} />}
                {selectedAsset && <AssetFilings selectedAsset={selectedAsset} />}
              </div>
            </>
          )}
        </main>

        {/* Right Rail */}
        <RightRail selectedAsset={selectedAsset} />
      </div>

      {/* Diagnostics Status Bar */}
      <BottomStatusBar status="api_required" />
    </div>
  );
};
