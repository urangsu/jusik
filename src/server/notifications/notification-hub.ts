import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationDelivery } from "@/domain/alerts/alert-delivery";
import { NotificationPreference } from "@/domain/alerts/alert-preference";
import { NotificationChannelAdapter } from "./notification-channel";
import { JsonFileStore } from "../storage/json-file-store";
import { consoleChannel } from "./channels/console-channel";
import { webInboxChannel } from "./channels/web-inbox-channel";
import { telegramChannelSkeleton } from "./channels/telegram-channel-skeleton";
import { kakaoChannelSkeleton } from "./channels/kakao-channel-skeleton";
import { emailChannelSkeleton } from "./channels/email-channel-skeleton";
import { notificationDeliveryStore } from "./notification-delivery-store";
import { alertRuleEngine } from "../alerts/alert-rule-engine";
import { isInQuietHours } from "../alerts/alert-quiet-hours";

export const DEFAULT_PREFERENCE: NotificationPreference = {
  globalEnabled: true,
  locale: "ko",
  channelPreferences: {
    web_inbox: true,
    console: true,
    telegram: false,
    kakao: false,
    email: false,
    web_push: false,
  },
  quietHours: {
    enabled: true,
    start: "23:00",
    end: "07:00",
    timezone: "Asia/Seoul",
  },
};

export class NotificationHub {
  private preferenceStore: JsonFileStore<NotificationPreference>;
  private adapters: Map<string, NotificationChannelAdapter> = new Map();

  constructor() {
    this.preferenceStore = new JsonFileStore<NotificationPreference>(
      "data/alerts/preferences.json",
      DEFAULT_PREFERENCE
    );

    // Register adapters
    this.adapters.set(consoleChannel.id, consoleChannel);
    this.adapters.set(webInboxChannel.id, webInboxChannel);
    this.adapters.set(telegramChannelSkeleton.id, telegramChannelSkeleton);
    this.adapters.set(kakaoChannelSkeleton.id, kakaoChannelSkeleton);
    this.adapters.set(emailChannelSkeleton.id, emailChannelSkeleton);
  }

  async getPreference(): Promise<NotificationPreference> {
    return this.preferenceStore.read();
  }

  async updatePreference(updates: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const current = await this.getPreference();
    const updated = {
      ...current,
      ...updates,
      channelPreferences: {
        ...current.channelPreferences,
        ...updates.channelPreferences,
      },
      quietHours: {
        ...current.quietHours,
        ...updates.quietHours,
      },
    };
    await this.preferenceStore.write(updated);
    return updated;
  }

  async dispatchNotification(event: AlertEvent): Promise<NotificationDelivery[]> {
    const preference = await this.getPreference();
    const deliveries: NotificationDelivery[] = [];

    // Find the rule to get target channels
    const rule = await alertRuleEngine.getRule(event.ruleId);
    if (!rule) {
      console.warn(`[NotificationHub] Rule ${event.ruleId} not found for event ${event.id}`);
      return [];
    }

    const isGlobalDisabled = !preference.globalEnabled;
    const quietActive = isInQuietHours(new Date(), preference.quietHours);

    for (const channelId of rule.channels) {
      const adapter = this.adapters.get(channelId);
      const userEnabled = preference.channelPreferences[channelId];

      const deliveryId = `del-${Math.random().toString(36).substr(2, 9)}`;
      const delivery: NotificationDelivery = {
        id: deliveryId,
        alertEventId: event.id,
        channelId,
        status: "pending",
        title: event.title,
        body: event.body,
        locale: preference.locale,
        sentAt: null,
        failedAt: null,
        createdAt: new Date().toISOString(),
      };

      // 1. Check if globally disabled
      if (isGlobalDisabled) {
        delivery.status = "skipped";
        delivery.failureReason = "global_disabled";
        await notificationDeliveryStore.addDelivery(delivery);
        deliveries.push(delivery);
        continue;
      }

      // 2. Check if user channel is disabled in settings
      if (!userEnabled) {
        delivery.status = "skipped";
        delivery.failureReason = "user_channel_disabled";
        await notificationDeliveryStore.addDelivery(delivery);
        deliveries.push(delivery);
        continue;
      }

      // 3. Check if adapter exists
      if (!adapter) {
        delivery.status = "skipped";
        delivery.failureReason = "adapter_not_found";
        await notificationDeliveryStore.addDelivery(delivery);
        deliveries.push(delivery);
        continue;
      }

      // 4. Check quiet hours for external channels (console and web_inbox are local and bypass quiet hours)
      const isExternal = !["console", "web_inbox"].includes(channelId);
      if (quietActive && isExternal) {
        // Critical alerts are saved in web_inbox but external delivery is held/skipped
        delivery.status = "skipped";
        delivery.failureReason = "quiet_hours";
        await notificationDeliveryStore.addDelivery(delivery);
        deliveries.push(delivery);
        continue;
      }

      // 5. Send notification
      try {
        const result = await adapter.send(event, event.title, event.body);
        delivery.status = result.status;
        delivery.providerResponse = result.providerResponse;
        if (result.status === "sent") {
          delivery.sentAt = new Date().toISOString();
        } else if (result.status === "failed") {
          delivery.failedAt = new Date().toISOString();
          delivery.failureReason = result.failureReason || "unknown_failure";
        }
      } catch (err: any) {
        delivery.status = "failed";
        delivery.failedAt = new Date().toISOString();
        delivery.failureReason = err.message || String(err);
      }

      await notificationDeliveryStore.addDelivery(delivery);
      deliveries.push(delivery);
    }

    return deliveries;
  }
}

export const notificationHub = new NotificationHub();
