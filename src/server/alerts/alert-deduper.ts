import { alertCooldownManager } from "./alert-cooldown";

export class AlertDeduper {
  async isDuplicate(
    ruleId: string,
    eventType: string,
    assetId?: string,
    conditionHash?: string,
    cooldownMinutes = 60
  ): Promise<boolean> {
    const fingerprint = alertCooldownManager.generateFingerprint(ruleId, eventType, assetId, conditionHash);
    const allowed = await alertCooldownManager.checkCooldown(fingerprint, cooldownMinutes);
    return !allowed;
  }

  async registerTrigger(
    ruleId: string,
    eventType: string,
    assetId?: string,
    conditionHash?: string
  ): Promise<void> {
    const fingerprint = alertCooldownManager.generateFingerprint(ruleId, eventType, assetId, conditionHash);
    await alertCooldownManager.updateCooldown(fingerprint);
  }
}

export const alertDeduper = new AlertDeduper();
