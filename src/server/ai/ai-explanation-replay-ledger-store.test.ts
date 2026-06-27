import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveAiExplanationReplayRecord,
  listAiExplanationReplayRecords,
  getLatestAiExplanationReplayRecords,
} from "./ai-explanation-replay-ledger-store";
import { AiExplanationReplayRecord } from "@/domain/ai/ai-explanation-replay-ledger";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";

describe("ai-explanation-replay-ledger-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("replay-ledger");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const dummyRecord: AiExplanationReplayRecord = {
    id: "rep_1",
    requestHash: "hash_123",
    findingId: "finding_123",
    mode: "safe",
    outcome: "passed",
    request: {} as any,
    promptInput: {} as any,
    output: { isBlocked: false } as any,
    cacheRecord: {} as any,
    blockedRecord: null,
    expectedBlocked: false,
    actualBlocked: false,
    passed: true,
    failureReasons: [],
    createdAt: "2026-06-25T12:00:00Z",
    engineVersion: "1.0.0",
  };

  it("should save a record, update history, and latest file", async () => {
    await saveAiExplanationReplayRecord(dummyRecord);

    const latest = await getLatestAiExplanationReplayRecords();
    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe("rep_1");

    const history = await listAiExplanationReplayRecords();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("rep_1");
  });

  it("should deduplicate latest records on findingId|requestHash|mode|engineVersion", async () => {
    await saveAiExplanationReplayRecord(dummyRecord);

    // Save matching record with different id and different outcomes
    const updatedRecord = {
      ...dummyRecord,
      id: "rep_2",
      outcome: "error" as const,
      passed: false,
    };
    await saveAiExplanationReplayRecord(updatedRecord);

    // latest should contain only one updated record (deduplicated)
    const latest = await getLatestAiExplanationReplayRecords();
    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe("rep_2");
    expect(latest[0].outcome).toBe("error");

    // history should contain both runs
    const history = await listAiExplanationReplayRecords();
    expect(history).toHaveLength(2);
  });

  it("should support query filters in list method", async () => {
    await saveAiExplanationReplayRecord(dummyRecord);

    const record2: AiExplanationReplayRecord = {
      ...dummyRecord,
      id: "rep_2",
      findingId: "finding_456",
      mode: "forbidden_wording",
      outcome: "blocked",
      expectedBlocked: true,
      actualBlocked: true,
    };
    await saveAiExplanationReplayRecord(record2);

    const listAll = await listAiExplanationReplayRecords();
    expect(listAll).toHaveLength(2);

    const listByFinding = await listAiExplanationReplayRecords({ findingId: "finding_456" });
    expect(listByFinding).toHaveLength(1);
    expect(listByFinding[0].id).toBe("rep_2");

    const listByMode = await listAiExplanationReplayRecords({ mode: "forbidden_wording" });
    expect(listByMode).toHaveLength(1);
    expect(listByMode[0].id).toBe("rep_2");

    const listByPassed = await listAiExplanationReplayRecords({ passed: true });
    expect(listByPassed).toHaveLength(2); // both have passed: true (since actual === expected)
  });
});
