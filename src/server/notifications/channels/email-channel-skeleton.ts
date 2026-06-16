import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationChannelAdapter } from "../notification-channel";

export class EmailChannelSkeleton implements NotificationChannelAdapter {
  id = "email";

  async send(
    event: AlertEvent,
    title: string,
    body: string,
    recipient?: string
  ): Promise<{ status: "sent" | "failed" | "skipped"; failureReason?: string }> {
    const isEnabled = process.env.EMAIL_ENABLED === "true";
    if (!isEnabled) {
      return { status: "skipped", failureReason: "channel_disabled" };
    }

    // Skeleton implementation
    console.log(`[Email Channel Skeleton] Sending alert... (Simulated)`);
    return { status: "sent" };
  }
}

export const emailChannelSkeleton = new EmailChannelSkeleton();
