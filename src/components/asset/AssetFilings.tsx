import React from "react";
import { Asset } from "@/domain/market/asset";
import { useAssetFilings } from "@/client/filings/use-asset-filings";
import { Panel } from "../ui/Panel";
import { MetricCell } from "../ui/MetricCell";
import { Newspaper, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

export const AssetFilings: React.FC<{ selectedAsset: Asset }> = ({ selectedAsset }) => {
  const { t } = useI18n();
  const { filingsEnvelope } = useAssetFilings(selectedAsset);

  const filings = Array.isArray(filingsEnvelope.value) ? filingsEnvelope.value : [];

  return (
    <Panel
      title={t("newsFeedTitle")}
      headerAction={<Newspaper className="w-4 h-4 text-kt-text-muted" />}
    >
      {filings.length > 0 ? (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {filings.slice(0, 5).map((f) => (
            <div
              key={f.id}
              className="p-2.5 bg-kt-bg-overlay-300/30 border border-kt-border-panel rounded flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-kt-text-primary hover:underline flex items-center gap-1 line-clamp-1"
                >
                  {f.title}
                  <ExternalLink className="w-3 h-3 text-kt-text-muted flex-shrink-0" />
                </a>
                <span className="text-[10px] text-kt-text-muted whitespace-nowrap">
                  {f.publishedAt ? f.publishedAt.split("T")[0] : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full border border-dashed border-kt-border-panel/40 rounded-kt-card flex flex-col items-center justify-center p-6 text-center gap-2">
          <Newspaper className="w-6 h-6 text-kt-text-muted opacity-40" />
          <span className="text-xs text-kt-text-muted">{filingsEnvelope.message || t("newsFeedMuted")}</span>
          <MetricCell value={null} status={filingsEnvelope.status} />
        </div>
      )}
    </Panel>
  );
};
