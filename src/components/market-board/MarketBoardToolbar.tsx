import React from "react";
import { CommandInput } from "../ui/CommandInput";

interface MarketBoardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  sectors: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
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
  generatedAt,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card">
      <div className="flex items-center gap-4 flex-1 min-w-[280px]">
        <CommandInput
          placeholder="종목명 또는 티커 검색..."
          value={searchQuery}
          onSearch={onSearchChange}
          className="max-w-xs"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-kt-text-muted">섹터</span>
          <select
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            <option value="ALL">전체 섹터</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-kt-text-muted">정렬</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            <option value="MARKET_CAP">시가총액 순</option>
            <option value="CHANGE_PERCENT">등락률 순</option>
            <option value="VOLUME">거래량 순</option>
          </select>
        </div>
      </div>

      <div className="text-[10px] text-kt-text-muted tabular-nums">
        스냅샷 생성시각: {new Date(generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
};
