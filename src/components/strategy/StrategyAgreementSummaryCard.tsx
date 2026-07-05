import React, { useEffect, useState } from "react";
import { Network, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
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

const STABILITY_WARNING_LABELS: Record<string, string> = {
  insufficient_signal_history: "신호 이력 데이터 부족 (전체 데이터 없음)",
  insufficient_consecutive_history: "최소 신뢰 기간 부족",
  signal_not_persistent: "신호 최소 유지 조건 미달 (최근 동일 신호 3회 미만)",
  signal_flip_count_high: "신호 반전 빈도 임계치 초과 (최근 30일간 잦은 반전)",
  insufficient_rank_autocorrelation_history: "순위 자기상관 분석 데이터 부족",
  rank_autocorrelation_low: "순위 자기상관 계수 기준치 미달 (신호 일관성 부족)",
  rank_autocorrelation_low_sample: "상관관계 산출 샘플 크기 부족 (주의 필요)",
};

export const StrategyAgreementSummaryCard: React.FC<{ signal: StrategyAgreementSignal }> = ({ signal }) => {
  const isInsufficient = signal.status === "insufficient_data" || signal.agreementScore === null;

  const [stabilitySnap, setStabilitySnap] = useState<any>(null);
  const [suitabilitySnap, setSuitabilitySnap] = useState<any>(null);

  useEffect(() => {
    if (!signal.assetId) return;
    const signalId = signal.signalId || "momentum";

    fetch(`/api/signals/stability?assetId=${signal.assetId}&signalId=${signalId}&date=${signal.date}`)
      .then((res) => res.json())
      .then((envelope) => {
        if (envelope?.status === "real_time" || envelope?.status === "cached" || envelope?.status === "insufficient_data") {
          setStabilitySnap(envelope.value);
        }
      })
      .catch((err) => console.error("Failed to load signal stability for diagnostics", err));
  }, [signal.assetId, signal.signalId, signal.date]);

  useEffect(() => {
    if (!signal.symbol || !signal.assetId) return;
    const signalId = signal.signalId || "momentum";

    const originalScoreParam = signal.agreementScore !== null ? `&originalScore=${signal.agreementScore}` : "";
    fetch(
      `/api/strategy/suitability?assetId=${signal.assetId}&symbol=${signal.symbol}&signalId=${signalId}&originalLabel=${signal.agreementLabel}${originalScoreParam}&asOf=${signal.date}`
    )
      .then((res) => res.json())
      .then((envelope) => {
        if (envelope?.status === "real_time" || envelope?.status === "cached" || envelope?.status === "insufficient_data") {
          setSuitabilitySnap(envelope.value);
        }
      })
      .catch((err) => console.error("Failed to load suitability from backend", err));
  }, [signal.symbol, signal.assetId, signal.agreementLabel, signal.agreementScore, signal.signalId, signal.date]);

  // Read values strictly from suitabilitySnap (canonical boundary)
  const adjustedLabel = suitabilitySnap ? suitabilitySnap.adjustedLabel : signal.agreementLabel;
  const suitabilityScore = suitabilitySnap ? suitabilitySnap.suitabilityScore : signal.agreementScore;
  const suitabilityWarnings = suitabilitySnap ? suitabilitySnap.warnings : [];
  const regimeGate = suitabilitySnap ? suitabilitySnap.regimeGate : null;

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

            {/* Signal Stability Gate v1.0.0 Section */}
            {stabilitySnap && (
              <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-surface-200/50 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-kt-text-muted">SIGNAL STABILITY GATE v1.0.0</span>
                    <span className="text-[8px] text-kt-text-muted">Flip Count/Autocorrelation 진단</span>
                  </div>
                  {stabilitySnap.status === "passed" ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-kt-positive-text bg-kt-positive-weak px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" /> STABLE
                    </span>
                  ) : stabilitySnap.status === "blocked" ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-kt-negative-text bg-kt-negative-weak px-1.5 py-0.5 rounded">
                      <ShieldAlert className="w-3 h-3" /> BLOCKED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-surface-300 px-1.5 py-0.5 rounded border border-kt-border-panel/40">
                      INSUFFICIENT DATA
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-kt-text-secondary">Consecutive Observations (최근 관측 유지)</span>
                  <span className="font-semibold text-kt-text-primary">
                    {stabilitySnap.consecutiveObservations}회 (기준 &ge; 3회)
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-kt-text-secondary">Flip Count 30d (반전 횟수)</span>
                    <span className="text-[9px] text-kt-text-muted">30일간 매수/매도/중립 신호 반전 총합</span>
                  </div>
                  <span className="font-semibold text-kt-text-primary">
                    {stabilitySnap.flipCount30d}회 (기준 &le; 4회)
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-kt-text-secondary">Rank Autocorrelation (순위 상관)</span>
                    <span className="text-[9px] text-kt-text-muted">인접 session t/t-1 단면 순위 상관관계</span>
                  </div>
                  <span className="font-semibold text-kt-text-primary tabular-nums">
                    {stabilitySnap.rankAutocorrelation !== null ? stabilitySnap.rankAutocorrelation.toFixed(3) : "N/A"} (기준 &ge; 0.200)
                  </span>
                </div>

                {stabilitySnap.warnings.length > 0 && (
                  <div className="mt-1 bg-kt-negative-weak/10 border border-kt-negative-weak/40 p-2 rounded text-[10px] text-kt-negative-text flex flex-col gap-1">
                    <div className="flex gap-1.5 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold">안정성 검증 오류 사유:</span>
                    </div>
                    <ul className="list-disc pl-5 flex flex-col gap-0.5">
                      {stabilitySnap.warnings.map((w: string, idx: number) => (
                        <li key={idx}>{STABILITY_WARNING_LABELS[w] || w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Regime Gate v1 Suitability Section */}
            {regimeGate && (
              <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-surface-200/50 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-1.5">
                  <span className="text-[10px] font-bold text-kt-text-muted">REGIME GATE V1 적합도</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${getRegimeColorClass(regimeGate.regime)}`}>
                    {regimeGate.regime}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-kt-text-secondary">조정된 적합도 라벨</span>
                  <span className="font-bold text-kt-text-primary">
                    {AGREEMENT_LABEL[adjustedLabel as StrategyAgreementLabel] || adjustedLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-kt-text-secondary">적합도 점수</span>
                  <span className="font-bold text-kt-text-primary tabular-nums">
                    {suitabilityScore !== null ? `${suitabilityScore} / 100` : "차단 (N/A)"}
                  </span>
                </div>

                {suitabilityWarnings.length > 0 && (
                  <div className="mt-1 bg-kt-negative-weak/10 border border-kt-negative-weak/40 p-2 rounded text-[10px] text-kt-negative-text flex flex-col gap-1">
                    {suitabilityWarnings.map((warning: string, idx: number) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </div>
                    ))}
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
