import type { PublicResearchPost, ResearchPostSourceMethod } from "@/domain/research/research-voice";
import type { ResearchClaim, ResearchClaimDirection, ResearchClaimKind } from "@/domain/research/research-claim";
import { listSymbolMasterRecords } from "@/server/symbols/symbol-master-store";

export type ImportPostResult = {
  isValid: boolean;
  errors: string[];
  post: PublicResearchPost | null;
};

export type ImportClaimResult = {
  isValid: boolean;
  errors: string[];
  claim: ResearchClaim | null;
};

export function validateImportPost(payload: any): ImportPostResult {
  const errors: string[] = [];

  // 1. Validate source method
  const validMethods: ResearchPostSourceMethod[] = ["official_api", "user_json", "user_csv"];
  if (!payload.sourceMethod || !validMethods.includes(payload.sourceMethod)) {
    errors.push(`Invalid sourceMethod: must be one of ${validMethods.join(", ")}`);
  }

  // 2. Require sourceUrl
  if (!payload.sourceUrl || typeof payload.sourceUrl !== "string" || payload.sourceUrl.trim() === "") {
    errors.push("sourceUrl is required.");
  }

  // 3. Require externalId
  if (!payload.externalId || typeof payload.externalId !== "string" || payload.externalId.trim() === "") {
    errors.push("externalId is required.");
  }

  // 4. Require text and voiceId
  if (!payload.text || typeof payload.text !== "string" || payload.text.trim() === "") {
    errors.push("text content is required.");
  }
  if (!payload.voiceId || typeof payload.voiceId !== "string" || payload.voiceId.trim() === "") {
    errors.push("voiceId is required.");
  }

  // 5. Require publishedAt
  if (!payload.publishedAt || isNaN(Date.parse(payload.publishedAt))) {
    errors.push("publishedAt is required and must be a valid date.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors, post: null };
  }

  const contentHash = payload.contentHash || simpleHash(payload.text);
  const postId = payload.postId || `post_${payload.voiceId}_${payload.externalId}`;

  const post: PublicResearchPost = {
    postId,
    voiceId: payload.voiceId,
    sourceUrl: payload.sourceUrl,
    externalId: payload.externalId,
    publishedAt: new Date(payload.publishedAt).toISOString(),
    ingestedAt: payload.ingestedAt || new Date().toISOString(),
    contentHash,
    text: payload.text,
    revisionOf: payload.revisionOf || null,
    status: payload.status || "active",
    sourceMethod: payload.sourceMethod,
    metadata: payload.metadata || {},
  };

  return { isValid: true, errors: [], post };
}

export async function validateAndResolveClaim(
  payload: any,
  post: PublicResearchPost | null,
): Promise<ImportClaimResult> {
  const errors: string[] = [];

  // Validate extraction method
  const validExtractions = ["provider_direct", "deterministic_parser", "ai_extraction", "user_import"];
  if (!payload.extractionMethod || !validExtractions.includes(payload.extractionMethod)) {
    errors.push(`Invalid extractionMethod: must be one of ${validExtractions.join(", ")}`);
  }

  // Require claimKind
  if (!payload.claimKind || typeof payload.claimKind !== "string") {
    errors.push("claimKind is required.");
  }

  // Direction validation (preserve unclear)
  const validDirections: ResearchClaimDirection[] = ["bullish", "bearish", "neutral", "unclear"];
  if (!payload.direction || !validDirections.includes(payload.direction)) {
    errors.push(`Invalid direction: must be one of ${validDirections.join(", ")}`);
  }

  // evidenceSpan is required for any non-unclear claim
  if (payload.direction !== "unclear") {
    if (!payload.evidenceSpan || !payload.evidenceSpan.from || !payload.evidenceSpan.to) {
      errors.push("evidenceSpan (containing both 'from' and 'to' dates) is required for non-unclear claims.");
    } else {
      if (isNaN(Date.parse(payload.evidenceSpan.from)) || isNaN(Date.parse(payload.evidenceSpan.to))) {
        errors.push("evidenceSpan contains invalid date strings.");
      }
    }
  }

  // Canonical Symbol Master resolution
  let assetId: string | null = null;
  let unresolvedReason: string | null = null;

  if (payload.ticker) {
    const symbolRecords = await listSymbolMasterRecords();
    const query = payload.ticker.trim().toLowerCase();

    // Look for exact matches on assetId, symbol, or names
    const matched = symbolRecords.find((rec) => {
      return (
        rec.assetId.toLowerCase() === query ||
        rec.symbol.toLowerCase() === query ||
        (rec.nameKo && rec.nameKo.toLowerCase() === query) ||
        (rec.nameEn && rec.nameEn.toLowerCase() === query)
      );
    });

    if (matched) {
      assetId = matched.assetId;
    } else {
      assetId = null;
      unresolvedReason = `Ticker "${payload.ticker}" could not be resolved against Symbol Master.`;
    }
  } else {
    assetId = null;
    unresolvedReason = "No ticker provided for resolution.";
  }

  if (errors.length > 0) {
    return { isValid: false, errors, claim: null };
  }

  const claimId = payload.claimId || `claim_${post ? post.postId : "standalone"}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const claim: ResearchClaim = {
    claimId,
    postId: post ? post.postId : null,
    voiceId: post ? post.voiceId : (payload.voiceId || null),
    assetId,
    unresolvedReason,
    text: payload.text || "",
    direction: payload.direction as ResearchClaimDirection,
    claimKind: payload.claimKind as ResearchClaimKind,
    evidenceIds: payload.evidenceIds || [],
    evidenceSpan: payload.direction === "unclear" ? null : {
      from: new Date(payload.evidenceSpan.from).toISOString().slice(0, 10),
      to: new Date(payload.evidenceSpan.to).toISOString().slice(0, 10),
    },
    extractionMethod: payload.extractionMethod,
    createdAt: payload.createdAt || new Date().toISOString(),
  };

  return { isValid: true, errors: [], claim };
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}
