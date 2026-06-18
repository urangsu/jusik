import fs from "fs/promises";
import path from "path";
import { FileLock } from "./file-lock";
import { writeAtomic } from "./atomic-write";

export class JsonFileStore<T> {
  private filePath: string;
  private defaultData: T;
  private lock: FileLock;

  constructor(filePath: string, defaultData: T) {
    this.filePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
    this.defaultData = defaultData;
    this.lock = new FileLock(this.filePath);
  }

  async read(): Promise<T> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(content) as T;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // Ensure parent directory exists for subsequent writes
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        return this.defaultData;
      }
      // JSON parse failed or other read error
      console.warn(`[JsonFileStore] Failed to read/parse file: ${this.filePath}. Backing up to .corrupt`);
      try {
        const corruptPath = `${this.filePath}.corrupt`;
        await fs.mkdir(path.dirname(corruptPath), { recursive: true });
        await fs.rename(this.filePath, corruptPath);
      } catch {
        // Ignore rename error
      }
      return this.defaultData;
    }
  }

  async write(data: T): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await this.lock.acquire();
    try {
      const serialized = JSON.stringify(data, null, 2);
      await writeAtomic(this.filePath, serialized);
    } finally {
      await this.lock.release();
    }
  }
}
