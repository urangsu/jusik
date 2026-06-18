import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendConsoleNotification, redactSensitiveConsoleData } from "./console-notification-channel";
import { AlertEvent } from "../../../domain/alerts/alert-event";

describe("console-notification-channel redact", () => {
  it("should redact potential KIS account numbers", () => {
    const text = "계좌번호는 50067890-02 입니다.";
    const result = redactSensitiveConsoleData(text);
    expect(result).toBe("계좌번호는 [ACCOUNT_REDACTED] 입니다.");
  });

  it("should redact API keys and tokens", () => {
    const text1 = "Here is the key: abcdef1234567890xyz";
    const text2 = "token=secretTokenValue123456";
    
    expect(redactSensitiveConsoleData(text1)).toBe("Here is the key: [SECRET_REDACTED]");
    expect(redactSensitiveConsoleData(text2)).toBe("token=[SECRET_REDACTED]");
  });

  it("should not redact normal text", () => {
    const text = "이것은 일반 텍스트입니다. 12345 또는 abc 같은 값은 가려지지 않습니다.";
    expect(redactSensitiveConsoleData(text)).toBe(text);
  });
});

describe("console-notification-channel output", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    logSpy.mockClear();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("should print alert events to console with redacted sensitive info", async () => {
    const event: AlertEvent = {
      id: "evt-1",
      ruleType: "provider_error",
      severity: "critical",
      titleKo: "KIS 오류 발생 (key: kiskey1234567890)",
      titleEn: "KIS Error",
      messageKo: "계좌 12345678-01 에서 오류가 발생했습니다.",
      messageEn: "Error on account 12345678-01.",
      assetId: null,
      symbol: null,
      universeId: null,
      providerId: "kis",
      sourceEventId: null,
      sourceReceiptNo: null,
      dataStatus: "error",
      source: "KIS Health Checker",
      sourceTier: "official",
      warnings: [],
      dedupeKey: "kis:error",
      occurredAt: "2026-06-18T09:00:00Z",
      createdAt: "2026-06-18T09:00:00Z",
      readAt: null,
      dismissedAt: null,
    };

    await sendConsoleNotification(event);

    expect(logSpy).toHaveBeenCalled();
    const allLogs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(allLogs).toContain("=== [ALERT CRITICAL]");
    expect(allLogs).toContain("Rule Type: provider_error");
    expect(allLogs).toContain("Title: KIS 오류 발생 (key: [SECRET_REDACTED])");
    expect(allLogs).toContain("Message: 계좌 [ACCOUNT_REDACTED] 에서 오류가 발생했습니다.");
    expect(allLogs).toContain("Provider: kis");
  });
});
