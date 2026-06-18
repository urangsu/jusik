import React, { useEffect, useState } from "react";
import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";
import { useI18n } from "@/i18n/use-i18n";
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

export const MacroRegimePanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [snapshots, setSnapshots] = useState<Record<string, RegimeSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRegimes() {
      try {
        // Fetch current snapshots for US and KR
        const [usRes, krRes] = await Promise.all([
          fetch("/api/regime/current?market=US"),
          fetch("/api/regime/current?market=KR"),
        ]);

        const usData = usRes.ok ? await usRes.json() : null;
        const krData = krRes.ok ? await krRes.json() : null;

        if (active) {
          const map: Record<string, RegimeSnapshot> = {};
          if (usData?.status === "real_time" || usData?.status === "cached") {
            map.US = usData.value;
          }
          if (krData?.status === "real_time" || krData?.status === "cached") {
            map.KR = krData.value;
          }
          setSnapshots(map);
        }
      } catch (err: any) {
        console.error("Failed to load macro regimes", err);
        if (active) setError(err.message || String(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRegimes();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-6 rounded-kt-card animate-pulse flex items-center justify-center">
        <span className="text-xs text-kt-text-muted">
          {isKo ? "거시 레짐 데이터를 불러오는 중..." : "Loading macro regime data..."}
        </span>
      </div>
    );
  }

  if (error || Object.keys(snapshots).length === 0) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-4 rounded-kt-card flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-kt-negative-text" />
        <span className="text-xs text-kt-text-muted">
          {isKo
            ? "거시 레짐 데이터를 불러오지 못했습니다. /api/regime/evaluate를 실행해 주세요."
            : "No macro regime data. Run /api/regime/evaluate to generate."}
        </span>
      </div>
    );
  }

  const getRegimeColorClass = (regime: string) => {
    if (regime === "risk_on" || regime === "selective_risk_on") {
      return "text-kt-positive-text bg-kt-positive-weak"; // Red for risk preference / positive
    }
    if (regime === "risk_off" || regime === "panic") {
      return "text-kt-negative-text bg-kt-negative-weak"; // Blue for risk avoidance / negative
    }
    return "text-kt-text-secondary bg-kt-bg-surface-100";
  };

  const getRegimeLabel = (regime: string) => {
    if (isKo) {
      if (regime === "risk_on") return "위험 선호 (Risk On)";
      if (regime === "selective_risk_on") return "선택적 위험 선호 (Selective Risk On)";
      if (regime === "neutral") return "중립 (Neutral)";
      if (regime === "risk_off") return "위험 회피 (Risk Off)";
      if (regime === "panic") return "패닉 (Panic)";
      if (regime === "overheated") return "과열 (Overheated)";
      return "데이터 부족 (Insufficient Data)";
    } else {
      if (regime === "risk_on") return "Risk On";
      if (regime === "selective_risk_on") return "Selective Risk On";
      if (regime === "neutral") return "Neutral";
      if (regime === "risk_off") return "Risk Off";
      if (regime === "panic") return "Panic";
      if (regime === "overheated") return "Overheated";
      return "Insufficient Data";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      {["US", "KR"].map((m) => {
        const snap = snapshots[m];
        if (!snap) return null;

        const isRiskOn = snap.regime === "risk_on" || snap.regime === "selective_risk_on";

        return (
          <div
            key={m}
            className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-kt-border-panel pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-kt-text-secondary" />
                <span className="text-sm font-bold text-kt-text-primary">
                  {m === "US" ? (isKo ? "미국 시장 레짐" : "US Market Regime") : (isKo ? "한국 시장 레짐" : "KR Market Regime")}
                </span>
              </div>
              <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${getRegimeColorClass(snap.regime)}`}>
                {getRegimeLabel(snap.regime)}
              </span>
            </div>

            {/* Score Details */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex flex-col bg-kt-bg-body/30 p-2.5 rounded-kt-card border border-kt-border-panel/40">
                <span className="text-kt-text-muted">{isKo ? "레짐 종합 점수" : "Overall Score"}</span>
                <span className="text-lg font-bold text-kt-text-primary tabular-nums mt-1">
                  {snap.score !== null ? `${snap.score} / 100` : "N/A"}
                </span>
              </div>
              <div className="flex flex-col bg-kt-bg-body/30 p-2.5 rounded-kt-card border border-kt-border-panel/40">
                <span className="text-kt-text-muted">{isKo ? "진단 신뢰 수준" : "Confidence"}</span>
                <span className="text-lg font-bold text-kt-text-primary mt-1 capitalize">
                  {isKo
                    ? snap.confidence === "high"
                      ? "높음"
                      : snap.confidence === "medium"
                      ? "보통"
                      : "낮음"
                    : snap.confidence}
                </span>
              </div>
            </div>

            {/* Gates */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold tracking-wider text-kt-text-muted uppercase">
                {isKo ? "시장 환경 게이트 필터" : "Market Environment Gates"}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded bg-kt-bg-body/40 border border-kt-border-panel/50 text-center">
                  <span className="text-[9px] text-kt-text-muted mb-1.5">{isKo ? "신규 관찰 허용" : "Allows Watch"}</span>
                  {snap.gates.allowsNewWatch ? (
                    <CheckCircle className="w-3.5 h-3.5 text-kt-positive-text" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-kt-negative-text" />
                  )}
                </div>
                <div className="flex flex-col items-center p-2 rounded bg-kt-bg-body/40 border border-kt-border-panel/50 text-center">
                  <span className="text-[9px] text-kt-text-muted mb-1.5">{isKo ? "위험 상향 허용" : "Risk Upgrade"}</span>
                  {snap.gates.allowsRiskUpgrading ? (
                    <CheckCircle className="w-3.5 h-3.5 text-kt-positive-text" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-kt-negative-text" />
                  )}
                </div>
                <div className="flex flex-col items-center p-2 rounded bg-kt-bg-body/40 border border-kt-border-panel/50 text-center">
                  <span className="text-[9px] text-kt-text-muted mb-1.5">{isKo ? "모멘텀 알림 억제" : "Suppress Alert"}</span>
                  {snap.gates.suppressesMomentumAlert ? (
                    <CheckCircle className="w-3.5 h-3.5 text-kt-positive-text" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-kt-text-muted" />
                  )}
                </div>
              </div>
            </div>

            {/* Warnings & Notes */}
            {snap.warnings.length > 0 && (
              <div className="bg-kt-negative-weak/20 border border-kt-negative-weak p-2.5 rounded text-[10px] text-kt-text-secondary flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-kt-negative-text flex-shrink-0" />
                <div className="flex flex-col gap-1 leading-relaxed">
                  {snap.warnings.map((w, idx) => (
                    <span key={idx}>{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
