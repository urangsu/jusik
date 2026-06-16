import React from "react";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { AlertSeverityBadge } from "../ui/AlertSeverityBadge";

interface AlertEventListProps {
  events: AlertEvent[];
}

export const AlertEventList: React.FC<AlertEventListProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-8 text-center text-kt-text-muted">
        탐지된 알림 이벤트가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
      {events.map((evt) => {
        const dateStr = new Date(evt.createdAt).toLocaleString("ko-KR");
        return (
          <div
            key={evt.id}
            className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-2 transition-colors hover:bg-kt-bg-overlay-300/10"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertSeverityBadge severity={evt.severity} />
                <span className="text-xs font-bold text-kt-text-secondary">
                  {evt.ruleName}
                </span>
                {evt.symbol && (
                  <span className="text-[10px] text-kt-text-muted border border-kt-border-panel px-1.5 py-0.5 rounded">
                    {evt.symbol}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-kt-text-muted tabular-nums">
                {dateStr}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-kt-text-primary">
                {evt.title}
              </h4>
              <p className="text-xs text-kt-text-secondary whitespace-pre-wrap leading-relaxed">
                {evt.body}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-kt-text-muted border-t border-kt-border-panel/40 pt-2 mt-1">
              <span>출처: {evt.source} ({evt.sourceTier})</span>
              <span>데이터 상태: {evt.dataStatus}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
