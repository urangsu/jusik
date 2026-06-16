import { NotificationChannelId } from "./alert-channel";

export type NotificationPreference = {
  globalEnabled: boolean;
  locale: "ko" | "en";
  channelPreferences: Record<NotificationChannelId, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
};
