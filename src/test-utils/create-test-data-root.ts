import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Creates a unique temporary directory for test data isolation.
 *
 * Usage in vitest:
 *   const { root, cleanup } = await createTestDataRoot("my-store-test");
 *   process.env.JUSIK_TEST_DATA_ROOT = root;
 *   // ... run tests ...
 *   await cleanup();
 *
 * This ensures each test file uses a completely separate data directory,
 * preventing conflicts when tests run in parallel.
 */
export async function createTestDataRoot(prefix: string): Promise<{
  /** Absolute path to the temp directory */
  root: string;
  /** Removes the temp directory and clears JUSIK_TEST_DATA_ROOT */
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), `jusik-test-${prefix}-`)
  );

  const cleanup = async () => {
    delete process.env.JUSIK_TEST_DATA_ROOT;
    await fs.rm(root, { recursive: true, force: true });
  };

  return { root, cleanup };
}
