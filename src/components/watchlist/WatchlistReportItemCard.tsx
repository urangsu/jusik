import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { WatchlistReportItem, WatchlistReportStatus } from "@/domain/watchlist/watchlist-report-item";
import { ExternalLink, ArrowRight, Check, Archive, EyeOff, AlertTriangle, Info, Clock, Loader2 } from "lucide-react";

interface WatchlistReportItemCardProps {
  item: WatchlistReportItem;
  onStatusChange: (id: string, newStatus: WatchlistReportStatus) => void;
}

export const WatchlistReportItemCard: React.FC<WatchlistReportItemCardProps> = ({ item, onStatusChange }) => {
  const { locale } = useI18n();
  const [updating, setUpdating] = useState(false);

  const changeStatus = async (targetStatus: WatchlistReportStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/watchlist/reports/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update status.");
      onStatusChange(item.id, targetStatus);
    } catch (err) {
      alert(err || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Severity badges styling following KR finance color convention (positive/up = red, negative/down = blue)
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "critical":
        // Positive/Up = red (critical)
        return "text-kt-positive-text bg-kt-positive-weak";
      case "warning":
        // Negative/Down = blue (warning)
        return "text-kt-negative-text bg-kt-negative-weak";
      case "watch":
        return "text-kt-text-primary border border-kt-border-panel";
      case "info":
      default:
        return "text-kt-text-muted bg-kt-bg-overlay-300";
    }
  };

  const getCategoryLabel = (cat: string) => {
    if (locale === "ko") {
      switch (cat) {
        case "filing":
          return "공시";
        case "internal_research":
          return "내부 연구 기록";
        case "signal":
          return "신호 사후검토";
        case "backtest":
          return "백테스트";
        case "provider":
          return "제공자";
        case "data_quality":
          return "데이터 경고";
        case "manual":
          return "수동 등록 링크";
        default:
          return cat;
      }
    } else {
      switch (cat) {
        case "filing":
          return "Filing";
        case "internal_research":
          return "Internal Research";
        case "signal":
          return "Signal";
        case "backtest":
          return "Backtest";
        case "provider":
          return "Provider";
        case "data_quality":
          return "Data Quality";
        case "manual":
          return "Manual";
        default:
          return cat;
      }
    }
  };

  const formattedDate = new Date(item.detectedAt).toLocaleString(
    locale === "ko" ? "ko-KR" : "en-US",
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }
  );

  return (
    <div
      className={`p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card transition space-y-3 relative ${
        item.status === "read" ? "opacity-60" : "opacity-100"
      }`}
    >
      {updating && (
        <div className="absolute inset-0 bg-kt-bg-body/40 flex items-center justify-center rounded-kt-card z-10">
          <Loader2 className="w-5 h-5 animate-spin text-kt-text-muted" />
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-kt-text-primary tabular-nums">
            {item.symbol}
          </span>
          <span className="text-[10px] text-kt-text-muted">
            {item.assetName}
          </span>
          <span className={`px-2 py-0.5 rounded-kt-pill text-[9px] font-bold uppercase ${getSeverityStyle(item.severity)}`}>
            {item.severity}
          </span>
          <span className="px-2 py-0.5 rounded-kt-pill text-[9px] bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel">
            {getCategoryLabel(item.category)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-kt-text-muted tabular-nums">
          <Clock className="w-3 h-3" />
          {formattedDate}
        </div>
      </div>

      {/* Card Content */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-kt-text-primary">
          {item.title}
        </h4>
        {item.summary && (
          <p className="text-[11px] text-kt-text-secondary leading-relaxed">
            {item.summary}
          </p>
        )}
      </div>

      {/* Details/Source Tier & Warnings */}
      <div className="flex flex-col gap-1 text-[10px] text-kt-text-muted">
        <div className="flex items-center gap-1">
          <span>Source:</span>
          <span className="font-semibold text-kt-text-secondary">{item.source.sourceTitle}</span>
          <span className="px-1 bg-kt-bg-overlay-300 rounded text-[9px] text-kt-text-muted border border-kt-border-panel">
            {item.source.sourceTier}
          </span>
        </div>
        {item.source.warnings.length > 0 && (
          <div className="flex items-center gap-1 text-kt-negative-text font-medium bg-kt-negative-weak/40 px-2 py-0.5 rounded-kt-card w-fit border border-kt-negative-weak">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>{item.source.warnings.join(", ")}</span>
          </div>
        )}
      </div>

      <hr className="border-kt-border-panel/40" />

      {/* Card Actions */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Navigation Links */}
        <div className="flex items-center gap-3">
          {item.source.sourceUrl && (
            <a
              href={item.source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-kt-text-muted hover:text-kt-text-primary transition font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{locale === "ko" ? "원문 보기" : "View Original"}</span>
            </a>
          )}

          {item.source.internalUrl && (
            <Link
              href={item.source.internalUrl}
              className="flex items-center gap-1 text-[11px] text-kt-positive-text hover:text-white transition font-medium"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{locale === "ko" ? "상세 보기" : "View Detail"}</span>
            </Link>
          )}
        </div>

        {/* State Modifiers */}
        <div className="flex items-center gap-1.5">
          {item.status === "unread" ? (
            <button
              onClick={() => changeStatus("read")}
              title={locale === "ko" ? "읽음 처리" : "Mark Read"}
              className="p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-bg-body text-kt-text-secondary hover:text-kt-text-primary cursor-pointer border border-kt-border-panel text-[10px] flex items-center gap-1 px-2"
            >
              <Check className="w-3 h-3" />
              <span>{locale === "ko" ? "읽음" : "Read"}</span>
            </button>
          ) : (
            <button
              onClick={() => changeStatus("unread")}
              title={locale === "ko" ? "읽지 않음 처리" : "Mark Unread"}
              className="p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-bg-body text-kt-text-muted hover:text-kt-text-secondary cursor-pointer border border-kt-border-panel text-[10px] flex items-center gap-1 px-2"
            >
              <Clock className="w-3 h-3" />
              <span>{locale === "ko" ? "안 읽음" : "Unread"}</span>
            </button>
          )}

          {item.status !== "archived" && (
            <button
              onClick={() => changeStatus("archived")}
              title={locale === "ko" ? "보관 처리" : "Archive"}
              className="p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-bg-body text-kt-text-secondary hover:text-kt-text-primary cursor-pointer border border-kt-border-panel text-[10px] flex items-center gap-1 px-2"
            >
              <Archive className="w-3 h-3" />
              <span>{locale === "ko" ? "보관" : "Archive"}</span>
            </button>
          )}

          {item.status !== "hidden" && (
            <button
              onClick={() => changeStatus("hidden")}
              title={locale === "ko" ? "숨김 처리" : "Hide"}
              className="p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-bg-body text-kt-text-secondary hover:text-kt-text-primary cursor-pointer border border-kt-border-panel text-[10px] flex items-center gap-1 px-2"
            >
              <EyeOff className="w-3 h-3" />
              <span>{locale === "ko" ? "숨김" : "Hide"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
