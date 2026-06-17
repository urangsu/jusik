import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface FactorDataStatusBadgeProps {
  status: "eod" | "cached" | "real_time" | "delayed" | string;
  sourceTier?: string;
  warnings?: string[];
  className?: string;
}

export const FactorDataStatusBadge: React.FC<FactorDataStatusBadgeProps> = ({
  status,
  sourceTier,
  warnings = [],
  className = "",
}) => {
  const { locale } = useI18n();

  const isEod = status === "eod" || status === "cached";
  const isPersonal = sourceTier === "personal_fallback" || warnings.includes("personal_use_only");

  const textsKo = {
    eod: "종가 확정 (EOD)",
    intraday: "장중 임시 (Live)",
    personal: "개인 fallback 데이터",
    unofficial: "비공식",
  };

  const textsEn = {
    eod: "EOD Final",
    intraday: "Intraday Temp",
    personal: "Personal Fallback",
    unofficial: "Unofficial",
  };

  const texts = locale === "ko" ? textsKo : textsEn;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* EOD vs Intraday Badge */}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border rounded-kt-pill leading-none ${
          isEod
            ? "bg-kt-bg-surface-200 text-kt-text-secondary border-kt-border-panel/40"
            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
        }`}
      >
        {isEod ? texts.eod : texts.intraday}
      </span>

      {/* Personal Fallback warning badge */}
      {isPersonal && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border rounded-kt-pill bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/20 leading-none">
          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
          {texts.personal}
        </span>
      )}

      {/* Unofficial warning badge */}
      {warnings.includes("unofficial") && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border rounded-kt-pill bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel/30 leading-none">
          {texts.unofficial}
        </span>
      )}
    </div>
  );
};
