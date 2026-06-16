import fs from "fs/promises";

export class FileLock {
  private lockPath: string;

  constructor(filePath: string) {
    this.lockPath = `${filePath}.lock`;
  }

  async acquire(timeoutMs = 5000, retryIntervalMs = 100): Promise<void> {
    const startTime = Date.now();
    while (true) {
      try {
        // 'wx' flag fails if the file already exists (atomic check & create)
        const handle = await fs.open(this.lockPath, "wx");
        await handle.close();
        return;
      } catch (err: any) {
        if (err.code !== "EEXIST") {
          throw err;
        }
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Timeout acquiring lock for file: ${this.lockPath}`);
        }
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }

  async release(): Promise<void> {
    try {
      await fs.unlink(this.lockPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }
}
