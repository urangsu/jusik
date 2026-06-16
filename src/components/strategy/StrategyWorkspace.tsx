import React, { useState } from "react";
import { Asset } from "@/domain/market/asset";
import { calculateStrategyAgreementSignal } from "@/domain/strategy/calculate-strategy-agreement-signal";
import { StrategyAgreementSignal } from "@/domain/strategy/strategy-agreement-signal";
import { StdDevSignal } from "@/domain/strategy/stddev-signal";
import { StrategyViewScore } from "@/domain/strategy/strategy-view";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";
import { StrategyAgreementTab } from "./StrategyAgreementTab";
import { StdDevTradingTab } from "./StdDevTradingTab";

const STRATEGY_TABS = [
  { id: "stddev", label: "표준편차 매매" },
  { id: "regime", label: "레짐-우선 뷰" },
  { id: "pullback", label: "월천식 눌림 뷰" },
  { id: "quant", label: "기본 퀀트" },
  { id: "agreement", label: "전략 합의" },
] as const;

type StrategyTabId = (typeof STRATEGY_TABS)[number]["id"];

function createInsufficientStdDevSignal(asset: Asset | null): StdDevSignal {
  return {
    assetId: asset?.id ?? "unselected",
    symbol: asset?.symbol ?? "N/A",
    date: new Date().toISOString().slice(0, 10),
    window: 20,
    lastPrice: null,
    movingAverage: null,
    standardDeviation: null,
    zScore: null,
    upper1: null,
    upper2: null,
    upper3: null,
    lower1: null,
    lower2: null,
    lower3: null,
    position: "insufficient_data",
    direction: "insufficient_data",
    signalStrength: null,
    status: "insufficient_data",
    dataQualityScore: 0,
    vetoReasons: ["가격 OHLCV API 필요"],
    explanation: "실제 종가 데이터가 연결되지 않아 표준편차 위치를 계산하지 않습니다.",
  };
}

function createStrategyViews(asset: Asset | null): StrategyViewScore[] {
  const base = {
    assetId: asset?.id ?? "unselected",
    symbol: asset?.symbol ?? "N/A",
    date: new Date().toISOString().slice(0, 10),
    score: null,
    signal: "insufficient_data" as const,
    confidence: "none" as const,
    status: "insufficient_data" as const,
    dataQualityScore: 0,
    bullishFactors: [],
    bearishFactors: [],
    vetoReasons: ["필수 데이터 API 필요"],
    explanation: "계산 가능한 데이터가 부족합니다.",
  };

  return [
    { ...base, strategyId: "macro_first_largecap", displayName: "레짐-우선 뷰" },
    { ...base, strategyId: "wolcheon_pullback", displayName: "월천식 눌림 뷰" },
    { ...base, strategyId: "stddev_mean_reversion", displayName: "표준편차 뷰" },
    { ...base, strategyId: "fundamental_quant", displayName: "기본 퀀트" },
    { ...base, strategyId: "dividend_return", displayName: "배당/환원" },
    { ...base, strategyId: "momentum", displayName: "모멘텀" },
  ];
}

function createStrategyAgreementSignal(asset: Asset | null, views: StrategyViewScore[]): StrategyAgreementSignal {
  return calculateStrategyAgreementSignal({
    assetId: asset?.id ?? "unselected",
    symbol: asset?.symbol ?? "N/A",
    date: new Date().toISOString().slice(0, 10),
    views,
  });
}

export const StrategyWorkspace: React.FC<{ selectedAsset: Asset | null }> = ({ selectedAsset }) => {
  const [activeStrategyTab, setActiveStrategyTab] = useState<StrategyTabId>("stddev");
  const stdDevSignal = createInsufficientStdDevSignal(selectedAsset);
  const strategyViews = createStrategyViews(selectedAsset);
  const agreementSignal = createStrategyAgreementSignal(selectedAsset, strategyViews);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-2 overflow-x-auto rounded-kt-pill border border-kt-border-panel bg-kt-bg-surface-100 p-1">
        {STRATEGY_TABS.map((tab) => {
          const isActive = tab.id === activeStrategyTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStrategyTab(tab.id)}
              className={`whitespace-nowrap rounded-kt-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border border-kt-border-panel bg-kt-bg-body text-kt-text-primary"
                  : "text-kt-text-secondary hover:text-kt-text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeStrategyTab === "stddev" && (
        <StdDevTradingTab selectedAsset={selectedAsset} signal={stdDevSignal} />
      )}
      {activeStrategyTab === "agreement" && (
        <StrategyAgreementTab signal={agreementSignal} views={strategyViews} />
      )}
      {activeStrategyTab !== "stddev" && activeStrategyTab !== "agreement" && (
        <Panel title={STRATEGY_TABS.find((tab) => tab.id === activeStrategyTab)?.label}>
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <StatusBadge status="api_required" />
            <p className="mt-3 text-sm font-semibold text-kt-text-primary">전략 계산 API 필요</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-kt-text-muted">
              가격 OHLCV, 재무제표, 공시, 수급, 시장 레짐 데이터가 연결되기 전까지 신호를 생성하지 않습니다.
            </p>
          </div>
        </Panel>
      )}
    </section>
  );
};
