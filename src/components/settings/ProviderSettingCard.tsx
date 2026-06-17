import React, { useState, useEffect } from "react";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { ProviderSettingDefinition } from "../../domain/settings/provider-setting-definition";
import { SecretInput } from "./SecretInput";
import { useI18n } from "../../i18n/use-i18n";
import { getProviderStatusLabel } from "../../i18n/provider-labels";
import { CheckCircle, XCircle, Play, Save, Loader2, AlertCircle } from "lucide-react";

interface ProviderSettingCardProps {
  snapshot: ProviderSettingSnapshot;
  definition: ProviderSettingDefinition;
  onSave: (providerId: string, values: Record<string, any>) => Promise<void>;
  onTestConnection: (providerId: string) => Promise<void>;
}

export const ProviderSettingCard: React.FC<ProviderSettingCardProps> = ({
  snapshot,
  definition,
  onSave,
  onTestConnection,
}) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form values from snapshot
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    for (const field of definition.fields) {
      const snapVal = snapshot.values[field.key];
      if (field.secret) {
        // Secrets are not put in clear text in state unless user types a new one
        initialValues[field.key] = "";
      } else {
        initialValues[field.key] = snapVal !== undefined ? snapVal : (field.defaultValue ?? "");
      }
    }
    setFormValues(initialValues);
  }, [snapshot, definition]);

  const handleFieldChange = (key: string, val: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Filter out empty secret values (so we don't overwrite configured secrets with empty string)
      const valuesToSubmit: Record<string, any> = {};
      for (const field of definition.fields) {
        const val = formValues[field.key];
        if (field.secret) {
          if (val && val.trim().length > 0) {
            valuesToSubmit[field.key] = val;
          }
        } else {
          valuesToSubmit[field.key] = val;
        }
      }
      await onSave(definition.providerId, valuesToSubmit);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Handled in parent or console
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTestConnection(definition.providerId);
    } catch (err) {
      // Handled
    } finally {
      setIsTesting(false);
    }
  };

  const isHealthy = snapshot.status === "healthy" || snapshot.status === "configured";
  const statusLabel = getProviderStatusLabel(snapshot.status, locale);

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel/80 rounded-kt-card p-4 flex flex-col gap-3 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-kt-border-panel/40 pb-2.5">
        <div>
          <h3 className="text-xs font-bold text-kt-text-primary tracking-tight">
            {definition.displayName}
          </h3>
          <p className="text-[10px] text-kt-text-muted mt-0.5">
            {isKo ? definition.descriptionKo : definition.descriptionEn}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isHealthy ? (
            <CheckCircle className="w-3.5 h-3.5 text-kt-negative-text flex-shrink-0" />
          ) : snapshot.status === "not_configured" ? (
            <AlertCircle className="w-3.5 h-3.5 text-kt-text-muted flex-shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-kt-positive-text flex-shrink-0" />
          )}
          <span
            className={`text-[10px] font-bold ${
              isHealthy
                ? "text-kt-negative-text"
                : snapshot.status === "not_configured"
                ? "text-kt-text-muted"
                : "text-kt-positive-text"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Main configuration fields */}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {definition.fields.map((field) => {
            const valueKey = field.key;
            const label = isKo ? field.labelKo : field.labelEn;

            return (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-kt-text-secondary">
                  {label}
                  {field.required && <span className="text-kt-negative-text ml-0.5">*</span>}
                </label>

                {field.type === "boolean" ? (
                  <div className="flex items-center h-7">
                    <input
                      type="checkbox"
                      id={`chk-${field.key}`}
                      checked={!!formValues[field.key]}
                      onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                ) : field.secret ? (
                  <SecretInput
                    value={snapshot.values[field.key] as any}
                    onChange={(val) => handleFieldChange(field.key, val)}
                    placeholder={isKo ? `${label} 입력` : `Enter ${label}`}
                  />
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={formValues[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1 text-xs rounded border border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary focus:outline-none focus:border-kt-text-secondary transition-colors"
                  />
                ) : (
                  <input
                    type="text"
                    value={formValues[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-1.5 text-xs rounded border border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary focus:outline-none focus:border-kt-text-secondary transition-colors"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Diagnostic log metadata */}
        {snapshot.lastCheckedAt && (
          <div className="text-[9px] text-kt-text-muted mt-1 bg-kt-bg-overlay-300/10 p-1.5 rounded border border-kt-border-panel/40 flex flex-col gap-0.5 leading-normal">
            <div>
              <span className="font-semibold">{isKo ? "진단 메시지:" : "Diagnostics:"}</span>{" "}
              {snapshot.message || (isKo ? "진단 기록 없음" : "No message")}
            </div>
            <div>
              <span className="font-semibold">{isKo ? "마지막 점검:" : "Last checked:"}</span>{" "}
              {new Date(snapshot.lastCheckedAt).toLocaleString(isKo ? "ko-KR" : "en-US")}
            </div>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-end gap-2 border-t border-kt-border-panel/40 pt-2.5 mt-2">
          {definition.healthCheckSupported && (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || isSaving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-kt-text-secondary border border-kt-border-panel rounded hover:bg-kt-bg-overlay-300 hover:text-kt-text-primary disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isTesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isKo ? "연결 테스트" : "Test Connection"}
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-kt-bg-body bg-kt-text-primary rounded hover:bg-kt-text-secondary disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {saveSuccess ? (isKo ? "저장 완료!" : "Saved!") : (isKo ? "설정 저장" : "Save Settings")}
          </button>
        </div>
      </form>
    </div>
  );
};
