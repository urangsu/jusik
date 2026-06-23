import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { WatchlistReportStatus, WatchlistReportCategory, WatchlistReportSeverity } from "@/domain/watchlist/watchlist-report-item";
import { Search } from "lucide-react";

interface WatchlistReportFiltersProps {
  status: string;
  category: string;
  severity: string;
  search: string;
  onStatusChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onSeverityChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

export const WatchlistReportFilters: React.FC<WatchlistReportFiltersProps> = ({
  status,
  category,
  severity,
  search,
  onStatusChange,
  onCategoryChange,
  onSeverityChange,
  onSearchChange,
}) => {
  const { locale } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-kt-text-muted">
          <Search className="w-3.5 h-3.5" />
        </span>
        <input
          type="text"
          placeholder={locale === "ko" ? "종목코드/명 검색..." : "Search code/name..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary pl-9 pr-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40"
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-kt-text-muted font-medium">
          {locale === "ko" ? "상태" : "Status"}
        </span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
        >
          <option value="ALL">{locale === "ko" ? "전체 상태" : "All Status"}</option>
          <option value="unread">{locale === "ko" ? "읽지 않음" : "Unread"}</option>
          <option value="read">{locale === "ko" ? "읽음" : "Read"}</option>
          <option value="archived">{locale === "ko" ? "보관됨" : "Archived"}</option>
          <option value="hidden">{locale === "ko" ? "숨김" : "Hidden"}</option>
        </select>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-kt-text-muted font-medium">
          {locale === "ko" ? "카테고리" : "Category"}
        </span>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
        >
          <option value="ALL">{locale === "ko" ? "전체 카테고리" : "All Categories"}</option>
          <option value="filing">{locale === "ko" ? "공시" : "Filings"}</option>
          <option value="internal_research">{locale === "ko" ? "내부 연구 기록" : "Internal Research"}</option>
          <option value="signal">{locale === "ko" ? "신호 사후검토" : "Signal Postmortem"}</option>
          <option value="backtest">{locale === "ko" ? "백테스트 결과" : "Backtest Results"}</option>
          <option value="provider">{locale === "ko" ? "제공자 정보" : "Provider Health"}</option>
          <option value="data_quality">{locale === "ko" ? "데이터 경고" : "Data Quality"}</option>
          <option value="manual">{locale === "ko" ? "수동 등록 링크" : "Manual Import"}</option>
        </select>
      </div>

      {/* Severity Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-kt-text-muted font-medium">
          {locale === "ko" ? "심각도" : "Severity"}
        </span>
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
          className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
        >
          <option value="ALL">{locale === "ko" ? "전체 심각도" : "All Severities"}</option>
          <option value="info">INFO</option>
          <option value="watch">WATCH</option>
          <option value="warning">WARNING</option>
          <option value="critical">CRITICAL</option>
        </select>
      </div>
    </div>
  );
};
