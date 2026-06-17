import React from "react";
import { useI18n } from "@/i18n/use-i18n";

export type SignalBadgeType =
  | "strong_watch"
  | "watch"
  | "neutral"
  | "caution"
  | "risk"
  | "not_applicable"
  | "insufficient_data";

interface TechnicalSignalBadgeProps {
  label?: "bullish" | "bearish" | "neutral" | "insufficient_data" | SignalBadgeType;
  score?: number | null;
  className?: string;
}

export const TechnicalSignalBadge: React.FC<TechnicalSignalBadgeProps> = ({
  label,
  score,
  className = "",
}) => {
  const { locale } = useI18n();

  // Map input label/score to badge type
  let type: SignalBadgeType = "neutral";

  if (label === "insufficient_data" || score === null || score === undefined) {
    type = "insufficient_data";
  } else if (label === "bullish") {
    type = score >= 80 ? "strong_watch" : "watch";
  } else if (label === "bearish") {
    type = score <= -80 ? "risk" : "caution";
  } else if (label === "neutral") {
    type = "neutral";
  } else {
    // If a direct SignalBadgeType is passed
    type = label as SignalBadgeType;
  }

  const labelsKo: Record<SignalBadgeType, string> = {
    strong_watch: "강한 관찰",
    watch: "관찰",
    neutral: "중립",
    caution: "주의",
    risk: "위험",
    not_applicable: "적용 불가",
    insufficient_data: "데이터 부족",
  };

  const labelsEn: Record<SignalBadgeType, string> = {
    strong_watch: "Strong Watch",
    watch: "Watch",
    neutral: "Neutral",
    caution: "Caution",
    risk: "Risk",
    not_applicable: "N/A",
    insufficient_data: "No Data",
  };

  const text = locale === "ko" ? labelsKo[type] : labelsEn[type];

  // Set colors according to the KR finance convention (positive/up = red, negative/down = blue)
  let colorClasses = "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel";

  if (type === "strong_watch") {
    colorClasses = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/30 font-semibold";
  } else if (type === "watch") {
    colorClasses = "bg-kt-positive-weak/50 text-kt-positive-text border-kt-positive/20";
  } else if (type === "caution") {
    colorClasses = "bg-kt-negative-weak/50 text-kt-negative-text border-kt-negative-text/20";
  } else if (type === "risk") {
    colorClasses = "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/30 font-semibold";
  } else if (type === "insufficient_data" || type === "not_applicable") {
    colorClasses = "bg-kt-bg-surface-100 text-kt-text-muted border-kt-border-panel/40";
  }

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-kt-pill border leading-none ${colorClasses} ${className}`}
    >
      {text}
    </span>
  );
};
