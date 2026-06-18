import React from "react";
import { AlertEvent } from "../../domain/alerts/alert-event";
import { AlertSeverityBadge } from "./AlertSeverityBadge";
import { AlertRuleTypeBadge } from "./AlertRuleTypeBadge";
import { useI18n } from "../../i18n/use-i18n";
import { Check, Trash2, Calendar, FileText, Globe } from "lucide-react";

interface AlertEventCardProps {
  event: AlertEvent;
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export const AlertEventCard: React.FC<AlertEventCardProps> = ({
  event,
  onRead,
  onDismiss,
}) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const title = isKo ? event.titleKo : event.titleEn;
  const msg = isKo ? event.messageKo : event.messageEn;
  const dateStr = new Date(event.occurredAt).toLocaleString(
    isKo ? "ko-KR" : "en-US"
  );

  const isRead = !!event.readAt;
  const isDismissed = !!event.dismissedAt;

  // Render open DART link if it has sourceReceiptNo
  const dartUrl = event.sourceReceiptNo
    ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${event.sourceReceiptNo}`
    : null;

  return (
    <div
      className={`relative p-3.5 border rounded-kt-card transition-all flex flex-col gap-2 ${
        isRead
          ? "bg-kt-bg-surface-100/50 border-kt-border-panel/30 opacity-60"
          : "bg-kt-bg-surface-100 border-kt-border-panel hover:border-kt-text-secondary/30"
      }`}
    >
      {/* Upper row */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <AlertSeverityBadge severity={event.severity} />
          <AlertRuleTypeBadge ruleType={event.ruleType} />
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-kt-text-muted">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span className="tabular-nums">{dateStr}</span>
        </div>
      </div>

      {/* Title & message */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-bold text-kt-text-primary tracking-tight">
          {title}
        </h4>
        <p className="text-[11px] text-kt-text-secondary leading-relaxed whitespace-pre-wrap">
          {msg}
        </p>
      </div>

      {/* Meta tags / info row */}
      <div className="flex items-center justify-between gap-4 border-t border-kt-border-panel/30 pt-2.5 mt-1">
        <div className="flex items-center gap-2 text-[10px] text-kt-text-muted flex-wrap">
          {event.symbol && (
            <span className="bg-kt-bg-overlay-300 px-1.5 py-0.5 rounded border border-kt-border-panel/40 font-mono font-bold text-kt-text-secondary">
              {event.symbol}
            </span>
          )}
          {event.providerId && (
            <span className="bg-kt-bg-overlay-300 px-1.5 py-0.5 rounded border border-kt-border-panel/40">
              Provider: {event.providerId}
            </span>
          )}
          {event.source && (
            <span className="opacity-80">
              Source: {event.source}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {dartUrl && (
            <a
              href={dartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-kt-text-secondary bg-kt-bg-overlay-300 border border-kt-border-panel rounded hover:bg-kt-bg-overlay-300/80 cursor-pointer"
            >
              <Globe className="w-3 h-3" />
              {isKo ? "원문 보기" : "View Original"}
            </a>
          )}

          {!isRead && !isDismissed && (
            <button
              onClick={() => onRead(event.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-kt-positive border border-kt-positive/30 rounded hover:bg-kt-positive/80 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              {isKo ? "읽음" : "Read"}
            </button>
          )}

          {!isDismissed && (
            <button
              onClick={() => onDismiss(event.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-kt-text-secondary bg-kt-bg-overlay-300 border border-kt-border-panel rounded hover:bg-kt-bg-overlay-300/80 hover:text-kt-positive-text cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              {isKo ? "해제" : "Dismiss"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
