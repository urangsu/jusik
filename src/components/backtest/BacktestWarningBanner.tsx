"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";

/**
 * BacktestWarningBanner
 * 
 * 백테스트 페이지 최상단에 항상 표시되는 기능 검증용 경고 배너.
 * "투자 조언 아님" 문구는 절대 제거하지 않는다.
 * 이모지 사용 금지.
 */
export const BacktestWarningBanner: React.FC = () => {
  const { locale } = useI18n();

  return (
    <div
      role="alert"
      aria-label={locale === "ko" ? "기능 검증용 경고" : "Function verification warning"}
      className="w-full px-4 py-3 border-b border-kt-border-panel bg-kt-bg-overlay-300/60 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-0.5 max-w-5xl mx-auto">
        <p className="text-xs font-semibold text-kt-text-primary tracking-wide uppercase">
          {locale === "ko" ? "기능 검증용 시뮬레이션" : "Function-Verification Simulation"}
        </p>
        <p className="text-xs text-kt-text-secondary leading-relaxed">
          {locale === "ko"
            ? "이 백테스트는 투자 조언이 아닙니다. 미조정 가격 기준이며, SAMPLE universe 한정 결과입니다. 수정주가·거래일 캘린더·historical universe membership이 반영되지 않아 운용 성과 검증에 사용할 수 없습니다."
            : "This backtest is not investment advice. Results are based on unadjusted prices and a sample universe only. Adjusted prices, trading calendars, and historical universe membership are not applied. Do not use for investment decisions."}
        </p>
      </div>
    </div>
  );
};
