import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationChannelAdapter } from "../notification-channel";
import { JsonFileStore } from "../../storage/json-file-store";

export type WebInboxMessage = {
  id: string;
  alertEventId: string;
  title: string;
  body: string;
  severity: string;
  createdAt: string;
  read: boolean;
};

export class WebInboxChannel implements NotificationChannelAdapter {
  id = "web_inbox";
  private store: JsonFileStore<WebInboxMessage[]>;

  constructor() {
    this.store = new JsonFileStore<WebInboxMessage[]>("data/alerts/web-inbox.json", []);
  }

  async getMessages(): Promise<WebInboxMessage[]> {
    return this.store.read();
  }

  async markAsRead(id: string): Promise<void> {
    const messages = await this.getMessages();
    const index = messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      messages[index].read = true;
      await this.store.write(messages);
    }
  }

  async markAllAsRead(): Promise<void> {
    const messages = await this.getMessages();
    messages.forEach((m) => (m.read = true));
    await this.store.write(messages);
  }

  async clearAll(): Promise<void> {
    await this.store.write([]);
  }

  async send(
    event: AlertEvent,
    title: string,
    body: string,
    recipient?: string
  ): Promise<{ status: "sent" | "failed" | "skipped"; failureReason?: string }> {
    const isEnabled = process.env.WEB_INBOX_ENABLED !== "false";
    if (!isEnabled) {
      return { status: "skipped", failureReason: "channel_disabled" };
    }

    const messages = await this.getMessages();
    messages.push({
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      alertEventId: event.id,
      title,
      body,
      severity: event.severity,
      createdAt: new Date().toISOString(),
      read: false,
    });

    const limited = messages.slice(-1000);
    await this.store.write(limited);

    return { status: "sent" };
  }
}

export const webInboxChannel = new WebInboxChannel();
