import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Research Workspace UI safety checks", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "src/components/research/ResearchWorkspace.tsx",
  );
  const source = fs.readFileSync(componentPath, "utf-8");

  it("does not contain buy/sell/entry text in Korean or English", () => {
    // Should never contain trading action cues
    expect(source.toLowerCase()).not.toContain("buy");
    expect(source.toLowerCase()).not.toContain("sell");
    expect(source).not.toContain("매수");
    expect(source).not.toContain("매도");
    expect(source).not.toContain("추천");
  });

  it("does not contain expected return or target price text", () => {
    expect(source.toLowerCase()).not.toContain("expected return");
    expect(source.toLowerCase()).not.toContain("target price");
    expect(source).not.toContain("목표가");
    expect(source).not.toContain("목표 주가");
    expect(source).not.toContain("예상 수익");
  });

  it("displays insufficient_data and 데이터 부족 when asset is empty or missing data", () => {
    expect(source).toContain("insufficient_data");
    expect(source).toContain("데이터 부족");
    expect(source).toContain("현재 화면은 투자 판단이 아니라 근거 검증 상태를 표시합니다.");
  });

  it("ensures no emojis exist in the UI text", () => {
    // Emojis are forbidden in the UI
    const emojiRegex = /[\uD800-\uDFFF\u2600-\u27BF]/g;
    expect(source).not.toMatch(emojiRegex);
  });
});

describe("Supply Chain Evidence Panel UI safety checks", () => {
  const panelPath = path.resolve(
    process.cwd(),
    "src/components/research/SupplyChainEvidencePanel.tsx",
  );
  const source = fs.readFileSync(panelPath, "utf-8");

  it("uses distinct labels for inferred and verified supply-chain edges", () => {
    expect(source).toContain("Verified (검증됨)");
    expect(source).toContain("Inferred (추정됨)");
    expect(source).toContain("Hypothesis (가설)");
  });

  it("does not contain buy/sell/entry/recommendation text", () => {
    expect(source.toLowerCase()).not.toContain("buy");
    expect(source.toLowerCase()).not.toContain("sell");
    expect(source).not.toContain("매수");
    expect(source).not.toContain("매도");
  });
});
