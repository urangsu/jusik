import React from "react";
import { MarketScreenerRow } from "@/domain/market-board/market-screener-row";
import { MetricCell } from "../ui/MetricCell";
import { useI18n } from "@/i18n/use-i18n";
import { getMetricLabel } from "@/i18n/metric-labels";
import {
  formatMarketCap,
  formatPrice,
  formatPercent,
  formatMultiple,
  formatMultipleTwoDecimals,
  formatPercentShort,
} from "@/i18n/formatters";

interface MarketScreenerTableProps {
  rows: MarketScreenerRow[];
  onRowClick?: (row: MarketScreenerRow) => void;
  momentumScores?: Record<
    string,
    { short: number | null; medium: number | null; long: number | null }
  >;
}

export const MarketScreenerTable: React.FC<MarketScreenerTableProps> = ({
  rows,
  onRowClick,
  momentumScores,
}) => {
  const { t, tSector, locale } = useI18n();

  const labels = {
    ticker: t("colTicker"),
    name: t("colName"),
    sector: t("colSector"),
    price: getMetricLabel("PRICE", locale),
    change: getMetricLabel("CHANGE_PERCENT", locale),
    cap: getMetricLabel("MARKET_CAP", locale),
    per: getMetricLabel("PER", locale),
    pbr: getMetricLabel("PBR", locale),
    roe: getMetricLabel("ROE", locale),
    div: getMetricLabel("DIVIDEND_YIELD", locale),
  };

  return (
    <div className="w-full flex flex-col bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 overflow-hidden h-[456px]">
      <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-2 flex-shrink-0">
        <h3 className="text-xs font-semibold text-kt-text-primary">
          {locale === "ko" ? "스크리너 테이블 (Screener Table)" : "Screener Table"}
        </h3>
        <span className="text-[9px] text-kt-text-muted">
          {locale === "ko" ? `검색결과: ${rows.length}개 종목` : `Results: ${rows.length} stocks`}
        </span>
      </div>

      <div className="flex-1 overflow-auto mt-2 pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-kt-bg-surface-100 text-kt-text-muted border-b border-kt-border-panel/80 z-10">
            <tr>
              <th className="py-2.5 px-3 font-medium">{labels.ticker}</th>
              <th className="py-2.5 px-2 font-medium">{labels.name}</th>
              <th className="py-2.5 px-2 font-medium">{labels.sector}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.price.full}>{labels.price.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.change.full}>{labels.change.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.cap.full}>{labels.cap.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.per.full}>{labels.per.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.pbr.full}>{labels.pbr.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.roe.full}>{labels.roe.short}</th>
              <th className="py-2.5 px-2 font-medium text-right" title={labels.div.full}>{labels.div.short}</th>
              <th className="py-2.5 px-2 font-medium text-right">{locale === "ko" ? "단기" : "Short"}</th>
              <th className="py-2.5 px-2 font-medium text-right">{locale === "ko" ? "중기" : "Medium"}</th>
              <th className="py-2.5 px-2 font-medium text-right">{locale === "ko" ? "장기" : "Long"}</th>
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
                  <td className="py-2 px-2 text-kt-text-muted truncate max-w-[100px]" title={tSector(row.sector)}>
                    {tSector(row.sector) || "-"}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.price}
                      status={row.dataStatus}
                      formatter={(val) => formatPrice(Number(val), isKr, locale)}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.changePercent}
                      status={row.dataStatus}
                      changeType={changeType}
                      formatter={(val) => formatPercent(Number(val))}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.marketCap}
                      status={row.dataStatus}
                      formatter={(val) => formatMarketCap(Number(val), isKr, locale)}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.per}
                      status={row.dataStatus}
                      formatter={(val) => formatMultiple(Number(val), locale)}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.pbr}
                      status={row.dataStatus}
                      formatter={(val) => formatMultipleTwoDecimals(Number(val), locale)}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.roe}
                      status={row.dataStatus}
                      formatter={(val) => formatPercentShort(Number(val))}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <MetricCell
                      value={row.dividendYield}
                      status={row.dataStatus}
                      formatter={(val) => formatPercentShort(Number(val))}
                    />
                  </td>
                  {(() => {
                    const mScores = momentumScores?.[row.assetId];
                    const renderScore = (score: number | null | undefined) => {
                      if (score === undefined || score === null) return <span className="text-kt-text-muted">-</span>;
                      const color = score > 0 ? "text-kt-positive-text" : score < 0 ? "text-kt-negative-text" : "text-kt-text-primary";
                      return <span className={`${color} font-semibold tabular-nums`}>{score > 0 ? "+" : ""}{score}</span>;
                    };
                    return (
                      <>
                        <td className="py-2 px-2 text-right">{renderScore(mScores?.short)}</td>
                        <td className="py-2 px-2 text-right">{renderScore(mScores?.medium)}</td>
                        <td className="py-2 px-2 text-right">{renderScore(mScores?.long)}</td>
                      </>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-10 text-xs text-kt-text-muted">
            {locale === "ko" ? "검색 결과에 부합하는 종목이 없습니다." : "No stocks matching search criteria."}
          </div>
        )}
      </div>
    </div>
  );
};
