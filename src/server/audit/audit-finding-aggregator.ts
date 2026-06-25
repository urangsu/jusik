import fs from "fs/promises";
import path from "path";
import { AuditFinding } from "@/domain/audit/audit-finding";
import { listIndividualSignalIcResults } from "./individual-signal-ic-store";
import { listFactorCorrelationResults } from "./factor-correlation-store";
import { getMarketExposureByTrialDir, getMarketExposureLatestPath } from "./market-exposure-store-paths";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";
import {
  mapIndividualSignalIcToFindings,
  mapFactorCorrelationToFindings,
  mapMarketExposureToFindings,
} from "./audit-finding-mapper";
import { saveAuditFindings, listAuditFindings } from "./audit-finding-store";

async function loadAllMarketExposureResults(): Promise<MarketExposureResult[]> {
  const trialDir = getMarketExposureByTrialDir();
  try {
    const files = await fs.readdir(trialDir);
    const results: MarketExposureResult[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const raw = await fs.readFile(path.join(trialDir, file), "utf8");
          results.push(JSON.parse(raw));
        } catch {
          // ignore parsing error
        }
      }
    }
    return results;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    const latestPath = getMarketExposureLatestPath();
    try {
      const raw = await fs.readFile(latestPath, "utf8");
      return [JSON.parse(raw)];
    } catch {
      return [];
    }
  }
}

function getDedupeKey(f: AuditFinding): string {
  return `${f.sourceType}|${f.sourceId}|${f.scope}|${f.universeId || ""}|${f.strategyId || ""}|${f.trialId || ""}|${f.signalId || ""}|${f.factorA || ""}|${f.factorB || ""}`;
}

export async function aggregateAuditFindings(input?: {
  includeIndividualSignalIc?: boolean;
  includeFactorCorrelation?: boolean;
  includeMarketExposure?: boolean;
}): Promise<{
  createdOrUpdated: number;
  findings: AuditFinding[];
}> {
  const includeIc = input?.includeIndividualSignalIc !== false;
  const includeCorr = input?.includeFactorCorrelation !== false;
  const includeExposure = input?.includeMarketExposure !== false;

  const newMappedFindings: AuditFinding[] = [];

  // 1. Gather and Map Individual Signal IC Results
  if (includeIc) {
    try {
      const icResults = await listIndividualSignalIcResults();
      const findings = mapIndividualSignalIcToFindings(icResults);
      newMappedFindings.push(...findings);
    } catch {
      // skip
    }
  }

  // 2. Gather and Map Factor Correlation Results
  if (includeCorr) {
    try {
      const corrResults = await listFactorCorrelationResults();
      const findings = mapFactorCorrelationToFindings(corrResults);
      newMappedFindings.push(...findings);
    } catch {
      // skip
    }
  }

  // 3. Gather and Map Market Exposure Results
  if (includeExposure) {
    try {
      const exposureResults = await loadAllMarketExposureResults();
      const findings = mapMarketExposureToFindings(exposureResults);
      newMappedFindings.push(...findings);
    } catch {
      // skip
    }
  }

  // 4. Calculate createdOrUpdated count by comparing with existing
  const existingFindings = await listAuditFindings();
  const existingMap = new Map<string, AuditFinding>();
  for (const f of existingFindings) {
    existingMap.set(getDedupeKey(f), f);
  }

  let createdOrUpdatedCount = 0;
  for (const f of newMappedFindings) {
    const key = getDedupeKey(f);
    const existing = existingMap.get(key);
    if (!existing) {
      createdOrUpdatedCount++;
    } else {
      // Check if any meaningful field has changed
      const isChanged =
        existing.severity !== f.severity ||
        existing.actionability !== f.actionability ||
        existing.title !== f.title ||
        existing.summary !== f.summary ||
        JSON.stringify(existing.warnings) !== JSON.stringify(f.warnings);
      if (isChanged) {
        createdOrUpdatedCount++;
      }
    }
  }

  // 5. Save combined findings
  await saveAuditFindings(newMappedFindings);

  // Return the newly merged complete list of findings from the store
  const finalFindingsList = await listAuditFindings();

  return {
    createdOrUpdated: createdOrUpdatedCount,
    findings: finalFindingsList,
  };
}
