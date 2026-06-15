import React from "react";

interface TabItem {
  id: string;
  label: string;
}

interface PillTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const PillTabs: React.FC<PillTabsProps> = ({ tabs, activeTabId, onChange, className = "" }) => {
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-pill ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-1 text-xs font-medium rounded-kt-pill transition-colors cursor-pointer ${
              isActive
                ? "bg-kt-bg-body text-kt-text-primary border border-kt-border-panel"
                : "text-kt-text-secondary hover:text-kt-text-primary hover:bg-kt-bg-body/40"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
