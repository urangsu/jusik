import { AlertEvent } from "@/domain/alerts/alert-event";

export class NotificationRenderer {
  render(event: AlertEvent, locale: "ko" | "en"): { title: string; body: string } {
    const isKo = locale === "ko";
    return {
      title: isKo ? event.titleKo : event.titleEn,
      body: isKo ? event.messageKo : event.messageEn,
    };
  }
}

export const notificationRenderer = new NotificationRenderer();
