import { describe, it, expect, vi, beforeEach } from "vitest";
import { alertEvaluator } from "./alert-evaluator";
import { alertPreferenceStore } from "./alert-preference-store";
import { alertCooldownManager } from "./alert-cooldown";
import { alertEventStore } from "./alert-event-store";
import { isInQuietHours } from "./alert-quiet-hours";
import { detectNewFilingEvents } from "./detectors/filing-event-detector";
import { detectProviderHealthAlerts } from "./detectors/provider-health-detector";
import { detectTechnicalSignalChanges } from "./detectors/technical-signal-change-detector";
import { detectReliabilityDeterioration } from "./detectors/reliability-deterioration-detector";
import { sendConsoleNotification } from "../notifications/channels/console-notification-channel";
import { AlertEvent } from "../../domain/alerts/alert-event";

vi.mock("./alert-preference-store", () => ({
  alertPreferenceStore: {
    getPreferences: vi.fn(),
  },
}));

vi.mock("./alert-cooldown", () => ({
  alertCooldownManager: {
    checkCooldown: vi.fn(),
    updateCooldown: vi.fn(),
  },
}));

vi.mock("./alert-event-store", () => ({
  alertEventStore: {
    saveAlertEvents: vi.fn(),
  },
}));

vi.mock("./alert-quiet-hours", () => ({
  isInQuietHours: vi.fn(),
}));

vi.mock("./detectors/filing-event-detector", () => ({
  detectNewFilingEvents: vi.fn(),
}));

vi.mock("./detectors/provider-health-detector", () => ({
  detectProviderHealthAlerts: vi.fn(),
}));

vi.mock("./detectors/technical-signal-change-detector", () => ({
  detectTechnicalSignalChanges: vi.fn(),
}));

vi.mock("./detectors/reliability-deterioration-detector", () => ({
  detectReliabilityDeterioration: vi.fn(),
}));

vi.mock("../notifications/channels/console-notification-channel", () => ({
  sendConsoleNotification: vi.fn(),
}));

// Mock rule engines to return nothing for simplicity in main evaluator tests
vi.mock("./alert-rule-engine", () => ({
  alertRuleEngine: {
    getRules: vi.fn(async () => []),
  },
}));

describe("AlertEvaluator", () => {
  const mockFilingEvent: AlertEvent = {
    id: "evt-filing-1",
    ruleType: "new_filing",
    severity: "info",
    titleKo: "새공시",
    titleEn: "New Filing",
    messageKo: "메시지",
    messageEn: "Message",
    assetId: null,
    symbol: null,
    universeId: null,
    providerId: "opendart",
    sourceEventId: null,
    sourceReceiptNo: null,
    dataStatus: "real_time",
    source: "OpenDART",
    sourceTier: "official",
    warnings: [],
    dedupeKey: "filing:1",
    occurredAt: "2026-06-18T00:00:00Z",
    createdAt: "2026-06-18T00:00:00Z",
    readAt: null,
    dismissedAt: null,
  };

  const mockCriticalEvent: AlertEvent = {
    ...mockFilingEvent,
    id: "evt-provider-1",
    ruleType: "provider_invalid_key",
    severity: "critical",
    dedupeKey: "provider:opendart:invalid_key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default preferences
    vi.mocked(alertPreferenceStore.getPreferences).mockResolvedValue({
      enabled: true,
      enabledRuleTypes: ["new_filing", "provider_invalid_key"],
      minSeverity: "info",
      quietHours: {
        enabled: true,
        start: "23:00",
        end: "07:00",
        timezone: "Asia/Seoul",
      },
      channels: {
        webInbox: true,
        console: true,
        telegram: false,
        email: false,
      },
      cooldownMinutes: 60,
    });

    vi.mocked(isInQuietHours).mockReturnValue(false);
    vi.mocked(alertCooldownManager.checkCooldown).mockResolvedValue(true);
    vi.mocked(detectNewFilingEvents).mockResolvedValue([mockFilingEvent]);
    vi.mocked(detectProviderHealthAlerts).mockResolvedValue([mockCriticalEvent]);
    vi.mocked(detectTechnicalSignalChanges).mockResolvedValue([]);
    vi.mocked(detectReliabilityDeterioration).mockResolvedValue([]);
  });

  it("should evaluate and save active alert events when enabled", async () => {
    const res = await alertEvaluator.evaluateAlerts();

    expect(res.generated).toBe(2);
    expect(res.saved).toBe(2);
    expect(res.skipped).toBe(0);
    expect(alertEventStore.saveAlertEvents).toHaveBeenCalledWith([mockFilingEvent, mockCriticalEvent]);
    expect(sendConsoleNotification).toHaveBeenCalledTimes(2);
    expect(alertCooldownManager.updateCooldown).toHaveBeenCalledTimes(2);
  });

  it("should skip all evaluations if globally disabled", async () => {
    vi.mocked(alertPreferenceStore.getPreferences).mockResolvedValue({
      enabled: false,
      enabledRuleTypes: ["new_filing"],
      minSeverity: "info",
      quietHours: { enabled: false, start: "23:00", end: "07:00", timezone: "Asia/Seoul" },
      channels: { webInbox: true, console: true, telegram: false, email: false },
      cooldownMinutes: 60,
    });

    const res = await alertEvaluator.evaluateAlerts();
    expect(res.generated).toBe(0);
    expect(res.saved).toBe(0);
    expect(alertEventStore.saveAlertEvents).not.toHaveBeenCalled();
  });

  it("should filter events by minSeverity", async () => {
    vi.mocked(alertPreferenceStore.getPreferences).mockResolvedValue({
      enabled: true,
      enabledRuleTypes: ["new_filing", "provider_invalid_key"],
      minSeverity: "critical", // Only critical severity and above
      quietHours: { enabled: false, start: "23:00", end: "07:00", timezone: "Asia/Seoul" },
      channels: { webInbox: true, console: true, telegram: false, email: false },
      cooldownMinutes: 60,
    });

    const res = await alertEvaluator.evaluateAlerts();

    expect(res.generated).toBe(2);
    expect(res.saved).toBe(1); // Only mockCriticalEvent is saved
    expect(res.skipped).toBe(1);
    expect(alertEventStore.saveAlertEvents).toHaveBeenCalledWith([mockCriticalEvent]);
  });

  it("should skip evaluations during quiet hours if enabled", async () => {
    vi.mocked(isInQuietHours).mockReturnValue(true);

    const res = await alertEvaluator.evaluateAlerts();
    expect(res.saved).toBe(0);
    expect(res.skipped).toBe(2);
  });

  it("should filter out events that are in cooldown", async () => {
    // mockFilingEvent is in cooldown, mockCriticalEvent is not
    vi.mocked(alertCooldownManager.checkCooldown).mockImplementation(async (key) => {
      return key !== "filing:1";
    });

    const res = await alertEvaluator.evaluateAlerts();
    expect(res.saved).toBe(1);
    expect(res.skipped).toBe(1);
    expect(alertEventStore.saveAlertEvents).toHaveBeenCalledWith([mockCriticalEvent]);
  });
});
