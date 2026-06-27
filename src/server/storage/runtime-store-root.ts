import path from "path";

/**
 * Returns the root directory for runtime data storage.
 *
 * Priority:
 * 1. JUSIK_TEST_DATA_ROOT  — set by test harnesses (temp dir per test)
 * 2. JUSIK_DATA_ROOT       — set by production deployment
 * 3. process.cwd()         — default (development)
 *
 * Path traversal guard: resolved path must stay within allowed roots.
 */
export function getRuntimeStoreRoot(): string {
  const testRoot = process.env.JUSIK_TEST_DATA_ROOT;
  if (testRoot && testRoot.trim().length > 0) {
    return path.resolve(testRoot);
  }

  const dataRoot = process.env.JUSIK_DATA_ROOT;
  if (dataRoot && dataRoot.trim().length > 0) {
    return path.resolve(dataRoot);
  }

  return process.cwd();
}

/**
 * Resolves a path under the runtime store root.
 *
 * Guards against path traversal: throws if the resolved path
 * does not start with the store root.
 */
export function resolveRuntimeDataPath(...segments: string[]): string {
  const root = getRuntimeStoreRoot();
  const resolved = path.resolve(root, ...segments);

  // Path traversal guard
  if (!resolved.startsWith(root)) {
    throw new Error(
      `Path traversal detected: "${resolved}" is outside root "${root}"`
    );
  }

  return resolved;
}
