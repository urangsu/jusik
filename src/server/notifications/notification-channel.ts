import { AlertEvent } from "@/domain/alerts/alert-event";

export interface NotificationChannelAdapter {
  id: string;
  send(
    event: AlertEvent,
    title: string,
    body: string,
    recipient?: string
  ): Promise<{
    status: "sent" | "failed" | "skipped";
    failureReason?: string;
    providerResponse?: unknown;
  }>;
}
