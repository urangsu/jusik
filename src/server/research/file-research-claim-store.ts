import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { ResearchClaim } from "@/domain/research/research-claim";

function getClaimsDir(): string {
  return resolveRuntimeDataPath("data", "research", "claims");
}

function getClaimPath(claimId: string): string {
  return path.join(getClaimsDir(), `${claimId}.json`);
}

export async function saveResearchClaim(claim: ResearchClaim): Promise<void> {
  const dir = getClaimsDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = getClaimPath(claim.claimId);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error("Path traversal attempt blocked.");
  }
  await writeAtomic(filePath, JSON.stringify(claim, null, 2));
}

export async function getResearchClaim(claimId: string): Promise<ResearchClaim | null> {
  const filePath = getClaimPath(claimId);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as ResearchClaim;
  } catch {
    return null;
  }
}

export async function listResearchClaims(query?: {
  assetId?: string;
  claimKind?: string;
}): Promise<ResearchClaim[]> {
  const dir = getClaimsDir();
  try {
    const files = await fs.readdir(dir);
    const claims: ResearchClaim[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const data = await fs.readFile(path.join(dir, file), "utf-8");
          const claim = JSON.parse(data) as ResearchClaim;

          let match = true;
          if (query?.assetId && claim.assetId !== query.assetId) {
            match = false;
          }
          if (query?.claimKind && claim.claimKind !== query.claimKind) {
            match = false;
          }

          if (match) {
            claims.push(claim);
          }
        } catch {
          // ignore corrupt files
        }
      }
    }
    return claims;
  } catch {
    return [];
  }
}

export async function clearAllResearchClaims(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Clear operations are only allowed in test environment.");
  }
  try {
    await fs.rm(getClaimsDir(), { recursive: true, force: true });
  } catch {
    // ignore
  }
}
