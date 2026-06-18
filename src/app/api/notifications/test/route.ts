import { NextRequest } from "next/server";
import { notificationHub } from "@/server/notifications/notification-hub";
import { alertEventStore } from "@/server/alerts/alert-event-store";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isKo = body.locale === "en" ? false : true;

    const event: AlertEvent = {
      id: `evt-test-${Math.random().toString(36).substr(2, 9)}`,
      ruleType: "return_zscore",
      severity: body.severity || "info",
      titleKo: isKo
        ? `[테스트 알림] ${body.title || "간단 테스트"}`
        : `[Test Alert] ${body.title || "Simple Test"}`,
      titleEn: `[Test Alert] ${body.title || "Simple Test"}`,
      messageKo: isKo
        ? `${body.body || "이것은 알림 채널 검증용 테스트 메시지입니다."}\n데이터 출처: 테스트\n기준시각: ${new Date().toISOString()}`
        : `${body.body || "This is a test message for verifying notification channels."}\nSource: Test\nTimestamp: ${new Date().toISOString()}`,
      messageEn: `${body.body || "This is a test message for verifying notification channels."}\nSource: Test\nTimestamp: ${new Date().toISOString()}`,
      dataStatus: "real_time",
      source: "Test System",
      sourceTier: "official",
      warnings: [],
      dedupeKey: `test:alert:${Math.random().toString(36).substr(2, 9)}`,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
    };

    await alertEventStore.addEvent(event);
    const deliveries = await notificationHub.dispatchNotification(event);

    return createSafeResponse({ success: true, eventId: event.id, deliveries });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export const dynamic = "force-dynamic";
