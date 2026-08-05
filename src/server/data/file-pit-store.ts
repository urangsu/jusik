import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { VersionedDataEnvelope } from "@/domain/data/versioned-data-envelope";

const PIT_DIR = path.resolve(process.cwd(), "data", "pit");

export function computeEnvelopeHash(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  return crypto.createHash("sha256").update(json).digest("hex");
}

export async function saveVersionedEnvelope<T>(
  envelope: Omit<VersionedDataEnvelope<T>, "dataVersionId" | "contentHash"> & {
    dataVersionId?: string;
    contentHash?: string;
  }
): Promise<VersionedDataEnvelope<T>> {
  const contentHash = envelope.contentHash || computeEnvelopeHash(envelope.value);
  const dataVersionId = envelope.dataVersionId || `ver_${envelope.assetId.replace(/:/g, "_")}_${Date.now()}_${contentHash.substring(0, 8)}`;

  const fullEnvelope: VersionedDataEnvelope<T> = {
    ...envelope,
    dataVersionId,
    contentHash,
  };

  const assetSubdir = path.join(PIT_DIR, envelope.capability, envelope.assetId.replace(/:/g, "_"));
  await fs.mkdir(assetSubdir, { recursive: true });

  const finalPath = path.join(assetSubdir, `${dataVersionId}.json`);
  const tempPath = path.join(assetSubdir, `${dataVersionId}.tmp.${Date.now()}`);

  const content = JSON.stringify(fullEnvelope, null, 2);
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, finalPath);

  return fullEnvelope;
}

export async function getVersionedEnvelopesForAsset<T>(
  capability: "quote" | "ohlcv" | "financials" | "filings",
  assetId: string
): Promise<VersionedDataEnvelope<T>[]> {
  const assetSubdir = path.join(PIT_DIR, capability, assetId.replace(/:/g, "_"));
  try {
    const files = await fs.readdir(assetSubdir);
    const envelopes: VersionedDataEnvelope<T>[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(assetSubdir, file);
        const raw = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw) as VersionedDataEnvelope<T>;
        envelopes.push(parsed);
      }
    }

    return envelopes;
  } catch {
    return [];
  }
}
