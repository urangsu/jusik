import { NextRequest } from "next/server";
import crypto from "crypto";
import { createSafeResponse } from "@/server/security/safe-api-response";
import {
  saveResearchPost,
  listResearchPosts,
  getResearchPost,
} from "@/server/research/research-voice-store";
import { saveResearchClaim } from "@/server/research/research-claim-store";
import {
  validateImportPost,
  validateAndResolveClaim,
} from "@/server/research/research-voice-import-validator";
import { checkResearchWriteGuard, makeResearchWriteErrorEnvelope } from "@/server/security/research-write-guard";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { PublicResearchPost } from "@/domain/research/research-voice";
import type { ResearchClaim } from "@/domain/research/research-claim";

export type ImportSummary = {
  importedPosts: PublicResearchPost[];
  importedClaims: ResearchClaim[];
  errors: string[];
};

const ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

function makeErrorResponse(message: string, status = 400) {
  const envelope: DataEnvelope<null> = {
    value: null,
    status: "error",
    source: "research_voice_import_validator",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: null,
    message,
  };
  return createSafeResponse(envelope, status);
}

/**
 * POST /api/research/voices/import
 * Imports research posts and claims.
 * Accept JSON body: { posts: any[], claims?: any[] }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Guard check
    const guard = checkResearchWriteGuard();
    if (!guard.allowed) {
      return createSafeResponse(makeResearchWriteErrorEnvelope(guard.status, guard.message), guard.status);
    }

    // 2. Payload size check (body text <= 50,000 characters)
    const rawText = await request.text().catch(() => "");
    if (rawText.length > 50000) {
      return makeErrorResponse("Request payload too large (maximum 50,000 characters).");
    }

    // Parse body
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return makeErrorResponse("Invalid JSON payload.");
    }

    const rawPosts = body.posts || [];
    const standaloneClaims = body.claims || [];

    // 3. Prohibit standalone claims
    if (standaloneClaims.length > 0) {
      return makeErrorResponse("Standalone claim imports are strictly forbidden. All claims must be nested under a post.");
    }

    // 4. Check array limits
    if (rawPosts.length > 100) {
      return makeErrorResponse("Maximum of 100 posts per import request.");
    }

    let totalClaimsCount = 0;
    for (const postPayload of rawPosts) {
      totalClaimsCount += (postPayload.claims || []).length;
    }
    if (totalClaimsCount > 500) {
      return makeErrorResponse("Maximum of 500 claims per import request.");
    }

    // 5. Validation phase (Atomic fail-fast)
    const validatedPostsAndClaims: Array<{
      post: PublicResearchPost;
      claims: ResearchClaim[];
    }> = [];

    const errors: string[] = [];

    for (const postPayload of rawPosts) {
      // Validate post ID formats
      if (postPayload.voiceId && !ID_REGEX.test(postPayload.voiceId)) {
        return makeErrorResponse(`Invalid voiceId format: "${postPayload.voiceId}".`);
      }
      if (postPayload.externalId && !ID_REGEX.test(postPayload.externalId)) {
        return makeErrorResponse(`Invalid externalId format: "${postPayload.externalId}".`);
      }

      // URL protocol validation
      if (postPayload.sourceUrl) {
        const urlStr = String(postPayload.sourceUrl);
        if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
          return makeErrorResponse("Invalid URL protocol. Only http:// or https:// URLs are allowed.");
        }
      }

      const postVal = validateImportPost(postPayload);
      if (!postVal.isValid || !postVal.post) {
        errors.push(...postVal.errors);
        continue;
      }

      const post = postVal.post;
      // Re-route post ID to be SHA-256 hash of voiceId + externalId
      const cleanHash = crypto.createHash("sha256").update(`${post.voiceId}_${post.externalId}`).digest("hex");
      const originalPostId = `post_${cleanHash}`;
      post.postId = originalPostId;

      const nestedClaims = postPayload.claims || [];
      const validatedClaimsForPost: ResearchClaim[] = [];

      for (const claimPayload of nestedClaims) {
        if (claimPayload.claimId && !ID_REGEX.test(claimPayload.claimId)) {
          return makeErrorResponse(`Invalid claimId format: "${claimPayload.claimId}".`);
        }

        const claimVal = await validateAndResolveClaim(claimPayload, post);
        if (!claimVal.isValid || !claimVal.claim) {
          errors.push(...claimVal.errors);
          continue;
        }

        const claim = claimVal.claim;
        // Strip isVerified field (deprecated, derived from Evidence)
        delete (claim as any).isVerified;

        validatedClaimsForPost.push(claim);
      }

      validatedPostsAndClaims.push({
        post,
        claims: validatedClaimsForPost,
      });
    }

    if (errors.length > 0) {
      const envelope: DataEnvelope<ImportSummary> = {
        value: { importedPosts: [], importedClaims: [], errors },
        status: "error",
        source: "research_voice_import_validator",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "Validation failed during atomic import check. No records were stored.",
      };
      return createSafeResponse(envelope, 400);
    }

    // 6. Execution phase (write all posts & claims atomically if validation passed)
    const importedPosts: PublicResearchPost[] = [];
    const importedClaims: ResearchClaim[] = [];

    for (const group of validatedPostsAndClaims) {
      const { post, claims } = group;

      // Idempotent and revision check
      const existingPost = await getResearchPost(post.postId);
      let finalPost = post;

      if (existingPost) {
        if (existingPost.contentHash === post.contentHash) {
          // Idempotent write
          finalPost = existingPost;
        } else {
          // Revision: increment revision suffix
          const allPosts = await listResearchPosts({ voiceId: post.voiceId });
          const revisionsCount = allPosts.filter(
            (p) => p.revisionOf === post.postId || p.postId === post.postId
          ).length;

          finalPost = {
            ...post,
            postId: `${post.postId}_r${revisionsCount}`,
            revisionOf: post.postId,
          };
          await saveResearchPost(finalPost);
        }
      } else {
        await saveResearchPost(finalPost);
      }

      importedPosts.push(finalPost);

      // Save claims associated with the selected revision
      if (!existingPost || existingPost.contentHash !== post.contentHash) {
        for (const claim of claims) {
          // Re-align claim to point to the revision postId if modified
          claim.postId = finalPost.postId;
          await saveResearchClaim(claim);
          importedClaims.push(claim);
        }
      }
    }

    const value: ImportSummary = {
      importedPosts,
      importedClaims,
      errors: [],
    };

    const envelope: DataEnvelope<ImportSummary> = {
      value,
      status: "cached",
      source: "research_voice_import_validator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "research_voice_import_validator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "Server Error",
    };
    return createSafeResponse(envelope, 500);
  }
}
