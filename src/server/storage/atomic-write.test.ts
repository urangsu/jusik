import { describe, it, expect, afterEach } from "vitest";
import { writeAtomic } from "./atomic-write";
import fs from "fs/promises";
import path from "path";

describe("AtomicWrite", () => {
  const testFilePath = path.join(process.cwd(), "data/test-atomic-write.json");

  afterEach(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch {}
    try {
      await fs.unlink(`${testFilePath}.tmp`);
    } catch {}
  });

  it("should write content successfully using writeAtomic", async () => {
    const data = JSON.stringify({ success: true });
    await writeAtomic(testFilePath, data);

    const read = await fs.readFile(testFilePath, "utf8");
    expect(read).toBe(data);
  });

  it("should clean up temp file if write fails", async () => {
    // Attempt writing to an invalid/illegal path to trigger write failure
    const invalidPath = "/invalid-directory/test-file.json";
    await expect(writeAtomic(invalidPath, "{}")).rejects.toThrow();

    // Verify temp file does not linger
    await expect(fs.access(`${invalidPath}.tmp`)).rejects.toThrow();
  });
});
