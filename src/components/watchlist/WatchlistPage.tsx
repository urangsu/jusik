"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";
import { WatchlistReportItem, WatchlistReportStatus } from "@/domain/watchlist/watchlist-report-item";
import { WatchlistTable } from "./WatchlistTable";
import { AddWatchlistAssetForm } from "./AddWatchlistAssetForm";
import { WatchlistReportSummary } from "./WatchlistReportSummary";
import { WatchlistReportFilters } from "./WatchlistReportFilters";
import { WatchlistReportInbox } from "./WatchlistReportInbox";
import { RefreshCw, Play, Loader2, Info, AlertTriangle } from "lucide-react";

interface WatchlistPageProps {
  onRefreshUnreadCount?: () => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onRefreshUnreadCount }) => {
  const { locale } = useI18n();

  // Data states
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [reports, setReports] = useState<WatchlistReportItem[]>([]);

  // Loading states
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [aggregateResult, setAggregateResult] = useState<{
    created: number;
    skippedDuplicate: number;
  } | null>(null);
  const [aggregateError, setAggregateError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  const fetchWatchlist = async () => {
    try {
      const res = await fetch("/api/watchlist");
      const json = await res.json();
      if (res.ok) {
        setWatchlist(json.value || []);
      }
    } catch (err) {
      console.error("Failed to fetch watchlist", err);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/watchlist/reports?includeHidden=true");
      const json = await res.json();
      if (res.ok) {
        setReports(json.value || []);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    fetchReports();
  }, []);

  const handleAddSuccess = (newItem: WatchlistItem) => {
    setWatchlist((prev) => [...prev, newItem]);
    // Trigger auto-aggregate for this new asset
    triggerAggregate(newItem.assetId);
  };

  const handleRemoveSuccess = (assetId: string) => {
    setWatchlist((prev) => prev.filter((i) => i.assetId !== assetId));
  };

  const handleUpdateSuccess = (updatedItem: WatchlistItem) => {
    setWatchlist((prev) => prev.map((i) => (i.assetId === updatedItem.assetId ? updatedItem : i)));
  };

  const handleReportStatusChange = (id: string, newStatus: WatchlistReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    onRefreshUnreadCount?.();
  };

  const triggerAggregate = async (specificAssetId?: string) => {
    setAggregating(true);
    setAggregateResult(null);
    setAggregateError(null);
    try {
      const res = await fetch("/api/watchlist/reports/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: specificAssetId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Aggregation failed.");
      }
      
      const { created, skippedDuplicate } = json.value;
      setAggregateResult({ created, skippedDuplicate });
      
      // Re-fetch reports to show new items
      await fetchReports();
      onRefreshUnreadCount?.();
    } catch (err: any) {
      let msg = err?.message || String(err) || "";
      if (msg.includes("LOCAL_SETTINGS_WRITE_ENABLED=true") || msg.includes("Settings write route") || msg.includes("disabled") || msg.includes("forbidden")) {
        msg = locale === "ko"
          ? "LOCAL_SETTINGS_WRITE_ENABLED=true 필요. 수집 실행 권한이 비활성화되어 있습니다."
          : "LOCAL_SETTINGS_WRITE_ENABLED=true is required. Aggregation write operation is disabled.";
      } else {
        msg = locale === "ko"
          ? "리포트 수집 중 오류가 발생했습니다."
          : "An error occurred during report aggregation.";
      }
      setAggregateError(msg);
    } finally {
      setAggregating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-kt-border-panel">
        <div>
          <h1 className="text-2xl font-bold text-kt-text-primary tracking-tight">
            {locale === "ko" ? "관심종목 리포트 인박스" : "Watchlist Report Inbox"}
          </h1>
          <p className="text-xs text-kt-text-muted mt-1">
            {locale === "ko"
              ? "관심종목으로 등록한 자산의 공시, 내부 분석 보고서, 신호 검토 기록을 모아봅니다."
              : "Consolidated events, filings, and internal reports for your watched assets."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {aggregateResult && (
            <div className="text-[11px] text-kt-text-secondary bg-kt-bg-surface-100 border border-kt-border-panel px-3 py-1.5 rounded-kt-card tabular-nums">
              {locale === "ko"
                ? `수집 완료: 신규 ${aggregateResult.created}건 / 중복 제외 ${aggregateResult.skippedDuplicate}건`
                : `Aggregated: ${aggregateResult.created} new / ${aggregateResult.skippedDuplicate} skipped`}
            </div>
          )}

          <button
            onClick={() => triggerAggregate()}
            disabled={aggregating}
            className="flex items-center gap-2 bg-kt-negative hover:bg-kt-bg-overlay-300 disabled:opacity-50 text-kt-text-secondary hover:text-kt-text-primary font-medium px-4 py-2 border border-kt-border-panel rounded-kt-card transition cursor-pointer text-xs"
          >
            {aggregating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{locale === "ko" ? "이벤트 수집 실행" : "Run Aggregator"}</span>
          </button>
        </div>
      </div>

      {aggregateError && (
        <div className="p-3.5 bg-kt-negative-weak/20 border border-kt-negative-weak text-xs text-kt-negative-text rounded-kt-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-kt-negative-text shrink-0" />
            <span>{aggregateError}</span>
          </div>
          <button
            onClick={() => setAggregateError(null)}
            className="text-kt-text-muted hover:text-kt-text-primary transition font-bold px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <WatchlistReportSummary reports={reports} />

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Watchlist List & Form */}
        <div className="lg:col-span-1 space-y-6">
          <AddWatchlistAssetForm onSuccess={handleAddSuccess} />

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-kt-text-primary">
              {locale === "ko" ? "관심종목 목록" : "Watched Assets"}
            </h3>
            {loadingWatchlist ? (
              <div className="p-8 text-center text-xs text-kt-text-muted">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading watchlist...
              </div>
            ) : (
              <WatchlistTable
                items={watchlist}
                onRemove={handleRemoveSuccess}
                onUpdate={handleUpdateSuccess}
              />
            )}
          </div>
        </div>

        {/* Right pane: Filters & Report Inbox cards */}
        <div className="lg:col-span-2 space-y-6">
          <WatchlistReportFilters
            status={statusFilter}
            category={categoryFilter}
            severity={severityFilter}
            search={searchFilter}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
            onSeverityChange={setSeverityFilter}
            onSearchChange={setSearchFilter}
          />

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-kt-text-primary">
              {locale === "ko" ? "수집된 리포트 피드" : "Report Feed"}
            </h3>

            {loadingReports ? (
              <div className="p-12 text-center text-xs text-kt-text-muted bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading reports...
              </div>
            ) : (
              <WatchlistReportInbox
                reports={reports}
                onStatusChange={handleReportStatusChange}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                severityFilter={severityFilter}
                searchFilter={searchFilter}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quant Logic Warning Banner */}
      <div className="p-4 bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-card flex items-start gap-3">
        <Info className="w-5 h-5 text-kt-text-muted mt-0.5 shrink-0" />
        <div className="text-[11px] text-kt-text-muted leading-relaxed">
          <p className="font-semibold text-kt-text-secondary mb-1">
            {locale === "ko" ? "알림 및 보고서 수집 정책 안내" : "Report Inbox Policy"}
          </p>
          {locale === "ko" ? (
            <ul className="list-disc pl-4 space-y-1">
              <li>본 화면은 관심종목(Watchlist)으로 등록된 자산군과 관련된 내부/외부 이벤트를 진단 목적으로 수집하여 제공합니다.</li>
              <li>어떠한 매수/매도 권유나 투자 추천 신호(Buy/Sell Instruction)를 포함하지 않으며, 실거래 또는 모의 매매 연동을 지원하지 않습니다.</li>
              <li>저작권 문제가 있는 외부 리포트 전문 및 뉴스 본문은 수집 또는 저장하지 않으며 원문 링크로만 연동됩니다.</li>
            </ul>
          ) : (
            <ul className="list-disc pl-4 space-y-1">
              <li>This inbox displays diagnostic alerts and internal logs associated with your watched assets.</li>
              <li>It does not present buy/sell instructions, recommended trades, or integrate with broker trading interfaces.</li>
              <li>No third-party report copies or news articles are archived; only verified external URLs are linked.</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
export default WatchlistPage;
