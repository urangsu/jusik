import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { GET as getVoices, POST as postVoice } from "./route";
import { POST as importVoices } from "./import/route";
import { getResearchPost, listResearchPosts } from "@/server/research/research-voice-store";
import { listResearchClaims } from "@/server/research/research-claim-store";

describe("Voices and Import API routes", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("api-research-voices-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    process.env.LOCAL_RESEARCH_WRITES_ENABLED = "true";
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    delete process.env.LOCAL_RESEARCH_WRITES_ENABLED;
    await cleanup();
  });

  it("POST /api/research/voices saves and GET lists voice profiles", async () => {
    const postReq = new NextRequest("http://localhost/api/research/voices", {
      method: "POST",
      body: JSON.stringify({
        voiceId: "voice_api_1",
        displayName: "API Voice",
        publicHandle: "@api_voice",
        sourcePlatforms: ["telegram"],
        affiliationStatus: "official",
      }),
    });

    const postRes = await postVoice(postReq);
    const postJson = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postJson.value.voiceId).toBe("voice_api_1");

    const getReq = new NextRequest("http://localhost/api/research/voices");
    const getRes = await getVoices(getReq);
    const getJson = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getJson.value).toHaveLength(1);
    expect(getJson.value[0].displayName).toBe("API Voice");
  });

  it("POST /api/research/voices/import processes posts, revisions, and claims correctly", async () => {
    // 1. First import: initial post and claim
    const payload1 = {
      posts: [
        {
          sourceMethod: "official_api",
          sourceUrl: "http://example.com/p1",
          externalId: "ext_api_post",
          text: "Samsung demand is rising.",
          voiceId: "voice_api_1",
          publishedAt: "2026-01-01T00:00:00Z",
          claims: [
            {
              extractionMethod: "user_import",
              claimKind: "demand_evidence",
              direction: "bullish",
              ticker: "005930", // Samsung Electronics
              text: "Seeded Samsung Electronics demand is rising",
              evidenceIds: ["ev_samsung"],
              evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
            },
          ],
        },
      ],
    };

    const req1 = new NextRequest("http://localhost/api/research/voices/import", {
      method: "POST",
      body: JSON.stringify(payload1),
    });

    const res1 = await importVoices(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.value.importedPosts).toHaveLength(1);
    expect(json1.value.importedClaims).toHaveLength(1);
    expect(json1.value.importedClaims[0].assetId).toBe("KR_005930"); // Resolved via Symbol Master
    expect(json1.value.errors).toHaveLength(0);

    // 2. Second import: identical content (idempotent, skips revision creation)
    const req2 = new NextRequest("http://localhost/api/research/voices/import", {
      method: "POST",
      body: JSON.stringify(payload1),
    });

    const res2 = await importVoices(req2);
    const json2 = await res2.json();
    expect(json2.value.importedPosts).toHaveLength(1);
    expect(json2.value.importedPosts[0].postId).toBe("post_99f4550aeff6c293f46d5ee03582af37c464c7e5f72f80a83c96c7da0d54d58d");
    const postsAfterReq2 = await listResearchPosts();
    expect(postsAfterReq2).toHaveLength(1); // Still 1 file stored

    // 3. Third import: same externalId, new hash (creates a revision)
    const payload3 = {
      posts: [
        {
          sourceMethod: "official_api",
          sourceUrl: "http://example.com/p1",
          externalId: "ext_api_post",
          text: "Samsung demand is revised and falling.", // changed text -> new hash
          voiceId: "voice_api_1",
          publishedAt: "2026-01-02T00:00:00Z",
          claims: [
            {
              extractionMethod: "user_import",
              claimKind: "demand_evidence",
              direction: "bearish", // changed direction
              ticker: "005930",
              text: "Revised claim text",
              evidenceIds: ["ev_samsung_revised"],
              evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
            },
          ],
        },
      ],
    };

    const req3 = new NextRequest("http://localhost/api/research/voices/import", {
      method: "POST",
      body: JSON.stringify(payload3),
    });

    const res3 = await importVoices(req3);
    const json3 = await res3.json();
    expect(json3.value.importedPosts).toHaveLength(1);
    expect(json3.value.importedPosts[0].postId).toBe("post_99f4550aeff6c293f46d5ee03582af37c464c7e5f72f80a83c96c7da0d54d58d_r1"); // Revision postId
    expect(json3.value.importedPosts[0].revisionOf).toBe("post_99f4550aeff6c293f46d5ee03582af37c464c7e5f72f80a83c96c7da0d54d58d");

    const postsAfterReq3 = await listResearchPosts();
    expect(postsAfterReq3).toHaveLength(2); // Both initial and revision stored

    const claims = await listResearchClaims();
    expect(claims).toHaveLength(2);
  });
});
