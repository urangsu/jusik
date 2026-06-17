"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";
import { ReliabilityAdjustedMomentumPreview } from "@/domain/reliability/reliability-adjusted-momentum";
import { ReliabilityWarningBanner } from "./ReliabilityWarningBanner";
import { SignalReliabilityTable } from "./SignalReliabilityTable";
import { ReliabilityMetricCards } from "./ReliabilityMetricCards";
import { WeightMultiplierPreview } from "./WeightMultiplierPreview";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { DataEnvelope } from "@/domain/common/data-status";
import { Play, Loader2, Info, Calculator } from "lucide-react";

export const ReliabilityWorkspace: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  // State
  const [universe, setUniverse] = useState<"KOSPI_SAMPLE" | "SP500_SAMPLE">("KOSPI_SAMPLE");
  const [horizon, setHorizon] = useState<"1w" | "1m" | "3m">("1m");
  const [summary, setSummary] = useState<ReliabilitySummary | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [preview, setPreview] = useState<ReliabilityAdjustedMomentumPreview | null>(null);

  // Loading / Error states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Universe constituents mapping
  const constituents = universe === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;

  // Set default asset ID when universe changes
  useEffect(() => {
    if (constituents.length > 0) {
      setSelectedAssetId(constituents[0].assetId);
    }
  }, [universe]);

  // Load latest summary
  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reliability/signals?universe=${universe}`);
      if (!res.ok) {
        if (res.status === 404) {
          setSummary(null);
          return;
        }
        throw new Error(`Failed to load reliability summary: ${res.statusText}`);
      }
      const envelope: DataEnvelope<ReliabilitySummary> = res.ok ? await res.json() : null;
      if (envelope && envelope.value) {
        setSummary(envelope.value);
      } else {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Load adjusted preview when asset changes
  const loadPreview = async () => {
    if (!selectedAssetId) return;
    setPreviewError(null);
    try {
      const res = await fetch(`/api/reliability/momentum-preview?universe=${universe}&assetId=${selectedAssetId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setPreview(null);
          return;
        }
        throw new Error(`Failed to load momentum preview: ${res.statusText}`);
      }
      const envelope: DataEnvelope<ReliabilityAdjustedMomentumPreview> = await res.json();
      if (envelope && envelope.value) {
        setPreview(envelope.value);
      } else {
        setPreview(null);
      }
    } catch (err: any) {
      setPreviewError(err?.message || String(err));
    }
  };

  // Trigger calculations
  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/reliability/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ universeId: universe }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 405) {
          throw new Error(
            isKo
              ? "신뢰도 연산 API가 비활성화되어 있습니다. 로컬 환경 변수 설정을 확인하세요."
              : "Reliability API is disabled. Check your local environment variable configuration."
          );
        }
        throw new Error(`Failed to run calculation: ${res.statusText}`);
      }

      await loadSummary();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [universe]);

  useEffect(() => {
    if (summary) {
      loadPreview();
    } else {
      setPreview(null);
    }
  }, [summary, selectedAssetId]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Warnings compliance banner */}
      <ReliabilityWarningBanner />

      <div className="px-4 flex flex-col gap-4 max-w-5xl mx-auto w-full pb-8">
        {/* Toolbar selectors */}
        <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Universe Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-kt-text-muted font-medium uppercase">
                {isKo ? "자산 유니버스" : "Universe"}
              </label>
              <select
                value={universe}
                onChange={(e) => setUniverse(e.target.value as any)}
                className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer"
              >
                <option value="KOSPI_SAMPLE">KOSPI Sample</option>
                <option value="SP500_SAMPLE">S&P 500 Sample</option>
              </select>
            </div>

            {/* Horizon Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-kt-text-muted font-medium uppercase">
                {isKo ? "평가 기간 필터" : "Evaluation Horizon"}
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as any)}
                className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer"
              >
                <option value="1w">{isKo ? "1주 (Short)" : "1w"}</option>
                <option value="1m">{isKo ? "1개월 (Medium)" : "1m"}</option>
                <option value="3m">{isKo ? "3개월 (Long)" : "3m"}</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-kt-pill text-xs font-semibold text-white bg-kt-positive hover:bg-kt-positive/90 transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isKo ? "지표 연산 중..." : "Calculating..."}</span>
              </>
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" />
                <span>{isKo ? "신뢰도 지표 계산" : "Compute Reliability"}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="border border-kt-negative-text/20 bg-kt-negative-weak text-kt-negative-text text-xs rounded-kt-card p-3 flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">[오류]</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading ? (
          <div className="border border-kt-border-panel rounded-kt-card p-12 bg-kt-bg-surface-100 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-kt-positive-text animate-spin" />
            <span className="text-xs text-kt-text-muted">{isKo ? "신뢰도 로드 중..." : "Loading Summary..."}</span>
          </div>
        ) : summary ? (
          <div className="flex flex-col gap-4">
            {/* Metric distribution cards */}
            <ReliabilityMetricCards summary={summary} />

            {/* Metrics table */}
            <SignalReliabilityTable
              records={summary.records.filter((r) => r.horizon === horizon)}
            />

            {/* Weight multiplier preview section */}
            <div className="border border-kt-border-panel rounded-kt-card p-4 bg-kt-bg-surface-100/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-kt-text-primary">
                  {isKo ? "개별 자산 가중치 시뮬레이션" : "Individual Asset Weight Preview"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-kt-text-muted">{isKo ? "종목 선택" : "Asset"}</span>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="bg-kt-bg-body border border-kt-border-panel rounded-kt-card px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer"
                  >
                    {constituents.map((c) => (
                      <option key={c.assetId} value={c.assetId}>
                        {c.symbol} ({isKo ? c.nameKo : c.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {previewError && (
                <div className="text-xs text-kt-negative-text font-medium">{previewError}</div>
              )}

              {preview ? (
                <WeightMultiplierPreview preview={preview} />
              ) : (
                <div className="border border-dashed border-kt-border-panel rounded-kt-card p-6 text-center text-xs text-kt-text-muted">
                  {isKo
                    ? "선택된 종목의 모멘텀 스냅샷을 찾을 수 없습니다. factors:technical 작업을 먼저 실행하세요."
                    : "No momentum snapshot found for selected asset. Run factors:technical calculations first."}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-kt-border-panel/80 rounded-kt-card p-12 bg-kt-bg-overlay-300/10 flex flex-col items-center justify-center text-center gap-3">
            <Info className="w-8 h-8 text-kt-text-muted opacity-40" />
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-xs font-semibold text-kt-text-secondary">
                {isKo ? "신뢰도 연산 결과가 없습니다" : "No Reliability Summary Found"}
              </span>
              <p className="text-[11px] text-kt-text-muted leading-relaxed">
                {isKo
                  ? "우측 상단의 '신뢰도 지표 계산' 버튼을 클릭하시면, 과거 가격 데이터를 기반으로 각 기술적 신호의 통계적 예측 정밀도를 계산합니다."
                  : "Click the 'Compute Reliability' button on the top right to calculate prediction accuracy for each technical signal dynamically."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
