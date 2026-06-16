import { AlertEvent } from "@/domain/alerts/alert-event";
import { JsonFileStore } from "../storage/json-file-store";

export class AlertEventStore {
  private store: JsonFileStore<AlertEvent[]>;

  constructor() {
    this.store = new JsonFileStore<AlertEvent[]>("data/alerts/events.json", []);
  }

  async getEvents(): Promise<AlertEvent[]> {
    return this.store.read();
  }

  async addEvent(event: AlertEvent): Promise<void> {
    const events = await this.getEvents();
    events.push(event);
    await this.store.write(events);
  }

  async prune(retentionDays = 90): Promise<number> {
    const events = await this.getEvents();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = events.length;
    const filtered = events.filter(e => new Date(e.createdAt).getTime() >= cutoff);
    const prunedCount = initialCount - filtered.length;
    if (prunedCount > 0) {
      await this.store.write(filtered);
      console.log(`[AlertEventStore] Pruned ${prunedCount} old events (retention: ${retentionDays} days).`);
    }
    return prunedCount;
  }
}

export const alertEventStore = new AlertEventStore();
