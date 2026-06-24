"use client";

import React, { useEffect, useState } from "react";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";
import { StrategyTrialTable } from "./StrategyTrialTable";
import { SignalPostmortemSummary } from "./SignalPostmortemSummary";
import { useI18n } from "@/i18n/use-i18n";
import { DataEnvelope } from "@/domain/common/data-status";
import IndividualSignalIcSummary from "./IndividualSignalIcSummary";
import MarketExposureSummary from "./MarketExposureSummary";


export const StrategyTrialMemoryPanel: React.FC = () => {
  const { locale } = useI18n();
  const [trials, setTrials] = useState<StrategyTrialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrial, setSelectedTrial] = useState<StrategyTrialRecord | null>(null);

  useEffect(() => {
    async function fetchTrials() {
      try {
        const res = await fetch("/api/strategy/trials");
        const json: DataEnvelope<StrategyTrialRecord[]> = await res.json();
        if (json.value) {
          setTrials(json.value);
          if (json.value.length > 0) {
            setSelectedTrial(json.value[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load strategy trials:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrials();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-6 text-xs text-kt-text-muted">
        {locale === "ko" ? "전략 연구 기록 로딩 중..." : "Loading strategy trials..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StrategyTrialTable
        trials={trials}
        onSelectTrial={setSelectedTrial}
        selectedTrialId={selectedTrial?.id}
      />

      {selectedTrial && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SignalPostmortemSummary postmortemSummary={selectedTrial.postmortemSummary} />

            <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 space-y-4">
              <h3 className="text-xs font-semibold text-kt-text-primary border-b border-kt-border-panel/40 pb-2">
                {locale === "ko" ? "개별 신호 IC 요약 (Individual Signal IC Audit)" : "Individual Signal IC Audit"}
              </h3>
              <IndividualSignalIcSummary universeId={selectedTrial.universeId} strategyId={selectedTrial.strategyId} />
            </div>

            <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 space-y-4">
              <h3 className="text-xs font-semibold text-kt-text-primary border-b border-kt-border-panel/40 pb-2">
                {locale === "ko" ? "시장 노출도 감사 (Market Exposure Audit)" : "Market Exposure Audit"}
              </h3>
              <MarketExposureSummary trialId={selectedTrial.id} />
            </div>


            <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 space-y-4">
              <h3 className="text-xs font-semibold text-kt-text-primary border-b border-kt-border-panel/40 pb-2">
                {locale === "ko" ? "가설 및 연구 내용 (Thesis & Hypothesis)" : "Thesis & Hypothesis"}
              </h3>
              <div>
                <h4 className="text-[10px] text-kt-text-muted uppercase mb-1">
                  {locale === "ko" ? "연구 가설 (Thesis)" : "Thesis"}
                </h4>
                <p className="text-xs text-kt-text-primary leading-relaxed bg-kt-bg-surface-200/40 p-2.5 rounded border border-kt-border-panel/20">
                  {selectedTrial.thesisKo}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] text-kt-text-muted uppercase mb-1">
                  {locale === "ko" ? "시장 가설 (Hypothesis)" : "Hypothesis"}
                </h4>
                <p className="text-xs text-kt-text-primary leading-relaxed bg-kt-bg-surface-200/40 p-2.5 rounded border border-kt-border-panel/20">
                  {selectedTrial.hypothesis}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 space-y-4">
              <h3 className="text-xs font-semibold text-kt-text-primary border-b border-kt-border-panel/40 pb-2">
                {locale === "ko" ? "실험 메타데이터 (Meta Info)" : "Meta Information"}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] text-kt-text-muted uppercase mb-0.5">{locale === "ko" ? "연구 ID" : "Trial ID"}</div>
                  <div className="text-kt-text-primary font-mono select-all truncate">{selectedTrial.id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-kt-text-muted uppercase mb-0.5">{locale === "ko" ? "파라미터 해시" : "Parameter Hash"}</div>
                  <div className="text-kt-text-primary font-mono">{selectedTrial.parameterHash}</div>
                </div>
                <div>
                  <div className="text-[10px] text-kt-text-muted uppercase mb-0.5">{locale === "ko" ? "엔진 버전" : "Engine Version"}</div>
                  <div className="text-kt-text-primary">{selectedTrial.engineVersion}</div>
                </div>
                <div>
                  <div className="text-[10px] text-kt-text-muted uppercase mb-0.5">{locale === "ko" ? "백테스트 Run ID" : "Backtest Run ID"}</div>
                  <div className="text-kt-text-primary font-mono">{selectedTrial.backtestRunId || "N/A"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-kt-text-muted uppercase mb-0.5">{locale === "ko" ? "데이터 구간" : "Data Window"}</div>
                  <div className="text-kt-text-primary">
                    {selectedTrial.dataWindow.startDate} ~ {selectedTrial.dataWindow.endDate}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 space-y-4">
              <h3 className="text-xs font-semibold text-kt-text-primary border-b border-kt-border-panel/40 pb-2">
                {locale === "ko" ? "편향 위험 경고 (Bias Warnings)" : "Bias Warnings"}
              </h3>
              {selectedTrial.biasWarnings.length === 0 ? (
                <div className="text-xs text-kt-text-muted">
                  {locale === "ko" ? "감지된 편향 경고가 없습니다." : "No bias warnings detected."}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTrial.biasWarnings.map((w) => (
                    <span
                      key={w}
                      className="px-2 py-1 rounded bg-kt-negative-text/10 text-kt-negative-text border border-kt-negative-text/20 text-[10px] font-medium"
                    >
                      {w.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
