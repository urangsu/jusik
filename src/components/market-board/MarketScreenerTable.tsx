import React from "react";
import { MarketScreenerRow } from "@/domain/market-board/market-screener-row";
import { MetricCell } from "../ui/MetricCell";

interface MarketScreenerTableProps {
  rows: MarketScreenerRow[];
  onRowClick?: (row: MarketScreenerRow) => void;
}

export const MarketScreenerTable: React.FC<MarketScreenerTableProps> = ({
  rows,
  onRowClick,
}) => {
  const formatCap = (cap: number | null, isKr: boolean) => {
    if (cap === null) return null;
    if (isKr) {
      return (cap / 1e12).toFixed(1) + "조 원";
    }
    return (cap / 1e9).toFixed(1) + "B USD";
  };

  return (
    <div className="w-full flex flex-col bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 overflow-hidden h-[456px]">
      <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-2 flex-shrink-0">
        <h3 className="text-xs font-semibold text-kt-text-primary">스크리너 테이블 (Screener Table)</h3>
        <span className="text-[9px] text-kt-text-muted">검색결과: {rows.length}개 종목</span>
      </div>

      <div className="flex-1 overflow-auto mt-2 pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-kt-bg-surface-100 text-kt-text-muted border-b border-kt-border-panel/80 z-10">
            <tr>
              <th className="py-2.5 px-3 font-medium">종목코드</th>
              <th className="py-2.5 px-2 font-medium">종목명</th>
              <th className="py-2.5 px-2 font-medium">섹터</th>
              <th className="py-2.5 px-2 font-medium text-right">현재가</th>
              <th className="py-2.5 px-2 font-medium text-right">등락률</th>
              <th className="py-2.5 px-2 font-medium text-right">시가총액</th>
              <th className="py-2.5 px-2 font-medium text-right">PER</th>
              <th className="py-2.5 px-2 font-medium text-right">PBR</th>
              <th className="py-2.5 px-2 font-medium text-right">ROE</th>
              <th className="py-2.5 px-2 font-medium text-right">배당률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isKr = row.assetId.startsWith("KR");
              const changeVal = row.changePercent;
              const changeType =
                changeVal !== null && changeVal > 0
                  ? ("positive" as const)
                  : changeVal !== null && changeVal < 0
                  ? ("negative" as const)
                  : ("neutral" as const);

              const isUnofficial = row.warnings.includes("unofficial") || row.warnings.includes("personal_use_only");
              const borderStyle = isUnofficial ? "border-unofficial" : "border-b border-kt-border-panel/30";

              return (
                <tr
                  key={row.assetId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors cursor-pointer hover:bg-kt-bg-overlay-300/40 group ${borderStyle}`}
                >
                  <td className="py-2 px-3 font-semibold text-kt-text-primary tabular-nums">
                    {row.symbol}
                  </td>
                  <td className="py-2 px-2 text-kt-text-secondary truncate max-w-[90px]" title={row.name}>
                    {row.name}
                  </td>
                  <td className="py-2 px-2 text-kt-text-muted truncate max-w-[100px]" title={row.sector || ""}>
                    {row.sector || "-"}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.price}
                      status={row.dataStatus}
                      formatter={(val) =>
                        isKr
                          ? Math.round(Number(val)).toLocaleString() + "원"
                          : "$" + Number(val).toLocaleString()
                      }
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.changePercent}
                      status={row.dataStatus}
                      changeType={changeType}
                      formatter={(val) => (Number(val) > 0 ? "+" : "") + Number(val).toFixed(2) + "%"}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.marketCap}
                      status={row.dataStatus}
                      formatter={(val) => formatCap(Number(val), isKr) || ""}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.per}
                      status={row.dataStatus}
                      formatter={(val) => Number(val).toFixed(1) + "배"}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.pbr}
                      status={row.dataStatus}
                      formatter={(val) => Number(val).toFixed(2) + "배"}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.roe}
                      status={row.dataStatus}
                      formatter={(val) => Number(val).toFixed(1) + "%"}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.dividendYield}
                      status={row.dataStatus}
                      formatter={(val) => Number(val).toFixed(2) + "%"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-10 text-xs text-kt-text-muted">
            검색 결과에 부합하는 종목이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
