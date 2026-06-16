import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationChannelAdapter } from "../notification-channel";

export class ConsoleChannel implements NotificationChannelAdapter {
  id = "console";

  async send(
    event: AlertEvent,
    title: string,
    body: string,
    recipient?: string
  ): Promise<{ status: "sent" | "failed" | "skipped"; failureReason?: string }> {
    const isEnabled = process.env.CONSOLE_NOTIFICATION_ENABLED !== "false";
    if (!isEnabled) {
      return { status: "skipped", failureReason: "channel_disabled" };
    }

    console.log(`[Notification Console Channel] [${event.severity.toUpperCase()}] ${title}`);
    console.log(body);
    if (recipient) {
      console.log(`Recipient: ${recipient}`);
    }
    console.log("-".repeat(50));

    return { status: "sent" };
  }
}

export const consoleChannel = new ConsoleChannel();
