import { AlertRuleType } from "./alert-rule-type";
import { AlertSeverity } from "./alert-severity";

export type AlertPreference = {
  enabled: boolean;

  enabledRuleTypes: AlertRuleType[];

  minSeverity: AlertSeverity;

  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
    timezone: "Asia/Seoul";
  };

  channels: {
    webInbox: boolean;
    console: boolean;
    telegram: boolean;
    email: boolean;
  };

  cooldownMinutes: number;
  locale?: "ko" | "en";
};
