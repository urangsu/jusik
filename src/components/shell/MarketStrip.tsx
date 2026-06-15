import React from "react";
import { MetricCell } from "../ui/MetricCell";

export const MarketStrip: React.FC = () => {
  const indices = [
    { name: "KOSPI", symbol: "KOSPI" },
    { name: "KOSDAQ", symbol: "KOSDAQ" },
    { name: "S&P 500", symbol: "SPX" },
    { name: "NASDAQ", symbol: "IXIC" },
  ];

  return (
    <div className="flex items-center gap-6 px-6 py-2 bg-kt-bg-surface-100 border-b border-kt-border-panel overflow-x-auto text-xs text-kt-text-secondary select-none">
      <span className="font-medium text-kt-text-muted flex-shrink-0">MARKET PULSE</span>
      <div className="flex items-center gap-6">
        {indices.map((idx) => (
          <div key={idx.symbol} className="flex items-center gap-3 border-r border-kt-border-panel/40 pr-6 last:border-0 last:pr-0">
            <span className="font-semibold text-kt-text-primary">{idx.name}</span>
            <MetricCell value={null} status="api_required" />
          </div>
        ))}
      </div>
    </div>
  );
};
