import { describe, it, expect } from "vitest";
import { inspectForbiddenWording } from "./forbidden-wording-guard";

describe("inspectForbiddenWording", () => {
  it("should block forbidden Korean phrases like '매수 추천'", () => {
    const res = inspectForbiddenWording({ text: "이 종목은 매수 추천입니다" });
    expect(res.blocked).toBe(true);
    expect(res.blockedTerms).toContain("매수");
    expect(res.blockedTerms).toContain("추천");
  });

  it("should block forbidden Korean phrases like '수익 보장'", () => {
    const res = inspectForbiddenWording({ text: "수익 보장 가능" });
    expect(res.blocked).toBe(true);
    expect(res.blockedTerms).toContain("수익 보장");
  });

  it("should allow allowed Korean explanation exceptions", () => {
    const res = inspectForbiddenWording({ text: "매수/매도 추천을 하지 않습니다" });
    expect(res.blocked).toBe(false);
  });

  it("should allow general notice disclaimer exceptions", () => {
    const res = inspectForbiddenWording({ text: "진단 결과이며 투자 지시가 아닙니다" });
    expect(res.blocked).toBe(false);
  });

  it("should block strong buy in English", () => {
    const res = inspectForbiddenWording({ text: "This is a strong buy signal" });
    expect(res.blocked).toBe(true);
    expect(res.blockedTerms).toContain("strong buy");
  });

  it("should allow english recommendation disclaimers", () => {
    const res = inspectForbiddenWording({ text: "not a buy or sell recommendation" });
    expect(res.blocked).toBe(false);
  });

  it("should still block even if exception is present with other forbidden terms", () => {
    const res = inspectForbiddenWording({
      text: "이 종목은 매수 추천이며, 매수/매도 추천을 하지 않습니다",
    });
    expect(res.blocked).toBe(true);
  });
});
