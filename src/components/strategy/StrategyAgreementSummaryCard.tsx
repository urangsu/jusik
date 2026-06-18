import React, { useEffect, useState } from "react";
import { Network, AlertTriangle } from "lucide-react";
import { StrategyAgreementSignal, StrategyAgreementLabel } from "@/domain/strategy/strategy-agreement-signal";
import { MetricCell } from "../ui/MetricCell";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";
import { StrategyAgreementBar } from "./StrategyAgreementBar";

const AGREEMENT_LABEL: Record<StrategyAgreementLabel, string> = {
  strong_watch: "검토 우선",
  watch: "관찰",
  neutral: "중립",
  caution: "주의",
  risk: "위험",
  insufficient_data: "전략 합의 불가",
};

export const StrategyAgreementSummaryCard: React.FC<{ signal: StrategyAgreementSignal }> = ({ signal }) => {
  const isInsufficient = signal.status === "insufficient_data" || signal.agreementScore === null;

  const [regimeSnap, setRegimeSnap] = useState<any>(null);

  useEffect(() => {
    if (!signal.symbol) return;
    const isKr = signal.symbol.startsWith("KR:") || /^\d{6}$/.test(signal.symbol) || signal.assetId.startsWith("KR:");
    const market = isKr ? "KR" : "US";

    fetch(`/api/regime/current?market=${market}`)
      .then((res) => res.json())
      .then((envelope) => {
        if (envelope?.status === "real_time" || envelope?.status === "cached") {
          setRegimeSnap(envelope.value);
        }
      })
      .catch((err) => console.error("Failed to load regime for suitability", err));
  }, [signal.symbol, signal.assetId]);

  let adjustedLabel: StrategyAgreementLabel | "insufficient_data" = signal.agreementLabel;
  let suitabilityScore = signal.agreementScore;
  let suitabilityWarning = "";

  if (regimeSnap) {
    const regime = regimeSnap.regime;
    if (regime === "panic") {
      suitabilityScore = null;
      adjustedLabel = "insufficient_data";
      suitabilityWarning = "레짐 패닉 상태로 인해 적합도 점수가 차단되었습니다.";
    } else if (regime === "risk_off") {
      if (signal.agreementLabel === "strong_watch" || signal.agreementLabel === "watch") {
        adjustedLabel = "caution";
        suitabilityWarning = "시장 리스크 오프 국면으로 인해 등급이 caution으로 감쇄되었습니다.";
      }
    } else if (regime === "insufficient_data") {
      suitabilityScore = null;
      adjustedLabel = "insufficient_data";
      suitabilityWarning = "레짐 판단 데이터 부족";
    }
  } else {
    adjustedLabel = signal.agreementLabel;
    suitabilityScore = signal.agreementScore;
  }

  const getRegimeColorClass = (regime: string) => {
    if (regime === "risk_on" || regime === "selective_risk_on") {
      return "text-kt-positive-text bg-kt-positive-weak";
    }
    if (regime === "risk_off" || regime === "panic") {
      return "text-kt-negative-text bg-kt-negative-weak";
    }
    return "text-kt-text-secondary bg-kt-bg-surface-200";
  };

  return (
    <Panel
      title="전략 합의"
      headerAction={<Network className="h-4 w-4 text-kt-text-muted" />}
    >
      <div className="flex flex-col gap-4">
        {/* Raw Agreement Section */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-kt-text-muted">합의 라벨</p>
            <p className="mt-1 text-xl font-semibold text-kt-text-primary">
              {AGREEMENT_LABEL[signal.agreementLabel]}
            </p>
          </div>
          <StatusBadge status={signal.status} />
        </div>

        {isInsufficient ? (
          <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
            <p className="text-sm font-semibold text-kt-text-primary">전략 합의 계산 불가</p>
            <p className="mt-2 text-xs leading-relaxed text-kt-text-muted">
              필요 데이터가 아직 연결되지 않았습니다.
            </p>
            <p className="mt-2 text-xs font-semibold text-kt-text-secondary">현재 상태: 데이터 부족</p>
            <p className="mt-2 text-xs leading-relaxed text-kt-text-muted">
              필요 항목: 가격 OHLCV, 재무제표, 팩터 노출, 레짐, 포트폴리오 컨텍스트
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
                <p className="mb-2 text-xs text-kt-text-muted">합의 점수</p>
                <MetricCell value={signal.agreementScore} status={signal.status} />
              </div>
              <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
                <p className="mb-2 text-xs text-kt-text-muted">데이터 품질</p>
                <MetricCell
                  value={signal.dataQualityScore}
                  status={signal.status}
                  formatter={(value) => `${value}%`}
                />
              </div>
            </div>

            {/* Regime Gate v1 Suitability Section */}
            {regimeSnap && (
              <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-surface-200/50 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-1.5">
                  <span className="text-[10px] font-bold text-kt-text-muted">REGIME GATE V1 적합도</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${getRegimeColorClass(regimeSnap.regime)}`}>
                    {regimeSnap.regime}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-kt-text-secondary">조정된 적합도 라벨</span>
                  <span className="font-bold text-kt-text-primary">
                    {AGREEMENT_LABEL[adjustedLabel as StrategyAgreementLabel]}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-kt-text-secondary">적합도 점수</span>
                  <span className="font-bold text-kt-text-primary tabular-nums">
                    {suitabilityScore !== null ? `${suitabilityScore} / 100` : "차단 (N/A)"}
                  </span>
                </div>

                {suitabilityWarning && (
                  <div className="mt-1 bg-kt-negative-weak/10 border border-kt-negative-weak/40 p-2 rounded text-[10px] text-kt-negative-text flex gap-1.5 items-start">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{suitabilityWarning}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!isInsufficient ? <StrategyAgreementBar agreementRate={signal.agreementRate} /> : null}

        <p className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3 text-xs leading-relaxed text-kt-text-muted">
          이 화면은 여러 전략 신호의 합의 정도를 보여주는 진단 도구이며, 거래 지시가 아닙니다.
        </p>
        <p className="text-xs leading-relaxed text-kt-text-muted">{signal.explanation}</p>
      </div>
    </Panel>
  );
};
