import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { WatchlistReportItem } from "@/domain/watchlist/watchlist-report-item";
import { ListFilter, AlertTriangle, MessageSquare } from "lucide-react";

interface WatchlistReportSummaryProps {
  reports: WatchlistReportItem[];
}

export const WatchlistReportSummary: React.FC<WatchlistReportSummaryProps> = ({ reports }) => {
  const { locale } = useI18n();

  const total = reports.length;
  const unread = reports.filter((r) => r.status === "unread").length;
  const warnings = reports.filter((r) => r.severity === "warning" || r.severity === "critical").length;
  const archived = reports.filter((r) => r.status === "archived").length;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
        <div className="text-[10px] text-kt-text-muted font-medium mb-1">
          {locale === "ko" ? "전체 리포트" : "Total Reports"}
        </div>
        <div className="text-xl font-bold text-kt-text-primary tabular-nums">
          {total}
        </div>
      </div>

      <div className="p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
        <div className="text-[10px] text-kt-text-muted font-medium mb-1">
          {locale === "ko" ? "읽지 않음" : "Unread"}
        </div>
        <div className={`text-xl font-bold tabular-nums ${unread > 0 ? "text-kt-positive-text" : "text-kt-text-primary"}`}>
          {unread}
        </div>
      </div>

      <div className="p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
        <div className="text-[10px] text-kt-text-muted font-medium mb-1">
          {locale === "ko" ? "경고 및 심각" : "Warnings / Critical"}
        </div>
        <div className={`text-xl font-bold tabular-nums ${warnings > 0 ? "text-kt-negative-text" : "text-kt-text-primary"}`}>
          {warnings}
        </div>
      </div>

      <div className="p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
        <div className="text-[10px] text-kt-text-muted font-medium mb-1">
          {locale === "ko" ? "보관됨" : "Archived"}
        </div>
        <div className="text-xl font-bold text-kt-text-secondary tabular-nums">
          {archived}
        </div>
      </div>
    </div>
  );
};
