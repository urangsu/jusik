import { AlertEvent } from "@/domain/alerts/alert-event";
import { NotificationDelivery } from "@/domain/alerts/alert-delivery";
import { AlertPreference } from "@/domain/alerts/alert-preference";
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

export const DEFAULT_PREFERENCE: AlertPreference = {
  enabled: true,
  enabledRuleTypes: [
    "price_cross",
    "return_zscore",
    "volume_zscore",
    "gap_move",
    "intraday_reversal",
    "new_filing",
    "provider_error",
    "provider_rate_limited",
    "provider_invalid_key",
    "technical_signal_change",
    "momentum_score_change",
    "reliability_deterioration",
    "backtest_job_failed",
    "data_quality",
  ],
  minSeverity: "info",
  quietHours: {
    enabled: true,
    start: "23:00",
    end: "07:00",
    timezone: "Asia/Seoul",
  },
  channels: {
    webInbox: true,
    console: true,
    telegram: false,
    email: false,
  },
  cooldownMinutes: 60,
  locale: "ko",
};

export class NotificationHub {
  private preferenceStore: JsonFileStore<AlertPreference>;
  private adapters: Map<string, NotificationChannelAdapter> = new Map();

  constructor() {
    this.preferenceStore = new JsonFileStore<AlertPreference>(
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

  async getPreference(): Promise<AlertPreference> {
    return this.preferenceStore.read();
  }

  async updatePreference(updates: Partial<AlertPreference>): Promise<AlertPreference> {
    const current = await this.getPreference();
    const updated = {
      ...current,
      ...updates,
      channels: {
        ...current.channels,
        ...updates.channels,
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
    const ruleId = (event as any).ruleId || "";
    const rule = ruleId ? await alertRuleEngine.getRule(ruleId) : null;
    const targetChannels = rule?.channels || ["web_inbox", "console"];

    const isGlobalDisabled = !preference.enabled;
    const quietActive = isInQuietHours(new Date(), preference.quietHours);

    for (const channelId of targetChannels) {
      const adapter = this.adapters.get(channelId);
      
      let userEnabled = false;
      if (channelId === "web_inbox" || (channelId as string) === "webInbox") {
        userEnabled = preference.channels.webInbox;
      } else if (channelId === "console") {
        userEnabled = preference.channels.console;
      } else if (channelId === "telegram") {
        userEnabled = preference.channels.telegram;
      } else if (channelId === "email") {
        userEnabled = preference.channels.email;
      }

      const deliveryId = `del-${Math.random().toString(36).substr(2, 9)}`;
      const title = event.titleKo || event.titleEn;
      const body = event.messageKo || event.messageEn;

      const delivery: NotificationDelivery = {
        id: deliveryId,
        alertEventId: event.id,
        channelId,
        status: "pending",
        title,
        body,
        locale: preference.locale || "ko",
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
      const isExternal = !["console", "web_inbox", "webInbox"].includes(channelId as string);
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
        const result = await adapter.send(event, title, body);
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
