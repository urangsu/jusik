import { WalkForwardWindow, assertWindowNoOverlap } from "@/domain/backtest/walk-forward-window";

const MIN_TRAIN_DAYS = 60;
const MIN_TEST_DAYS = 20;

export type WalkForwardGeneratorParams = {
  startDate: string;
  endDate: string;
  /** 훈련 기간 (영업일 근사값, calendar days 기준) */
  trainDays: number;
  /** 테스트 기간 (calendar days) */
  testDays: number;
  /** 다음 window 시작까지 이동 폭 (calendar days) */
  stepDays: number;
};

/**
 * calendar day 오프셋으로 날짜를 계산한다.
 * 공휴일/거래일 캘린더는 P0에서 미구현 (TODO: WO-010에서 실제 거래일 캘린더 적용).
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(startStr: string, endStr: string): number {
  const a = new Date(startStr);
  const b = new Date(endStr);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Walk-forward window를 생성한다.
 * 
 * 규칙:
 * - trainDays >= 60 (영업일 근사)
 * - testDays >= 20
 * - trainEnd < testStart (겹침 없음)
 * - OOS window가 1개 이상 생성되어야 한다
 */
export function generateWalkForwardWindows(
  params: WalkForwardGeneratorParams
): WalkForwardWindow[] {
  const { startDate, endDate, trainDays, testDays, stepDays } = params;

  if (trainDays < MIN_TRAIN_DAYS) {
    throw new Error(`trainDays must be >= ${MIN_TRAIN_DAYS}, got ${trainDays}`);
  }
  if (testDays < MIN_TEST_DAYS) {
    throw new Error(`testDays must be >= ${MIN_TEST_DAYS}, got ${testDays}`);
  }
  if (stepDays <= 0) {
    throw new Error(`stepDays must be > 0, got ${stepDays}`);
  }

  const totalDays = daysBetween(startDate, endDate);
  if (totalDays < trainDays + testDays) {
    throw new Error(
      `Total range (${totalDays} days) is too short for trainDays (${trainDays}) + testDays (${testDays})`
    );
  }

  const windows: WalkForwardWindow[] = [];
  let windowStart = startDate;
  let windowIndex = 0;

  while (true) {
    const trainStart = windowStart;
    const trainEnd = addDays(trainStart, trainDays - 1);
    const testStart = addDays(trainEnd, 1);  // train 다음 날 = test 시작
    const testEnd = addDays(testStart, testDays - 1);

    if (testEnd > endDate) break;

    const window: WalkForwardWindow = {
      windowIndex,
      trainStart,
      trainEnd,
      testStart,
      testEnd,
    };

    // 겹침 방어 assertion
    assertWindowNoOverlap(window);

    windows.push(window);
    windowStart = addDays(windowStart, stepDays);
    windowIndex++;
  }

  if (windows.length === 0) {
    throw new Error(
      `No walk-forward windows generated. Extend the date range or reduce trainDays/testDays.`
    );
  }

  return windows;
}
