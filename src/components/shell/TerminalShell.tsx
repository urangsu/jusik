"use client";

import React, { useState } from "react";
import { TopCommandBar } from "./TopCommandBar";
import { MarketStrip } from "./MarketStrip";
import { LeftRail } from "./LeftRail";
import { RightRail } from "./RightRail";
import { BottomStatusBar } from "./BottomStatusBar";
import { StrategyWorkspace } from "../strategy/StrategyWorkspace";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { Asset } from "@/domain/market/asset";
import { AreaChart, TrendingUp, BarChart3, Newspaper, Info } from "lucide-react";

export const TerminalShell: React.FC = () => {
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
                        {selectedAsset.nameKo || selectedAsset.nameEn}
                      </span>
                      <span className="text-[10px] text-kt-text-muted border border-kt-border-panel px-1.5 py-0.5 rounded uppercase">
                        {selectedAsset.exchange} · {selectedAsset.region}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-kt-text-muted">현재가</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-kt-text-muted">전일대비</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                    </div>
                  </div>
                  {selectedAsset.sector && (
                    <div className="text-xs text-kt-text-muted">
                      섹터: {selectedAsset.sector} | 산업: {selectedAsset.industry || "N/A"}
                    </div>
                  )}
                </div>
              )}

              {/* Upper row: Chart Frame */}
              <div className="h-72 flex-shrink-0">
                <Panel
                  title="시세 차트 (Chart Frame)"
                  headerAction={<TrendingUp className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="w-full h-full border border-dashed border-kt-border-panel/60 rounded-kt-card flex flex-col items-center justify-center p-6 bg-kt-bg-overlay-300/20 text-center gap-3">
                    <AreaChart className="w-8 h-8 text-kt-text-muted opacity-40" />
                    <span className="text-xs font-semibold text-kt-text-secondary">실시간 차트 프레임 (대기 중)</span>
                    <p className="text-[11px] text-kt-text-muted max-w-sm leading-normal">
                      상승(빨강)/하락(파랑)의 시맨틱 토큰 기반의 시세 데이터 수신을 준비하고 있습니다.
                    </p>
                    <MetricCell value={null} status="api_required" />
                  </div>
                </Panel>
              </div>

              {/* Lower row: Financials & News */}
              <div className="flex-1 grid grid-cols-2 gap-4 min-h-[300px] max-xl:grid-cols-1">
                {/* Financial Snapshot */}
                <Panel
                  title="재무 및 밸류에이션 (Financial Snapshot)"
                  headerAction={<BarChart3 className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="flex flex-col gap-2.5 h-full">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">PER (주가수익비율)</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">PBR (주가순자산비율)</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">ROE (자기자본이익률)</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                      <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
                        <span className="text-xs text-kt-text-secondary">부채비율</span>
                        <MetricCell value={null} status="api_required" />
                      </div>
                    </div>

                    <div className="border border-kt-border-panel rounded-kt-card p-3 bg-kt-bg-overlay-300/20 flex items-start gap-2 mt-auto">
                      <Info className="w-4 h-4 text-kt-text-muted flex-shrink-0 mt-0.5" />
                      <span className="text-[10px] text-kt-text-muted leading-relaxed">
                        기업의 DART(한국) / SEC EDGAR(미국) 공시 보고서를 수집해 매핑하기 위한 재무 모델 데이터 스키마가 완비되어 있습니다. API 연결 후 분석 지표가 활성화됩니다.
                      </span>
                    </div>
                  </div>
                </Panel>

                {/* News Feed */}
                <Panel
                  title="실시간 뉴스 (News Feed)"
                  headerAction={<Newspaper className="w-4 h-4 text-kt-text-muted" />}
                >
                  <div className="w-full h-full border border-dashed border-kt-border-panel/40 rounded-kt-card flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Newspaper className="w-6 h-6 text-kt-text-muted opacity-40" />
                    <span className="text-xs text-kt-text-muted">실시간 금융 뉴스 헤드라인 대기 중</span>
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
