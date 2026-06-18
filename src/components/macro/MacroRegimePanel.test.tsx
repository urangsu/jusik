import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MacroRegimePanel } from "./MacroRegimePanel";

describe("MacroRegimePanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders regime score and confidence after loading", async () => {
    const mockUsRegime = {
      status: "real_time",
      value: {
        market: "US",
        regime: "selective_risk_on",
        score: 68,
        confidence: "high",
        gates: { allowsNewWatch: true, allowsRiskUpgrading: true, suppressesMomentumAlert: false },
        warnings: [],
        calculatedAt: new Date().toISOString(),
      },
    };

    const mockKrRegime = {
      status: "real_time",
      value: {
        market: "KR",
        regime: "risk_off",
        score: 38,
        confidence: "high",
        gates: { allowsNewWatch: false, allowsRiskUpgrading: false, suppressesMomentumAlert: true },
        warnings: ["Exchange Rate Spike"],
        calculatedAt: new Date().toISOString(),
      },
    };

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url.toString().includes("market=US")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsRegime,
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockKrRegime,
      } as any);
    });

    render(<MacroRegimePanel />);

    // Check loading indicator or wait for renders
    await waitFor(() => {
      expect(screen.getByText(/US Market Regime|미국 시장 레짐/i)).toBeDefined();
      expect(screen.getByText(/KR Market Regime|한국 시장 레짐/i)).toBeDefined();
    });

    // Check scores
    expect(screen.getByText(/68 \/ 100/)).toBeDefined();
    expect(screen.getByText(/38 \/ 100/)).toBeDefined();
  });
});
