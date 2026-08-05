import React from "react";
import { Asset } from "@/domain/market/asset";
import { useAssetMarketData } from "@/client/market-data/use-asset-market-data";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { AreaChart, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

export const AssetChart: React.FC<{ selectedAsset: Asset }> = ({ selectedAsset }) => {
  const { t } = useI18n();
  const { ohlcvEnvelope } = useAssetMarketData(selectedAsset);

  const candles = Array.isArray(ohlcvEnvelope.value) ? ohlcvEnvelope.value : [];
  const candleCount = candles.length;

  return (
    <div className="h-72 flex-shrink-0">
      <Panel
        title={t("chartFrameTitle")}
        headerAction={<TrendingUp className="w-4 h-4 text-kt-text-muted" />}
      >
        <div className="w-full h-full border border-dashed border-kt-border-panel/60 rounded-kt-card flex flex-col items-center justify-center p-6 bg-kt-bg-overlay-300/20 text-center gap-3">
          <AreaChart className="w-8 h-8 text-kt-text-muted opacity-40" />
          <span className="text-xs font-semibold text-kt-text-secondary">
            {candleCount > 0 ? `${selectedAsset.symbol} OHLCV Data (${candleCount} candles)` : t("chartFrameMuted")}
          </span>
          <p className="text-[11px] text-kt-text-muted max-w-sm leading-normal">
            {ohlcvEnvelope.message || t("chartFrameMutedDesc")}
          </p>
          <div className="flex items-center gap-2">
            <MetricCell
              value={candleCount > 0 ? `${candleCount} Bars` : null}
              status={ohlcvEnvelope.status}
            />
            {ohlcvEnvelope.source && (
              <span className="text-[10px] text-kt-text-muted">
                Source: {ohlcvEnvelope.source}
              </span>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
};
