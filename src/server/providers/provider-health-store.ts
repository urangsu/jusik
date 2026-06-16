import { DataStatus } from "@/domain/common/data-status";
import { JsonFileStore } from "../storage/json-file-store";

export type ProviderHealthState = {
  providerId: string;
  status: DataStatus;
  lastErrorMsg?: string;
  lastUpdatedAt: string;
};

export class ProviderHealthStore {
  private store: JsonFileStore<Record<string, ProviderHealthState>>;

  constructor() {
    this.store = new JsonFileStore<Record<string, ProviderHealthState>>("data/alerts/provider-health.json", {});
  }

  async setHealth(providerId: string, status: DataStatus, errorMsg?: string): Promise<void> {
    const data = await this.store.read();
    data[providerId] = {
      providerId,
      status,
      lastErrorMsg: errorMsg,
      lastUpdatedAt: new Date().toISOString()
    };
    await this.store.write(data);
  }

  async getHealth(providerId: string): Promise<ProviderHealthState | null> {
    const data = await this.store.read();
    return data[providerId] || null;
  }

  async getAllHealth(): Promise<Record<string, ProviderHealthState>> {
    return this.store.read();
  }
}

export const providerHealthStore = new ProviderHealthStore();
