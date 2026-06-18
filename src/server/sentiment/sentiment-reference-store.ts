import { SentimentReferenceSnapshot } from "@/domain/sentiment/sentiment-reference-snapshot";
import { JsonFileStore } from "../storage/json-file-store";

export class SentimentReferenceStore {
  private latestStore: JsonFileStore<Record<string, SentimentReferenceSnapshot>>;

  constructor() {
    this.latestStore = new JsonFileStore<Record<string, SentimentReferenceSnapshot>>(
      "data/sentiment/latest.json",
      {}
    );
  }

  async saveSnapshot(snapshot: SentimentReferenceSnapshot): Promise<void> {
    const latest = await this.latestStore.read();
    latest[snapshot.provider] = snapshot;
    await this.latestStore.write(latest);
  }

  async getLatestSnapshot(
    provider: "cnn_fear_greed_reference" | "alternative_me_crypto_fear_greed"
  ): Promise<SentimentReferenceSnapshot | null> {
    const latest = await this.latestStore.read();
    return latest[provider] || null;
  }

  async getAllLatest(): Promise<Record<string, SentimentReferenceSnapshot>> {
    return this.latestStore.read();
  }
}

export const sentimentReferenceStore = new SentimentReferenceStore();
