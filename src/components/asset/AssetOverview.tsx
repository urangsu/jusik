import React from "react";
import { Asset } from "@/domain/market/asset";
import { useAssetMarketData } from "@/client/market-data/use-asset-market-data";
import { MetricCell } from "../ui/MetricCell";
import { useI18n } from "@/i18n/use-i18n";

export const AssetOverview: React.FC<{ selectedAsset: Asset }> = ({ selectedAsset }) => {
  const { t, tSector, locale } = useI18n();
  const { quoteEnvelope } = useAssetMarketData(selectedAsset);

  const price = quoteEnvelope.value?.price ?? null;
  const changePct = quoteEnvelope.value?.changePct ?? null;
  const currency = quoteEnvelope.value?.currency || (selectedAsset.region === "KR" ? "KRW" : "USD");

  const formattedPrice = price !== null
    ? `${price.toLocaleString(locale === "ko" ? "ko-KR" : "en-US")} ${currency}`
    : null;

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-1.5 flex-shrink-0">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold text-kt-text-primary tabular-nums">
            {selectedAsset.symbol}
          </span>
          <span className="text-sm text-kt-text-secondary">
            {locale === "ko"
              ? selectedAsset.nameKo || selectedAsset.nameEn
              : selectedAsset.nameEn || selectedAsset.nameKo}
          </span>
          <span className="text-[10px] text-kt-text-muted border border-kt-border-panel px-1.5 py-0.5 rounded uppercase">
            {selectedAsset.exchange} · {selectedAsset.region}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-kt-text-muted">{t("currentPrice")}</span>
            <MetricCell value={formattedPrice} status={quoteEnvelope.status} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-kt-text-muted">{t("prevCloseChange")}</span>
            <MetricCell
              value={changePct !== null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : null}
              status={quoteEnvelope.status}
            />
          </div>
        </div>
      </div>
      {selectedAsset.sector && (
        <div className="text-xs text-kt-text-muted flex justify-between items-center">
          <span>
            {t("sector")}: {tSector(selectedAsset.sector)} | {t("industry")}: {selectedAsset.industry || "N/A"}
          </span>
          {quoteEnvelope.source && (
            <span className="text-[10px] text-kt-text-muted">
              Source: {quoteEnvelope.source} ({quoteEnvelope.status})
            </span>
          )}
        </div>
      )}
    </div>
  );
};
