import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SentimentReferencePanel } from "./SentimentReferencePanel";

describe("SentimentReferencePanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders sentiment values and critical isolation warning text", async () => {
    const mockRef = {
      status: "cached",
      value: {
        cnn_fear_greed_reference: {
          market: "us_stock",
          provider: "cnn_fear_greed_reference",
          value: 22,
          label: "extreme_fear",
          updatedAt: new Date().toISOString(),
        },
        alternative_me_crypto_fear_greed: {
          market: "crypto",
          provider: "alternative_me_crypto_fear_greed",
          value: 78,
          label: "extreme_greed",
          updatedAt: new Date().toISOString(),
        },
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockRef,
    } as any);

    render(<SentimentReferencePanel />);

    // Wait for the fetch and rendering
    await waitFor(() => {
      expect(screen.getByText(/22/)).toBeDefined();
      expect(screen.getByText(/78/)).toBeDefined();
    });

    // Verify critical Korean isolation disclaimer exists
    expect(
      screen.getByText(
        /참고용 시장심리 지표입니다\. 전략 적합도 계산과 주문 판단에는 사용하지 않습니다\./
      )
    ).toBeDefined();
  });
});
