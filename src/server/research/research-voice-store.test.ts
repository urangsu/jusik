import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import {
  saveVoiceProfile,
  getVoiceProfile,
  listVoiceProfiles,
  saveResearchPost,
  getResearchPost,
  listResearchPosts,
  clearAllResearchVoicesAndPosts,
} from "./research-voice-store";
import type { ResearchVoiceProfile, PublicResearchPost } from "@/domain/research/research-voice";

describe("research-voice-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("research-voice-store-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const mockProfile: ResearchVoiceProfile = {
    voiceId: "voice_1",
    displayName: "Tech Analyst",
    publicHandle: "@tech_analyst",
    sourcePlatforms: ["twitter"],
    affiliationStatus: "independent_tracker",
    productionEligible: false,
  };

  const mockPost = (id: string, text: string, hash: string): PublicResearchPost => ({
    postId: id,
    voiceId: "voice_1",
    sourceUrl: "http://example.com/post",
    externalId: "ext_" + id,
    publishedAt: "2026-01-01T00:00:00Z",
    ingestedAt: "2026-01-01T00:00:00Z",
    contentHash: hash,
    text,
    revisionOf: null,
    status: "active",
    sourceMethod: "user_json",
  });

  it("saves and retrieves voice profiles", async () => {
    await saveVoiceProfile(mockProfile);
    const profile = await getVoiceProfile(mockProfile.voiceId);
    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe("Tech Analyst");

    const list = await listVoiceProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].voiceId).toBe(mockProfile.voiceId);
  });

  it("saves and retrieves public research posts with append-only validation", async () => {
    const post = mockPost("post_1", "Initial text", "hash1");
    await saveResearchPost(post);

    // Idempotent save of identical content should be a no-op
    await expect(saveResearchPost(post)).resolves.not.toThrow();

    // Saving with different content hash on same postId should throw immutable error
    const modifiedPost = mockPost("post_1", "Updated text", "hash2");
    await expect(saveResearchPost(modifiedPost)).rejects.toThrow(/Immutable post violation/);

    const retrieved = await getResearchPost("post_1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.text).toBe("Initial text");
  });

  it("lists research posts filtering by voiceId and status", async () => {
    await saveResearchPost(mockPost("post_1", "Active text", "hash1"));
    await saveResearchPost({
      ...mockPost("post_2", "Deleted text", "hash2"),
      status: "deleted",
    });

    const all = await listResearchPosts();
    expect(all).toHaveLength(2);

    const active = await listResearchPosts({ status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].postId).toBe("post_1");

    const deleted = await listResearchPosts({ status: "deleted" });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].postId).toBe("post_2");
  });
});
