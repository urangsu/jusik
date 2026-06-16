import React from "react";
import { LineChart } from "lucide-react";
import { Asset } from "@/domain/market/asset";
import { StdDevSignal } from "@/domain/strategy/stddev-signal";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";
import { StdDevBandPanel } from "./StdDevBandPanel";
import { StdDevSignalCard } from "./StdDevSignalCard";

interface StdDevTradingTabProps {
  selectedAsset: Asset | null;
  signal: StdDevSignal;
}

export const StdDevTradingTab: React.FC<StdDevTradingTabProps> = ({ selectedAsset, signal }) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-kt-card border border-kt-border-panel bg-kt-bg-surface-100 p-4">
        <div>
          <p className="text-xs text-kt-text-muted">선택 종목</p>
          <h2 className="mt-1 text-lg font-semibold text-kt-text-primary">
            {selectedAsset ? `${selectedAsset.nameKo || selectedAsset.nameEn} / ${selectedAsset.symbol}` : "종목 미선택"}
          </h2>
          <p className="mt-1 text-xs text-kt-text-muted">
            {selectedAsset ? `${selectedAsset.exchange} · ${selectedAsset.region}` : "검색 또는 관심 종목에서 선택"}
          </p>
        </div>
        <StatusBadge status={signal.status} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_320px] gap-4 max-2xl:grid-cols-[300px_minmax(0,1fr)] max-xl:grid-cols-1">
        <StdDevBandPanel signal={signal} />
        <Panel
          title="밴드 차트 프레임"
          headerAction={<LineChart className="h-4 w-4 text-kt-text-muted" />}
          className="min-h-[360px]"
        >
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-kt-card border border-dashed border-kt-border-panel bg-kt-bg-overlay-300/20 p-6 text-center">
            <LineChart className="mb-3 h-8 w-8 text-kt-text-muted opacity-50" />
            <p className="text-sm font-semibold text-kt-text-primary">가격 OHLCV API 필요</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-kt-text-muted">
              실제 종가 배열이 연결되기 전까지 가격선과 밴드를 렌더링하지 않습니다.
            </p>
          </div>
        </Panel>
        <StdDevSignalCard signal={signal} />
      </div>
    </div>
  );
};
