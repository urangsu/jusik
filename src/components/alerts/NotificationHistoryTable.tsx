import React from "react";
import { NotificationDelivery } from "@/domain/alerts/alert-delivery";

interface NotificationHistoryTableProps {
  deliveries: NotificationDelivery[];
}

export const NotificationHistoryTable: React.FC<NotificationHistoryTableProps> = ({
  deliveries,
}) => {
  if (deliveries.length === 0) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-6 text-center text-kt-text-muted text-xs">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-kt-border-panel rounded-kt-card bg-kt-bg-surface-100">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-kt-border-panel bg-kt-bg-overlay-300/40 text-kt-text-muted">
            <th className="p-3 font-semibold">채널</th>
            <th className="p-3 font-semibold">제목</th>
            <th className="p-3 font-semibold">수신자</th>
            <th className="p-3 font-semibold">상태</th>
            <th className="p-3 font-semibold">일시</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((del) => {
            const dateStr = new Date(del.createdAt).toLocaleString("ko-KR");

            let statusColor = "";
            let statusLabel = "";

            switch (del.status) {
              case "sent":
                statusColor = "text-green-500 bg-green-500/10 border-green-500/20";
                statusLabel = "발송 완료";
                break;
              case "failed":
                statusColor = "text-kt-positive-text bg-kt-positive-weak border-kt-positive/20";
                statusLabel = "실패";
                break;
              case "skipped":
                statusColor = "text-kt-text-muted bg-kt-border-panel border-kt-border-panel";
                statusLabel = "보류/스킵";
                break;
              default:
                statusColor = "text-kt-text-secondary border-kt-border-panel";
                statusLabel = del.status;
            }

            return (
              <tr key={del.id} className="border-b border-kt-border-panel/40 hover:bg-kt-bg-overlay-300/10">
                <td className="p-3 font-medium text-kt-text-secondary capitalize">
                  {del.channelId === "web_inbox" ? "Inbox" : del.channelId}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-kt-text-primary">{del.title}</span>
                    {del.failureReason && (
                      <span className="text-[10px] text-kt-positive-text">
                        사유: {del.failureReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-kt-text-secondary">
                  {del.recipient || "-"}
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusColor}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="p-3 text-kt-text-muted tabular-nums">
                  {dateStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
