import React from "react";
import { Asset } from "@/domain/market/asset";
import { useAssetFinancials } from "@/client/financials/use-asset-financials";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { BarChart3, Info } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { getMetricLabel } from "@/i18n/metric-labels";

export const AssetFinancialSnapshot: React.FC<{ selectedAsset: Asset }> = ({ selectedAsset }) => {
  const { t, locale } = useI18n();
  const { statementEnvelope, ratioEnvelope } = useAssetFinancials(selectedAsset);

  const perLabel = getMetricLabel("PER", locale).full;
  const pbrLabel = getMetricLabel("PBR", locale).full;
  const roeLabel = getMetricLabel("ROE", locale).full;
  const debtLabel = getMetricLabel("DEBT_RATIO", locale).full;

  const per = ratioEnvelope.value?.per ?? null;
  const pbr = ratioEnvelope.value?.pbr ?? null;
  const roe = ratioEnvelope.value?.roe ?? null;

  return (
    <Panel
      title={t("financialSnapshotTitle")}
      headerAction={<BarChart3 className="w-4 h-4 text-kt-text-muted" />}
    >
      <div className="flex flex-col gap-2.5 h-full">
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
            <span className="text-xs text-kt-text-secondary">{perLabel}</span>
            <MetricCell value={per !== null ? `${per.toFixed(2)}x` : null} status={ratioEnvelope.status} />
          </div>
          <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
            <span className="text-xs text-kt-text-secondary">{pbrLabel}</span>
            <MetricCell value={pbr !== null ? `${pbr.toFixed(2)}x` : null} status={ratioEnvelope.status} />
          </div>
          <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
            <span className="text-xs text-kt-text-secondary">{roeLabel}</span>
            <MetricCell value={roe !== null ? `${roe.toFixed(2)}%` : null} status={ratioEnvelope.status} />
          </div>
          <div className="bg-kt-bg-overlay-300/40 p-3 rounded-kt-card border border-kt-border-panel flex justify-between items-center">
            <span className="text-xs text-kt-text-secondary">{debtLabel}</span>
            <MetricCell value={null} status={statementEnvelope.status} />
          </div>
        </div>

        <div className="border border-kt-border-panel rounded-kt-card p-3 bg-kt-bg-overlay-300/20 flex flex-col gap-1 mt-auto">
          <div className="flex items-center justify-between text-[10px] text-kt-text-muted">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              {statementEnvelope.source ? `Source: ${statementEnvelope.source}` : t("financialInfoDisclaimer")}
            </span>
            <span>Status: {statementEnvelope.status}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
};
