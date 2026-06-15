import React from "react";
import { Search } from "lucide-react";

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSearch, className = "", ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <div className={`relative flex items-center bg-kt-bg-overlay-300 border border-kt-border-panel rounded-kt-card px-3 py-1.5 focus-within:border-kt-text-muted/50 transition-colors ${className}`}>
      <Search className="w-4 h-4 text-kt-text-muted mr-2 flex-shrink-0" />
      <input
        type="text"
        className="w-full bg-transparent text-sm text-kt-text-primary placeholder-kt-text-muted border-none focus:outline-none"
        onChange={handleChange}
        {...props}
      />
    </div>
  );
};
