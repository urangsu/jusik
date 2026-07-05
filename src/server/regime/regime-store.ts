import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";
import { JsonFileStore } from "../storage/json-file-store";

export class RegimeStore {
  private store: JsonFileStore<RegimeSnapshot[]>;
  private latestStore: JsonFileStore<Record<string, RegimeSnapshot>>;

  constructor() {
    this.store = new JsonFileStore<RegimeSnapshot[]>(
      "data/regime/snapshots.json",
      []
    );
    this.latestStore = new JsonFileStore<Record<string, RegimeSnapshot>>(
      "data/regime/latest.json",
      {}
    );
  }

  async saveSnapshot(snapshot: RegimeSnapshot): Promise<void> {
    const snapshots = await this.store.read();
    snapshots.push(snapshot);
    if (snapshots.length > 500) {
      snapshots.shift();
    }
    await this.store.write(snapshots);

    const latest = await this.latestStore.read();
    latest[snapshot.market] = snapshot;
    await this.latestStore.write(latest);
  }

  async getSnapshotAsOf(market: "US" | "KR", asOf: string): Promise<RegimeSnapshot | null> {
    const history = await this.store.read();
    const filtered = history
      .filter((s) => s.market === market && s.calculatedAt.substring(0, 10) <= asOf)
      .sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt));
    if (filtered.length > 0) return filtered[0];
    return this.getLatestSnapshot(market);
  }

  async getLatestSnapshot(market: "US" | "KR"): Promise<RegimeSnapshot | null> {
    const latest = await this.latestStore.read();
    return latest[market] || null;
  }

  async getAllLatest(): Promise<Record<string, RegimeSnapshot>> {
    return this.latestStore.read();
  }

  async getHistory(): Promise<RegimeSnapshot[]> {
    return this.store.read();
  }
}

export const regimeStore = new RegimeStore();
