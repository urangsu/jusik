import React from "react";
import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AlertSettingsPage } from "./AlertSettingsPage";
import { I18nProvider } from "@/i18n/use-i18n";

const globalFetch = global.fetch;

describe("AlertSettingsPage UI Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: any) => {
      const urlStr = typeof url === "string" ? url : url.url || "";
      if (urlStr.includes("/api/alerts/preferences")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              value: {
                enabled: true,
                enabledRuleTypes: [
                  "price_cross",
                  "return_zscore",
                  "new_filing",
                ],
                minSeverity: "info",
                channels: {
                  webInbox: true,
                  console: true,
                  telegram: false,
                  email: false,
                },
                quietHours: {
                  enabled: true,
                  start: "23:00",
                  end: "07:00",
                  timezone: "Asia/Seoul",
                },
                cooldownMinutes: 60,
              },
            }),
        });
      }
      if (urlStr.includes("/api/alerts/events")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              value: [
                {
                  id: "evt-1",
                  ruleType: "new_filing",
                  severity: "info",
                  titleKo: "삼성전자 급등",
                  titleEn: "Samsung Electronics Spike",
                  messageKo: "삼성전자가 급등했습니다.",
                  messageEn: "Samsung Electronics skyrocketed.",
                  dataStatus: "real_time",
                  source: "Test",
                  sourceTier: "official",
                  warnings: [],
                  createdAt: new Date().toISOString(),
                  occurredAt: new Date().toISOString(),
                  readAt: null,
                  dismissedAt: null,
                },
              ],
            }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as any;
  });

  afterAll(() => {
    global.fetch = globalFetch;
  });

  it("renders page header and main preferences config and inbox", async () => {
    render(
      <I18nProvider initialLocale="ko">
        <AlertSettingsPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("글로벌 알림 환경 설정")).toBeInTheDocument();
      expect(screen.getByText("실시간 알림 감지 활성화")).toBeInTheDocument();
      expect(screen.getByText("알림 및 경보 보드")).toBeInTheDocument();
      expect(screen.getByText("삼성전자 급등")).toBeInTheDocument();
    });
  });

  it("handles preference updates and submit", async () => {
    render(
      <I18nProvider initialLocale="ko">
        <AlertSettingsPage />
      </I18nProvider>
    );

    // Wait for preferences load
    await screen.findByText("글로벌 알림 환경 설정");

    const submitBtn = screen.getByText("설정 저장");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/alerts/preferences",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });
});
