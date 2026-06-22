import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { SignalPostmortem, SignalPostmortemOutcome, SignalPostmortemStatus } from "@/domain/strategy/signal-postmortem";
import { SignalPostmortemEvent } from "@/domain/strategy/signal-postmortem-event";
import { writeAtomic } from "../storage/atomic-write";
import {
  getSignalPostmortemsDir,
  getSignalPostmortemsEventsPath,
  getSignalPostmortemsLatestPath,
  getSignalPostmortemByIdPath,
} from "./signal-postmortem-store-paths";

export type SignalPostmortemQuery = {
  trialId?: string;
  strategyId?: string;
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  assetId?: string;
  outcome?: SignalPostmortemOutcome;
  status?: SignalPostmortemStatus;
};

export type SignalPostmortemStoreData = {
  postmortems: SignalPostmortem[];
  lastUpdatedAt: string;
};

export async function saveSignalPostmortem(record: SignalPostmortem): Promise<void> {
  const byIdPath = getSignalPostmortemByIdPath(record.id);

  // Write individual record E2E
  await writeAtomic(byIdPath, JSON.stringify(record, null, 2));

  // Append event
  const eventsPath = getSignalPostmortemsEventsPath();
  let events: SignalPostmortemEvent[] = [];
  try {
    const rawEvents = await fs.readFile(eventsPath, "utf8");
    events = JSON.parse(rawEvents);
  } catch (err) {
    // ignore
  }

  const event: SignalPostmortemEvent = {
    id: `event_${crypto.randomUUID()}`,
    postmortemId: record.id,
    type: "created",
    payload: record as any,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  await writeAtomic(eventsPath, JSON.stringify(events, null, 2));

  // Update latest snapshot
  const latestPath = getSignalPostmortemsLatestPath();
  let latestData: SignalPostmortemStoreData = { postmortems: [], lastUpdatedAt: new Date(0).toISOString() };
  try {
    const rawLatest = await fs.readFile(latestPath, "utf8");
    latestData = JSON.parse(rawLatest);
  } catch (err) {
    // ignore
  }

  latestData.postmortems = latestData.postmortems.filter((p) => p.id !== record.id);
  latestData.postmortems.push(record);
  latestData.lastUpdatedAt = new Date().toISOString();
  await writeAtomic(latestPath, JSON.stringify(latestData, null, 2));
}

export async function listSignalPostmortems(
  query?: SignalPostmortemQuery
): Promise<SignalPostmortem[]> {
  const latestPath = getSignalPostmortemsLatestPath();
  let latestData: SignalPostmortemStoreData = { postmortems: [], lastUpdatedAt: new Date(0).toISOString() };
  try {
    const rawLatest = await fs.readFile(latestPath, "utf8");
    latestData = JSON.parse(rawLatest);
  } catch (err) {
    return [];
  }

  let filtered = latestData.postmortems;

  if (query) {
    if (query.trialId) {
      filtered = filtered.filter((p) => p.trialId === query.trialId);
    }
    if (query.strategyId) {
      filtered = filtered.filter((p) => p.strategyId === query.strategyId);
    }
    if (query.universeId) {
      filtered = filtered.filter((p) => p.universeId === query.universeId);
    }
    if (query.assetId) {
      filtered = filtered.filter((p) => p.assetId === query.assetId);
    }
    if (query.outcome) {
      filtered = filtered.filter((p) => p.outcome === query.outcome);
    }
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
  }

  return filtered;
}

export async function getSignalPostmortemById(id: string): Promise<SignalPostmortem | null> {
  const byIdPath = getSignalPostmortemByIdPath(id);
  try {
    const raw = await fs.readFile(byIdPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
