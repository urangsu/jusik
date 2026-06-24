"use client";

import React, { useEffect, useState } from "react";
import { MarketExposureResult, MarketExposureAssessment } from "@/domain/audit/market-exposure-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";
import { BarChart3, Info, ShieldAlert, Play, Loader2 } from "lucide-react";

type Props = {
  trialId: string;
};

export default function MarketExposureSummary({ trialId }: Props) {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarketExposureResult | null>(null);

  const fetchResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/market-exposure?trialId=${trialId}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const envelope: DataEnvelope<MarketExposureResult | null> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Failed to fetch market exposure results");
      }
      if (envelope.status === "not_found") {
        setResult(null);
      } else {
        setResult(envelope.value);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [trialId]);

  const handleRunAudit = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/market-exposure/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialId }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 405) {
          throw new Error(
            isKo
              ? "시장 노출 연산 권한이 없거나 비활성화되어 있습니다. LOCAL_SETTINGS_WRITE_ENABLED=true 설정이 필요합니다."
              : "Market exposure write permission is disabled. Set LOCAL_SETTINGS_WRITE_ENABLED=true in local settings."
          );
        }
        throw new Error(`API run error: ${res.status}`);
      }

      const envelope: DataEnvelope<MarketExposureResult> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Audit calculation failed");
      }

      setResult(envelope.value);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card animate-pulse flex flex-col gap-3">
        <div className="h-4 bg-kt-bg-overlay-300 w-1/4 rounded" />
        <div className="h-16 bg-kt-bg-overlay-300 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded-kt-card text-kt-negative-text flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">{error}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card flex flex-col gap-3 items-center justify-center text-center">
        <div className="flex items-center gap-2 text-xs text-kt-text-secondary">
          <Info className="w-4 h-4 text-kt-text-secondary/60" />
          <span>
            {isKo
              ? "시장 노출 감사 결과가 아직 없습니다. CLI 또는 우측 버튼을 통해 감사를 수행하십시오."
              : "No market exposure audit results found. Run audit to calculate metrics."}
          </span>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={calculating}
          className="flex items-center gap-1 px-3 py-1 bg-kt-positive hover:bg-kt-positive/90 text-white rounded-kt-pill text-xs font-semibold cursor-pointer disabled:opacity-50 select-none"
        >
          {calculating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{isKo ? "연산 중..." : "Calculating..."}</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>{isKo ? "시장 노출 감사 실행" : "Run Market Exposure Audit"}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const isMarketDependent = result.assessment === "market_dependent";
  const isPartiallyDependent = result.assessment === "partially_market_dependent";

  let assessmentBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary";
  if (isMarketDependent) {
    assessmentBadge = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
  } else if (isPartiallyDependent) {
    assessmentBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
  }

  const renderReturn = (val: number | null, percent = true) => {
    if (val === null) return "null";
    const formatted = percent ? (val * 100).toFixed(2) + "%" : val.toFixed(4);
    const isPos = val > 0;
    const isNeg = val < 0;
    return (
      <span className={isPos ? "text-kt-positive-text" : isNeg ? "text-kt-negative-text" : ""}>
        {isPos ? "+" : ""}{formatted}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-kt-bg-surface-100 border border-kt-border-panel/40 p-3 rounded-kt-card flex flex-col">
          <span className="text-[10px] text-kt-text-secondary font-medium uppercase">
            Beta
          </span>
          <span className="text-sm font-bold mt-1 font-mono">
            {renderReturn(result.beta, false)}
          </span>
        </div>

        <div className="bg-kt-bg-surface-100 border border-kt-border-panel/40 p-3 rounded-kt-card flex flex-col">
          <span className="text-[10px] text-kt-text-secondary font-medium uppercase">
            {isKo ? "상관관계" : "Correlation"}
          </span>
          <span className="text-sm font-bold mt-1 font-mono">
            {renderReturn(result.benchmarkCorrelation, false)}
          </span>
        </div>

        <div className="bg-kt-bg-surface-100 border border-kt-border-panel/40 p-3 rounded-kt-card flex flex-col">
          <span className="text-[10px] text-kt-text-secondary font-medium uppercase">
            {isKo ? "평균 초과수익" : "Avg Excess Return"}
          </span>
          <span className="text-sm font-bold mt-1 font-mono">
            {renderReturn(result.averageExcessReturn)}
          </span>
        </div>

        <div className="bg-kt-bg-surface-100 border border-kt-border-panel/40 p-3 rounded-kt-card flex flex-col justify-between">
          <span className="text-[10px] text-kt-text-secondary font-medium uppercase">
            {isKo ? "중립성 평가" : "Neutrality"}
          </span>
          <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-[3px] text-center inline-block ${assessmentBadge}`}>
            {result.assessment.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Detail Metrics Table */}
      <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel rounded-kt-card overflow-hidden">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead>
            <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
              <th className="py-2 px-3">{isKo ? "상승장 평균 수익" : "Up Market Return"}</th>
              <th className="py-2 px-3">{isKo ? "하락장 평균 수익" : "Down Market Return"}</th>
              <th className="py-2 px-3">{isKo ? "상승장 캡처 비율" : "Up Capture"}</th>
              <th className="py-2 px-3">{isKo ? "하락장 캡처 비율" : "Down Capture"}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-kt-text-primary font-mono">
              <td className="py-2.5 px-3">{renderReturn(result.upMarketAvgReturn)}</td>
              <td className="py-2.5 px-3">{renderReturn(result.downMarketAvgReturn)}</td>
              <td className="py-2.5 px-3">{renderReturn(result.upCapture)}</td>
              <td className="py-2.5 px-3">{renderReturn(result.downCapture)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Warnings & Meta Info */}
      <div className="flex flex-col gap-2 bg-kt-bg-surface-100 border border-kt-border-panel p-3 rounded-kt-card text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-kt-text-secondary font-medium">{isKo ? "경고 목록:" : "Warnings:"}</span>
          <div className="flex flex-wrap gap-1">
            {result.warnings.filter(w => w !== "sample_universe_only").map((w) => (
              <span key={w} className="px-1.5 py-0.5 bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40 rounded-[3px] font-mono text-[9px]">
                {w}
              </span>
            ))}
            {result.warnings.length === 1 && result.warnings[0] === "sample_universe_only" && (
              <span className="text-kt-text-muted/40 italic font-mono">-</span>
            )}
          </div>
        </div>
        <div className="text-[10px] text-kt-text-muted mt-1 leading-normal">
          {isKo
            ? "* 이 결과는 시장 노출 진단 도구이며, 주문 추천 및 long-short 실거래와 연동되지 않습니다."
            : "* This diagnostic is for monitoring market exposure and does not represent trading execution instructions."}
        </div>
      </div>
    </div>
  );
}
