import { JsonFileStore } from "../storage/json-file-store";

export class AlertCooldownManager {
  private store: JsonFileStore<Record<string, string>>;

  constructor() {
    this.store = new JsonFileStore<Record<string, string>>("data/alerts/cooldowns.json", {});
  }

  generateFingerprint(ruleId: string, eventType: string, assetId?: string, conditionHash?: string): string {
    return [ruleId, eventType, assetId || "global", conditionHash || "default"].join(":");
  }

  async checkCooldown(fingerprint: string, cooldownMinutes: number): Promise<boolean> {
    if (cooldownMinutes <= 0) return true;

    const cooldowns = await this.store.read();
    const lastTimeStr = cooldowns[fingerprint];
    if (!lastTimeStr) {
      return true;
    }

    const lastTime = new Date(lastTimeStr).getTime();
    const now = Date.now();
    const diffMinutes = (now - lastTime) / (1000 * 60);

    return diffMinutes >= cooldownMinutes;
  }

  async updateCooldown(fingerprint: string): Promise<void> {
    const cooldowns = await this.store.read();
    cooldowns[fingerprint] = new Date().toISOString();
    await this.store.write(cooldowns);
  }

  async clearCooldown(fingerprint: string): Promise<void> {
    const cooldowns = await this.store.read();
    delete cooldowns[fingerprint];
    await this.store.write(cooldowns);
  }
}

export const alertCooldownManager = new AlertCooldownManager();
