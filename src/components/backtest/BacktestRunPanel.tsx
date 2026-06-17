"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { BacktestResult } from "@/domain/backtest/backtest-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { Play, Loader2, Info } from "lucide-react";

interface BacktestRunPanelProps {
  onResult: (result: BacktestResult | null) => void;
  onRunningChange: (running: boolean) => void;
}

export const BacktestRunPanel: React.FC<BacktestRunPanelProps> = ({
  onResult,
  onRunningChange,
}) => {
  const { locale } = useI18n();

  // Inputs
  const [universeId, setUniverseId] = useState<"KOSPI_SAMPLE" | "SP500_SAMPLE">("KOSPI_SAMPLE");
  const [strategy] = useState<"momentum_v1_long_only">("momentum_v1_long_only");

  // Dates default: 1 year ago to today
  const today = new Date().toISOString().split("T")[0];
  const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(oneYearAgo);
  const [endDate, setEndDate] = useState(today);

  // Walk-forward params
  const [trainDays, setTrainDays] = useState(90);
  const [testDays, setTestDays] = useState(30);
  const [stepDays, setStepDays] = useState(30);
  const [maxPositions, setMaxPositions] = useState(5);
  const [minScore, setMinScore] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    onRunningChange(true);
    onResult(null);

    try {
      const response = await fetch("/api/backtest/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          universeId,
          strategy,
          startDate,
          endDate,
          trainDays,
          testDays,
          stepDays,
          maxPositions,
          minScore,
        }),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 405) {
          throw new Error(
            locale === "ko"
              ? "백테스트 실행 API가 비활성화되어 있습니다. 로컬 환경 변수 설정을 확인하세요."
              : "Backtest API is disabled. Check your local environment variable configuration."
          );
        }
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      const envelope: DataEnvelope<BacktestResult> = await response.json();
      if (envelope.status === "error" || !envelope.value) {
        throw new Error(envelope.message || "Failed to parse backtest results.");
      }

      onResult(envelope.value);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsLoading(false);
      onRunningChange(false);
    }
  };

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-kt-border-panel pb-2">
        <h3 className="text-sm font-semibold text-kt-text-primary">
          {locale === "ko" ? "시뮬레이션 파라미터" : "Simulation Parameters"}
        </h3>
        <span className="text-[10px] text-kt-text-muted">
          {locale === "ko" ? "Walk-forward 검증 엔진" : "Walk-forward Verification Engine"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Universe Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "자산 유니버스" : "Universe"}
            </label>
            <select
              value={universeId}
              onChange={(e) => setUniverseId(e.target.value as any)}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted"
            >
              <option value="KOSPI_SAMPLE">KOSPI Sample</option>
              <option value="SP500_SAMPLE">S&P 500 Sample</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "시작 일자" : "Start Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "종료 일자" : "End Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>

          {/* Max Positions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "최대 보유 종목 수" : "Max Positions"}
            </label>
            <input
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(Number(e.target.value))}
              min={1}
              max={20}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>
        </div>

        {/* Walk forward days parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-kt-border-panel/40 pt-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "훈련 기간 (영업일)" : "Train Period (Days)"}
            </label>
            <input
              type="number"
              value={trainDays}
              onChange={(e) => setTrainDays(Number(e.target.value))}
              min={60}
              max={365}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "평가 기간 (영업일)" : "Test Period (Days)"}
            </label>
            <input
              type="number"
              value={testDays}
              onChange={(e) => setTestDays(Number(e.target.value))}
              min={20}
              max={120}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-kt-text-secondary">
              {locale === "ko" ? "리밸런싱 주기 (영업일)" : "Step Period (Days)"}
            </label>
            <input
              type="number"
              value={stepDays}
              onChange={(e) => setStepDays(Number(e.target.value))}
              min={20}
              max={120}
              className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1.5 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted font-mono"
              required
            />
          </div>
        </div>

        {error && (
          <div className="border border-kt-negative-text/20 bg-kt-negative-weak text-kt-negative-text text-xs rounded-kt-card p-3 flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">[오류]</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-kt-border-panel/40 pt-4 flex-wrap gap-3">
          <div className="flex items-start gap-2 max-w-md">
            <Info className="w-4 h-4 text-kt-text-muted flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-kt-text-muted leading-relaxed">
              {locale === "ko"
                ? "시뮬레이션은 Walk-Forward 교차 검증을 사용하여 과거 훈련 구간에서 산출한 모멘텀 신호를 OOS 평가 구간에 대입하고 성과를 검증합니다."
                : "Simulation uses Walk-Forward cross-validation to apply momentum signals calculated in historical training windows to OOS test windows."}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center justify-center gap-1.5 px-6 py-2 rounded-kt-pill text-xs font-semibold text-white bg-kt-positive hover:bg-kt-positive/90 transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{locale === "ko" ? "시뮬레이션 실행 중..." : "Running Simulation..."}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{locale === "ko" ? "시뮬레이션 실행" : "Run Simulation"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
