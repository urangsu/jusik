import React from "react";

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const DataCard: React.FC<DataCardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-card p-4 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
