"use client";

import React, { useState } from "react";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";
import { Award, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DataEnvelope } from "@/domain/common/data-status";

type Props = {
  initialRecord: SignalOutcomeJournalRecord;
};

export const SignalOutcomeJournalPanel: React.FC<Props> = ({ initialRecord }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [record, setRecord] = useState<SignalOutcomeJournalRecord>(initialRecord);
  const [observing, setObserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleObserve = async () => {
    setObserving(true);
    setError(null);
    try {
      const res = await fetch("/api/outcomes/signal-journal/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id }),
      });
      const data: DataEnvelope<SignalOutcomeJournalRecord> = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Observation failed");
      }
      if (data.value) {
        setRecord(data.value);
      }
    } catch (err: any) {
      setError(err.message || "Failed to trigger observation");
    } finally {
      setObserving(false);
    }
  };

  const getStatusBadgeClass = (status: SignalOutcomeJournalRecord["outcomeStatus"]) => {
    switch (status) {
      case "observed":
        return "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20";
      case "insufficient_data":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "pending":
        return "bg-kt-bg-overlay-200 text-kt-text-secondary border-kt-border-panel/40";
      case "error":
      default:
        return "bg-kt-negative-weak/10 text-kt-negative-text border-kt-negative-text/20";
    }
  };

  // confidenceAdjustment is always "not_applicable" — single observation never changes confidence
  const getAdjustmentBadgeClass = (_adj: SignalOutcomeJournalRecord["confidenceAdjustment"]) => {
    return "bg-kt-bg-overlay-100 text-kt-text-muted border-kt-border-panel/30";
  };

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-kt-text-muted" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "사후 분석 성과기록 (Outcome Journal)" : "Signal Outcome Journal"}
          </span>
          <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold border uppercase ${getStatusBadgeClass(record.outcomeStatus)}`}>
            {record.outcomeStatus}
          </span>
        </div>

        {record.outcomeStatus === "pending" && (
          <button
            onClick={handleObserve}
            disabled={observing}
            className="flex items-center gap-1 px-2.5 py-1 bg-kt-bg-overlay-100 border border-kt-border-panel hover:bg-kt-bg-overlay-200 text-kt-text-secondary rounded-kt-pill text-[9px] font-semibold cursor-pointer disabled:opacity-50 select-none"
          >
            {observing ? (
              <><Loader2 className="w-2.5 h-2.5 animate-spin" /> {isKo ? "진행 중..." : "Checking..."}</>
            ) : (
              <><RefreshCw className="w-2.5 h-2.5" /> {isKo ? "성과 관찰" : "Observe Outcomes"}</>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[9px] text-kt-negative-text bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px] font-mono leading-relaxed">
        <div>
          <strong className="text-kt-text-secondary">Subject ID:</strong> {record.subjectId}
        </div>
        <div>
          <strong className="text-kt-text-secondary">Horizon:</strong> {record.horizon}
        </div>
        {record.assetId && (
          <div>
            <strong className="text-kt-text-secondary">Asset ID:</strong> {record.assetId}
          </div>
        )}
        {record.outcomeStatus === "observed" && (
          <div>
            <strong className="text-kt-text-secondary">Confidence:</strong>{" "}
            <span className={`px-1 rounded border text-[8px] uppercase ${getAdjustmentBadgeClass(record.confidenceAdjustment)}`}>
              {record.confidenceAdjustment}
            </span>
          </div>
        )}
      </div>

      {record.outcomeStatus === "observed" && (
        <div className="border-t border-kt-border-panel/20 pt-2.5 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-center">
            <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
              <div className="text-kt-text-muted text-[8px] uppercase">Observed Return</div>
              <div className="text-[10px] font-bold text-kt-text-primary mt-0.5">
                {record.observedForwardReturn !== null ? `${(record.observedForwardReturn * 100).toFixed(2)}%` : "—"}
              </div>
            </div>
            {record.marketBenchmarkReturn !== null ? (
              <>
                <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                  <div className="text-kt-text-muted text-[8px] uppercase">Market Benchmark</div>
                  <div className="text-[10px] font-bold text-kt-text-secondary mt-0.5">
                    {`${(record.marketBenchmarkReturn * 100).toFixed(2)}%`}
                  </div>
                </div>
                <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                  <div className="text-kt-text-muted text-[8px] uppercase">Market Excess Return</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${
                    record.marketExcessReturn !== null && record.marketExcessReturn > 0
                      ? "text-kt-positive-text"
                      : record.marketExcessReturn !== null && record.marketExcessReturn < 0
                      ? "text-kt-negative-text"
                      : "text-kt-text-primary"
                  }`}>
                    {record.marketExcessReturn !== null ? `${(record.marketExcessReturn * 100).toFixed(2)}%` : "—"}
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 bg-kt-bg-overlay-100/50 p-2 rounded border border-kt-border-panel/20 flex items-center justify-center text-[9.5px] text-kt-text-muted">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-yellow-600/70" />
                비교 기준 데이터 부족 (No benchmark provenance)
              </div>
            )}
          </div>

          {record.lesson && (
            <p className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30 text-[9.5px] text-kt-text-secondary leading-normal font-sans">
              {record.lesson}
            </p>
          )}
        </div>
      )}

      {record.outcomeStatus === "insufficient_data" && (
        <div className="border-t border-kt-border-panel/20 pt-2.5 text-[9px] text-yellow-600 flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{record.lesson || "관찰에 필요한 시장 가격 시계열 데이터가 존재하지 않습니다."}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[8px] font-mono border-t border-kt-border-panel/10 pt-2 text-kt-text-muted">
        <span>Created At: {new Date(record.createdAt).toLocaleString()}</span>
        {record.observedAt && <span>Observed At: {new Date(record.observedAt).toLocaleString()}</span>}
      </div>
    </div>
  );
};
