import React, { useState, useEffect } from "react";
import { AlertEvent } from "../../domain/alerts/alert-event";
import { AlertRuleType } from "../../domain/alerts/alert-rule-type";
import { AlertSeverity } from "../../domain/alerts/alert-severity";
import { AlertEventCard } from "./AlertEventCard";
import { useI18n } from "../../i18n/use-i18n";
import { Bell, Play, RefreshCw, Loader2, Inbox } from "lucide-react";

interface AlertInboxProps {
  onRefreshTrigger?: () => void;
}

export const AlertInbox: React.FC<AlertInboxProps> = ({ onRefreshTrigger }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Filter states
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>("all");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (unreadOnly) {
        params.append("unreadOnly", "true");
      }
      if (severityFilter !== "all") {
        params.append("severity", severityFilter);
      }
      if (ruleTypeFilter !== "all") {
        params.append("ruleType", ruleTypeFilter);
      }

      const res = await fetch(`/api/alerts/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.value || []);
      }
    } catch (err) {
      console.error("Failed to load alert events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [unreadOnly, severityFilter, ruleTypeFilter]);

  const handleRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/events/${id}/read`, { method: "POST" });
      if (res.ok) {
        await fetchEvents();
        if (onRefreshTrigger) onRefreshTrigger();
      }
    } catch (err) {
      console.error("Failed to mark alert as read", err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/events/${id}/dismiss`, { method: "POST" });
      if (res.ok) {
        await fetchEvents();
        if (onRefreshTrigger) onRefreshTrigger();
      }
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/alerts/evaluate", { method: "POST" });
      if (res.ok) {
        await fetchEvents();
        if (onRefreshTrigger) onRefreshTrigger();
      }
    } catch (err) {
      console.error("Failed to run alert evaluation", err);
    } finally {
      setEvaluating(false);
    }
  };

  const ruleTypes: { id: AlertRuleType; label: string }[] = [
    { id: "price_cross", label: isKo ? "가격 돌파" : "Price Cross" },
    { id: "return_zscore", label: isKo ? "이상 등락" : "Price Volatility" },
    { id: "volume_zscore", label: isKo ? "거래량 이상" : "Volume Spike" },
    { id: "gap_move", label: isKo ? "갭 변동" : "Gap Move" },
    { id: "new_filing", label: isKo ? "새 공시" : "New Filing" },
    { id: "provider_error", label: isKo ? "제공자 오류" : "Provider Error" },
    { id: "provider_rate_limited", label: isKo ? "요청 제한" : "Rate Limited" },
    { id: "provider_invalid_key", label: isKo ? "인증키 오류" : "Invalid Key" },
    { id: "technical_signal_change", label: isKo ? "기술 신호 변화" : "Technical Signal Change" },
    { id: "momentum_score_change", label: isKo ? "모멘텀 점수 변화" : "Momentum Change" },
    { id: "reliability_deterioration", label: isKo ? "신뢰도 악화" : "Reliability Deterioration" },
    { id: "backtest_job_failed", label: isKo ? "백테스트 실패" : "Backtest Failed" },
    { id: "data_quality", label: isKo ? "데이터 품질" : "Data Quality" },
  ];

  const severities: { id: AlertSeverity; label: string }[] = [
    { id: "info", label: isKo ? "정보" : "Info" },
    { id: "watch", label: isKo ? "관찰" : "Watch" },
    { id: "warning", label: isKo ? "주의" : "Warning" },
    { id: "critical", label: isKo ? "위험" : "Critical" },
  ];

  return (
    <div className="flex flex-col gap-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 overflow-hidden h-full">
      {/* Header with Evaluate Trigger */}
      <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-3.5 flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-kt-positive-text" />
          <h3 className="text-sm font-bold text-kt-text-primary">
            {isKo ? "알림 및 경보 보드" : "Alert Inbox"}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 rounded bg-kt-bg-overlay-300 border border-kt-border-panel hover:bg-kt-bg-overlay-300/80 cursor-pointer disabled:opacity-50"
            title={isKo ? "새로고침" : "Refresh"}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-kt-text-secondary ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-kt-bg-body bg-kt-text-primary rounded hover:bg-kt-text-secondary cursor-pointer disabled:opacity-50"
          >
            {evaluating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isKo ? "평가 즉시 실행" : "Evaluate Now"}
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3.5 flex-wrap bg-kt-bg-overlay-300/10 p-2.5 rounded border border-kt-border-panel/40 flex-shrink-0 text-xs text-kt-text-secondary">
        {/* Unread Only Toggle */}
        <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-kt-border-panel bg-kt-bg-surface-200 text-kt-text-primary focus:ring-0 cursor-pointer"
          />
          {isKo ? "미확인 알림만 보기" : "Unread Only"}
        </label>

        <div className="h-4 w-px bg-kt-border-panel/40" />

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5">
          <span>{isKo ? "심각도:" : "Severity:"}</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-2 py-0.5 text-xs text-kt-text-primary focus:outline-none focus:border-kt-text-secondary cursor-pointer"
          >
            <option value="all">{isKo ? "전체" : "All"}</option>
            {severities.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-kt-border-panel/40" />

        {/* Rule Type Filter */}
        <div className="flex items-center gap-1.5">
          <span>{isKo ? "유형:" : "Rule Type:"}</span>
          <select
            value={ruleTypeFilter}
            onChange={(e) => setRuleTypeFilter(e.target.value)}
            className="bg-kt-bg-surface-200 border border-kt-border-panel rounded px-2 py-0.5 text-xs text-kt-text-primary focus:outline-none focus:border-kt-text-secondary cursor-pointer max-w-[150px]"
          >
            <option value="all">{isKo ? "전체" : "All"}</option>
            {ruleTypes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading && events.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-kt-text-muted text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{isKo ? "알림 목록 로드 중..." : "Loading alerts..."}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-kt-text-muted text-xs">
            <Inbox className="w-6 h-6 opacity-40" />
            <span>{isKo ? "감지된 알림이 없습니다." : "No alerts found."}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-2">
            {events.map((ev) => (
              <AlertEventCard
                key={ev.id}
                event={ev}
                onRead={handleRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
