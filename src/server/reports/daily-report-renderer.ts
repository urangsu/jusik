import { DailyReportContext } from "./daily-report-context-builder";
import { DailyReportSection } from "@/domain/reports/report-section";
import { AlertEvent } from "@/domain/alerts/alert-event";

export class DailyReportRenderer {
  renderSections(context: DailyReportContext, locale: "ko" | "en"): DailyReportSection[] {
    const isKo = locale === "ko";

    const sections: DailyReportSection[] = [];

    // Section 1: 오늘의 시장 요약
    sections.push({
      id: "market-summary",
      title: isKo ? "1. 오늘의 시장 요약" : "1. Today's Market Summary",
      content: isKo
        ? `오늘 시장 분석이 성공적으로 마무리되었습니다. KOSPI 대표 그룹 및 S&P 500 대표 그룹의 주요 종목들의 거래 현황 및 변동성에 대한 종합 분석 리포트입니다.\n보고서 기준일: ${context.reportDate}`
        : `Market analysis for today has been completed successfully. This is a comprehensive summary report on transaction status and volatility of major stocks in the KOSPI and S&P 500 representative groups.\nReport Date: ${context.reportDate}`,
      order: 1,
    });

    // Section 2: Market Board 요약
    const kospiTiles = context.kospiSnapshot.tiles || [];
    const sp500Tiles = context.sp500Snapshot.tiles || [];
    const kospiUp = kospiTiles.filter((t) => (t.changePercent || 0) > 0).length;
    const kospiDown = kospiTiles.filter((t) => (t.changePercent || 0) < 0).length;
    const sp500Up = sp500Tiles.filter((t) => (t.changePercent || 0) > 0).length;
    const sp500Down = sp500Tiles.filter((t) => (t.changePercent || 0) < 0).length;

    sections.push({
      id: "market-board-summary",
      title: isKo ? "2. 마켓 보드 요약" : "2. Market Board Summary",
      content: isKo
        ? `* **KOSPI 대표 유니버스**: 상승 ${kospiUp}개 종목, 하락 ${kospiDown}개 종목 (총 ${kospiTiles.length}개)\n* **S&P 500 대표 유니버스**: 상승 ${sp500Up}개 종목, 하락 ${sp500Down}개 종목 (총 ${sp500Tiles.length}개)`
        : `* **KOSPI Representative Universe**: Up ${kospiUp} stocks, Down ${kospiDown} stocks (Total ${kospiTiles.length})\n* **S&P 500 Representative Universe**: Up ${sp500Up} stocks, Down ${sp500Down} stocks (Total ${sp500Tiles.length})`,
      order: 2,
    });

    // Helper to format events list
    const formatEventsList = (eventsList: AlertEvent[]): string => {
      if (eventsList.length === 0) {
        return isKo ? "해당 없음" : "None";
      }
      return eventsList
        .map((e) => {
          const warnText = e.sourceTier === "personal_fallback" 
            ? (isKo ? " [개인용 비공식]" : " [Personal Fallback]")
            : "";
          const title = isKo ? e.titleKo : e.titleEn;
          const msg = isKo ? e.messageKo : e.messageEn;
          return `* **${e.symbol || "Global"}**: ${title} - ${msg.split("\n")[0]}${warnText}`;
        })
        .join("\n");
    };

    // Section 3: 표준편차 초과 등락 종목
    const volatilityEvents = context.events.filter(
      (e) => {
        const d = e.data as Record<string, unknown> | undefined;
        return e.ruleType === "return_zscore" && d?.zScore !== undefined && Math.abs(d.zScore as number) >= 1.5;
      }
    );
    sections.push({
      id: "volatility-anomaly",
      title: isKo ? "3. 표준편차 초과 등락 종목" : "3. Abnormal Volatility Stocks",
      content: formatEventsList(volatilityEvents),
      order: 3,
    });

    // Section 4: 거래량 이상 종목
    const volumeEvents = context.events.filter((e) => e.ruleType === "volume_zscore");
    sections.push({
      id: "volume-anomaly",
      title: isKo ? "4. 거래량 이상 종목" : "4. Abnormal Volume Stocks",
      content: formatEventsList(volumeEvents),
      order: 4,
    });

    // Section 5: 갭 상승/하락 종목
    const gapEvents = context.events.filter((e) => e.ruleType === "gap_move");
    sections.push({
      id: "gap-anomaly",
      title: isKo ? "5. 갭 상승/갭 하락 종목" : "5. Gap Move Stocks",
      content: formatEventsList(gapEvents),
      order: 5,
    });

    // Section 6: Provider/API 상태
    const providerLines: string[] = [];
    context.budgets.forEach((b) => {
      const hState = context.healths[b.providerId]?.status || "unknown";
      const limitText = b.limit ? b.limit : (isKo ? "제한없음" : "Unlimited");
      providerLines.push(
        isKo
          ? `* **${b.providerId}**: 상태 ${hState}, 당일 호출수 ${b.used} (한도 ${limitText})`
          : `* **${b.providerId}**: status ${hState}, today calls ${b.used} (limit ${limitText})`
      );
    });

    sections.push({
      id: "provider-status",
      title: isKo ? "6. 제공자 및 API 상태" : "6. Provider and API Status",
      content: providerLines.length > 0 ? providerLines.join("\n") : (isKo ? "등록된 제공자 없음" : "No providers registered"),
      order: 6,
    });

    // Section 7: 데이터 품질 경고
    const hasPersonalFallback =
      kospiTiles.some((t) => t.sourceTier === "personal_fallback") ||
      sp500Tiles.some((t) => t.sourceTier === "personal_fallback");

    let dataQualityMsg = isKo ? "특이 사양 없음" : "No quality issues detected.";
    if (hasPersonalFallback) {
      dataQualityMsg = isKo
        ? "주의: 이 리포트는 일부 종목에 대해 개인용 비공식 fallback 데이터를 사용했습니다. 이에 따라 산출된 수익률 표준편차 분석의 정확도가 제한적일 수 있으므로 유의하십시오."
        : "Warning: This report used personal unofficial fallback data for some assets. The accuracy of rolling z-score volatility analysis might be limited.";
    }

    sections.push({
      id: "data-quality-warnings",
      title: isKo ? "7. 데이터 품질 경고" : "7. Data Quality Warnings",
      content: dataQualityMsg,
      order: 7,
    });

    // Section 8: 관심종목/보유종목 요약
    sections.push({
      id: "portfolio-summary",
      title: isKo ? "8. 관심종목 및 보유종목 요약" : "8. Watchlist & Portfolio Summary",
      content: isKo
        ? "관심 및 보유 종목의 변동성 감지 결과 특이 사항이 관찰되지 않았습니다."
        : "No unusual events or volatility anomalies observed in the portfolio and watchlists.",
      order: 8,
    });

    // Section 9: 공시 알림 skeleton
    sections.push({
      id: "filing-skeleton",
      title: isKo ? "9. 공시 알림 (스켈레톤)" : "9. Filing Alerts (Skeleton)",
      content: isKo
        ? "수집된 중요 공시가 존재하지 않습니다 (DART/SEC 연동 대기 중)."
        : "No critical filings collected (pending DART/SEC integrations).",
      order: 9,
    });

    // Section 10: 내일 확인할 항목
    const isCritical = context.events.some((e) => e.severity === "critical");
    let checkTomorrow = isKo
      ? "* 내일 개장 전 API 연결 상황 및 마켓 스냅샷 상태를 재검토하십시오."
      : "* Re-verify API connection health and market snapshot status before tomorrow's market open.";
    if (isCritical) {
      checkTomorrow += isKo
        ? "\n* **중요**: 당일 크리티컬 등급의 시스템 경보 또는 데이터 누락이 있었습니다. 제공자 설정을 확인하십시오."
        : "\n* **CRITICAL**: Critical system warnings or data omissions were detected today. Check provider parameters.";
    }

    sections.push({
      id: "check-tomorrow",
      title: isKo ? "10. 내일 확인할 항목" : "10. Items to Check Tomorrow",
      content: checkTomorrow,
      order: 10,
    });

    return sections;
  }
}

export const dailyReportRenderer = new DailyReportRenderer();
