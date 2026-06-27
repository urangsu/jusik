"use client";

import React, { useEffect, useState } from "react";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";
import { Loader2, Plus, X, AlertTriangle, ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DataEnvelope } from "@/domain/common/data-status";

type Props = {
  onPromotionSuccess?: () => void;
};

export const SurgeCandidateInbox: React.FC<Props> = ({ onPromotionSuccess }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [candidates, setCandidates] = useState<SurgeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/surge/candidates?status=new");
      const data: DataEnvelope<SurgeCandidate[]> = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to fetch candidates");
      }
      setCandidates(data.value || []);
    } catch (err: any) {
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      // Run scanner for KR, then US
      await fetch("/api/surge/candidates/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "KR" }),
      });
      await fetch("/api/surge/candidates/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "US" }),
      });
      await fetchCandidates();
    } catch (err: any) {
      setError(err.message || "Scanner execution failed");
    } finally {
      setScanning(false);
    }
  };

  const handlePromote = async (id: string) => {
    setActionInProgress((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/surge/candidates/${id}/promote`, {
        method: "POST",
      });
      const data: DataEnvelope<any> = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Promotion failed");
      }
      // Remove candidate from local list
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      onPromotionSuccess?.();
    } catch (err: any) {
      alert(err.message || "Failed to promote candidate");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDismiss = async (id: string) => {
    setActionInProgress((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/surge/candidates/${id}/dismiss`, {
        method: "POST",
      });
      const data: DataEnvelope<any> = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Dismiss failed");
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to dismiss candidate");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "price_change":
        return isKo ? "가격 이상 변동" : "Price Alert";
      case "volume_spike":
        return isKo ? "거래량 급등" : "Volume Spike";
      case "volatility_expansion":
        return isKo ? "변동성 확장" : "Volatility Expansion";
      default:
        return reason;
    }
  };

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-4 rounded-kt-card space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-kt-text-primary uppercase tracking-wider">
            {isKo ? "이상 움직임 후보 인박스 (Surge Candidate Inbox)" : "Surge Candidate Inbox"}
          </span>
          <p className="text-[11px] text-kt-text-muted leading-relaxed max-w-xl">
            {isKo
              ? "급등락 및 거래량 폭증이 감지된 종목 목록입니다. 관심종목으로 자동 추가되지 않으며 사용자가 개별 검토 후 승격합니다."
              : "Stocks exhibiting abnormal price movements or volume spikes. These are review candidates and are not auto-added to watchlists."}
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-kt-positive hover:bg-kt-positive/90 text-white rounded-kt-pill text-[10px] font-semibold cursor-pointer disabled:opacity-50 select-none"
        >
          {scanning ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{isKo ? "탐지 중..." : "Scanning..."}</span>
            </>
          ) : (
            <span>{isKo ? "이상 변동 후보 탐지" : "Scan Candidates"}</span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded-kt-card text-kt-negative-text flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-kt-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading candidates...
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-kt-text-muted border border-dashed border-kt-border-panel/80 rounded-kt-card bg-kt-bg-overlay-300/10">
          {isKo ? "현재 인박스에 대기 중인 검토 대상 종목이 없습니다." : "No candidates currently waiting for review."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {candidates.map((c) => {
            const isProcessing = !!actionInProgress[c.id];
            const chgPct = c.metrics.priceChangePct !== null ? `${(c.metrics.priceChangePct * 100).toFixed(1)}%` : "—";
            const volStr = c.metrics.volumeRatio !== null ? `${c.metrics.volumeRatio.toFixed(1)}x` : "—";

            return (
              <div
                key={c.id}
                className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/40 flex flex-col justify-between gap-3 relative"
              >
                {isProcessing && (
                  <div className="absolute inset-0 bg-kt-bg-body/40 flex items-center justify-center rounded z-10">
                    <Loader2 className="w-4 h-4 animate-spin text-kt-text-muted" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-kt-text-primary tabular-nums">{c.symbol}</span>
                      <span className="px-1.5 py-0.5 rounded-[3px] text-[8px] font-mono bg-kt-bg-panel text-kt-text-muted border border-kt-border-panel/30">
                        {c.market}
                      </span>
                    </div>
                    <span className="text-[8px] text-kt-text-muted font-mono">
                      {new Date(c.detectedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Reason chips */}
                  <div className="flex flex-wrap gap-1">
                    {c.reasons.map((r) => (
                      <span
                        key={r}
                        className="px-1.5 py-0.5 rounded-[3px] text-[8px] font-medium bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative-text/20"
                      >
                        {getReasonLabel(r)}
                      </span>
                    ))}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono border-t border-kt-border-panel/10 pt-2 text-kt-text-secondary">
                    <div>
                      <span className="text-kt-text-muted block text-[8px] uppercase">Chg %</span>
                      <span className={c.metrics.priceChangePct !== null && c.metrics.priceChangePct > 0 ? "text-kt-positive-text font-bold" : "text-kt-negative-text font-bold"}>
                        {chgPct}
                      </span>
                    </div>
                    <div>
                      <span className="text-kt-text-muted block text-[8px] uppercase">Vol Ratio</span>
                      <span className="font-semibold">{volStr}</span>
                    </div>
                    <div>
                      <span className="text-kt-text-muted block text-[8px] uppercase">Range %</span>
                      <span className="font-semibold">
                        {c.metrics.volatilityRatio !== null ? `${(c.metrics.volatilityRatio * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-kt-border-panel/10 pt-2.5">
                  <button
                    onClick={() => handleDismiss(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-kt-text-muted hover:text-kt-text-primary rounded text-[9px] font-semibold border border-kt-border-panel/30 hover:bg-kt-bg-overlay-200 cursor-pointer select-none"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>{isKo ? "제외" : "Dismiss"}</span>
                  </button>
                  <button
                    onClick={() => handlePromote(c.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-kt-positive-weak text-kt-positive-text border border-kt-positive/20 hover:bg-kt-positive/10 rounded text-[9px] font-bold cursor-pointer select-none"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{isKo ? "관심종목 승격" : "Promote"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default SurgeCandidateInbox;
