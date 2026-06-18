import { describe, it, expect } from "vitest";
import { generateValidityReport } from "@/server/backtest/portfolio-simulator";

describe("generateValidityReport", () => {
  it("defaults to functional_check_only for sample universes", () => {
    const report = generateValidityReport("KOSPI_SAMPLE", 4, 3, 80, false, false, false);

    expect(report.level).toBe("functional_check_only");
    expect(report.reasons).toContain("sample_universe_only");
    expect(report.reasons).toContain("missing_adjusted_price");
    expect(report.reasons).toContain("no_historical_universe_membership");
    expect(report.reasons).toContain("missing_benchmark");
    expect(report.messageKo).toContain("기능 검증용");
  });

  it("includes missing_benchmark when benchmark data is unavailable", () => {
    const report = generateValidityReport("KOSPI_SAMPLE", 4, 3, 80, false, false, false);
    expect(report.reasons).toContain("missing_benchmark");
  });

  it("includes insufficient_ic_pairs when IC pairs are insufficient", () => {
    const report = generateValidityReport("KOSPI_SAMPLE", 4, 3, 80, false, false, true);
    expect(report.reasons).toContain("insufficient_ic_pairs");
  });

  it("includes personal_fallback_used when fallback data was used", () => {
    const report = generateValidityReport("KOSPI_SAMPLE", 4, 3, 80, false, true, false);
    expect(report.reasons).toContain("personal_fallback_used");
  });

  it("marks invalid runs when there are no OOS windows", () => {
    const report = generateValidityReport("KOSPI_SAMPLE", 0, 0, 0, false, false, false);
    expect(report.level).toBe("invalid");
  });
});
