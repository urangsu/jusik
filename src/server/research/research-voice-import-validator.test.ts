import { describe, it, expect } from "vitest";
import { validateImportPost, validateAndResolveClaim } from "./research-voice-import-validator";
import type { PublicResearchPost } from "@/domain/research/research-voice";

describe("research-voice-import-validator", () => {
  describe("validateImportPost", () => {
    it("rejects unsupported source method", () => {
      const payload = {
        sourceMethod: "invalid_method", // Should be official_api, user_json, user_csv
        sourceUrl: "http://example.com/post1",
        externalId: "ext1",
        text: "Important post text",
        voiceId: "voice1",
        publishedAt: "2026-01-01T00:00:00Z",
      };

      const result = validateImportPost(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes("sourceMethod"))).toBe(true);
    });

    it("rejects missing source URL", () => {
      const payload = {
        sourceMethod: "user_json",
        externalId: "ext1",
        text: "Important post text",
        voiceId: "voice1",
        publishedAt: "2026-01-01T00:00:00Z",
      };

      const result = validateImportPost(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes("sourceUrl"))).toBe(true);
    });

    it("accepts valid post payload and calculates simple content hash", () => {
      const payload = {
        sourceMethod: "official_api" as const,
        sourceUrl: "http://example.com/post1",
        externalId: "ext1",
        text: "Important post text",
        voiceId: "voice1",
        publishedAt: "2026-01-01T00:00:00Z",
      };

      const result = validateImportPost(payload);
      expect(result.isValid).toBe(true);
      expect(result.post).not.toBeNull();
      expect(result.post!.contentHash).toBeDefined();
      expect(result.post!.status).toBe("active");
    });
  });

  describe("validateAndResolveClaim", () => {
    const mockPost: PublicResearchPost = {
      postId: "p1",
      voiceId: "v1",
      sourceUrl: "http://example.com/post1",
      externalId: "ext1",
      publishedAt: "2026-01-01T00:00:00Z",
      ingestedAt: "2026-01-01T00:00:00Z",
      contentHash: "hash1",
      text: "Some text",
      revisionOf: null,
      status: "active",
      sourceMethod: "user_json",
    };

    it("resolves canonical symbol assetId correctly from ticker", async () => {
      // "AAPL" is a seeded symbol with assetId "US_AAPL"
      const payload = {
        extractionMethod: "user_import",
        claimKind: "demand_evidence",
        direction: "bullish",
        ticker: "AAPL",
        text: "AAPL is doing great",
        evidenceIds: ["ev1"],
        evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
      };

      const result = await validateAndResolveClaim(payload, mockPost);
      expect(result.isValid).toBe(true);
      expect(result.claim).not.toBeNull();
      expect(result.claim!.assetId).toBe("US_AAPL");
      expect(result.claim!.unresolvedReason).toBeNull();
    });

    it("keeps assetId as null on unresolved ticker and sets unresolvedReason", async () => {
      const payload = {
        extractionMethod: "user_import",
        claimKind: "demand_evidence",
        direction: "bullish",
        ticker: "UNKNOWN_COMPANY",
        text: "Unresolvable ticker content",
        evidenceIds: ["ev1"],
        evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
      };

      const result = await validateAndResolveClaim(payload, mockPost);
      expect(result.isValid).toBe(true);
      expect(result.claim!.assetId).toBeNull();
      expect(result.claim!.unresolvedReason).toContain("could not be resolved");
    });

    it("preserves unclear direction and permits null/omitted evidenceSpan for unclear claims", async () => {
      const payload = {
        extractionMethod: "user_import",
        claimKind: "demand_evidence",
        direction: "unclear",
        ticker: "AAPL",
        text: "Unclear demand signals",
        evidenceIds: ["ev1"],
        evidenceSpan: null,
      };

      const result = await validateAndResolveClaim(payload, mockPost);
      expect(result.isValid).toBe(true);
      expect(result.claim!.direction).toBe("unclear");
      expect(result.claim!.evidenceSpan).toBeNull();
    });

    it("rejects non-unclear claims that lack evidenceSpan", async () => {
      const payload = {
        extractionMethod: "user_import",
        claimKind: "demand_evidence",
        direction: "bullish", // non-unclear
        ticker: "AAPL",
        text: "Good demand signals",
        evidenceIds: ["ev1"],
        // evidenceSpan missing
      };

      const result = await validateAndResolveClaim(payload, mockPost);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes("evidenceSpan"))).toBe(true);
    });
  });
});
