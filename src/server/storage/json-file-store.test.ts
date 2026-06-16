import { describe, it, expect, afterEach } from "vitest";
import { JsonFileStore } from "./json-file-store";
import fs from "fs/promises";
import path from "path";

describe("JsonFileStore", () => {
  const testFilePath = path.join(process.cwd(), "data/test-json-store.json");

  afterEach(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch {}
    try {
      await fs.unlink(`${testFilePath}.corrupt`);
    } catch {}
    try {
      await fs.unlink(`${testFilePath}.lock`);
    } catch {}
  });

  it("should read default data if file does not exist", async () => {
    const store = new JsonFileStore<string[]>(testFilePath, ["default"]);
    const data = await store.read();
    expect(data).toEqual(["default"]);
  });

  it("should write and read data successfully", async () => {
    const store = new JsonFileStore<string[]>(testFilePath, []);
    await store.write(["item1", "item2"]);

    const data = await store.read();
    expect(data).toEqual(["item1", "item2"]);
  });

  it("should backup to .corrupt and return default data when parse fails", async () => {
    // Write invalid JSON manually
    await fs.writeFile(testFilePath, "{ invalid json", "utf8");

    const store = new JsonFileStore<Record<string, any>>(testFilePath, { fallback: true });
    const data = await store.read();

    // Should return default
    expect(data).toEqual({ fallback: true });

    // Should have created .corrupt file
    const corruptContent = await fs.readFile(`${testFilePath}.corrupt`, "utf8");
    expect(corruptContent).toBe("{ invalid json");
  });
});
