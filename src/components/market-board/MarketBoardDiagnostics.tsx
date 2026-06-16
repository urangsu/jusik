import React from "react";
import { SourceSummary } from "@/domain/source/source-summary";
import { ProviderBudgetBadge } from "./ProviderBudgetBadge";
import { Panel } from "../ui/Panel";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";

interface MarketBoardDiagnosticsProps {
  sourceSummary: SourceSummary[];
}

export const MarketBoardDiagnostics: React.FC<MarketBoardDiagnosticsProps> = ({
  sourceSummary,
}) => {
  const isPersonalFallbackActive = sourceSummary.some(
    (s) => s.tier === "personal_fallback" && s.enabled
  );

  return (
    <Panel title="데이터 소스 진단 (Diagnostics)">
      <div className="flex flex-col gap-3">
        {/* Fallback Warning */}
        {isPersonalFallbackActive && (
          <div className="bg-kt-positive-weak border border-kt-positive/20 p-2.5 rounded-kt-card flex items-start gap-2 text-xs text-kt-positive-text leading-relaxed">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">개인용 비공식 Fallback 활성화</span>
              <p className="text-[10px] text-kt-text-primary opacity-80 leading-normal">
                yfinance 또는 Stooq 등의 비공식 API 데이터가 연동되어 수신 중입니다. 이 값은 개인 교육/로컬 테스트 목적으로만 이용 가능하며, 전략 점수 조건 적격 판정에 단독 활용되지 않습니다.
              </p>
            </div>
          </div>
        )}

        {/* Source grid */}
        <div className="flex flex-col gap-1.5">
          {sourceSummary.map((src) => {
            const isActive = src.enabled;
            const isHealthy = src.status === "healthy" && isActive;
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
                    <span className="text-[9px] text-kt-text-muted capitalize">
                      {src.tier.replace("_", " ")}
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
