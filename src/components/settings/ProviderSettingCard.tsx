import React, { useState, useEffect } from "react";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { ProviderSettingDefinition, ProviderSettingField } from "../../domain/settings/provider-setting-definition";
import { SecretInput } from "./SecretInput";
import { useI18n } from "../../i18n/use-i18n";
import { getProviderStatusLabel } from "../../i18n/provider-labels";
import { CheckCircle, XCircle, Play, Save, Loader2, AlertCircle, Info } from "lucide-react";

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
    } catch {
      // Handled
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTestConnection(definition.providerId);
    } catch {
      // Handled
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = snapshot.status !== "not_configured" && snapshot.status !== "credentials_missing" && snapshot.status !== "disabled";
  const isHealthy = snapshot.status === "healthy";
  const isUnverified = snapshot.status === "configured" || snapshot.status === "unverified";

  const renderField = (field: ProviderSettingField) => {
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
  };

  const requiredFields = definition.fields.filter(
    (f) => f.key !== "KIS_ACCOUNT_NO" && f.key !== "KIS_ACCOUNT_PRODUCT_CODE"
  );
  const optionalAccountFields = definition.fields.filter(
    (f) => f.key === "KIS_ACCOUNT_NO" || f.key === "KIS_ACCOUNT_PRODUCT_CODE"
  );

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

        {/* Separated Configuration & Connection Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Storage status */}
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
              isConfigured
                ? "bg-kt-bg-surface-200 border-kt-border-panel text-kt-text-secondary"
                : "bg-kt-bg-surface-200 border-kt-border-panel/40 text-kt-text-muted"
            }`}
          >
            {isKo ? (isConfigured ? "설정 저장됨" : "미입력") : (isConfigured ? "Configured" : "Unconfigured")}
          </span>

          {/* Health status */}
          <div className="flex items-center gap-1">
            {isHealthy ? (
              <CheckCircle className="w-3.5 h-3.5 text-kt-negative-text flex-shrink-0" />
            ) : isUnverified ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-kt-positive-text flex-shrink-0" />
            )}
            <span
              className={`text-[10px] font-bold ${
                isHealthy
                  ? "text-kt-negative-text"
                  : isUnverified
                  ? "text-amber-400"
                  : "text-kt-positive-text"
              }`}
            >
              {getProviderStatusLabel(snapshot.status, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Main configuration fields */}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {definition.providerId === "kis" ? (
          <>
            {/* Market Data Auth Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-kt-text-primary uppercase tracking-wider">
                {isKo ? "시세 데이터 인증 (필수)" : "Market Data Credentials"}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requiredFields.map(renderField)}
              </div>
            </div>

            {/* Account Info Optional Section */}
            {optionalAccountFields.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-kt-border-panel/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">
                    {isKo ? "계좌 조회 기능용 (선택)" : "Account Details (Optional)"}
                  </span>
                  <span className="text-[9px] text-kt-text-muted">
                    {isKo ? "* 시세 조회의 연결 테스트에는 계좌번호가 필요하지 않습니다." : "* Account details optional for quote tests"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {optionalAccountFields.map(renderField)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {definition.fields.map(renderField)}
          </div>
        )}

        {/* Diagnostic log metadata */}
        {snapshot.lastCheckedAt && (
          <div className="text-[9px] text-kt-text-muted mt-1 bg-kt-bg-overlay-300/10 p-2 rounded border border-kt-border-panel/40 flex flex-col gap-0.5 leading-normal">
            <div className="flex items-center gap-1.5">
              <Info className="w-3 h-3 text-kt-text-muted flex-shrink-0" />
              <span className="font-semibold">{isKo ? "진단 결과:" : "Diagnostics:"}</span>{" "}
              <span>{snapshot.message || (isKo ? "진단 기록 없음" : "No message")}</span>
            </div>
            <div className="text-[9px] text-kt-text-muted pl-4">
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
