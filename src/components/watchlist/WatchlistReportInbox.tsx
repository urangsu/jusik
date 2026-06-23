import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { WatchlistReportItem, WatchlistReportStatus } from "@/domain/watchlist/watchlist-report-item";
import { WatchlistReportItemCard } from "./WatchlistReportItemCard";
import { Inbox } from "lucide-react";

interface WatchlistReportInboxProps {
  reports: WatchlistReportItem[];
  onStatusChange: (id: string, newStatus: WatchlistReportStatus) => void;
  statusFilter: string;
  categoryFilter: string;
  severityFilter: string;
  searchFilter: string;
}

export const WatchlistReportInbox: React.FC<WatchlistReportInboxProps> = ({
  reports,
  onStatusChange,
  statusFilter,
  categoryFilter,
  severityFilter,
  searchFilter,
}) => {
  const { locale } = useI18n();

  // Apply filters
  const filteredReports = reports.filter((item) => {
    // 1. Search filter (symbol or title or summary or assetName)
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchSymbol = item.symbol.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary ? item.summary.toLowerCase().includes(q) : false;
      const matchName = item.assetName ? item.assetName.toLowerCase().includes(q) : false;

      if (!matchSymbol && !matchTitle && !matchSummary && !matchName) {
        return false;
      }
    }

    // 2. Status filter
    if (statusFilter !== "ALL") {
      if (item.status !== statusFilter) return false;
    } else {
      // By default, do not show hidden items unless explicitly filtered
      if (item.status === "hidden") return false;
    }

    // 3. Category filter
    if (categoryFilter !== "ALL") {
      if (item.category !== categoryFilter) return false;
    }

    // 4. Severity filter
    if (severityFilter !== "ALL") {
      if (item.severity !== severityFilter) return false;
    }

    return true;
  });

  if (filteredReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card text-kt-text-muted text-xs">
        <Inbox className="w-8 h-8 mb-2 opacity-50" />
        {locale === "ko" ? "조회된 리포트가 없습니다." : "No reports found."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredReports.map((item) => (
        <WatchlistReportItemCard
          key={item.id}
          item={item}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
};
