"use client";

import React, { useState, useEffect } from "react";
import { FilingEvent } from "../../domain/filings/filing-event";
import { DataEnvelope } from "../../domain/common/data-status";
import { useI18n } from "../../i18n/use-i18n";
import { FilingTypeBadge } from "./FilingTypeBadge";
import { ExternalLink, Loader2 } from "lucide-react";

interface RecentFilingsListProps {
  stockCode: string;
}

export const RecentFilingsList: React.FC<RecentFilingsListProps> = ({ stockCode }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [filings, setFilings] = useState<FilingEvent[]>([]);
  const [status, setStatus] = useState<string>("cached");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!stockCode) return;

    const fetchFilings = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/filings/recent?stockCode=${stockCode}&limit=5`);
        if (!res.ok) {
          throw new Error(`Error loading filings: ${res.statusText}`);
        }
        const envelope: DataEnvelope<FilingEvent[]> = await res.json();
        setStatus(envelope.status);
        if (envelope.value) {
          setFilings(envelope.value);
        } else {
          setFilings([]);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || String(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilings();
  }, [stockCode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-kt-text-muted gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{isKo ? "공시 정보 로드 중..." : "Loading filings..."}</span>
      </div>
    );
  }

  if (status === "api_required") {
    return (
      <div className="text-center p-6 text-xs text-kt-text-muted border border-dashed border-kt-border-panel rounded-kt-card bg-kt-bg-overlay-300/10">
        {isKo ? "OpenDART API 설정 필요" : "OpenDART API Key Required"}
      </div>
    );
  }

  if (status === "rate_limited") {
    return (
      <div className="text-center p-6 text-xs text-kt-negative-text border border-dashed border-kt-negative-text/20 rounded-kt-card bg-kt-negative-weak">
        {isKo ? "OpenDART 요청 제한" : "OpenDART API Rate Limit Exceeded"}
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-4 text-xs text-kt-negative-text border border-kt-negative-text/20 rounded-kt-card bg-kt-negative-weak">
        {errorMsg}
      </div>
    );
  }

  if (filings.length === 0) {
    return (
      <div className="text-center p-6 text-xs text-kt-text-muted border border-dashed border-kt-border-panel rounded-kt-card">
        {isKo ? "최근 공시 없음" : "No recent filings"}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-kt-border-panel text-kt-text-muted">
            <th className="py-2 font-medium">{isKo ? "접수일자" : "Date"}</th>
            <th className="py-2 font-medium">{isKo ? "회사명" : "Corp Name"}</th>
            <th className="py-2 font-medium">{isKo ? "보고서명" : "Report"}</th>
            <th className="py-2 font-medium">{isKo ? "제출인" : "Filer"}</th>
            <th className="py-2 font-medium">{isKo ? "비고" : "Remark"}</th>
            <th className="py-2 font-medium text-center">{isKo ? "원문 보기" : "View"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-kt-border-panel/40 text-kt-text-primary">
          {filings.map((f) => (
            <tr key={f.id} className="hover:bg-kt-bg-overlay-300/10 transition-colors">
              <td className="py-2 font-mono text-kt-text-secondary">
                {f.receiptDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}
              </td>
              <td className="py-2 font-medium">{f.corpName}</td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <FilingTypeBadge type={f.disclosureType} />
                  <span>{f.reportName}</span>
                </div>
              </td>
              <td className="py-2 text-kt-text-secondary">{f.filerName}</td>
              <td className="py-2 text-kt-text-muted font-mono">{f.remark || "-"}</td>
              <td className="py-2 text-center">
                <a
                  href={f.filingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center p-1 rounded hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
