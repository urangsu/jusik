import { AlertEvent } from "@/domain/alerts/alert-event";
import { AlertRuleType } from "@/domain/alerts/alert-rule-type";
import { AlertSeverity } from "@/domain/alerts/alert-severity";
import { JsonFileStore } from "../storage/json-file-store";
import path from "path";
import fs from "fs/promises";

export class AlertEventStore {
  private store: JsonFileStore<AlertEvent[]>;
  private latestStore: JsonFileStore<AlertEvent[]>;
  private eventsPath = "data/alerts/events.json";
  private latestPath = "data/alerts/latest.json";

  constructor() {
    this.store = new JsonFileStore<AlertEvent[]>(this.eventsPath, []);
    this.latestStore = new JsonFileStore<AlertEvent[]>(this.latestPath, []);
  }

  private async ensureDirs(): Promise<void> {
    await fs.mkdir(path.dirname(this.eventsPath), { recursive: true });
  }

  async getEvents(): Promise<AlertEvent[]> {
    return this.store.read();
  }

  async saveAlertEvents(events: AlertEvent[]): Promise<void> {
    await this.ensureDirs();
    const existing = await this.getEvents();
    const map = new Map<string, AlertEvent>();

    for (const ev of existing) {
      map.set(ev.dedupeKey, ev);
    }

    for (const ev of events) {
      if (map.has(ev.dedupeKey)) {
        const existingEvent = map.get(ev.dedupeKey)!;
        existingEvent.occurredAt = ev.occurredAt;
      } else {
        map.set(ev.dedupeKey, ev);
      }
    }

    const merged = Array.from(map.values());
    merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    await this.store.write(merged);
    await this.latestStore.write(merged.slice(0, 100));
  }

  async getAlertEvents(params: {
    limit?: number;
    unreadOnly?: boolean;
    ruleType?: AlertRuleType;
    severity?: AlertSeverity;
  }): Promise<AlertEvent[]> {
    const events = await this.getEvents();
    let filtered = [...events];

    if (params.unreadOnly) {
      filtered = filtered.filter((e) => e.readAt === null);
    }
    if (params.ruleType) {
      filtered = filtered.filter((e) => e.ruleType === params.ruleType);
    }
    if (params.severity) {
      filtered = filtered.filter((e) => e.severity === params.severity);
    }

    filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    if (params.limit !== undefined) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  async markAlertRead(id: string): Promise<void> {
    const events = await this.getEvents();
    const ev = events.find((e) => e.id === id);
    if (ev) {
      ev.readAt = new Date().toISOString();
      await this.store.write(events);
      
      const latest = await this.latestStore.read();
      const lev = latest.find((e) => e.id === id);
      if (lev) {
        lev.readAt = ev.readAt;
        await this.latestStore.write(latest);
      }
    }
  }

  async dismissAlert(id: string): Promise<void> {
    const events = await this.getEvents();
    const ev = events.find((e) => e.id === id);
    if (ev) {
      ev.dismissedAt = new Date().toISOString();
      await this.store.write(events);

      const latest = await this.latestStore.read();
      const lev = latest.find((e) => e.id === id);
      if (lev) {
        lev.dismissedAt = ev.dismissedAt;
        await this.latestStore.write(latest);
      }
    }
  }

  async addEvent(event: AlertEvent): Promise<void> {
    await this.saveAlertEvents([event]);
  }

  async prune(retentionDays = 90): Promise<number> {
    const events = await this.getEvents();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = events.length;
    const filtered = events.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
    const prunedCount = initialCount - filtered.length;
    if (prunedCount > 0) {
      await this.store.write(filtered);
      const latest = filtered.slice(0, 100);
      await this.latestStore.write(latest);
      console.log(`[AlertEventStore] Pruned ${prunedCount} old events (retention: ${retentionDays} days).`);
    }
    return prunedCount;
  }
}

export const alertEventStore = new AlertEventStore();
