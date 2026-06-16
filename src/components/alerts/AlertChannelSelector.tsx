import React from "react";
import { NotificationChannelProfile } from "@/domain/alerts/alert-channel";

interface AlertChannelSelectorProps {
  channels: NotificationChannelProfile[];
  preferences: Record<string, boolean>;
  onChange: (channelId: string, enabled: boolean) => void;
}

export const AlertChannelSelector: React.FC<AlertChannelSelectorProps> = ({
  channels,
  preferences,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 max-xl:grid-cols-1">
      {channels.map((chan) => {
        const isSelected = preferences[chan.id] || false;
        const isSkeleton = ["telegram", "kakao", "email", "web_push"].includes(chan.id);

        let badgeColor = "";
        let badgeText = "";

        switch (chan.status) {
          case "enabled":
            badgeColor = "text-green-500 bg-green-500/10 border-green-500/20";
            badgeText = "활성";
            break;
          case "disabled":
            badgeColor = "text-kt-text-muted bg-kt-border-panel border-kt-border-panel";
            badgeText = "비활성";
            break;
          default:
            badgeColor = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
            badgeText = chan.status;
        }

        return (
          <div
            key={chan.id}
            className={`bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex items-start justify-between gap-4 transition-all ${
              isSelected ? "border-kt-border-panel/80 bg-kt-bg-overlay-300/10" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onChange(chan.id, e.target.checked)}
                className="w-4.5 h-4.5 rounded border-kt-border-panel bg-kt-bg-overlay-300 text-kt-positive cursor-pointer mt-0.5"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-kt-text-primary">
                    {chan.displayName}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded border ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>
                <p className="text-[10px] text-kt-text-muted leading-relaxed">
                  지원 기능: {chan.supportsMarkdown ? "마크다운, " : ""}{" "}
                  {chan.supportsImmediateDelivery ? "즉시 전송, " : "지연 발송, "}{" "}
                  {isSkeleton ? "스켈레톤(Simulated)" : "기본 활성"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
