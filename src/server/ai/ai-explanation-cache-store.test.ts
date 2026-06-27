import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveAiExplanationCacheRecord,
  saveAiExplanationBlockedRecord,
  getAiExplanationCacheByHash,
  listAiExplanationCacheRecords,
  listAiExplanationBlockedRecords,
} from "./ai-explanation-cache-store";
import { AiExplanationCacheRecord, AiExplanationBlockedRecord } from "@/domain/ai/ai-explanation-request";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";

describe("ai-explanation-cache-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("cache-store");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const sampleCacheRecord: AiExplanationCacheRecord = {
    requestHash: "hash_ok_123",
    request: {
      id: "req_1",
      requestHash: "hash_ok_123",
      intent: "audit_finding_explanation",
      sourceType: "audit_finding",
      sourceId: "finding_123",
      contextPackId: "finding_123",
      contextPack: {
        id: "finding_123",
        intent: "audit_finding_explanation",
        sourceRefs: [],
        facts: [],
        limitations: [],
        createdAt: "2026-06-25T12:00:00Z",
      },
      locale: "ko",
      userPrompt: null,
      status: "cached",
      createdAt: "2026-06-25T12:00:00Z",
      updatedAt: "2026-06-25T12:00:00Z",
    },
    output: {
      id: "out_1",
      intent: "audit_finding_explanation",
      title: "Title",
      summary: "Summary",
      claims: [],
      limitations: [],
      requiredDisclaimers: [],
      blockedTerms: [],
      isBlocked: false,
      blockReasons: [],
      generatedAt: "2026-06-25T12:00:00Z",
      engineVersion: "1.0.0",
    },
    cachedAt: "2026-06-25T12:00:00Z",
    expiresAt: null,
    engineVersion: "1.0.0",
  };

  const sampleBlockedRecord: AiExplanationBlockedRecord = {
    requestHash: "hash_blocked_123",
    request: {
      ...sampleCacheRecord.request,
      requestHash: "hash_blocked_123",
      status: "blocked",
    },
    attemptedOutput: {
      ...sampleCacheRecord.output,
      isBlocked: true,
      blockReasons: ["금지 단어가 포함되어 있습니다."],
    },
    blockReasons: ["금지 단어 포함"],
    blockedTerms: ["매수"],
    blockedAt: "2026-06-25T12:00:00Z",
    engineVersion: "1.0.0",
  };

  it("should save and retrieve a valid cache record", async () => {
    await saveAiExplanationCacheRecord(sampleCacheRecord);

    const record = await getAiExplanationCacheByHash("hash_ok_123");
    expect(record).not.toBeNull();
    expect(record?.requestHash).toBe("hash_ok_123");
    expect(record?.output.isBlocked).toBe(false);
  });

  it("should fail to save cache record if output is blocked", async () => {
    const badRecord = {
      ...sampleCacheRecord,
      output: {
        ...sampleCacheRecord.output,
        isBlocked: true,
      },
    };
    await expect(saveAiExplanationCacheRecord(badRecord)).rejects.toThrow(
      "Blocked AI output cannot be saved to normal cache store."
    );
  });

  it("should save blocked record to blocked directory", async () => {
    await saveAiExplanationBlockedRecord(sampleBlockedRecord);

    // Normal cache lookup should not find it
    const normalLook = await getAiExplanationCacheByHash("hash_blocked_123");
    expect(normalLook).toBeNull();

    // Query blocked list
    const blockedList = await listAiExplanationBlockedRecords({
      sourceId: "finding_123",
    });
    expect(blockedList).toHaveLength(1);
    expect(blockedList[0].requestHash).toBe("hash_blocked_123");
    expect(blockedList[0].blockedTerms).toContain("매수");
  });

  it("should list and filter normal cache records", async () => {
    await saveAiExplanationCacheRecord(sampleCacheRecord);

    const all = await listAiExplanationCacheRecords();
    expect(all).toHaveLength(1);

    const filtered = await listAiExplanationCacheRecords({
      intent: "audit_finding_explanation",
      sourceType: "audit_finding",
      sourceId: "finding_123",
    });
    expect(filtered).toHaveLength(1);

    const none = await listAiExplanationCacheRecords({
      intent: "filing_explanation",
    });
    expect(none).toHaveLength(0);
  });
});
