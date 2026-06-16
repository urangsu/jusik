import React from "react";
import { MarketMapTile } from "@/domain/market-board/market-map-tile";

interface MarketHeatmapProps {
  tiles: MarketMapTile[];
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ tiles }) => {
  // Group tiles by sector
  const sectorsMap: Record<string, MarketMapTile[]> = {};
  tiles.forEach((tile) => {
    const sector = tile.sector || "기타";
    if (!sectorsMap[sector]) {
      sectorsMap[sector] = [];
    }
    sectorsMap[sector].push(tile);
  });

  const sectors = Object.keys(sectorsMap);

  return (
    <div className="w-full flex flex-col gap-3 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4">
      <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-2">
        <h3 className="text-xs font-semibold text-kt-text-primary">시장 트리맵 (Market Heatmap)</h3>
        <span className="text-[9px] text-kt-text-muted">시가총액 규모 비중 기준</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-1">
        {sectors.map((sector) => {
          const sectorTiles = sectorsMap[sector];
          const totalCap = sectorTiles.reduce((acc, t) => acc + (t.marketCap || 0), 0);

          return (
            <div
              key={sector}
              className="border border-kt-border-panel rounded-kt-card bg-kt-bg-body/30 p-2 flex flex-col gap-1.5 h-[185px]"
            >
              <span className="text-[10px] font-bold text-kt-text-secondary truncate">
                {sector}
              </span>

              <div className="flex-1 flex flex-wrap gap-1 overflow-hidden">
                {sectorTiles.map((tile) => {
                  const percent = tile.changePercent;
                  const isUp = percent !== null && percent > 0;
                  const isDown = percent !== null && percent < 0;

                  let bgClass = "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel/40";
                  if (isUp) bgClass = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/10";
                  if (isDown) bgClass = "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/10";

                  const isUnofficial = tile.warnings.includes("unofficial") || tile.warnings.includes("personal_use_only");
                  const borderClass = isUnofficial ? "border-unofficial" : "border";

                  // Flex-grow factor (min: 1, max: 6)
                  const sizeWeight = totalCap > 0 && tile.marketCap
                    ? Math.max(1, Math.min(6, Math.round((tile.marketCap / totalCap) * 10)))
                    : 1;

                  return (
                    <div
                      key={tile.symbol}
                      style={{ flexGrow: sizeWeight }}
                      className={`h-10 min-w-[48px] p-1 flex flex-col justify-center rounded text-center transition-colors select-none ${bgClass} ${borderClass}`}
                      title={`${tile.name} (${tile.symbol})\n등락률: ${percent !== null ? percent.toFixed(2) + "%" : "N/A"}\n시총: ${tile.marketCap ? (tile.marketCap / 1e12).toFixed(1) + "T" : "N/A"}\n출처: ${tile.source}`}
                    >
                      <div className="text-[9px] font-semibold tracking-tight truncate tabular-nums">
                        {tile.symbol}
                      </div>
                      <div className="text-[8px] font-medium tracking-tighter tabular-nums mt-0.5">
                        {percent !== null ? (percent > 0 ? "+" : "") + percent.toFixed(2) + "%" : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
