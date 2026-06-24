"use client";

import React, { useEffect, useState } from "react";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { AlertTriangle, TrendingDown, Info, ShieldAlert, BarChart3, Clock } from "lucide-react";

type Props = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strategyId?: string;
};

export default function IndividualSignalIcSummary({ universeId, strategyId }: Props) {
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

  // Filter based on strategyId connection (momentum_v1 connects to momentum_ signals)
  const connectedResults = strategyId === "momentum_v1"
    ? results.filter((r) => r.signalId.startsWith("momentum_"))
    : results;

  if (connectedResults.length === 0) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card text-kt-text-secondary flex items-center gap-2 text-xs">
        <Info className="w-4 h-4 text-kt-text-secondary/60" />
        <span>개별 신호 IC 감사 결과가 아직 없습니다. CLI 또는 상관관계 탭에서 감사를 먼저 수행하십시오.</span>
      </div>
    );
  }

  // Calculate diagnostic counts
  const negativeSignals = connectedResults.filter((r) => r.severity === "strong_negative" || r.severity === "weak_negative");
  const insufficientSignals = connectedResults.filter((r) => r.severity === "insufficient_sample");
  const weakHighWeightSignals = connectedResults.filter((r) => r.warnings.includes("weak_signal_high_weight"));

  const calculatedAtStr = connectedResults[0]?.calculatedAt
    ? new Date(connectedResults[0].calculatedAt).toLocaleString()
    : "N/A";

  return (
    <div className="space-y-4">
      {/* Mini Diagnostic Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-kt-bg-panel/30 border border-kt-border-panel/50 p-3 rounded-kt-card">
          <div className="text-[10px] text-kt-text-secondary font-medium flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-kt-negative-text" />
            <span>음수 IC 신호</span>
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
        <div className="px-3 py-2 bg-kt-bg-overlay-100 border-b border-kt-border-panel/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-kt-text-secondary" />
            <span className="text-xs font-bold text-kt-text-primary">개별 신호 IC 상세 (Individual Signal IC Audit)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-kt-text-secondary">
            <Clock className="w-3 h-3" />
            <span>감사 시점: {calculatedAtStr}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
                <th className="py-2 px-3">Signal ID</th>
                <th className="py-2 px-1">Horizon</th>
                <th className="py-2 px-1 text-right">Sample Size</th>
                <th className="py-2 px-1 text-right">IC Spearman</th>
                <th className="py-2 px-1 text-right">Top-Bottom Spread</th>
                <th className="py-2 px-2 text-center">Severity</th>
                <th className="py-2 px-3">Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kt-border-panel/20">
              {connectedResults.map((r) => {
                const isPositive = r.severity === "strong_positive" || r.severity === "weak_positive";
                const isNegative = r.severity === "strong_negative" || r.severity === "weak_negative";

                let severityBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                if (isPositive) {
                  severityBadge = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
                } else if (isNegative) {
                  severityBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                }

                const icVal = r.icSpearman;
                const spreadVal = r.topBottomSpread;

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
                      {icVal !== null ? (
                        <span className={icVal > 0 ? "text-kt-positive-text" : icVal < 0 ? "text-kt-negative-text" : "text-kt-text-secondary"}>
                          {icVal > 0 ? "+" : ""}{icVal.toFixed(4)}
                        </span>
                      ) : (
                        "null"
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-right font-mono tabular-nums text-kt-text-primary">
                      {spreadVal !== null ? (
                        <span className={spreadVal > 0 ? "text-kt-positive-text" : spreadVal < 0 ? "text-kt-negative-text" : "text-kt-text-secondary"}>
                          {spreadVal > 0 ? "+" : ""}{(spreadVal * 100).toFixed(2)}%
                        </span>
                      ) : (
                        "null"
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-medium inline-block ${severityBadge}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {r.warnings.filter(w => w !== "sample_universe_only").map((w) => {
                          const isWarningText = w === "weak_signal_high_weight" || w === "negative_ic" || (w as string) === "negative_contribution" || w === "unstable_across_horizons";
                          const isInsufficientText = w === "insufficient_sample" || w === "missing_signal_score" || w === "missing_forward_return";

                          let color = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                          if (isWarningText) {
                            color = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                          } else if (isInsufficientText) {
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
