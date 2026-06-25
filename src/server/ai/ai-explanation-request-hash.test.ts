import { describe, it, expect } from "vitest";
import { createAiExplanationRequestHash } from "./ai-explanation-request-hash";

describe("createAiExplanationRequestHash", () => {
  const baseInput = {
    intent: "audit_finding_explanation",
    sourceType: "audit_finding",
    sourceId: "finding_123",
    contextPackId: "finding_123",
    sourceRefs: [
      {
        sourceType: "individual_signal_ic",
        sourceId: "ic_1",
        status: "cached",
        updatedAt: "2026-06-25T12:00:00Z",
        warnings: ["weak_signal", "negative_ic"],
      },
      {
        sourceType: "factor_correlation",
        sourceId: "corr_1",
        status: "cached",
        updatedAt: "2026-06-25T12:00:00Z",
        warnings: ["collinearity_warn"],
      },
    ],
    locale: "ko" as const,
    userPrompt: "설명해주세요.",
  };

  it("should generate the same hash for the exact same input", () => {
    const hash1 = createAiExplanationRequestHash(baseInput);
    const hash2 = createAiExplanationRequestHash(baseInput);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // sha256 hex length
  });

  it("should generate the same hash even if sourceRefs ordering is different", () => {
    const inputWithSwappedRefs = {
      ...baseInput,
      sourceRefs: [baseInput.sourceRefs[1], baseInput.sourceRefs[0]],
    };
    const hash1 = createAiExplanationRequestHash(baseInput);
    const hash2 = createAiExplanationRequestHash(inputWithSwappedRefs);
    expect(hash1).toBe(hash2);
  });

  it("should generate the same hash even if warnings in sourceRefs have different ordering", () => {
    const inputWithSwappedWarnings = {
      ...baseInput,
      sourceRefs: [
        {
          ...baseInput.sourceRefs[0],
          warnings: ["negative_ic", "weak_signal"], // originally ["weak_signal", "negative_ic"]
        },
        baseInput.sourceRefs[1],
      ],
    };
    const hash1 = createAiExplanationRequestHash(baseInput);
    const hash2 = createAiExplanationRequestHash(inputWithSwappedWarnings);
    expect(hash1).toBe(hash2);
  });

  it("should generate different hash if userPrompt changes", () => {
    const inputWithDifferentPrompt = {
      ...baseInput,
      userPrompt: "다른 프롬프트",
    };
    const hash1 = createAiExplanationRequestHash(baseInput);
    const hash2 = createAiExplanationRequestHash(inputWithDifferentPrompt);
    expect(hash1).not.toBe(hash2);
  });

  it("should generate different hash if updatedAt changes", () => {
    const inputWithDifferentDate = {
      ...baseInput,
      sourceRefs: [
        {
          ...baseInput.sourceRefs[0],
          updatedAt: "2026-06-25T13:00:00Z",
        },
        baseInput.sourceRefs[1],
      ],
    };
    const hash1 = createAiExplanationRequestHash(baseInput);
    const hash2 = createAiExplanationRequestHash(inputWithDifferentDate);
    expect(hash1).not.toBe(hash2);
  });
});
