import { AlertEvent } from "@/domain/alerts/alert-event";

export class NotificationRenderer {
  render(event: AlertEvent, locale: "ko" | "en"): { title: string; body: string } {
    // If the event locale matches the target preference locale, use the event's rendered text
    // Otherwise, we can return the event's title and body (since they are already rendered by the evaluator).
    void locale;
    return {
      title: event.title,
      body: event.body,
    };
  }
}

export const notificationRenderer = new NotificationRenderer();
