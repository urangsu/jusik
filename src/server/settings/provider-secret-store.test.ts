import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveProviderSecret,
  getProviderSecret,
  getProviderSecretSync,
  deleteProviderSecret,
  getMaskedProviderSecret,
  maskSecret,
} from "./provider-secret-store";

(globalThis as any).__mockFileContent = "{}";

vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => (globalThis as any).__mockFileContent),
      writeFileSync: vi.fn((path, content) => {
        (globalThis as any).__mockFileContent = content as string;
      }),
    },
  };
});

vi.mock("fs/promises", () => {
  return {
    default: {
      mkdir: vi.fn(),
      readFile: vi.fn(async () => (globalThis as any).__mockFileContent),
      writeFile: vi.fn(async (path, content) => {
        (globalThis as any).__mockFileContent = content as string;
      }),
    },
  };
});

describe("Provider Secret Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__mockFileContent = "{}";
  });

  it("should save and retrieve secrets asynchronously", async () => {
    await saveProviderSecret({
      providerId: "opendart",
      key: "OPENDART_API_KEY",
      value: "my_opendart_key_12345",
    });

    const key = await getProviderSecret({
      providerId: "opendart",
      key: "OPENDART_API_KEY",
    });
    expect(key).toBe("my_opendart_key_12345");
  });

  it("should retrieve secrets synchronously", async () => {
    await saveProviderSecret({
      providerId: "kis",
      key: "KIS_APP_KEY",
      value: "kis_app_key_abcde",
    });

    const key = getProviderSecretSync({
      providerId: "kis",
      key: "KIS_APP_KEY",
    });
    expect(key).toBe("kis_app_key_abcde");
  });

  it("should return null for non-existent secrets", async () => {
    const key = await getProviderSecret({
      providerId: "opendart",
      key: "NON_EXISTENT_KEY",
    });
    expect(key).toBeNull();
  });

  it("should delete a secret correctly", async () => {
    await saveProviderSecret({
      providerId: "opendart",
      key: "TEMP_KEY",
      value: "temp",
    });

    await deleteProviderSecret({
      providerId: "opendart",
      key: "TEMP_KEY",
    });

    const key = await getProviderSecret({
      providerId: "opendart",
      key: "TEMP_KEY",
    });
    expect(key).toBeNull();
  });

  it("should return masked secret details, shielding raw secret value", async () => {
    await saveProviderSecret({
      providerId: "opendart",
      key: "OPENDART_API_KEY",
      value: "super_secret_api_key_value",
    });

    const masked = await getMaskedProviderSecret({
      providerId: "opendart",
      key: "OPENDART_API_KEY",
    });

    expect(masked.configured).toBe(true);
    expect(masked.maskedValue).not.toContain("super_secret");
    expect(masked.maskedValue).toBe("supe****alue");
  });

  it("should mask small secrets with all asterisks", () => {
    expect(maskSecret("short")).toBe("********");
    expect(maskSecret("longsecretkey")).toBe("long****tkey");
  });
});
