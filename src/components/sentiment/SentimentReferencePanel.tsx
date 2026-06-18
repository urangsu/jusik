import React, { useEffect, useState } from "react";
import { SentimentReferenceSnapshot } from "@/domain/sentiment/sentiment-reference-snapshot";
import { useI18n } from "@/i18n/use-i18n";
import { Compass, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export const SentimentReferencePanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [references, setReferences] = useState<Record<string, SentimentReferenceSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchSentiment() {
      try {
        const res = await fetch("/api/sentiment/references");
        if (res.ok) {
          const envelope = await res.json();
          if (active && envelope?.status === "cached") {
            setReferences(envelope.value || {});
          }
        }
      } catch (err) {
        console.error("Failed to load sentiment references", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSentiment();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-6 rounded-kt-card animate-pulse flex items-center justify-center">
        <span className="text-xs text-kt-text-muted">
          {isKo ? "시장심리 참고값 로딩 중..." : "Loading sentiment reference data..."}
        </span>
      </div>
    );
  }

  const getLabelColor = (label: string) => {
    if (label === "extreme_greed" || label === "greed") {
      return "text-kt-positive-text bg-kt-positive-weak"; // Red for greed (positive/up)
    }
    if (label === "extreme_fear" || label === "fear") {
      return "text-kt-negative-text bg-kt-negative-weak"; // Blue for fear (negative/down)
    }
    return "text-kt-text-secondary bg-kt-bg-surface-200";
  };

  const getLabelKo = (label: string) => {
    switch (label) {
      case "extreme_fear":
        return "극단적 공포";
      case "fear":
        return "공포";
      case "neutral":
        return "중립";
      case "greed":
        return "탐욕";
      case "extreme_greed":
        return "극단적 탐욕";
      default:
        return "정보 없음";
    }
  };

  const cnn = references.cnn_fear_greed_reference || null;
  const crypto = references.alternative_me_crypto_fear_greed || null;

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3">
      {/* Header with toggle */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-kt-text-secondary" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "시장심리 보조 참고 지표" : "Market Sentiment References"}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-kt-text-muted" />
        ) : (
          <ChevronUp className="w-4 h-4 text-kt-text-muted" />
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-4 border-t border-kt-border-panel pt-3">
          {/* Side by side cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: CNN */}
            <div className="bg-kt-bg-body/30 border border-kt-border-panel/40 p-3 rounded-kt-card flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-kt-text-primary">
                  {isKo ? "미국 주식 공포탐욕" : "US Stock Fear & Greed"}
                </span>
                <span className="text-[10px] text-kt-text-muted">CNN Fear & Greed Reference</span>
                <span className="text-[9px] text-kt-negative-text font-medium mt-1">
                  {isKo ? "참고용 / 전략 적합도 미사용" : "Reference Only / Unused in Strategy"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-lg font-bold tabular-nums text-kt-text-primary">
                  {cnn?.value !== null && cnn?.value !== undefined ? cnn.value : "N/A"}
                </span>
                {cnn && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getLabelColor(cnn.label)}`}>
                    {isKo ? getLabelKo(cnn.label) : cnn.label.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Crypto */}
            <div className="bg-kt-bg-body/30 border border-kt-border-panel/40 p-3 rounded-kt-card flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-kt-text-primary">
                  {isKo ? "크립토 공포탐욕" : "Crypto Fear & Greed"}
                </span>
                <span className="text-[10px] text-kt-text-muted">Alternative.me Crypto Fear & Greed</span>
                <span className="text-[9px] text-kt-negative-text font-medium mt-1">
                  {isKo ? "크립토 전용 / 전략 적합도 미사용" : "Crypto Only / Unused in Strategy"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-lg font-bold tabular-nums text-kt-text-primary">
                  {crypto?.value !== null && crypto?.value !== undefined ? crypto.value : "N/A"}
                </span>
                {crypto && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getLabelColor(crypto.label)}`}>
                    {isKo ? getLabelKo(crypto.label) : crypto.label.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Core isolation disclaimer */}
          <div className="bg-kt-bg-body/50 border border-kt-border-panel/30 p-2.5 rounded text-[10px] text-kt-text-muted flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-kt-text-muted flex-shrink-0" />
            <span className="leading-relaxed">
              {isKo
                ? "참고용 시장심리 지표입니다. 전략 적합도 계산과 주문 판단에는 사용하지 않습니다."
                : "This is a reference-only market sentiment indicator. It is not used for strategy suitability calculations or order placement decisions."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
