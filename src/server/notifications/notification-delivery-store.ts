import { NotificationDelivery } from "@/domain/alerts/alert-delivery";
import { JsonFileStore } from "../storage/json-file-store";

export function maskRecipient(recipient: string): string {
  if (!recipient) return "";
  if (recipient.includes("@")) {
    const [local, domain] = recipient.split("@");
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }
  const phoneClean = recipient.replace(/[-\s]/g, "");
  if (/^\d{10,11}$/.test(phoneClean)) {
    const part1 = phoneClean.slice(0, 3);
    const part3 = phoneClean.slice(-4);
    return `${part1}-****-${part3}`;
  }
  if (recipient.length > 5) {
    return `${recipient.slice(0, 2)}***${recipient.slice(-3)}`;
  }
  return "***";
}

export class NotificationDeliveryStore {
  private store: JsonFileStore<NotificationDelivery[]>;

  constructor() {
    this.store = new JsonFileStore<NotificationDelivery[]>("data/alerts/deliveries.json", []);
  }

  async getDeliveries(): Promise<NotificationDelivery[]> {
    return this.store.read();
  }

  async addDelivery(delivery: NotificationDelivery): Promise<void> {
    const deliveries = await this.getDeliveries();
    
    // Mask recipient before saving to protect sensitive information
    const maskedRecipient = delivery.recipient ? maskRecipient(delivery.recipient) : undefined;
    const securedDelivery: NotificationDelivery = {
      ...delivery,
      recipient: maskedRecipient
    };

    deliveries.push(securedDelivery);
    await this.store.write(deliveries);
  }

  async prune(retentionDays = 90): Promise<number> {
    const deliveries = await this.getDeliveries();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = deliveries.length;
    const filtered = deliveries.filter(d => new Date(d.createdAt).getTime() >= cutoff);
    const prunedCount = initialCount - filtered.length;
    if (prunedCount > 0) {
      await this.store.write(filtered);
      console.log(`[NotificationDeliveryStore] Pruned ${prunedCount} old delivery records.`);
    }
    return prunedCount;
  }
}

export const notificationDeliveryStore = new NotificationDeliveryStore();
