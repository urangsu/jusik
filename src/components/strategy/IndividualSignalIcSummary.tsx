"use client";

import React, { useEffect, useState } from "react";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { AlertTriangle, TrendingDown, Info, ShieldAlert, BarChart3 } from "lucide-react";

type Props = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
};

export default function IndividualSignalIcSummary({ universeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IndividualSignalIcResult[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/audit/individual-signal-ic?universeId=${universeId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        return res.json();
      })
      .then((envelope: DataEnvelope<IndividualSignalIcResult[]>) => {
        if (active) {
          if (envelope.status === "error") {
            throw new Error(envelope.message || "Failed to fetch audit results");
          }
          setResults(envelope.value || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || String(err));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [universeId]);

  if (loading) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card animate-pulse">
        <div className="h-4 bg-kt-bg-overlay-300 w-1/4 rounded mb-4" />
        <div className="h-20 bg-kt-bg-overlay-300 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card text-kt-negative-text flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span className="text-xs">오류: {error}</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card text-kt-text-secondary flex items-center gap-2 text-xs">
        <Info className="w-4 h-4 text-kt-text-secondary/60" />
        <span>개별 신호 IC 감사 기록이 없습니다. CLI 또는 API 실행을 통해 감사를 먼저 수행하십시오.</span>
      </div>
    );
  }

  // Calculate statistics
  const negativeSignals = results.filter((r) => r.contributionAssessment === "negative");
  const insufficientSignals = results.filter((r) => r.contributionAssessment === "insufficient_sample");
  const weakHighWeightSignals = results.filter((r) => r.warnings.includes("weak_signal_high_weight"));

  return (
    <div className="space-y-4">
      {/* Mini Diagnostic Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-kt-bg-panel/30 border border-kt-border-panel/50 p-3 rounded-kt-card">
          <div className="text-[10px] text-kt-text-secondary font-medium flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-kt-negative-text" />
            <span>음수 기여 신호</span>
          </div>
          <div className={`text-xl font-bold mt-1 tabular-nums ${negativeSignals.length > 0 ? "text-kt-negative-text" : "text-kt-text-primary"}`}>
            {negativeSignals.length}
          </div>
        </div>

        <div className="bg-kt-bg-panel/30 border border-kt-border-panel/50 p-3 rounded-kt-card">
          <div className="text-[10px] text-kt-text-secondary font-medium flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-kt-text-secondary/70" />
            <span>표본 부족 신호</span>
          </div>
          <div className="text-xl font-bold mt-1 text-kt-text-primary tabular-nums">
            {insufficientSignals.length}
          </div>
        </div>

        <div className="bg-kt-bg-panel/30 border border-kt-border-panel/50 p-3 rounded-kt-card">
          <div className="text-[10px] text-kt-text-secondary font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-kt-positive-text" />
            <span>약한 신호 고가중치</span>
          </div>
          <div className={`text-xl font-bold mt-1 tabular-nums ${weakHighWeightSignals.length > 0 ? "text-kt-positive-text" : "text-kt-text-primary"}`}>
            {weakHighWeightSignals.length}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-kt-bg-panel/30 border border-kt-border-panel/50 rounded-kt-card overflow-hidden">
        <div className="px-3 py-2 bg-kt-bg-overlay-100 border-b border-kt-border-panel/50 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-kt-text-secondary" />
          <span className="text-xs font-bold text-kt-text-primary">개별 신호 IC 상세 (Individual Signal IC Audit)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
                <th className="py-2 px-3">신호명 / 가중치</th>
                <th className="py-2 px-1">Horizon</th>
                <th className="py-2 px-1 text-right">표본 수</th>
                <th className="py-2 px-1 text-right">IC</th>
                <th className="py-2 px-1 text-right">ICIR</th>
                <th className="py-2 px-1 text-right">Hit Rate</th>
                <th className="py-2 px-2 text-center">평가</th>
                <th className="py-2 px-3">경고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kt-border-panel/20">
              {results.map((r) => {
                const isPositive = r.contributionAssessment === "positive";
                const isNegative = r.contributionAssessment === "negative";
                const isInsufficient = r.contributionAssessment === "insufficient_sample";

                let assessmentBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary";
                if (isPositive) {
                  assessmentBadge = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
                } else if (isNegative) {
                  assessmentBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                }

                return (
                  <tr key={r.id} className="hover:bg-kt-bg-overlay-100/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-kt-text-primary">
                      <div>{r.signalLabelKo || r.signalId}</div>
                      <div className="text-[9px] text-kt-text-secondary font-mono mt-0.5">
                        {r.signalId} {r.currentWeightInMomentumV1 !== null && `(w: ${r.currentWeightInMomentumV1})`}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 font-mono text-kt-text-primary">{r.horizon}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-kt-text-primary tabular-nums">{r.sampleSize}</td>
                    <td className="py-2.5 px-1 text-right font-mono tabular-nums text-kt-text-primary">
                      {r.spearmanIc !== null ? (
                        <span className={r.spearmanIc > 0 ? "text-kt-positive-text" : r.spearmanIc < 0 ? "text-kt-negative-text" : ""}>
                          {r.spearmanIc > 0 ? "+" : ""}{r.spearmanIc.toFixed(4)}
                        </span>
                      ) : (
                        "null"
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-right font-mono tabular-nums text-kt-text-primary">
                      {r.icir !== null ? (
                        <span className={r.icir > 0 ? "text-kt-positive-text" : r.icir < 0 ? "text-kt-negative-text" : ""}>
                          {r.icir > 0 ? "+" : ""}{r.icir.toFixed(4)}
                        </span>
                      ) : (
                        "null"
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-right font-mono tabular-nums text-kt-text-primary">
                      {r.hitRate !== null ? `${(r.hitRate * 100).toFixed(2)}%` : "null"}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-medium inline-block ${assessmentBadge}`}>
                        {r.contributionAssessment}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {r.warnings.filter(w => w !== "sample_universe_only").map((w) => {
                          const isWeak = w === "weak_signal_high_weight";
                          const isNeg = w === "negative_contribution";
                          const isIns = w === "insufficient_sample" || w === "not_enough_cross_section" || w === "not_enough_time_series";

                          let color = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                          if (isWeak || isNeg) {
                            color = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
                          } else if (isIns) {
                            color = "bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40";
                          }

                          return (
                            <span key={w} className={`px-1 py-0.5 rounded-[3px] text-[8px] font-mono leading-none ${color}`}>
                              {w}
                            </span>
                          );
                        })}
                        {r.warnings.length === 1 && r.warnings[0] === "sample_universe_only" && (
                          <span className="text-kt-text-secondary/40 text-[9px] font-mono italic">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
