import path from "path";
import fs from "fs/promises";
import { BacktestResult } from "@/domain/backtest/backtest-result";
import { BacktestRun } from "@/domain/backtest/backtest-run";
import { JsonFileStore } from "@/server/storage/json-file-store";
import { writeAtomic } from "@/server/storage/atomic-write";

const BACKTEST_DIR = path.join(process.cwd(), "data", "backtest");
const INDEX_PATH = path.join(BACKTEST_DIR, "index.json");
const MAX_RUNS = parseInt(process.env.BACKTEST_MAX_RUNS || "50", 10);

const indexStore = new JsonFileStore<BacktestRun[]>(INDEX_PATH, []);

async function ensureDir(): Promise<void> {
  await fs.mkdir(BACKTEST_DIR, { recursive: true });
}

/**
 * 백테스트 결과를 runId별 독립 파일로 저장한다.
 * 전체 결과를 하나의 배열에 append하지 않는다.
 */
export async function saveBacktestResult(result: BacktestResult): Promise<void> {
  await ensureDir();

  const resultPath = path.join(BACKTEST_DIR, `${result.runId}.json`);
  await writeAtomic(resultPath, JSON.stringify(result, null, 2));

  // index.json 갱신 (메타데이터만)
  const index = await indexStore.read();
  const runMeta: BacktestRun = {
    runId: result.runId,
    strategy: result.strategy,
    universeId: result.universeId,
    startDate: result.windows[0]?.trainStart ?? "",
    endDate: result.windows[result.windows.length - 1]?.testEnd ?? "",
    status: result.status === "completed" ? "done" : "error",
    createdAt: result.createdAt,
    completedAt: new Date().toISOString(),
    errorMessage: null,
  };

  // upsert
  const existing = index.filter((r) => r.runId !== result.runId);
  existing.push(runMeta);

  // 최신 순 정렬
  existing.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 최대 보존 수 초과 시 오래된 항목 삭제
  const toDelete = existing.slice(MAX_RUNS);
  for (const old of toDelete) {
    const oldPath = path.join(BACKTEST_DIR, `${old.runId}.json`);
    await fs.unlink(oldPath).catch(() => {}); // 파일이 없어도 무시
  }

  await indexStore.write(existing.slice(0, MAX_RUNS));
}

export async function getBacktestResult(runId: string): Promise<BacktestResult | null> {
  await ensureDir();
  const resultPath = path.join(BACKTEST_DIR, `${runId}.json`);
  try {
    const content = await fs.readFile(resultPath, "utf8");
    return JSON.parse(content) as BacktestResult;
  } catch {
    return null;
  }
}

export async function getBacktestIndex(): Promise<BacktestRun[]> {
  await ensureDir();
  return await indexStore.read();
}

export async function pruneOldBacktestRuns(maxRuns = MAX_RUNS): Promise<void> {
  await ensureDir();
  const index = await indexStore.read();
  const sorted = [...index].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toDelete = sorted.slice(maxRuns);
  for (const old of toDelete) {
    const oldPath = path.join(BACKTEST_DIR, `${old.runId}.json`);
    await fs.unlink(oldPath).catch(() => {});
  }
  await indexStore.write(sorted.slice(0, maxRuns));
}
