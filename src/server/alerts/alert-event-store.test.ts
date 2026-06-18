import { describe, it, expect, vi, beforeEach } from "vitest";
import { alertEventStore } from "./alert-event-store";
import { AlertEvent } from "../../domain/alerts/alert-event";

(globalThis as any).__mockAlertEventFileContent = "[]";

vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => (globalThis as any).__mockAlertEventFileContent),
      writeFileSync: vi.fn((path, content) => {
        (globalThis as any).__mockAlertEventFileContent = content as string;
      }),
    },
  };
});

vi.mock("fs/promises", () => {
  return {
    default: {
      mkdir: vi.fn(),
      readFile: vi.fn(async () => (globalThis as any).__mockAlertEventFileContent),
      writeFile: vi.fn(async (path, content) => {
        (globalThis as any).__mockAlertEventFileContent = content as string;
      }),
      open: vi.fn(async () => ({
        close: vi.fn(async () => {}),
      })),
      unlink: vi.fn(async () => {}),
      rename: vi.fn(async (from, to) => {
        if (from.endsWith(".tmp")) {
          // In writeAtomic, write temp file then rename
          // So our mock file content is actually what was in tempPath
        }
      }),
    },
  };
});

describe("AlertEventStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__mockAlertEventFileContent = "[]";
  });

  const sampleEvent: AlertEvent = {
    id: "evt-123",
    ruleType: "new_filing",
    severity: "info",
    titleKo: "테스트 제목",
    titleEn: "Test Title",
    messageKo: "테스트 내용",
    messageEn: "Test Content",
    assetId: "KR:005930",
    symbol: "005930",
    universeId: "KOSPI_SAMPLE",
    providerId: "opendart",
    sourceEventId: "src-123",
    sourceReceiptNo: "123",
    dataStatus: "real_time",
    source: "OpenDART",
    sourceTier: "official",
    warnings: [],
    dedupeKey: "filing:123",
    occurredAt: "2026-06-18T00:00:00Z",
    createdAt: "2026-06-18T00:00:00Z",
    readAt: null,
    dismissedAt: null,
  };

  it("should save and load alert events", async () => {
    await alertEventStore.saveAlertEvents([sampleEvent]);
    const events = await alertEventStore.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("evt-123");
  });

  it("should deduplicate events with the same dedupeKey and update occurredAt", async () => {
    await alertEventStore.saveAlertEvents([sampleEvent]);
    
    const duplicateEvent: AlertEvent = {
      ...sampleEvent,
      id: "evt-456",
      occurredAt: "2026-06-18T01:00:00Z",
    };

    await alertEventStore.saveAlertEvents([duplicateEvent]);
    
    const events = await alertEventStore.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("evt-123");
    expect(events[0].occurredAt).toBe("2026-06-18T01:00:00Z");
  });

  it("should filter events correctly", async () => {
    const criticalEvent: AlertEvent = {
      ...sampleEvent,
      id: "evt-critical",
      dedupeKey: "provider:opendart:error",
      ruleType: "provider_error",
      severity: "critical",
    };

    await alertEventStore.saveAlertEvents([sampleEvent, criticalEvent]);

    const criticalList = await alertEventStore.getAlertEvents({ severity: "critical" });
    expect(criticalList).toHaveLength(1);
    expect(criticalList[0].id).toBe("evt-critical");

    const filingList = await alertEventStore.getAlertEvents({ ruleType: "new_filing" });
    expect(filingList).toHaveLength(1);
    expect(filingList[0].id).toBe("evt-123");
  });

  it("should mark alerts read or dismissed", async () => {
    await alertEventStore.saveAlertEvents([sampleEvent]);
    
    await alertEventStore.markAlertRead("evt-123");
    let events = await alertEventStore.getAlertEvents({ unreadOnly: true });
    expect(events).toHaveLength(0);

    events = await alertEventStore.getEvents();
    expect(events[0].readAt).not.toBeNull();

    await alertEventStore.dismissAlert("evt-123");
    events = await alertEventStore.getEvents();
    expect(events[0].dismissedAt).not.toBeNull();
  });
});
