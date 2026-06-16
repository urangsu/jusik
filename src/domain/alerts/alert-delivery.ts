import { NotificationChannelId } from "./alert-channel";

export type NotificationDelivery = {
  id: string;
  alertEventId: string;
  channelId: NotificationChannelId;

  status: "pending" | "sent" | "failed" | "skipped";
  title: string;
  body: string;

  locale: "ko" | "en";
  recipient?: string;

  sentAt: string | null;
  failedAt: string | null;
  failureReason?: string;

  providerResponse?: unknown;

  createdAt: string;
};
