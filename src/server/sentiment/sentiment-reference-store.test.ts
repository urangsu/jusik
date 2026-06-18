import { describe, expect, it, beforeEach } from "vitest";
import { sentimentReferenceStore } from "./sentiment-reference-store";
import { SentimentReferenceSnapshot } from "@/domain/sentiment/sentiment-reference-snapshot";

describe("SentimentReferenceStore", () => {
  beforeEach(async () => {
    // Reset or clean up the store with default or empty
    const latest = await sentimentReferenceStore.getAllLatest();
    for (const key of Object.keys(latest)) {
      delete latest[key];
    }
  });

  it("can save and load snapshots correctly", async () => {
    const mockSnap: SentimentReferenceSnapshot = {
      id: "cnn-fng-test",
      market: "us_stock",
      provider: "cnn_fear_greed_reference",
      value: 65,
      label: "greed",
      usedForCoreSignal: false,
      usedForRegimeGate: false,
      usedForOrderDecision: false,
      source: "CNN Test",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    await sentimentReferenceStore.saveSnapshot(mockSnap);

    const loaded = await sentimentReferenceStore.getLatestSnapshot("cnn_fear_greed_reference");
    expect(loaded).toBeDefined();
    expect(loaded?.value).toBe(65);
    expect(loaded?.label).toBe("greed");
  });
});
