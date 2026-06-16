import React from "react";
import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AlertSettingsPage } from "./AlertSettingsPage";
import { I18nProvider } from "@/i18n/use-i18n";

// Mock fetch
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
              globalEnabled: true,
              locale: "ko",
              channelPreferences: {
                web_inbox: true,
                console: true,
                telegram: false,
                kakao: false,
                email: false,
              },
              quietHours: {
                enabled: true,
                start: "23:00",
                end: "07:00",
                timezone: "Asia/Seoul",
              },
            }),
        });
      }
      if (urlStr.includes("/api/notifications/channels")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              channels: [
                {
                  id: "web_inbox",
                  displayName: "Web Inbox (앱 내 알림)",
                  status: "enabled",
                  supportsMarkdown: true,
                  supportsImmediateDelivery: true,
                },
                {
                  id: "console",
                  displayName: "Console (로그 출력)",
                  status: "enabled",
                  supportsMarkdown: false,
                  supportsImmediateDelivery: true,
                },
              ],
            }),
        });
      }
      if (urlStr.includes("/api/alerts/rules")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              rules: [
                {
                  id: "rule-1",
                  name: "테스트 1일 수익률",
                  enabled: true,
                  type: "return_zscore",
                  scope: "universe",
                  channels: ["web_inbox"],
                  cooldownMinutes: 60,
                },
              ],
            }),
        });
      }
      if (urlStr.includes("/api/alerts/events")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              events: [
                {
                  id: "evt-1",
                  ruleId: "rule-1",
                  ruleName: "테스트 1일 수익률",
                  ruleType: "return_zscore",
                  severity: "warning",
                  title: "삼성전자 급등",
                  body: "삼성전자가 급등했습니다.",
                  dataStatus: "real_time",
                  source: "Test",
                  sourceTier: "official",
                  warnings: [],
                  createdAt: new Date().toISOString(),
                },
              ],
            }),
        });
      }
      if (urlStr.includes("/api/notifications/history")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              deliveries: [
                {
                  id: "del-1",
                  alertEventId: "evt-1",
                  channelId: "web_inbox",
                  status: "sent",
                  title: "삼성전자 급등",
                  body: "삼성전자가 급등했습니다.",
                  locale: "ko",
                  createdAt: new Date().toISOString(),
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

  it("renders page header and main preferences config", async () => {
    render(
      <I18nProvider initialLocale="ko">
        <AlertSettingsPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("알림 및 규칙 엔진 제어판")).toBeInTheDocument();
      expect(screen.getByText("글로벌 환경 설정")).toBeInTheDocument();
      expect(screen.getAllByText("테스트 1일 수익률")[0]).toBeInTheDocument();
      expect(screen.getAllByText("삼성전자 급등")[0]).toBeInTheDocument();
    });
  });

  it("shows rule editor when clicking '새 규칙' button", async () => {
    render(
      <I18nProvider initialLocale="ko">
        <AlertSettingsPage />
      </I18nProvider>
    );

    // Wait for load
    await screen.findAllByText("테스트 1일 수익률");

    const newRuleBtn = screen.getByText("새 규칙");
    fireEvent.click(newRuleBtn);

    expect(screen.getByText("새 알림 규칙 추가")).toBeInTheDocument();
    expect(screen.getByText("규칙 이름")).toBeInTheDocument();
  });
});
