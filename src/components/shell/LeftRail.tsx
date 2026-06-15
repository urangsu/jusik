import React from "react";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { Asset } from "@/domain/market/asset";
import { SEED_ASSETS } from "../search/AssetSearchBox";

interface LeftRailProps {
  onSelectAsset: (asset: Asset) => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({ onSelectAsset }) => {
  return (
    <aside className="w-80 border-r border-kt-border-panel flex flex-col gap-4 p-4 overflow-y-auto bg-kt-bg-body">
      <Panel title="관심 종목 (Watchlist)">
        <div className="flex flex-col gap-1.5">
          {SEED_ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="w-full text-left p-2.5 rounded-kt-card hover:bg-kt-bg-overlay-300 transition-colors border border-transparent hover:border-kt-border-panel cursor-pointer flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-kt-text-primary tabular-nums">{asset.symbol}</span>
                <span className="text-xs text-kt-text-muted truncate max-w-[120px]">
                  {asset.nameKo || asset.nameEn}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <MetricCell value={null} status="api_required" />
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="섹터 동향 (Sector Map)">
        <div className="flex flex-col gap-3 justify-center items-center py-6">
          <span className="text-xs text-kt-text-muted text-center leading-relaxed">
            섹터별 동향 및 매핑 데이터 준비 중
          </span>
          <MetricCell value={null} status="api_required" />
        </div>
      </Panel>
    </aside>
  );
};
