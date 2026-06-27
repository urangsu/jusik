import { getSurgeCandidate, saveSurgeCandidate } from "./surge-candidate-store";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";
import { addWatchlistItem, getWatchlistItemByAssetId } from "../watchlist/watchlist-store";
import type { WatchlistItem } from "@/domain/watchlist/watchlist-item";
import type { EvidencePack, EvidenceRef } from "@/domain/evidence/evidence-pack";
import { saveEvidencePack } from "../evidence/evidence-pack-store";

export async function promoteSurgeCandidateToWatchlist(input: {
  candidateId: string;
  reviewedBy?: string | null;
}): Promise<{
  candidate: SurgeCandidate;
  watchlistItemId: string;
  evidencePackId: string;
}> {
  const { candidateId } = input;
  const candidate = await getSurgeCandidate(candidateId);

  if (!candidate) {
    throw new Error(`Surge candidate ${candidateId} not found`);
  }

  if (candidate.status === "promoted_to_watchlist") {
    throw new Error(`Surge candidate ${candidateId} is already promoted`);
  }

  const nowStr = new Date().toISOString();

  // 1. Create a backing EvidencePack for this promotion
  const evidenceRefs: EvidenceRef[] = candidate.sourceRefs.map((refStr, idx) => ({
    id: `ref_promo_${candidate.id}_${idx}`,
    sourceType: "manual_import",
    sourceId: refStr,
    source: "Surge Observation Log",
    sourceTier: "manual_import",
    status: "cached",
    updatedAt: candidate.detectedAt,
    warnings: [],
  }));

  const evidencePackId = `evp_promo_${candidate.id}`;
  const evidencePack: EvidencePack = {
    id: evidencePackId,
    subjectType: "watchlist",
    subjectId: candidate.assetId,
    evidenceRefs,
    asOf: candidate.detectedAt,
    freshness: "fresh",
    claimTypes: ["price", "volume"],
    missingEvidence: [],
    blockedActions: [],
    limitations: ["Surge promotion snapshot"],
    createdAt: nowStr,
    engineVersion: "1.0.0",
  };

  await saveEvidencePack(evidencePack);

  // 2. Add item to Watchlist (check if it exists first)
  const existing = await getWatchlistItemByAssetId(candidate.assetId);
  const watchlistItemId = existing ? existing.id : `wli_${candidate.assetId}_${Date.now()}`;

  if (!existing) {
    const watchlistItem: WatchlistItem = {
      id: watchlistItemId,
      assetId: candidate.assetId,
      symbol: candidate.symbol,
      nameKo: candidate.symbol,
      nameEn: candidate.symbol,
      market: candidate.market,
      universeId: candidate.market === "KR" ? "KOSPI_SAMPLE" : "SP500_SAMPLE",
      tags: ["surge_promoted"],
      alertEnabled: true,
      reportInboxEnabled: true,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    await addWatchlistItem(watchlistItem);
  }

  // 3. Update candidate status
  candidate.status = "promoted_to_watchlist";
  candidate.evidencePackId = evidencePackId;
  candidate.updatedAt = nowStr;

  await saveSurgeCandidate(candidate);

  return {
    candidate,
    watchlistItemId,
    evidencePackId,
  };
}
