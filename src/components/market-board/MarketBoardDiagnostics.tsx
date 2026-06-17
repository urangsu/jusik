import React, { useState, useEffect } from "react";
import { SourceSummary } from "../../domain/source/source-summary";
import { ProviderBudgetBadge } from "./ProviderBudgetBadge";
import { Panel } from "../ui/Panel";
import { useI18n } from "../../i18n/use-i18n";
import { getProviderPolicyLabel, getProviderStatusLabel } from "../../i18n/provider-labels";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";

interface MarketBoardDiagnosticsProps {
  sourceSummary: SourceSummary[];
}

export const MarketBoardDiagnostics: React.FC<MarketBoardDiagnosticsProps> = ({
  sourceSummary,
}) => {
  const { t, locale } = useI18n();
  const [liveProviders, setLiveProviders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/providers/health")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.providers) {
          setLiveProviders(data.providers);
        }
      })
      .catch(() => {});
  }, []);

  const mergedSources = sourceSummary.map((src) => {
    const live = liveProviders.find((p) => p.id === src.providerId);
    if (live) {
      return {
        ...src,
        enabled: live.isEnabled,
        status: live.status,
        used: live.budget?.used ?? src.used,
        limit: live.budget?.limit ?? src.limit,
      };
    }
    return src;
  });

  const isPersonalFallbackActive = mergedSources.some(
    (s) => s.tier === "personal_fallback" && s.enabled
  );

  return (
    <Panel title={t("diagnosticsTitle")}>
      <div className="flex flex-col gap-3">
        {/* Fallback Warning */}
        {isPersonalFallbackActive && (
          <div className="bg-kt-positive-weak border border-kt-positive/20 p-2.5 rounded-kt-card flex items-start gap-2 text-xs text-kt-positive-text leading-relaxed">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">{t("diagnosticsWarningTitle")}</span>
              <p className="text-[10px] text-kt-text-primary opacity-80 leading-normal">
                {t("diagnosticsWarningDesc")}
              </p>
            </div>
          </div>
        )}

        {/* Source grid */}
        <div className="flex flex-col gap-1.5">
          {mergedSources.map((src) => {
            const isHealthy = (src.status === "healthy" || src.status === "configured") && src.enabled;
            return (
              <div
                key={src.providerId}
                className="flex items-center justify-between p-2 rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/40"
              >
                <div className="flex items-center gap-2">
                  {isHealthy ? (
                    <CheckCircle className="w-4 h-4 text-kt-negative-text flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-kt-text-muted flex-shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-kt-text-primary">
                      {src.displayName}
                    </span>
                    <span className="text-[9px] text-kt-text-muted">
                      {getProviderPolicyLabel(src.tier, locale)} • {getProviderStatusLabel(src.status, locale)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ProviderBudgetBadge used={src.used} limit={src.limit} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};
