import React from "react";
import { MarketUniverseId } from "@/domain/universe/market-universe";

interface UniverseToggleProps {
  activeUniverseId: MarketUniverseId;
  onChange: (id: MarketUniverseId) => void;
}

export const UniverseToggle: React.FC<UniverseToggleProps> = ({
  activeUniverseId,
  onChange,
}) => {
  const options = [
    { id: "KOSPI_SAMPLE" as const, label: "코스피 대표" },
    { id: "SP500_SAMPLE" as const, label: "S&P 500 대표" },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-pill inline-flex">
      {options.map((opt) => {
        const isActive = opt.id === activeUniverseId;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-4 py-1 text-xs font-medium rounded-kt-pill transition-colors cursor-pointer ${
              isActive
                ? "bg-kt-bg-body text-kt-text-primary border border-kt-border-panel"
                : "text-kt-text-secondary hover:text-kt-text-primary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
