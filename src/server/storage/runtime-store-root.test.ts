import { describe, it, expect, vi, afterEach } from "vitest";
import { getRuntimeStoreRoot, resolveRuntimeDataPath } from "./runtime-store-root";
import path from "path";

describe("runtime-store-root", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.JUSIK_TEST_DATA_ROOT;
    delete process.env.JUSIK_DATA_ROOT;
  });

  it("default root is process.cwd()", () => {
    vi.stubEnv("JUSIK_TEST_DATA_ROOT", "");
    vi.stubEnv("JUSIK_DATA_ROOT", "");

    expect(getRuntimeStoreRoot()).toBe(process.cwd());
  });

  it("JUSIK_TEST_DATA_ROOT overrides default", () => {
    const testRoot = "/tmp/jusik-test-123";
    process.env.JUSIK_TEST_DATA_ROOT = testRoot;

    expect(getRuntimeStoreRoot()).toBe(path.resolve(testRoot));
  });

  it("JUSIK_DATA_ROOT is used when test root is not set", () => {
    const dataRoot = "/tmp/jusik-data-prod";
    delete process.env.JUSIK_TEST_DATA_ROOT;
    process.env.JUSIK_DATA_ROOT = dataRoot;

    expect(getRuntimeStoreRoot()).toBe(path.resolve(dataRoot));
  });

  it("JUSIK_TEST_DATA_ROOT takes priority over JUSIK_DATA_ROOT", () => {
    const testRoot = "/tmp/jusik-test-priority";
    const dataRoot = "/tmp/jusik-data-not-used";
    process.env.JUSIK_TEST_DATA_ROOT = testRoot;
    process.env.JUSIK_DATA_ROOT = dataRoot;

    expect(getRuntimeStoreRoot()).toBe(path.resolve(testRoot));
  });

  it("resolveRuntimeDataPath joins segments under root", () => {
    const testRoot = "/tmp/jusik-join-test";
    process.env.JUSIK_TEST_DATA_ROOT = testRoot;

    const resolved = resolveRuntimeDataPath("data", "ai", "cache");
    expect(resolved).toBe(path.resolve(testRoot, "data", "ai", "cache"));
  });

  it("resolveRuntimeDataPath throws on path traversal attempt", () => {
    const testRoot = "/tmp/jusik-traversal-test";
    process.env.JUSIK_TEST_DATA_ROOT = testRoot;

    expect(() => {
      resolveRuntimeDataPath("../../etc/passwd");
    }).toThrow("Path traversal detected");
  });
});
