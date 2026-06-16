import React from "react";
import { CommandInput } from "../ui/CommandInput";
import { useI18n } from "@/i18n/use-i18n";

interface MarketBoardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  sectors: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  dataSourceFilter: string;
  onDataSourceFilterChange: (filter: string) => void;
  generatedAt: string;
}

export const MarketBoardToolbar: React.FC<MarketBoardToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedSector,
  onSectorChange,
  sectors,
  sortBy,
  onSortChange,
  dataSourceFilter,
  onDataSourceFilterChange,
  generatedAt,
}) => {
  const { t, tSector, locale } = useI18n();

  const formattedTime = new Date(generatedAt).toLocaleTimeString(
    locale === "ko" ? "ko-KR" : "en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit" }
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
      <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[280px]">
        <CommandInput
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onSearch={onSearchChange}
          className="max-w-xs"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-kt-text-muted">{t("sectorLabel")}</span>
          <select
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            <option value="ALL">{t("allSectors")}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {tSector(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-kt-text-muted">{t("filterDataSource")}</span>
          <select
            value={dataSourceFilter}
            onChange={(e) => onDataSourceFilterChange(e.target.value)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            <option value="ALL">{t("allSources")}</option>
            <option value="OFFICIAL_ONLY">{t("officialOnly")}</option>
            <option value="EXCLUDE_FALLBACK">{t("excludeFallback")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-kt-text-muted">{t("sortByLabel")}</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            <option value="MARKET_CAP">{locale === "ko" ? "시가총액 순" : "Market Cap"}</option>
            <option value="CHANGE_PERCENT">{locale === "ko" ? "등락률 순" : "Change %"}</option>
            <option value="VOLUME">{locale === "ko" ? "거래량 순" : "Volume"}</option>
          </select>
        </div>
      </div>

      <div className="text-[10px] text-kt-text-muted tabular-nums">
        {t("generatedAt")} {formattedTime}
      </div>
    </div>
  );
};
