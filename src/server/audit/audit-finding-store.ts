import fs from "fs/promises";
import {
  AuditFinding,
  AuditFindingSourceType,
  AuditFindingScope,
  AuditFindingSeverity,
} from "@/domain/audit/audit-finding";
import { writeAtomic } from "../storage/atomic-write";
import {
  getAuditFindingsDir,
  getAuditFindingsLatestPath,
  getAuditFindingsHistoryDir,
  getAuditFindingsHistoryPath,
  getAuditFindingsBySourceDir,
  getAuditFindingsBySourcePath,
} from "./audit-finding-store-paths";

function getDedupeKey(f: AuditFinding): string {
  return `${f.sourceType}|${f.sourceId}|${f.scope}|${f.universeId || ""}|${f.strategyId || ""}|${f.trialId || ""}|${f.signalId || ""}|${f.factorA || ""}|${f.factorB || ""}`;
}

export async function saveAuditFindings(findings: AuditFinding[]): Promise<void> {
  const dir = getAuditFindingsDir();
  const historyDir = getAuditFindingsHistoryDir();
  const bySourceDir = getAuditFindingsBySourceDir();

  // Create directories if they do not exist
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(historyDir, { recursive: true });
  await fs.mkdir(bySourceDir, { recursive: true });

  const latestPath = getAuditFindingsLatestPath();

  // 1. Load existing findings
  let existingFindings: AuditFinding[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    existingFindings = JSON.parse(raw);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // 2. Map existing findings by dedupeKey
  const findingsMap = new Map<string, AuditFinding>();
  for (const f of existingFindings) {
    findingsMap.set(getDedupeKey(f), f);
  }

  // 3. Overwrite or insert incoming findings
  for (const f of findings) {
    findingsMap.set(getDedupeKey(f), f);
  }

  const combinedFindings = Array.from(findingsMap.values());

  // 4. Save latest and history
  const serialized = JSON.stringify(combinedFindings, null, 2);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const historyPath = getAuditFindingsHistoryPath(timestamp);

  await writeAtomic(latestPath, serialized);
  await writeAtomic(historyPath, serialized);

  // 5. Partition by sourceType and save to by-source/
  const findingsBySource = new Map<AuditFindingSourceType, AuditFinding[]>();
  for (const f of combinedFindings) {
    if (!findingsBySource.has(f.sourceType)) {
      findingsBySource.set(f.sourceType, []);
    }
    findingsBySource.get(f.sourceType)!.push(f);
  }

  const allSourceTypes: AuditFindingSourceType[] = [
    "individual_signal_ic",
    "factor_correlation",
    "market_exposure",
    "signal_postmortem",
    "strategy_trial",
  ];

  for (const srcType of allSourceTypes) {
    const partPath = getAuditFindingsBySourcePath(srcType);
    const partFindings = findingsBySource.get(srcType) || [];
    await writeAtomic(partPath, JSON.stringify(partFindings, null, 2));
  }
}

export async function listAuditFindings(query?: {
  sourceType?: AuditFindingSourceType;
  scope?: AuditFindingScope;
  severity?: AuditFindingSeverity;
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strategyId?: string;
  trialId?: string;
  signalId?: string;
}): Promise<AuditFinding[]> {
  const latestPath = getAuditFindingsLatestPath();
  let results: AuditFinding[] = [];

  try {
    const raw = await fs.readFile(latestPath, "utf8");
    results = JSON.parse(raw);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    return [];
  }

  if (query) {
    if (query.sourceType) {
      results = results.filter((r) => r.sourceType === query.sourceType);
    }
    if (query.scope) {
      results = results.filter((r) => r.scope === query.scope);
    }
    if (query.severity) {
      results = results.filter((r) => r.severity === query.severity);
    }
    if (query.universeId) {
      results = results.filter((r) => r.universeId === query.universeId);
    }
    if (query.strategyId) {
      results = results.filter((r) => r.strategyId === query.strategyId);
    }
    if (query.trialId) {
      results = results.filter((r) => r.trialId === query.trialId);
    }
    if (query.signalId) {
      results = results.filter((r) => r.signalId === query.signalId);
    }
  }

  return results;
}
