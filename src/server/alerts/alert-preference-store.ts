import { AlertPreference } from "../../domain/alerts/alert-preference";
import { JsonFileStore } from "../storage/json-file-store";
import path from "path";
import fs from "fs/promises";

const PREF_PATH = "data/alerts/preferences.json";

const DEFAULT_PREFERENCES: AlertPreference = {
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
};

export class AlertPreferenceStore {
  private store: JsonFileStore<AlertPreference>;

  constructor() {
    this.store = new JsonFileStore<AlertPreference>(PREF_PATH, DEFAULT_PREFERENCES);
  }

  async getPreferences(): Promise<AlertPreference> {
    try {
      await fs.mkdir(path.dirname(PREF_PATH), { recursive: true });
      const prefs = await this.store.read();
      return { ...DEFAULT_PREFERENCES, ...prefs };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(prefs: Partial<AlertPreference>): Promise<AlertPreference> {
    await fs.mkdir(path.dirname(PREF_PATH), { recursive: true });
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    await this.store.write(updated);
    return updated;
  }
}

export const alertPreferenceStore = new AlertPreferenceStore();
