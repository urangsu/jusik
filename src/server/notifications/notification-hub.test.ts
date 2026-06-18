import { vi, describe, it, expect, beforeEach } from "vitest";
import { NotificationHub } from "./notification-hub";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { alertRuleEngine } from "../alerts/alert-rule-engine";
import { notificationDeliveryStore } from "./notification-delivery-store";
import { isInQuietHours } from "../alerts/alert-quiet-hours";

vi.mock("../alerts/alert-rule-engine", () => {
  return {
    alertRuleEngine: {
      getRule: vi.fn(),
    },
  };
});

vi.mock("./notification-delivery-store", () => {
  return {
    notificationDeliveryStore: {
      addDelivery: vi.fn(),
    },
  };
});

vi.mock("../alerts/alert-quiet-hours", () => {
  return {
    isInQuietHours: vi.fn(),
  };
});

describe("NotificationHub", () => {
  let hub: NotificationHub;
  let mockEvent: AlertEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    hub = new NotificationHub();

    mockEvent = {
      id: "evt1",
      ruleType: "return_zscore",
      ruleId: "rule1",
      severity: "warning",
      titleKo: "[이상 등락 감지] 삼성전자(005930)",
      titleEn: "[Abnormal Price Move] Samsung Electronics(005930)",
      messageKo: "삼성전자(005930)가 최근 60거래일 변동성 기준 2.0σ 수준의 상승을 보였습니다.\n현재 등락률: 3.5%",
      messageEn: "Samsung Electronics(005930) moved 2.0σ versus its baseline. Return: 3.5%",
      dataStatus: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      warnings: [],
      dedupeKey: "rule:1:005930:standard",
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
    };

    // Mock preferences store
    const mockPref = {
      enabled: true,
      enabledRuleTypes: ["return_zscore"],
      minSeverity: "info",
      channels: {
        webInbox: true,
        console: true,
        telegram: true,
        email: false,
      },
      quietHours: {
        enabled: true,
        start: "23:00",
        end: "07:00",
        timezone: "Asia/Seoul",
      },
      cooldownMinutes: 60,
      locale: "ko" as const,
    };

    hub["preferenceStore"] = {
      read: vi.fn().mockResolvedValue(mockPref),
      write: vi.fn(),
    } as any;
  });

  it("should dispatch to enabled channels and skip disabled ones", async () => {
    (alertRuleEngine.getRule as any).mockResolvedValue({
      id: "rule1",
      channels: ["web_inbox", "telegram", "kakao"],
    });
    (isInQuietHours as any).mockReturnValue(false);

    // Mock adapters
    const mockInboxSend = vi.fn().mockResolvedValue({ status: "sent" });
    const mockTelegramSend = vi.fn().mockResolvedValue({ status: "sent" });
    const mockKakaoSend = vi.fn().mockResolvedValue({ status: "sent" });

    hub["adapters"].set("web_inbox", { id: "web_inbox", send: mockInboxSend });
    hub["adapters"].set("telegram", { id: "telegram", send: mockTelegramSend });
    hub["adapters"].set("kakao", { id: "kakao", send: mockKakaoSend });

    const results = await hub.dispatchNotification(mockEvent);

    // Inbox is enabled by user -> should be sent
    expect(results.find((r) => r.channelId === "web_inbox")?.status).toBe("sent");
    expect(mockInboxSend).toHaveBeenCalled();

    // Telegram is enabled by user -> should be sent
    expect(results.find((r) => r.channelId === "telegram")?.status).toBe("sent");
    expect(mockTelegramSend).toHaveBeenCalled();

    // Kakao is disabled in user preferences -> should be skipped
    const kakaoDel = results.find((r) => r.channelId === "kakao");
    expect(kakaoDel?.status).toBe("skipped");
    expect(kakaoDel?.failureReason).toBe("user_channel_disabled");
    expect(mockKakaoSend).not.toHaveBeenCalled();
  });

  it("should skip external channels during quiet hours, but still process inbox/console", async () => {
    (alertRuleEngine.getRule as any).mockResolvedValue({
      id: "rule1",
      channels: ["web_inbox", "console", "telegram"],
    });
    (isInQuietHours as any).mockReturnValue(true); // Quiet hours active!

    const mockInboxSend = vi.fn().mockResolvedValue({ status: "sent" });
    const mockConsoleSend = vi.fn().mockResolvedValue({ status: "sent" });
    const mockTelegramSend = vi.fn().mockResolvedValue({ status: "sent" });

    hub["adapters"].set("web_inbox", { id: "web_inbox", send: mockInboxSend });
    hub["adapters"].set("console", { id: "console", send: mockConsoleSend });
    hub["adapters"].set("telegram", { id: "telegram", send: mockTelegramSend });

    const results = await hub.dispatchNotification(mockEvent);

    // web_inbox and console are local -> sent bypassing quiet hours
    expect(results.find((r) => r.channelId === "web_inbox")?.status).toBe("sent");
    expect(results.find((r) => r.channelId === "console")?.status).toBe("sent");

    // telegram is external -> skipped
    const telegramDel = results.find((r) => r.channelId === "telegram");
    expect(telegramDel?.status).toBe("skipped");
    expect(telegramDel?.failureReason).toBe("quiet_hours");
    expect(mockTelegramSend).not.toHaveBeenCalled();
  });

  it("should log errors and continue to other channels if one channel fails", async () => {
    (alertRuleEngine.getRule as any).mockResolvedValue({
      id: "rule1",
      channels: ["web_inbox", "telegram"],
    });
    (isInQuietHours as any).mockReturnValue(false);

    // web_inbox fails
    const mockInboxSend = vi.fn().mockRejectedValue(new Error("Database write failed"));
    // telegram succeeds
    const mockTelegramSend = vi.fn().mockResolvedValue({ status: "sent" });

    hub["adapters"].set("web_inbox", { id: "web_inbox", send: mockInboxSend });
    hub["adapters"].set("telegram", { id: "telegram", send: mockTelegramSend });

    const results = await hub.dispatchNotification(mockEvent);

    expect(results.find((r) => r.channelId === "web_inbox")?.status).toBe("failed");
    expect(results.find((r) => r.channelId === "telegram")?.status).toBe("sent");
  });
});
