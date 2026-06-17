export type WalkForwardWindow = {
  windowIndex: number;
  /** ISO date string: YYYY-MM-DD */
  trainStart: string;
  /** ISO date string: YYYY-MM-DD (inclusive) */
  trainEnd: string;
  /** ISO date string: YYYY-MM-DD (must be > trainEnd) */
  testStart: string;
  /** ISO date string: YYYY-MM-DD (inclusive) */
  testEnd: string;
};

export function assertWindowNoOverlap(window: WalkForwardWindow): void {
  if (window.testStart <= window.trainEnd) {
    throw new Error(
      `[WalkForwardWindow] Window ${window.windowIndex}: testStart (${window.testStart}) must be after trainEnd (${window.trainEnd})`
    );
  }
}
