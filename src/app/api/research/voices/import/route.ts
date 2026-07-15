import { NextRequest } from "next/server";
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
import type { DataEnvelope } from "@/domain/common/data-status";
import type { PublicResearchPost } from "@/domain/research/research-voice";
import type { ResearchClaim } from "@/domain/research/research-claim";

export type ImportSummary = {
  importedPosts: PublicResearchPost[];
  importedClaims: ResearchClaim[];
  errors: string[];
};

/**
 * POST /api/research/voices/import
 * Imports research posts and claims.
 * Accept JSON body: { posts: any[], claims?: any[] }
 */
export async function POST(request: NextRequest) {
  const errors: string[] = [];
  const importedPosts: PublicResearchPost[] = [];
  const importedClaims: ResearchClaim[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const rawPosts = body.posts || [];
    const standaloneClaims = body.claims || [];

    // 1. Process posts
    for (const postPayload of rawPosts) {
      // Validate post
      const postVal = validateImportPost(postPayload);
      if (!postVal.isValid || !postVal.post) {
        errors.push(...postVal.errors);
        continue;
      }

      const post = postVal.post;

      // Check if post already exists
      const originalPostId = `post_${post.voiceId}_${post.externalId}`;
      const existingPost = await getResearchPost(originalPostId);

      let finalPost = post;

      if (existingPost) {
        if (existingPost.contentHash === post.contentHash) {
          // Idempotent: skip writing, use existing
          finalPost = existingPost;
        } else {
          // Revision: same externalId, new hash
          const allPosts = await listResearchPosts({ voiceId: post.voiceId });
          const revisionsCount = allPosts.filter(
            (p) => p.externalId === post.externalId,
          ).length;

          // Set revision fields
          finalPost = {
            ...post,
            postId: `${originalPostId}_r${revisionsCount}`,
            revisionOf: originalPostId,
          };
          await saveResearchPost(finalPost);

          // Optionally, we could update the existing post status to "revised"
          // but we want immutable history files, so we keep the old revision file untouched
          // and let listResearchPosts return the latest revision from index
        }
      } else {
        // Brand new post
        finalPost = {
          ...post,
          postId: originalPostId,
        };
        await saveResearchPost(finalPost);
      }

      importedPosts.push(finalPost);

      // Process nested claims if present (only if new post or new revision)
      if (!existingPost || existingPost.contentHash !== post.contentHash) {
        const nestedClaims = postPayload.claims || [];
        for (const claimPayload of nestedClaims) {
          const claimVal = await validateAndResolveClaim(claimPayload, finalPost);
          if (!claimVal.isValid || !claimVal.claim) {
            errors.push(...claimVal.errors);
            continue;
          }
          await saveResearchClaim(claimVal.claim);
          importedClaims.push(claimVal.claim);
        }
      }
    }

    // 2. Process standalone claims
    for (const claimPayload of standaloneClaims) {
      const claimVal = await validateAndResolveClaim(claimPayload, null);
      if (!claimVal.isValid || !claimVal.claim) {
        errors.push(...claimVal.errors);
        continue;
      }
      await saveResearchClaim(claimVal.claim);
      importedClaims.push(claimVal.claim);
    }

    const value: ImportSummary = {
      importedPosts,
      importedClaims,
      errors,
    };

    const envelope: DataEnvelope<ImportSummary> = {
      value,
      status: errors.length > 0 ? "error" : "cached",
      source: "research_voice_import_validator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: errors.length > 0 ? "Some import payloads failed validation" : undefined,
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
