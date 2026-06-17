import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProviderSettings,
  updateProviderSettings,
  listProviderSettings,
} from "./provider-settings-store";
import { getProviderSecret } from "./provider-secret-store";

vi.mock("fs", () => {
  let mockFileContent = "{}";
  return {
    default: {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => mockFileContent),
      writeFileSync: vi.fn((path, content) => {
        mockFileContent = content as string;
      }),
    },
  };
});

vi.mock("fs/promises", () => {
  let mockFileContent = "{}";
  return {
    default: {
      mkdir: vi.fn(),
      readFile: vi.fn(async () => mockFileContent),
      writeFile: vi.fn(async (path, content) => {
        mockFileContent = content as string;
      }),
    },
  };
});

vi.mock("./provider-secret-store", async (importOriginal) => {
  const actual: any = await importOriginal();
  const secretMock: Record<string, string> = {};
  return {
    ...actual,
    saveProviderSecret: vi.fn(async ({ key, value }) => {
      secretMock[key] = value;
    }),
    getProviderSecret: vi.fn(async ({ key }) => {
      return secretMock[key] || null;
    }),
    getMaskedProviderSecret: vi.fn(async ({ key }) => {
      const val = secretMock[key];
      return {
        configured: !!val,
        maskedValue: val ? actual.maskSecret(val) : null,
        updatedAt: val ? "2026-06-18" : null,
      };
    }),
  };
});

describe("Provider Settings Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get provider settings combined with definition and masked secret metadata", async () => {
    const snap = await getProviderSettings("opendart");
    expect(snap.providerId).toBe("opendart");
    expect(snap.enabled).toBe(false);
    expect(snap.values["OPENDART_BASE_URL"]).toBe("https://opendart.fss.or.kr/api");
    expect(snap.status).toBe("not_configured");
  });

  it("should update non-secret fields in settings-store and secret fields in secret-store", async () => {
    await updateProviderSettings("opendart", {
      OPENDART_ENABLED: true,
      OPENDART_API_KEY: "my_opendart_key_12345",
      OPENDART_BASE_URL: "https://custom.opendart.api",
    });

    const snap = await getProviderSettings("opendart");
    expect(snap.enabled).toBe(true);
    expect(snap.values["OPENDART_BASE_URL"]).toBe("https://custom.opendart.api");
    
    // API key should be masked in snapshot values
    const apiKeyVal = snap.values["OPENDART_API_KEY"] as any;
    expect(apiKeyVal.configured).toBe(true);
    expect(apiKeyVal.maskedValue).toBe("my_o****2345");

    // Secret store should hold the clear key
    const rawKey = await getProviderSecret({ providerId: "opendart", key: "OPENDART_API_KEY" });
    expect(rawKey).toBe("my_opendart_key_12345");
  });

  it("should list settings snapshots for all providers", async () => {
    const list = await listProviderSettings();
    expect(list.length).toBeGreaterThan(0);
    expect(list.map(s => s.providerId)).toContain("opendart");
    expect(list.map(s => s.providerId)).toContain("kis");
  });
});
