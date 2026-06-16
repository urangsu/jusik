"use client";

import React, { useState, useEffect } from "react";
import { AlertRule } from "@/domain/alerts/alert-rule";
import { NotificationPreference } from "@/domain/alerts/alert-preference";
import { NotificationChannelProfile } from "@/domain/alerts/alert-channel";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationDelivery } from "@/domain/alerts/alert-delivery";
import { AlertRuleEditor } from "./AlertRuleEditor";
import { AlertEventList } from "./AlertEventList";
import { AlertChannelSelector } from "./AlertChannelSelector";
import { AnomalyRuleCard } from "./AnomalyRuleCard";
import { NotificationHistoryTable } from "./NotificationHistoryTable";
import { Bell, ShieldAlert, Settings, Volume2, RefreshCw, Send, Plus, Trash2, Edit } from "lucide-react";

export const AlertSettingsPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [channels, setChannels] = useState<NotificationChannelProfile[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);

  // UI state
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testTitle, setTestTitle] = useState("테스트 경보");
  const [testBody, setTestBody] = useState("정상 작동 중입니다.");
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [prefRes, chanRes, ruleRes, eventRes, delRes] = await Promise.all([
        fetch("/api/alerts/preferences"),
        fetch("/api/notifications/channels"),
        fetch("/api/alerts/rules"),
        fetch("/api/alerts/events"),
        fetch("/api/notifications/history"),
      ]);

      if (prefRes.ok) setPreferences(await prefRes.json());
      if (chanRes.ok) {
        const data = await chanRes.json();
        setChannels(data.channels || []);
      }
      if (ruleRes.ok) {
        const data = await ruleRes.json();
        setRules(data.rules || []);
      }
      if (eventRes.ok) {
        const data = await eventRes.json();
        setEvents(data.events || []);
      }
      if (delRes.ok) {
        const data = await delRes.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error("Failed to load alerts dashboard data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleSavePreference = async (updates: Partial<NotificationPreference>) => {
    try {
      const res = await fetch("/api/alerts/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setPreferences(await res.json());
      }
    } catch (err) {
      console.error("Failed to update preferences", err);
    }
  };

  const handleChannelPreferenceChange = async (channelId: string, enabled: boolean) => {
    if (!preferences) return;
    const updatedChannelPreferences = {
      ...preferences.channelPreferences,
      [channelId]: enabled,
    };
    await handleSavePreference({ channelPreferences: updatedChannelPreferences });
  };

  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule) {
        // Edit mode
        const res = await fetch(`/api/alerts/rules/${editingRule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ruleData),
        });
        if (res.ok) {
          setEditingRule(null);
          fetchData();
        }
      } else {
        // Add mode
        const res = await fetch("/api/alerts/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ruleData),
        });
        if (res.ok) {
          setShowAddForm(false);
          fetchData();
        }
      }
    } catch (err) {
      console.error("Failed to save rule", err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("이 알림 규칙을 정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/alerts/rules/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete rule", err);
    }
  };

  const handleTriggerEvaluate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/evaluate", { method: "POST" });
      if (res.ok) {
        alert("알림 규칙 평가 완료!");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to evaluate rules", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testTitle,
          body: testBody,
          severity: "info",
        }),
      });
      if (res.ok) {
        alert("테스트 알림 발송 요청 성공!");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to send test notification", err);
    }
  };

  if (!preferences) {
    return (
      <div className="flex-1 flex items-center justify-center text-kt-text-muted text-xs p-8">
        알림 시스템 정보를 로드하고 있습니다...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto max-lg:px-4 text-kt-text-primary bg-kt-bg-body">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-kt-border-panel pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-kt-positive-text" />
          <h2 className="text-xl font-bold">알림 및 규칙 엔진 제어판</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-kt-pill bg-kt-bg-overlay-300 border border-kt-border-panel hover:bg-kt-bg-overlay-300/80 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-kt-text-secondary" />
            새로고침
          </button>
          <button
            onClick={handleTriggerEvaluate}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-kt-pill bg-kt-positive text-white hover:bg-kt-positive/90 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            수동 평가 실행
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Preferences, Channels, Guides (Span 4) */}
        <div className="col-span-4 max-xl:col-span-12 flex flex-col gap-6">
          {/* Preferences Card */}
          <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-kt-border-panel/40 pb-2">
              <Settings className="w-4 h-4 text-kt-text-secondary" />
              <h3 className="font-bold text-xs">글로벌 환경 설정</h3>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-kt-text-secondary">글로벌 알림 수신 여부</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.globalEnabled}
                  onChange={(e) => handleSavePreference({ globalEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-kt-border-panel rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-kt-positive"></div>
              </label>
            </div>

            {/* Quiet Hours Settings */}
            <div className="flex flex-col gap-2 bg-kt-bg-overlay-300/20 p-3 rounded border border-kt-border-panel/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-kt-text-secondary flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-kt-text-muted" />
                  무음 시간 설정 (Quiet Hours)
                </span>
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={(e) =>
                    handleSavePreference({
                      quietHours: { ...preferences.quietHours, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded border-kt-border-panel bg-kt-bg-overlay-300 text-kt-positive cursor-pointer"
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-kt-text-muted">시작 시각</span>
                    <input
                      type="text"
                      placeholder="23:00"
                      value={preferences.quietHours.start}
                      onChange={(e) =>
                        handleSavePreference({
                          quietHours: { ...preferences.quietHours, start: e.target.value },
                        })
                      }
                      className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2 py-1 text-xs text-kt-text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-kt-text-muted">종료 시각</span>
                    <input
                      type="text"
                      placeholder="07:00"
                      value={preferences.quietHours.end}
                      onChange={(e) =>
                        handleSavePreference({
                          quietHours: { ...preferences.quietHours, end: e.target.value },
                        })
                      }
                      className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2 py-1 text-xs text-kt-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Alert Sender */}
            <div className="flex flex-col gap-2 bg-kt-bg-overlay-300/20 p-3 rounded border border-kt-border-panel/60">
              <span className="text-xs font-bold text-kt-text-secondary flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-kt-text-muted" />
                테스트 알림 발송
              </span>
              <div className="flex flex-col gap-1.5 mt-1">
                <input
                  type="text"
                  placeholder="테스트 제목"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2 py-1 text-xs text-kt-text-primary"
                />
                <textarea
                  placeholder="테스트 내용"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={2}
                  className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2 py-1 text-xs text-kt-text-primary resize-none"
                />
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="w-full py-1 bg-kt-bg-overlay-300 hover:bg-kt-bg-overlay-300/80 border border-kt-border-panel rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  보내기
                </button>
              </div>
            </div>
          </div>

          {/* Active Channels Card */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-kt-text-secondary uppercase tracking-wider">
              활성 알림 수신 채널 설정
            </h3>
            <AlertChannelSelector
              channels={channels}
              preferences={preferences.channelPreferences}
              onChange={handleChannelPreferenceChange}
            />
          </div>

          {/* Anomaly Detection Guide */}
          <AnomalyRuleCard />
        </div>

        {/* Center Column: Rules List & Editor (Span 4) */}
        <div className="col-span-4 max-xl:col-span-12 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-kt-text-secondary uppercase tracking-wider">
              알림 규칙 관리 ({rules.length})
            </h3>
            {!showAddForm && !editingRule && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-kt-pill bg-kt-bg-overlay-300 border border-kt-border-panel hover:bg-kt-bg-overlay-300/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-kt-text-secondary" />
                새 규칙
              </button>
            )}
          </div>

          {/* Render editor if editing or adding */}
          {(showAddForm || editingRule) && (
            <AlertRuleEditor
              rule={editingRule}
              onSave={handleSaveRule}
              onCancel={() => {
                setEditingRule(null);
                setShowAddForm(false);
              }}
            />
          )}

          {/* Rules List */}
          <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
            {rules.map((rule) => {
              const isEnabled = rule.enabled;
              return (
                <div
                  key={rule.id}
                  className={`bg-kt-bg-surface-100 border rounded-kt-card p-4 flex flex-col gap-2 transition-colors ${
                    isEnabled ? "border-kt-border-panel" : "border-kt-border-panel/40 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isEnabled ? "bg-green-500 animate-pulse" : "bg-kt-text-muted"
                        }`}
                      />
                      <span className="font-bold text-xs text-kt-text-primary">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-1 hover:bg-kt-bg-overlay-300 rounded cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-kt-text-muted" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 hover:bg-kt-bg-overlay-300 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-kt-positive-text" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-kt-text-secondary leading-relaxed bg-kt-bg-overlay-300/10 p-2.5 rounded border border-kt-border-panel/40">
                    <div>
                      <span className="font-semibold text-kt-text-muted">유형:</span> {rule.type}
                    </div>
                    <div>
                      <span className="font-semibold text-kt-text-muted">범위:</span> {rule.scope}{" "}
                      {rule.target?.universeId ? `(${rule.target.universeId})` : ""}
                    </div>
                    <div>
                      <span className="font-semibold text-kt-text-muted">경로:</span>{" "}
                      {rule.channels.join(", ")}
                    </div>
                    {rule.cooldownMinutes > 0 && (
                      <div>
                        <span className="font-semibold text-kt-text-muted">쿨다운:</span>{" "}
                        {rule.cooldownMinutes}분
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Events and Delivery logs (Span 4) */}
        <div className="col-span-4 max-xl:col-span-12 flex flex-col gap-6">
          {/* Active Events Log */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-kt-text-secondary uppercase tracking-wider">
              최근 감지된 경보 이벤트
            </h3>
            <AlertEventList events={events} />
          </div>

          {/* Delivery History */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-kt-text-secondary uppercase tracking-wider">
              최근 알림 발송 이력 (Delivery Log)
            </h3>
            <NotificationHistoryTable deliveries={deliveries} />
          </div>
        </div>
      </div>
    </div>
  );
};
