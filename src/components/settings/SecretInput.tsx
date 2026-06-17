import React from "react";

interface SecretInputProps {
  value: { configured: boolean; maskedValue: string | null } | null | string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SecretInput: React.FC<SecretInputProps> = ({
  value,
  onChange,
  placeholder = "API Key 입력",
}) => {
  const isConfigured =
    value && typeof value === "object" && "configured" in value
      ? value.configured
      : false;
  const maskedVal =
    value && typeof value === "object" && "maskedValue" in value
      ? value.maskedValue
      : null;

  const displayPlaceholder = isConfigured
    ? `설정됨: ${maskedVal || "********"}`
    : placeholder;

  return (
    <input
      type="password"
      autoComplete="off"
      placeholder={displayPlaceholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1.5 text-xs rounded border border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary placeholder:text-kt-text-muted focus:outline-none focus:border-kt-text-secondary transition-colors"
    />
  );
};
