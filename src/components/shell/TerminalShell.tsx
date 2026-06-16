"use client";

import React, { useState } from "react";
import { TopCommandBar } from "./TopCommandBar";
import { MarketStrip } from "./MarketStrip";
import { LeftRail } from "./LeftRail";
import { RightRail } from "./RightRail";
import { BottomStatusBar } from "./BottomStatusBar";
import { StrategyWorkspace } from "../strategy/StrategyWorkspace";
import { AlertSettingsPage } from "../alerts/AlertSettingsPage";
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
          ) : activeTab === "alerts" ? (
            <AlertSettingsPage />
          ) : (
            <>
              {/* Active Asset Info Block */}
              {selectedAsset && (
                <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-1.5 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold text-kt-text-primary tabular-nums">
                        {selectedAsset.symbol}
                      </span>
                      <span className="text-sm text-kt-text-secondary">
                        {locale === "ko" ? (selectedAsset.nameKo || selectedAsset.nameEn) : (selectedAsset.nameEn || selectedAsset.nameKo)}
                      </span>
                      <span className="text-[10px] text-kt-text-muted border border-kt-border-panel px-1.5 py-0.5 rounded uppercase">
                        {selectedAsset.exchange} · {selectedAsset.region}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-kt-text-muted">{t("currentPrice")}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-kt-text-muted">{t("prevCloseChange")}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                    </div>
                  </div>
                  {selectedAsset.sector && (
                    <div className="text-xs text-kt-text-muted">
                      {t("sector")}: {tSector(selectedAsset.sector)} | {t("industry")}: {selectedAsset.industry || "N/A"}
                    </div>
                  )}
                </div>
              )}

              {/* Upper row: Chart Frame */}
              <div className="h-72 flex-shrink-0">
                <Panel
                  title={t("chartFrameTitle")}
                  headerAction={<TrendingUp className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="w-full h-full border border-dashed border-kt-border-panel/60 rounded-kt-card flex flex-col items-center justify-center p-6 bg-kt-bg-overlay-300/20 text-center gap-3">
                    <AreaChart className="w-8 h-8 text-kt-text-muted opacity-40" />
                    <span className="text-xs font-semibold text-kt-text-secondary">{t("chartFrameMuted")}</span>
                    <p className="text-[11px] text-kt-text-muted max-w-sm leading-normal">
                      {t("chartFrameMutedDesc")}
                    </p>
                    <MetricCell value={null} status="api_required" />
                  </div>
                </Panel>
              </div>

              {/* Lower row: Financials & News */}
              <div className="flex-1 grid grid-cols-2 gap-4 min-h-[300px] max-xl:grid-cols-1">
                {/* Financial Snapshot */}
                <Panel
                  title={t("financialSnapshotTitle")}
                  headerAction={<BarChart3 className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="flex flex-col gap-2.5 h-full">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">{perLabel}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">{pbrLabel}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">{roeLabel}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">{debtLabel}</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                    </div>

                    <div className="border border-kt-border-panel rounded-kt-card p-3 bg-kt-bg-overlay-300/20 flex items-start gap-2 mt-auto">
                      <Info className="w-4 h-4 text-kt-text-muted flex-shrink-0 mt-0.5" />
                      <span className="text-[10px] text-kt-text-muted leading-relaxed">
                        {t("financialInfoDisclaimer")}
                      </span>
                    </div>
                  </div>
                </Panel>

                {/* News Feed */}
                <Panel
                  title={t("newsFeedTitle")}
                  headerAction={<Newspaper className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="w-full h-full border border-dashed border-kt-border-panel/40 rounded-kt-card flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Newspaper className="w-6 h-6 text-kt-text-muted opacity-40" />
                    <span className="text-xs text-kt-text-muted">{t("newsFeedMuted")}</span>
                    <MetricCell value={null} status="api_required" />
                  </div>
                </Panel>
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
