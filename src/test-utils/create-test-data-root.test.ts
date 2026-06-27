import { describe, it, expect, afterEach } from "vitest";
import { createTestDataRoot } from "./create-test-data-root";
import { promises as fs } from "fs";
import path from "path";

describe("createTestDataRoot", () => {
  afterEach(() => {
    delete process.env.JUSIK_TEST_DATA_ROOT;
  });

  it("creates a temp directory that exists", async () => {
    const { root, cleanup } = await createTestDataRoot("test-util-basic");
    try {
      const stat = await fs.stat(root);
      expect(stat.isDirectory()).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("cleanup removes the directory", async () => {
    const { root, cleanup } = await createTestDataRoot("test-util-cleanup");
    await cleanup();

    await expect(fs.stat(root)).rejects.toThrow();
  });

  it("cleanup clears JUSIK_TEST_DATA_ROOT", async () => {
    const { root, cleanup } = await createTestDataRoot("test-util-env");
    process.env.JUSIK_TEST_DATA_ROOT = root;
    expect(process.env.JUSIK_TEST_DATA_ROOT).toBe(root);

    await cleanup();
    expect(process.env.JUSIK_TEST_DATA_ROOT).toBeUndefined();
  });

  it("each call creates a unique temp directory", async () => {
    const { root: root1, cleanup: cleanup1 } = await createTestDataRoot("test-util-unique");
    const { root: root2, cleanup: cleanup2 } = await createTestDataRoot("test-util-unique");
    try {
      expect(root1).not.toBe(root2);
    } finally {
      await cleanup1();
      await cleanup2();
    }
  });

  it("prefix appears in the directory name", async () => {
    const prefix = "my-store-test";
    const { root, cleanup } = await createTestDataRoot(prefix);
    try {
      expect(path.basename(root)).toContain(prefix);
    } finally {
      await cleanup();
    }
  });
});
