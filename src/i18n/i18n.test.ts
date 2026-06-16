import { describe, it, expect } from "vitest";
import { getMetricLabel } from "./metric-labels";
import { getDataStatusLabel, getSourceWarningLabel } from "./status-labels";
import { getProviderPolicyLabel } from "./provider-labels";

describe("i18n Dictionary Checks", () => {
  it("should return localized metric labels", () => {
    const koMetric = getMetricLabel("PER", "ko");
    expect(koMetric.short).toBe("PER");
    expect(koMetric.full).toBe("PER(주가수익비율)");
    expect(koMetric.description).toContain("주당순이익");

    const enMetric = getMetricLabel("PER", "en");
    expect(enMetric.short).toBe("PER");
    expect(enMetric.full).toBe("PER (Price Earnings Ratio)");
  });

  it("should return localized data status labels", () => {
    expect(getDataStatusLabel("real_time", "ko")).toBe("실시간");
    expect(getDataStatusLabel("real_time", "en")).toBe("Real-time");

    expect(getDataStatusLabel("api_required", "ko")).toBe("API 필요");
    expect(getDataStatusLabel("api_required", "en")).toBe("API Required");
  });

  it("should return localized source warnings", () => {
    expect(getSourceWarningLabel("personal_use_only", "ko")).toBe("개인 연구용");
    expect(getSourceWarningLabel("personal_use_only", "en")).toBe("Personal Use Only");
  });

  it("should return localized provider policy labels", () => {
    expect(getProviderPolicyLabel("official", "ko")).toBe("공식");
    expect(getProviderPolicyLabel("official", "en")).toBe("Official");
  });
});
