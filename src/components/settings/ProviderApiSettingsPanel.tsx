import React, { useState, useEffect } from "react";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { PROVIDER_SETTING_DEFINITIONS } from "../../domain/settings/provider-setting-definition";
import { ProviderSettingCard } from "./ProviderSettingCard";
import { useI18n } from "../../i18n/use-i18n";
import { Loader2, ShieldAlert } from "lucide-react";
import { OperationalSmokePanel } from "../ops/OperationalSmokePanel";
import { ProviderReadinessPanel } from "../ops/ProviderReadinessPanel";

export const ProviderApiSettingsPanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [settings, setSettings] = useState<ProviderSettingSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings/providers");
      if (!res.ok) {
        throw new Error(`Failed to load settings: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && data.value) {
        setSettings(data.value);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (providerId: string, values: Record<string, any>) => {
    try {
      const res = await fetch(`/api/settings/providers/${providerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Failed to save settings: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && data.value) {
        setSettings((prev) =>
          prev.map((s) => (s.providerId === providerId ? data.value : s))
        );
      }
    } catch (err: any) {
      alert(isKo ? `저장 실패: ${err.message}` : `Save failed: ${err.message}`);
      throw err;
    }
  };

  const handleTestConnection = async (providerId: string) => {
    try {
      const res = await fetch(`/api/settings/providers/${providerId}/health-check`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Health check failed: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && data.value) {
        setSettings((prev) =>
          prev.map((s) => (s.providerId === providerId ? data.value : s))
        );
      }
    } catch (err: any) {
      alert(isKo ? `테스트 실패: ${err.message}` : `Test failed: ${err.message}`);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-kt-text-muted" />
        <span className="text-xs text-kt-text-muted">
          {isKo ? "설정 불러오는 중..." : "Loading settings..."}
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-4 m-4 text-xs text-kt-negative-text border border-kt-negative-text/20 rounded-kt-card bg-kt-negative-weak">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
      {/* Help Banner */}
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-kt-text-muted mt-0.5 flex-shrink-0" />
          <div className="text-xs leading-normal">
            <span className="font-bold block text-kt-text-primary">
              {isKo ? "데이터 공급자 API 설정 센터" : "Data Provider API Settings Center"}
            </span>
            <p className="text-[10px] text-kt-text-secondary mt-0.5 max-w-2xl leading-normal">
              {isKo
                ? "K-Terminal에서 사용하는 외부 데이터 서비스의 인증키 및 연결 상태를 한 곳에서 확인하고 관리합니다. 입력된 API Key는 로컬 보안 저장소에 암호화/격리 보존되며, 브라우저에는 마스킹된 앞뒤 문자만 전달됩니다."
                : "Manage API keys and check connection health for external data services in one place. Keys are kept in a local secret store, and only masked values are exposed in browser requests."}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Provider Cards */}
      <div className="flex flex-col gap-4">
        {PROVIDER_SETTING_DEFINITIONS.map((def) => {
          const snap = settings.find((s) => s.providerId === def.providerId) || {
            providerId: def.providerId,
            enabled: false,
            values: {},
            status: "not_configured",
            lastCheckedAt: null,
            message: null,
          };

          return (
            <ProviderSettingCard
              key={def.providerId}
              snapshot={snap}
              definition={def}
              onSave={handleSave}
              onTestConnection={handleTestConnection}
            />
          );
        })}
      </div>

      {/* Operational Smoke Check */}
      <OperationalSmokePanel />

      {/* Provider Configuration Readiness */}
      <ProviderReadinessPanel />
    </div>
  );
};
