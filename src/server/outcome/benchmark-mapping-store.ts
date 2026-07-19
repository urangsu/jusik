import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";
import type { BenchmarkMapping } from "@/domain/outcome/signal-outcome-journal";

function getMappingsDir(): string {
  return resolveRuntimeDataPath("data", "outcome-journals");
}

function getMappingsPath(): string {
  return path.join(getMappingsDir(), "benchmark-mappings.json");
}

const DEFAULT_MAPPINGS: BenchmarkMapping[] = [
  {
    universeId: "KOSPI_SAMPLE",
    marketBenchmarkAssetId: "KR_102110",
    sectorBenchmarkAssetId: null,
    provenance: "default_mapping_config",
  },
  {
    universeId: "SP500_SAMPLE",
    marketBenchmarkAssetId: "US_SPY",
    sectorBenchmarkAssetId: null,
    provenance: "default_mapping_config",
  },
  {
    universeId: "KOSPI",
    marketBenchmarkAssetId: "KR_102110",
    sectorBenchmarkAssetId: null,
    provenance: "default_mapping_config",
  },
  {
    universeId: "SP500",
    marketBenchmarkAssetId: "US_SPY",
    sectorBenchmarkAssetId: null,
    provenance: "default_mapping_config",
  },
];

export async function getBenchmarkMapping(universeId: string): Promise<BenchmarkMapping | null> {
  const filePath = getMappingsPath();

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const mappings = JSON.parse(raw) as BenchmarkMapping[];
    const mapping = mappings.find((m) => m.universeId === universeId);
    return mapping || null;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // Initialize with defaults if file doesn't exist
      await fs.mkdir(getMappingsDir(), { recursive: true });
      await writeAtomic(filePath, JSON.stringify(DEFAULT_MAPPINGS, null, 2));
      const mapping = DEFAULT_MAPPINGS.find((m) => m.universeId === universeId);
      return mapping || null;
    }
    return null;
  }
}

export async function saveBenchmarkMappings(mappings: BenchmarkMapping[]): Promise<void> {
  const dir = getMappingsDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = getMappingsPath();

  // Guard path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error("Path traversal attempt blocked.");
  }

  await writeAtomic(filePath, JSON.stringify(mappings, null, 2));
}
