import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { StrategyTrialRecord, StrategyTrialStoreData } from "@/domain/strategy/strategy-trial-record";
import { StrategyTrialStatus } from "@/domain/strategy/strategy-trial-status";
import { StrategyTrialEvent } from "@/domain/strategy/strategy-trial-event";
import { writeAtomic } from "../storage/atomic-write";
import {
  getStrategyTrialsDir,
  getStrategyTrialsEventsPath,
  getStrategyTrialsLatestPath,
  getStrategyTrialByIdPath,
} from "./strategy-trial-store-paths";

export type StrategyTrialQuery = {
  strategyId?: string;
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  validationStatus?: StrategyTrialStatus;
  includeRejected?: boolean;
  includeInvalid?: boolean;
  parameterHash?: string;
};

export async function saveStrategyTrialRecord(record: StrategyTrialRecord): Promise<void> {
  const byIdPath = getStrategyTrialByIdPath(record.id);

  // Check if already exists to prevent duplicate writes
  try {
    await fs.access(byIdPath);
    throw new Error(`StrategyTrialRecord with ID ${record.id} already exists`);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // 1. Write the by-id file
  await writeAtomic(byIdPath, JSON.stringify(record, null, 2));

  // 2. Append event to events.json
  const eventsPath = getStrategyTrialsEventsPath();
  let events: StrategyTrialEvent[] = [];
  try {
    const rawEvents = await fs.readFile(eventsPath, "utf8");
    events = JSON.parse(rawEvents);
  } catch (err) {
    // If file doesn't exist or is invalid
  }

  const event: StrategyTrialEvent = {
    id: `event_${crypto.randomUUID()}`,
    trialId: record.id,
    type: "created",
    payload: record as any,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  await writeAtomic(eventsPath, JSON.stringify(events, null, 2));

  // 3. Update latest.json snapshot
  const latestPath = getStrategyTrialsLatestPath();
  let latestData: StrategyTrialStoreData = { trials: [], lastUpdatedAt: new Date(0).toISOString() };
  try {
    const rawLatest = await fs.readFile(latestPath, "utf8");
    latestData = JSON.parse(rawLatest);
  } catch (err) {
    // If file doesn't exist
  }

  latestData.trials = latestData.trials.filter((t) => t.id !== record.id);
  latestData.trials.push(record);
  latestData.lastUpdatedAt = new Date().toISOString();
  await writeAtomic(latestPath, JSON.stringify(latestData, null, 2));
}

export async function listStrategyTrialRecords(
  query?: StrategyTrialQuery
): Promise<StrategyTrialRecord[]> {
  const latestPath = getStrategyTrialsLatestPath();
  let latestData: StrategyTrialStoreData = { trials: [], lastUpdatedAt: new Date(0).toISOString() };
  try {
    const rawLatest = await fs.readFile(latestPath, "utf8");
    latestData = JSON.parse(rawLatest);
  } catch (err) {
    return [];
  }

  let filtered = latestData.trials;

  if (query) {
    if (query.strategyId) {
      filtered = filtered.filter((t) => t.strategyId === query.strategyId);
    }
    if (query.universeId) {
      filtered = filtered.filter((t) => t.universeId === query.universeId);
    }
    if (query.validationStatus) {
      filtered = filtered.filter((t) => t.validationStatus === query.validationStatus);
    }
    if (query.parameterHash) {
      filtered = filtered.filter((t) => t.parameterHash === query.parameterHash);
    }
    if (query.includeRejected === false) {
      filtered = filtered.filter((t) => t.validationStatus !== "rejected");
    }
    if (query.includeInvalid === false) {
      filtered = filtered.filter((t) => t.validationStatus !== "invalid");
    }
  }

  return filtered;
}

export async function getStrategyTrialRecordById(
  id: string
): Promise<StrategyTrialRecord | null> {
  const byIdPath = getStrategyTrialByIdPath(id);
  try {
    const raw = await fs.readFile(byIdPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export async function findStrategyTrialsByParameterHash(
  strategyId: string,
  parameterHash: string
): Promise<StrategyTrialRecord[]> {
  const all = await listStrategyTrialRecords();
  return all.filter((t) => t.strategyId === strategyId && t.parameterHash === parameterHash);
}
