import React from "react";
import { AlertCircle, Terminal } from "lucide-react";
import { DataStatus } from "@/domain/common/data-status";

interface BottomStatusBarProps {
  status: DataStatus;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({ status }) => {
  return (
    <footer className="h-8 px-4 bg-kt-bg-overlay-300 border-t border-kt-border-panel flex items-center justify-between text-xs text-kt-text-secondary select-none">
      <div className="flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-kt-text-muted flex-shrink-0" />
        <span className="font-semibold text-kt-text-muted">DIAGNOSTICS:</span>
        {status === "api_required" ? (
          <span className="flex items-center gap-1 text-kt-negative-text font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            외부 API 연동 누락 (DART, SEC, Market API 연결 없음)
          </span>
        ) : (
          <span className="text-kt-text-secondary">{status}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-kt-text-muted text-[10px] tabular-nums">
        <span>LOCALE: KR/US</span>
        <span>ENV: LOCAL</span>
        <span>REV: P0.0.1</span>
      </div>
    </footer>
  );
};
