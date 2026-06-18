"use client";

import React, { useState, useEffect } from "react";
import { AlertPreference } from "../../domain/alerts/alert-preference";
import { AlertRuleType } from "../../domain/alerts/alert-rule-type";
import { AlertSeverity } from "../../domain/alerts/alert-severity";
import { AlertInbox } from "./AlertInbox";
import { useI18n } from "../../i18n/use-i18n";
import { Settings, Volume2, ShieldAlert, CheckSquare, Square, RefreshCw, Loader2, Save } from "lucide-react";

export const AlertSettingsPage: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [prefs, setPrefs] = useState<AlertPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshInboxTrigger, setRefreshInboxTrigger] = useState(0);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.value || data); // handle DataEnvelope or fallback
      }
    } catch (err) {
      console.error("Failed to fetch alert preferences", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/alerts/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.value || data);
        setSaveSuccess(true);
        setRefreshInboxTrigger((prev) => prev + 1);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleType = (ruleType: AlertRuleType) => {
    if (!prefs) return;
    const current = prefs.enabledRuleTypes || [];
    const updated = current.includes(ruleType)
      ? current.filter((t) => t !== ruleType)
      : [...current, ruleType];
    setPrefs({ ...prefs, enabledRuleTypes: updated });
  };

  const toggleChannel = (channel: keyof AlertPreference["channels"]) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      channels: {
        ...prefs.channels,
        [channel]: !prefs.channels[channel],
      },
    });
  };

  if (!prefs) {
    return (
      <div className="flex-1 flex items-center justify-center text-kt-text-muted text-xs p-8 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{isKo ? "알림 설정 로딩 중..." : "Loading alert settings..."}</span>
      </div>
    );
  }

  const ruleTypes: { id: AlertRuleType; label: string }[] = [
    { id: "price_cross", label: isKo ? "가격 돌파" : "Price Cross" },
    { id: "return_zscore", label: isKo ? "이상 등락" : "Price Volatility" },
    { id: "volume_zscore", label: isKo ? "거래량 이상" : "Volume Spike" },
    { id: "gap_move", label: isKo ? "갭 변동" : "Gap Move" },
    { id: "new_filing", label: isKo ? "새 공시 수집" : "New Filing" },
    { id: "provider_error", label: isKo ? "제공자 오류" : "Provider Error" },
    { id: "provider_rate_limited", label: isKo ? "요청 한도 초과" : "Rate Limited" },
    { id: "provider_invalid_key", label: isKo ? "인증키 오류" : "Invalid Key" },
    { id: "technical_signal_change", label: isKo ? "기술 신호 변화" : "Technical Signal Change" },
    { id: "momentum_score_change", label: isKo ? "모멘텀 점수 변화" : "Momentum Change" },
    { id: "reliability_deterioration", label: isKo ? "신뢰도 악화" : "Reliability Deterioration" },
    { id: "backtest_job_failed", label: isKo ? "백테스트 실패" : "Backtest Failed" },
    { id: "data_quality", label: isKo ? "데이터 품질" : "Data Quality" },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto max-lg:px-2 text-kt-text-primary bg-kt-bg-body leading-normal">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left Column: Preferences Form (Span 5) */}
        <form
          onSubmit={handleSavePreferences}
          className="col-span-5 max-xl:col-span-12 flex flex-col gap-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-kt-text-secondary" />
              <h3 className="text-sm font-bold">
                {isKo ? "글로벌 알림 환경 설정" : "Global Alert Preferences"}
              </h3>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-kt-bg-body bg-kt-text-primary rounded hover:bg-kt-text-secondary cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveSuccess ? (isKo ? "저장됨!" : "Saved!") : (isKo ? "설정 저장" : "Save Settings")}
            </button>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between bg-kt-bg-overlay-300/10 p-2.5 rounded border border-kt-border-panel/40">
            <span className="text-xs font-bold text-kt-text-primary">
              {isKo ? "실시간 알림 감지 활성화" : "Enable Real-time Alerts"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-kt-border-panel rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-kt-positive"></div>
            </label>
          </div>

          {/* Min Severity & Cooldown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-kt-text-secondary">
                {isKo ? "최소 감지 심각도" : "Minimum Severity"}
              </label>
              <select
                value={prefs.minSeverity}
                onChange={(e) => setPrefs({ ...prefs, minSeverity: e.target.value as AlertSeverity })}
                className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-3 py-1.5 text-xs text-kt-text-primary focus:outline-none focus:border-kt-text-secondary cursor-pointer h-8"
              >
                <option value="info">{isKo ? "정보 (Info)" : "Info"}</option>
                <option value="watch">{isKo ? "관찰 (Watch)" : "Watch"}</option>
                <option value="warning">{isKo ? "주의 (Warning)" : "Warning"}</option>
                <option value="critical">{isKo ? "위험 (Critical)" : "Critical"}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-kt-text-secondary">
                {isKo ? "알림 쿨다운 (분)" : "Cooldown (Minutes)"}
              </label>
              <input
                type="number"
                value={prefs.cooldownMinutes}
                onChange={(e) => setPrefs({ ...prefs, cooldownMinutes: parseInt(e.target.value, 10) || 0 })}
                className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary focus:outline-none focus:border-kt-text-secondary h-8"
              />
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="flex flex-col gap-2.5 bg-kt-bg-overlay-300/10 p-3 rounded border border-kt-border-panel/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-kt-text-primary flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-kt-text-muted" />
                {isKo ? "무음 시간 설정 (Quiet Hours)" : "Quiet Hours"}
              </span>
              <input
                type="checkbox"
                checked={prefs.quietHours.enabled}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    quietHours: { ...prefs.quietHours, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
              />
            </div>

            {prefs.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-kt-text-muted">{isKo ? "시작 시각 (HH:mm)" : "Start Time"}</span>
                  <input
                    type="text"
                    value={prefs.quietHours.start}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        quietHours: { ...prefs.quietHours, start: e.target.value },
                      })
                    }
                    className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-2.5 py-1 text-xs text-kt-text-primary"
                    placeholder="23:00"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-kt-text-muted">{isKo ? "종료 시각 (HH:mm)" : "End Time"}</span>
                  <input
                    type="text"
                    value={prefs.quietHours.end}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        quietHours: { ...prefs.quietHours, end: e.target.value },
                      })
                    }
                    className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-2.5 py-1 text-xs text-kt-text-primary"
                    placeholder="07:00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delivery Channels */}
          <div className="flex flex-col gap-2.5 bg-kt-bg-overlay-300/10 p-3 rounded border border-kt-border-panel/40">
            <span className="text-xs font-bold text-kt-text-primary flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-kt-text-muted" />
              {isKo ? "수신 채널 활성화" : "Active Channels"}
            </span>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <label className="flex items-center gap-2 text-xs text-kt-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.channels.webInbox}
                  onChange={() => toggleChannel("webInbox")}
                  className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
                />
                {isKo ? "웹 수신함" : "Web Inbox"}
              </label>

              <label className="flex items-center gap-2 text-xs text-kt-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.channels.console}
                  onChange={() => toggleChannel("console")}
                  className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
                />
                {isKo ? "콘솔 터미널" : "Console Log"}
              </label>

              <label className="flex items-center gap-2 text-xs text-kt-text-muted select-none">
                <input
                  type="checkbox"
                  checked={prefs.channels.telegram}
                  onChange={() => toggleChannel("telegram")}
                  className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
                />
                {isKo ? "텔레그램 (P1)" : "Telegram (P1)"}
              </label>

              <label className="flex items-center gap-2 text-xs text-kt-text-muted select-none">
                <input
                  type="checkbox"
                  checked={prefs.channels.email}
                  onChange={() => toggleChannel("email")}
                  className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
                />
                {isKo ? "SMTP 이메일 (P1)" : "SMTP Email (P1)"}
              </label>
            </div>
          </div>

          {/* Enabled Rule Types Checkboxes */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">
              {isKo ? "감지 대상 규칙 유형" : "Enabled Rule Types"}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-kt-bg-overlay-300/10 p-3 rounded border border-kt-border-panel/40 max-h-[280px] overflow-y-auto pr-1">
              {ruleTypes.map((t) => {
                const isChecked = (prefs.enabledRuleTypes || []).includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 text-xs text-kt-text-secondary cursor-pointer select-none hover:text-kt-text-primary py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRuleType(t.id)}
                      className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary cursor-pointer"
                    />
                    {t.label}
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* Right Column: Alert Inbox (Span 7) */}
        <div className="col-span-7 max-xl:col-span-12 h-[calc(100vh-140px)] min-h-[500px]">
          <AlertInbox onRefreshTrigger={() => setRefreshInboxTrigger((prev) => prev + 1)} />
        </div>
      </div>
    </div>
  );
};
