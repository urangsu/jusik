import React from "react";
import { AlertRuleType } from "../../domain/alerts/alert-rule-type";
import { useI18n } from "../../i18n/use-i18n";

interface AlertRuleTypeBadgeProps {
  ruleType: AlertRuleType;
  className?: string;
}

export const AlertRuleTypeBadge: React.FC<AlertRuleTypeBadgeProps> = ({
  ruleType,
  className = "",
}) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const labels: Record<AlertRuleType, { ko: string; en: string }> = {
    price_cross: { ko: "가격 돌파", en: "Price Cross" },
    return_zscore: { ko: "이상 등락", en: "Price Volatility" },
    volume_zscore: { ko: "거래량 이상", en: "Volume Spike" },
    gap_move: { ko: "갭 변동", en: "Gap Move" },
    intraday_reversal: { ko: "장중 반전", en: "Intraday Reversal" },
    new_filing: { ko: "새 공시", en: "New Filing" },
    provider_error: { ko: "제공자 오류", en: "Provider Error" },
    provider_rate_limited: { ko: "요청 제한", en: "Rate Limited" },
    provider_invalid_key: { ko: "인증키 오류", en: "Invalid Key" },
    technical_signal_change: { ko: "기술 신호 변화", en: "Technical Signal Change" },
    momentum_score_change: { ko: "모멘텀 점수 변화", en: "Momentum Change" },
    reliability_deterioration: { ko: "신뢰도 악화", en: "Reliability Deterioration" },
    backtest_job_failed: { ko: "백테스트 실패", en: "Backtest Failed" },
    data_quality: { ko: "데이터 품질", en: "Data Quality" },
    strategy_score_change: { ko: "전략 점수 변화", en: "Strategy Change" },
    portfolio_risk: { ko: "포트폴리오 리스크", en: "Portfolio Risk" },
    macro_regime_change: { ko: "거시 레짐 변경", en: "Macro Regime Change" },
    macro_risk_off: { ko: "거시 리스크 오프", en: "Macro Risk Off" },
    macro_panic: { ko: "거시 패닉", en: "Macro Panic" },
    sentiment_extreme_fear: { ko: "극단적 공포", en: "Extreme Fear" },
    sentiment_extreme_greed: { ko: "극단적 탐욕", en: "Extreme Greed" },
  };

  const currentLabel = labels[ruleType] || { ko: ruleType, en: ruleType };
  const displayText = isKo ? currentLabel.ko : currentLabel.en;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded bg-kt-bg-surface-200 border border-kt-border-panel/40 text-kt-text-secondary text-[9px] font-medium leading-none ${className}`}
    >
      {displayText}
    </span>
  );
};
