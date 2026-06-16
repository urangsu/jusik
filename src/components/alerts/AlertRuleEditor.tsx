"use client";

import React, { useState } from "react";
import { AlertRule, AlertRuleType, AlertRuleScope } from "@/domain/alerts/alert-rule";
import { AlertSeverity } from "@/domain/alerts/alert-severity";
import { NotificationChannelId } from "@/domain/alerts/alert-channel";

interface AlertRuleEditorProps {
  rule?: AlertRule | null;
  onSave: (ruleData: any) => void;
  onCancel: () => void;
}

export const AlertRuleEditor: React.FC<AlertRuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(rule?.name || "");
  const [enabled, setEnabled] = useState(rule ? rule.enabled : true);
  const [type, setType] = useState<AlertRuleType>(rule?.type || "return_zscore");
  const [scope, setScope] = useState<AlertRuleScope>(rule?.scope || "universe");
  const [severity, setSeverity] = useState<AlertSeverity>(rule?.severity || "info");
  const [cooldownMinutes, setCooldownMinutes] = useState(rule?.cooldownMinutes || 60);

  // Targets
  const [universeId, setUniverseId] = useState(rule?.target?.universeId || "KOSPI_SAMPLE");
  const [assetIdsText, setAssetIdsText] = useState(rule?.target?.assetIds?.join(", ") || "");

  // Data Policy
  const [allowPersonalFallback, setAllowPersonalFallback] = useState(
    rule?.dataPolicy?.allowPersonalFallback || false
  );

  // Channels
  const [channels, setChannels] = useState<NotificationChannelId[]>(
    rule?.channels || ["web_inbox", "console"]
  );

  // Conditions
  const [price, setPrice] = useState(
    rule?.condition?.kind === "price_cross" ? rule.condition.price : 50000
  );
  const [priceDirection, setPriceDirection] = useState(
    rule?.condition?.kind === "price_cross" ? rule.condition.direction : "above"
  );

  const [returnWindow, setReturnWindow] = useState(
    rule?.condition?.kind === "return_zscore" ? rule.condition.returnWindow : "1D"
  );
  const [baselineWindow, setBaselineWindow] = useState(
    rule?.condition?.kind === "return_zscore" || rule?.condition?.kind === "volume_zscore"
      ? rule.condition.baselineWindow
      : 60
  );
  const [thresholdAbsZ, setThresholdAbsZ] = useState(
    rule?.condition?.kind === "return_zscore" ? rule.condition.thresholdAbsZ : 2.0
  );
  const [minAbsReturnPercent, setMinAbsReturnPercent] = useState(
    rule?.condition?.kind === "return_zscore" ? rule.condition.minAbsReturnPercent || 3.0 : 3.0
  );

  const [thresholdZ, setThresholdZ] = useState(
    rule?.condition?.kind === "volume_zscore" ? rule.condition.thresholdZ : 2.5
  );
  const [minVolumeMultiplier, setMinVolumeMultiplier] = useState(
    rule?.condition?.kind === "volume_zscore" ? rule.condition.minVolumeMultiplier || 2.0 : 2.0
  );

  const [gapThreshold, setGapThreshold] = useState(
    rule?.condition?.kind === "gap_move" ? rule.condition.thresholdPercent : 3.0
  );
  const [gapDirection, setGapDirection] = useState(
    rule?.condition?.kind === "gap_move" ? rule.condition.direction : "both"
  );

  const handleChannelToggle = (ch: NotificationChannelId) => {
    if (channels.includes(ch)) {
      setChannels(channels.filter((c) => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let condition: any;
    if (type === "price_cross") {
      condition = { kind: "price_cross", direction: priceDirection, price };
    } else if (type === "return_zscore") {
      condition = {
        kind: "return_zscore",
        returnWindow,
        baselineWindow,
        thresholdAbsZ,
        minAbsReturnPercent,
      };
    } else if (type === "volume_zscore") {
      condition = { kind: "volume_zscore", baselineWindow, thresholdZ, minVolumeMultiplier };
    } else if (type === "gap_move") {
      condition = { kind: "gap_move", thresholdPercent: gapThreshold, direction: gapDirection };
    } else if (type === "provider_error") {
      condition = {
        kind: "provider_error",
        providerIds: ["kis", "fmp_free", "alpha_vantage_free", "finnhub_free"],
        statuses: ["error", "rate_limited"],
      };
    } else {
      condition = { kind: "new_filing", keywords: ["공시"] };
    }

    const ruleData = {
      name,
      enabled,
      type,
      scope,
      target: {
        universeId: scope === "universe" ? universeId : undefined,
        assetIds:
          scope === "asset"
            ? assetIdsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      },
      condition,
      severity,
      channels,
      cooldownMinutes,
      dataPolicy: {
        allowStale: true,
        allowDelayed: true,
        allowPersonalFallback,
        requireOfficialOrLicensed: !allowPersonalFallback,
      },
      locale: "ko",
    };

    onSave(ruleData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-6 flex flex-col gap-4 text-sm"
    >
      <div className="flex items-center justify-between border-b border-kt-border-panel pb-3 mb-2">
        <h3 className="text-base font-bold text-kt-text-primary">
          {rule ? "알림 규칙 수정" : "새 알림 규칙 추가"}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-kt-border-panel bg-kt-bg-overlay-300 text-kt-positive cursor-pointer"
          />
          <span className="text-xs text-kt-text-secondary">활성화</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-kt-text-muted">규칙 이름</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 삼성전자 가격 7만원 돌파"
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none focus:border-kt-text-muted"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-kt-text-muted">경보 등급</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none focus:border-kt-text-muted"
          >
            <option value="info">정보 (Info)</option>
            <option value="watch">주의 (Watch)</option>
            <option value="warning">경고 (Warning)</option>
            <option value="critical">위험 (Critical)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-kt-text-muted">규칙 종류</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AlertRuleType)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none focus:border-kt-text-muted"
          >
            <option value="return_zscore">변동성 z-score (이상 등락)</option>
            <option value="volume_zscore">거래량 z-score (거래량 이상)</option>
            <option value="price_cross">가격 돌파 (Price Cross)</option>
            <option value="gap_move">시가 갭 등락 (Gap Move)</option>
            <option value="provider_error">제공자 장애 (Provider Error)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-kt-text-muted">적용 범위</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as AlertRuleScope)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none focus:border-kt-text-muted"
          >
            <option value="universe">유니버스 (Universe)</option>
            <option value="asset">개별 종목 (Asset)</option>
            <option value="provider">제공자 (Provider)</option>
            <option value="market">전체 시장 (Market)</option>
          </select>
        </div>
      </div>

      {/* Dynamic scope targets */}
      {scope === "universe" && (
        <div className="flex flex-col gap-1.5 bg-kt-bg-overlay-300/30 p-3 rounded border border-kt-border-panel">
          <label className="text-xs text-kt-text-muted">대상 유니버스</label>
          <select
            value={universeId}
            onChange={(e) => setUniverseId(e.target.value as any)}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none"
          >
            <option value="KOSPI_SAMPLE">코스피 대표 20종목 (KOSPI_SAMPLE)</option>
            <option value="SP500_SAMPLE">S&P 500 대표 20종목 (SP500_SAMPLE)</option>
          </select>
        </div>
      )}

      {scope === "asset" && (
        <div className="flex flex-col gap-1.5 bg-kt-bg-overlay-300/30 p-3 rounded border border-kt-border-panel">
          <label className="text-xs text-kt-text-muted">종목 티커 리스트 (쉼표 구분)</label>
          <input
            type="text"
            required
            value={assetIdsText}
            onChange={(e) => setAssetIdsText(e.target.value)}
            placeholder="예: KR:005930, US:AAPL"
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary focus:outline-none"
          />
        </div>
      )}

      {/* Dynamic Condition forms */}
      <div className="bg-kt-bg-overlay-300/30 p-4 rounded border border-kt-border-panel flex flex-col gap-3">
        <h4 className="text-xs font-bold text-kt-text-secondary uppercase tracking-wider">세부 조건 설정</h4>

        {type === "price_cross" && (
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">방향</span>
              <select
                value={priceDirection}
                onChange={(e) => setPriceDirection(e.target.value as "above" | "below")}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              >
                <option value="above">상향 돌파 (Above)</option>
                <option value="below">하향 돌파 (Below)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">기준 가격</span>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
          </div>
        )}

        {type === "return_zscore" && (
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">수익률 윈도우</span>
              <select
                value={returnWindow}
                onChange={(e) => setReturnWindow(e.target.value as any)}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              >
                <option value="1D">1일 등락률 (1D)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">기준 변동성 윈도우 (거래일수)</span>
              <select
                value={baselineWindow}
                onChange={(e) => setBaselineWindow(parseInt(e.target.value, 10) as 20 | 60 | 120)}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              >
                <option value={20}>20거래일</option>
                <option value={60}>60거래일</option>
                <option value={120}>120거래일</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">임계 z-score (σ)</span>
              <input
                type="number"
                step="0.1"
                required
                value={thresholdAbsZ}
                onChange={(e) => setThresholdAbsZ(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">최소 등락률 (%)</span>
              <input
                type="number"
                step="0.1"
                required
                value={minAbsReturnPercent}
                onChange={(e) => setMinAbsReturnPercent(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
          </div>
        )}

        {type === "volume_zscore" && (
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">기준 윈도우 (거래일수)</span>
              <select
                value={baselineWindow}
                onChange={(e) => setBaselineWindow(parseInt(e.target.value, 10) as 20 | 60 | 120)}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              >
                <option value={20}>20거래일</option>
                <option value={60}>60거래일</option>
                <option value={120}>120거래일</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">임계 z-score (σ)</span>
              <input
                type="number"
                step="0.1"
                required
                value={thresholdZ}
                onChange={(e) => setThresholdZ(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">최소 거래량 배수 (평균 대비)</span>
              <input
                type="number"
                step="0.1"
                required
                value={minVolumeMultiplier}
                onChange={(e) => setMinVolumeMultiplier(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
          </div>
        )}

        {type === "gap_move" && (
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">방향</span>
              <select
                value={gapDirection}
                onChange={(e) => setGapDirection(e.target.value as any)}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              >
                <option value="both">상승 및 하락 모두</option>
                <option value="up">상승 갭만</option>
                <option value="down">하락 갭만</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-kt-text-muted">임계 갭 등락률 (%)</span>
              <input
                type="number"
                step="0.1"
                required
                value={gapThreshold}
                onChange={(e) => setGapThreshold(parseFloat(e.target.value))}
                className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-2.5 py-1.5 text-xs text-kt-text-primary"
              />
            </div>
          </div>
        )}

        {type === "provider_error" && (
          <span className="text-xs text-kt-text-muted">
            제공자 에러 및 레이트 리밋 상태 도달 시 자동으로 알림을 전송합니다.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {/* Cooldown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-kt-text-muted">동일 알림 재발송 쿨다운 (분)</label>
          <input
            type="number"
            required
            value={cooldownMinutes}
            onChange={(e) => setCooldownMinutes(parseInt(e.target.value, 10))}
            className="bg-kt-bg-overlay-300 border border-kt-border-panel rounded px-3 py-2 text-kt-text-primary"
          />
        </div>

        {/* Data Policy */}
        <div className="flex flex-col gap-1.5 justify-center">
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={allowPersonalFallback}
              onChange={(e) => setAllowPersonalFallback(e.target.checked)}
              className="w-4 h-4 rounded border-kt-border-panel bg-kt-bg-overlay-300 text-kt-positive cursor-pointer"
            />
            <span className="text-xs text-kt-text-secondary">
              비공식 개인 Fallback 데이터 허용 (yfinance 등)
            </span>
          </label>
        </div>
      </div>

      {/* Target Channels */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs text-kt-text-muted">수신 채널 선택</label>
        <div className="flex flex-wrap gap-4 bg-kt-bg-overlay-300/20 p-3 rounded border border-kt-border-panel">
          {(["web_inbox", "console", "telegram", "kakao", "email"] as NotificationChannelId[]).map(
            (ch) => {
              const checked = channels.includes(ch);
              const labelMap: Record<string, string> = {
                web_inbox: "인박스(Inbox)",
                console: "콘솔(Console)",
                telegram: "텔레그램(Sim)",
                kakao: "카카오톡(Sim)",
                email: "이메일(Sim)",
              };
              return (
                <label key={ch} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleChannelToggle(ch)}
                    className="w-4 h-4 rounded border-kt-border-panel bg-kt-bg-overlay-300 text-kt-positive cursor-pointer"
                  />
                  <span className="text-xs text-kt-text-secondary">{labelMap[ch] || ch}</span>
                </label>
              );
            }
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded-kt-pill text-kt-text-secondary hover:text-kt-text-primary hover:bg-kt-bg-overlay-300 cursor-pointer"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-xs font-semibold rounded-kt-pill bg-kt-positive text-white hover:bg-kt-positive/80 cursor-pointer"
        >
          저장
        </button>
      </div>
    </form>
  );
};
