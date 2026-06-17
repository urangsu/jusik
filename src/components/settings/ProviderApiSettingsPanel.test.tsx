import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider } from "../../i18n/use-i18n";
import { ProviderApiSettingsPanel } from "./ProviderApiSettingsPanel";

describe("ProviderApiSettingsPanel Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders loading state initially and then lists providers", async () => {
    const mockResponse = {
      status: "eod",
      value: [
        {
          providerId: "opendart",
          enabled: true,
          values: {
            OPENDART_ENABLED: true,
            OPENDART_BASE_URL: "https://opendart.fss.or.kr/api",
            OPENDART_API_KEY: { configured: true, maskedValue: "abcd****wxyz" },
          },
          status: "healthy",
          lastCheckedAt: "2026-06-18T00:00:00.000Z",
          message: "정상 작동",
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await act(async () => {
      render(
        <I18nProvider initialLocale="ko">
          <ProviderApiSettingsPanel />
        </I18nProvider>
      );
    });

    expect(screen.getByText("데이터 공급자 API 설정 센터")).toBeInTheDocument();
    expect(screen.getByText("OpenDART")).toBeInTheDocument();
  });
});
