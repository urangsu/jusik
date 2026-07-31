import { VersionedDataEnvelope } from "@/domain/data/versioned-data-envelope";
import { getVersionedEnvelopesForAsset } from "./file-pit-store";

export async function selectPitRevision<T>(
  capability: "quote" | "ohlcv" | "financials" | "filings",
  assetId: string,
  asOfTimestamp: string // ISO string cut-off
): Promise<VersionedDataEnvelope<T> | null> {
  const allRevisions = await getVersionedEnvelopesForAsset<T>(capability, assetId);
  const asOfTime = new Date(asOfTimestamp).getTime();

  if (isNaN(asOfTime)) return null;

  // Filter out look-ahead revisions (ingestedAt > asOfTimestamp or effectiveAt > asOfTimestamp)
  const validRevisions = allRevisions.filter((rev) => {
    const ingestedTime = new Date(rev.ingestedAt).getTime();
    const effectiveTime = new Date(rev.effectiveAt).getTime();
    return ingestedTime <= asOfTime && effectiveTime <= asOfTime;
  });

  if (validRevisions.length === 0) return null;

  // Sort by effectiveAt descending, then ingestedAt descending
  validRevisions.sort((a, b) => {
    const bEff = new Date(b.effectiveAt).getTime();
    const aEff = new Date(a.effectiveAt).getTime();
    if (bEff !== aEff) return bEff - aEff;
    return new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime();
  });

  return validRevisions[0];
}
