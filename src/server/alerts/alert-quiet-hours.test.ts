import { describe, it, expect } from "vitest";
import { isInQuietHours } from "./alert-quiet-hours";

describe("isInQuietHours", () => {
  const quietHours = {
    enabled: true,
    start: "23:00",
    end: "07:00",
    timezone: "Asia/Seoul",
  };

  it("should return false if quiet hours is disabled", () => {
    const disabledConfig = { ...quietHours, enabled: false };
    const date = new Date("2026-06-17T00:30:00Z"); // UTC 00:30 is 09:30 KST
    expect(isInQuietHours(date, disabledConfig)).toBe(false);
  });

  it("should return true if current time falls in quiet hours (over midnight KST)", () => {
    // 23:30 KST -> UTC 14:30
    const date = new Date("2026-06-17T14:30:00Z");
    expect(isInQuietHours(date, quietHours)).toBe(true);

    // 06:30 KST -> UTC 21:30 (previous day)
    const date2 = new Date("2026-06-16T21:30:00Z");
    expect(isInQuietHours(date2, quietHours)).toBe(true);
  });

  it("should return false if current time is outside quiet hours", () => {
    // 14:30 KST -> UTC 05:30
    const date = new Date("2026-06-17T05:30:00Z");
    expect(isInQuietHours(date, quietHours)).toBe(false);
  });

  it("should handle day-time quiet hours (e.g. 09:00 to 18:00)", () => {
    const daytimeQuiet = {
      enabled: true,
      start: "09:00",
      end: "18:00",
      timezone: "Asia/Seoul",
    };

    // 12:30 KST -> UTC 03:30
    const dateInside = new Date("2026-06-17T03:30:00Z");
    expect(isInQuietHours(dateInside, daytimeQuiet)).toBe(true);

    // 20:30 KST -> UTC 11:30
    const dateOutside = new Date("2026-06-17T11:30:00Z");
    expect(isInQuietHours(dateOutside, daytimeQuiet)).toBe(false);
  });
});
