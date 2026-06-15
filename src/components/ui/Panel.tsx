import React from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  headerAction?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ children, title, headerAction, className = "", ...props }) => {
  return (
    <div
      className={`bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden flex flex-col h-full ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-kt-border-panel bg-kt-bg-overlay-300/40">
          {title && <h3 className="text-sm font-semibold text-kt-text-primary">{title}</h3>}
          {headerAction && <div className="text-xs">{headerAction}</div>}
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto">{children}</div>
    </div>
  );
};
