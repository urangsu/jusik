"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { FilingEvent } from "@/domain/filings/filing-event";
import { ArrowLeft, ExternalLink, ShieldAlert, FileText, Landmark, Clock, Loader2 } from "lucide-react";

interface FilingDetailProps {
  receiptNo: string;
}

export const FilingDetail: React.FC<FilingDetailProps> = ({ receiptNo }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [filing, setFiling] = useState<FilingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiling = async () => {
      try {
        const res = await fetch(`/api/filings/${receiptNo}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to fetch filing details");
        }
        setFiling(json.value);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchFiling();
  }, [receiptNo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-xs text-kt-text-muted">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-kt-text-secondary" />
        <span>{isKo ? "공시 정보를 불러오는 중..." : "Loading disclosure details..."}</span>
      </div>
    );
  }

  if (error || !filing) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 space-y-4 text-center">
        <div className="p-4 bg-kt-negative-weak/10 border border-kt-negative-weak rounded-kt-card text-xs text-kt-negative-text">
          {error || (isKo ? "공시 정보를 찾을 수 없습니다." : "Disclosure details not found.")}
        </div>
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-2 text-xs text-kt-text-secondary hover:text-kt-text-primary transition-colors px-3 py-1.5 rounded-kt-pill bg-kt-bg-surface-100 border border-kt-border-panel cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isKo ? "인박스로 돌아가기" : "Back to Inbox"}</span>
        </Link>
      </div>
    );
  }

  // Format YYYYMMDD to YYYY-MM-DD
  const formatDate = (dateStr: string) => {
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  };

  const getCorpClassLabel = (cc: string) => {
    switch (cc) {
      case "Y": return "KOSPI";
      case "K": return "KOSDAQ";
      case "N": return "KONEX";
      case "E":
      default:
        return "기타법인";
    }
  };

  const isWarningReport = 
    filing.reportName.includes("정정") || 
    filing.reportName.includes("소송") || 
    filing.reportName.includes("감사의견") || 
    filing.reportName.includes("상장폐지") || 
    filing.reportName.includes("횡령");

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-2 text-xs text-kt-text-secondary hover:text-kt-text-primary transition-colors px-3 py-1.5 rounded-kt-pill bg-kt-bg-surface-100 border border-kt-border-panel cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isKo ? "인박스로 돌아가기" : "Back to Inbox"}</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
        {/* Banner header */}
        <div className="p-6 bg-gradient-to-r from-kt-bg-overlay-300 to-kt-bg-surface-100 border-b border-kt-border-panel flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-kt-text-muted" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-kt-text-muted">
                {isKo ? "OpenDART 공식 공시 보고서" : "OpenDART Corporate Disclosure"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-kt-text-primary">
              {filing.corpName} <span className="text-xs text-kt-text-muted font-normal">({filing.stockCode || filing.corpCode})</span>
            </h1>
            <p className="text-xs text-kt-text-secondary font-medium">
              {filing.reportName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-kt-pill bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel">
              {getCorpClassLabel(filing.corpClass)}
            </span>
          </div>
        </div>

        {/* Highlight details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-kt-border-panel/40">
          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "접수 일자" : "Receipt Date"}
            </span>
            <div className="text-md font-bold text-kt-text-primary tabular-nums flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-kt-text-muted" />
              {formatDate(filing.receiptDate)}
            </div>
          </div>

          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "제출인" : "Filer Name"}
            </span>
            <div className="text-md font-bold text-kt-text-primary">
              {filing.filerName}
            </div>
          </div>

          <div className="bg-kt-bg-overlay-300/40 p-4 rounded-kt-card border border-kt-border-panel/50 space-y-1">
            <span className="text-[10px] text-kt-text-muted font-semibold tracking-wider block">
              {isKo ? "접수 번호" : "Receipt Number"}
            </span>
            <div className="text-md font-mono font-bold text-kt-text-primary tabular-nums">
              {filing.receiptNo}
            </div>
          </div>
        </div>

        {/* Content details and Link out */}
        <div className="p-6 space-y-6">
          <div className="bg-kt-bg-overlay-300/20 border border-kt-border-panel/40 rounded-kt-card p-6 space-y-4">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-kt-text-muted shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-kt-text-secondary">{isKo ? "공시 개요" : "Disclosure Overview"}</h4>
                <p className="text-xs text-kt-text-primary leading-relaxed">
                  {isKo
                    ? `본 공시는 OpenDART를 통해 수집된 공식 공시 보고서입니다. 상세한 세부 수치 및 전문 내용(재무제표, 감사의견, 사업보고서 등)은 아래 공식 DART 사이트 원문을 통해 확인해 주시기 바랍니다.`
                    : `This disclosure was collected from OpenDART. Full text, financial statements, or reports should be viewed directly on the official DART portal linked below.`}
                </p>
              </div>
            </div>

            {filing.remark && (
              <div className="border-t border-kt-border-panel/20 pt-3">
                <span className="text-[10px] text-kt-text-muted block font-semibold mb-1">{isKo ? "비고" : "Remark"}</span>
                <span className="text-xs text-kt-text-secondary">{filing.remark}</span>
              </div>
            )}

            <div className="border-t border-kt-border-panel/20 pt-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="text-[10px] text-kt-text-muted leading-relaxed max-w-md">
                {isKo
                  ? "저작권 및 정보 보호 정책에 의거하여 유료 리서치 정보 및 공시 원문 텍스트는 서버 내에 크롤링하여 저장하지 않습니다."
                  : "Due to data copyright policies, full disclosure texts are not crawled or stored locally."}
              </div>
              
              <a
                href={filing.filingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-kt-positive hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary px-4 py-2 border border-kt-border-panel rounded-kt-card font-semibold text-xs transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isKo ? "DART 원문 보기" : "View on DART"}</span>
              </a>
            </div>
          </div>

          {/* Attention Banner if keyword match */}
          {isWarningReport && (
            <div className="p-4 bg-kt-positive-weak/10 border border-kt-positive-weak text-xs text-kt-positive-text rounded-kt-card flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-kt-positive-text shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{isKo ? "주의 항목 공시 알림" : "Warning Disclosure Indicator"}</div>
                <div className="text-kt-text-secondary leading-relaxed">
                  {isKo
                    ? "보고서명에 정정, 소송, 감사의견, 상장폐지, 횡령 등의 민감 키워드가 포함되어 있습니다. 원문 내용을 확인하여 기업 재무 건전성 및 리스크 요인을 신중히 확인하시기 바랍니다."
                    : "This filing contains sensitive corporate risk keywords (e.g. audit opinion, embezzlement, lawsuit). Please verify the details to evaluate potential corporate health risks."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
