import React from "react";
import { useI18n } from "@/i18n/use-i18n";

export const AnomalyRuleCard: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3 text-xs leading-relaxed text-kt-text-secondary">
      <h4 className="font-bold text-kt-text-primary">
        {isKo ? "통계적 이상 감지 (z-score) 안내" : "Statistical Anomaly Detection (z-score) Guide"}
      </h4>
      <p>
        {isKo
          ? "최신 마켓 스냅샷의 종가 시계열 데이터를 롤링 윈도우(60거래일 등)로 계산하여 현재 변동성이 통계적으로 유의미한 수준(±2σ 표준편차)을 넘어섰는지 계산합니다."
          : "Calculates whether the current price or volume volatility has exceeded statistically significant levels (±2σ standard deviation) using a rolling baseline window."}
      </p>
      <div className="border-t border-kt-border-panel/40 pt-2 flex flex-col gap-1.5 text-[10px] text-kt-text-muted">
        <div>
          <span className="font-semibold text-kt-text-secondary">z-score 공식:</span>{" "}
          <code>(값 - 롤링평균) / 롤링표준편차</code>
        </div>
        <div>
          <span className="font-semibold text-kt-text-secondary">변동성 임계치:</span>{" "}
          {isKo ? "기본값 2.0σ 이며 수익률 3% 이상일 때만 전송" : "Default is 2.0σ, triggered only when return is >= 3%"}
        </div>
        <div>
          <span className="font-semibold text-kt-text-secondary">거래량 임계치:</span>{" "}
          {isKo ? "기본값 2.5σ 이며 평균 대비 2배수 이상일 때만 전송" : "Default is 2.5σ, triggered only when volume is >= 2.0x average"}
        </div>
      </div>
    </div>
  );
};
