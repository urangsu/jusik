"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { SignalPostmortem } from "@/domain/strategy/signal-postmortem";
import { ArrowLeft, Activity, ShieldAlert, Award, Clock, FileText, CheckCircle2 } from "lucide-react";

interface SignalPostmortemDetailProps {
  postmortem: SignalPostmortem;
}

export const SignalPostmortemDetail: React.FC<SignalPostmortemDetailProps> = ({ postmortem }) => {
  const { locale } = useI18n();

  const isKo = locale === "ko";

  // Formatter helpers
  const formatPercent = (val: number | null) => {
    if (val === null) return "N/A";
    const pct = val * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };

  const getReturnColorClass = (val: number | null) => {
    if (val === null || val === 0) return "text-kt-text-secondary";
    return val > 0 ? "text-kt-positive-text font-bold" : "text-kt-negative-text font-bold";
  };

  const getOutcomeBadgeClass = (outcome: string) => {
    switch (outcome) {
      case "positive":
        return "bg-kt-positive-weak text-kt-positive-text border-kt-positive-weak";
      case "negative":
        return "bg-kt-negative-weak text-kt-negative-text border-kt-negative-weak";
      case "missing_price":
      case "not_evaluable":
      default:
        return "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-2 text-xs text-kt-text-secondary hover:text-kt-text-primary transition-colors px-3 py-1.5 rounded-kt-pill bg-kt-bg-surface-100 border border-kt-border-panel cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isKo ? "인박스로 돌아가기" : "Back to Inbox"}</span>
        </Link>
      </div>

      {/* Main Container */}
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-kt-bg-overlay-300 to-kt-bg-surface-100 border-b border-kt-border-panel flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-kt-positive-text" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-kt-text-muted">
                {isKo ? "신호 사후검토 보고서" : "Signal Postmortem Diagnostic"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-kt-text-primary tabular-nums">
              {postmortem.symbol} / {postmortem.strategyId}
            </h1>
            <p className="text-xs text-kt-text-secondary">
              ID: <span className="tabular-nums font-mono">{postmortem.id}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-kt-pill border uppercase ${getOutcomeBadgeClass(postmortem.outcome)}`}>
              {postmortem.outcome}
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-kt-pill bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel">
              {postmortem.status}
            </span>
          </div>
        </div>

        {/* Diagnostic Metadata Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-kt-border-panel/40">
          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "순위 및 점수" : "Rank & Score"}
            </span>
            <div className="text-lg font-bold text-kt-text-primary tabular-nums">
              Rank #{postmortem.rank} <span className="text-xs font-normal text-kt-text-secondary">({postmortem.signalScore.toFixed(4)})</span>
            </div>
          </div>

          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "백테스트 윈도우 인덱스" : "Backtest Window Index"}
            </span>
            <div className="text-lg font-bold text-kt-text-primary tabular-nums">
              Window #{postmortem.windowIndex}
            </div>
          </div>

          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "테스트 실행 기간" : "Test Evaluation Period"}
            </span>
            <div className="text-xs text-kt-text-primary tabular-nums font-mono space-y-0.5">
              <div>Start: {postmortem.testStart}</div>
              <div>End: {postmortem.testEnd}</div>
            </div>
          </div>
        </div>

        {/* Detailed Prices & Returns */}
        <div className="p-6 space-y-6">
          <h3 className="text-sm font-bold text-kt-text-primary border-l-2 border-kt-positive-text pl-2">
            {isKo ? "가격 및 수익률 상세 정보" : "Prices & Returns Evaluation"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entry exit details */}
            <div className="bg-kt-bg-overlay-300/20 border border-kt-border-panel/40 rounded-kt-card p-4 space-y-3">
              <h4 className="text-xs font-bold text-kt-text-secondary mb-2">{isKo ? "매매 정보" : "Execution Details"}</h4>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "진입 일자" : "Entry Date"}</span>
                <span className="tabular-nums font-medium text-kt-text-secondary">{postmortem.entryDate}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "진입 가격" : "Entry Price"}</span>
                <span className="tabular-nums font-medium text-kt-text-secondary">
                  {postmortem.entryPrice !== null ? postmortem.entryPrice.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "청산 일자" : "Exit Date"}</span>
                <span className="tabular-nums font-medium text-kt-text-secondary">{postmortem.exitDate || "N/A"}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-kt-text-muted">{isKo ? "청산 가격" : "Exit Price"}</span>
                <span className="tabular-nums font-medium text-kt-text-secondary">
                  {postmortem.exitPrice !== null ? postmortem.exitPrice.toLocaleString() : "N/A"}
                </span>
              </div>
            </div>

            {/* Return details */}
            <div className="bg-kt-bg-overlay-300/20 border border-kt-border-panel/40 rounded-kt-card p-4 space-y-3">
              <h4 className="text-xs font-bold text-kt-text-secondary mb-2">{isKo ? "수익률 정보" : "Performance Metrics"}</h4>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "총 수익률 (Gross Return)" : "Gross Return"}</span>
                <span className={`tabular-nums ${getReturnColorClass(postmortem.grossReturn)}`}>
                  {formatPercent(postmortem.grossReturn)}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "순 수익률 (Net Return)" : "Net Return"}</span>
                <span className={`tabular-nums ${getReturnColorClass(postmortem.netReturn)}`}>
                  {formatPercent(postmortem.netReturn)}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-kt-border-panel/20">
                <span className="text-kt-text-muted">{isKo ? "벤치마크 수익률" : "Benchmark Return"}</span>
                <span className={`tabular-nums ${getReturnColorClass(postmortem.benchmarkReturn)}`}>
                  {formatPercent(postmortem.benchmarkReturn)}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-kt-text-muted">{isKo ? "초과 수익률 (Excess Return)" : "Excess Return"}</span>
                <span className={`tabular-nums ${getReturnColorClass(postmortem.excessReturn)}`}>
                  {formatPercent(postmortem.excessReturn)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings and Bias checks */}
        {(postmortem.dataWarnings.length > 0 || postmortem.biasWarnings.length > 0) && (
          <div className="p-6 bg-kt-positive-weak/10 border-t border-kt-border-panel/40 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-kt-positive-text flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isKo ? "데이터 경고 및 이상 정보" : "Data Integrity Warnings"}</span>
              </h4>
              {postmortem.dataWarnings.length > 0 ? (
                <ul className="text-xs text-kt-text-secondary list-disc pl-4 space-y-1">
                  {postmortem.dataWarnings.map((w, idx) => (
                    <li key={idx} className="tabular-nums">{w}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-kt-text-muted italic">{isKo ? "발견된 데이터 이상 없음" : "No integrity warnings."}</span>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-kt-positive-text flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isKo ? "Data Snooping / Bias 검토" : "Bias & Snooping Warnings"}</span>
              </h4>
              {postmortem.biasWarnings.length > 0 ? (
                <ul className="text-xs text-kt-text-secondary list-disc pl-4 space-y-1">
                  {postmortem.biasWarnings.map((w, idx) => (
                    <li key={idx} className="tabular-nums">{w}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-kt-text-muted italic">{isKo ? "발견된 Bias 이상 없음" : "No bias warnings."}</span>
              )}
            </div>
          </div>
        )}

        {/* Review Notes */}
        <div className="p-6 border-t border-kt-border-panel/40 bg-kt-bg-overlay-300/10 space-y-3">
          <h4 className="text-xs font-bold text-kt-text-secondary flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-kt-text-muted" />
            <span>{isKo ? "사후검토 연구 피드백" : "Postmortem Review Notes"}</span>
          </h4>
          <div className="p-4 bg-kt-bg-overlay-300/30 border border-kt-border-panel/50 rounded-kt-card text-xs text-kt-text-primary leading-relaxed whitespace-pre-wrap">
            {postmortem.reviewNotes || (isKo ? "사후검토 피드백 및 코멘트가 작성되지 않았습니다." : "No review notes registered.")}
          </div>
        </div>
      </div>
    </div>
  );
};
