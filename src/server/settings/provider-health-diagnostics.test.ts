/**
 * Task 1 Step 1 — failing tests for null-data and attacker origin.
 * These must FAIL before Step 3 implementation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  evaluateKisDiagnostic,
  evaluateOpenDartDiagnostic,
  evaluateFinnhubDiagnostic,
  type KisDiagnosticInput,
} from "./provider-health-diagnostics";
import type { Parameters as _P } from "../../types/utils"; // won't be used; just keeping coherent import style

// ─── filesystem guard (same as before) ─────────────────────────────────────
const BLOCKED_PATH_PATTERN = /data\/(settings|secrets|pit)/;
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    readFile: async (path: Parameters<typeof actual.readFile>[0], options?: Parameters<typeof actual.readFile>[1]) => {
      if (BLOCKED_PATH_PATTERN.test(String(path))) throw new Error(`TEST ISOLATION VIOLATION: read '${String(path)}'`);
      return actual.readFile(path as any, options as any);
    },
    writeFile: async (path: Parameters<typeof actual.writeFile>[0], data: Parameters<typeof actual.writeFile>[1], options?: Parameters<typeof actual.writeFile>[2]) => {
      if (BLOCKED_PATH_PATTERN.test(String(path))) throw new Error(`TEST ISOLATION VIOLATION: write '${String(path)}'`);
      return actual.writeFile(path as any, data as any, options as any);
    },
  };
});

const PAPER_BASE_URL = "https://openapivts.koreainvestment.com:29443";
const REAL_BASE_URL = "https://openapi.koreainvestment.com:9443";

function kisInput(overrides: Partial<KisDiagnosticInput> = {}): KisDiagnosticInput {
  return {
    enabled: true,
    appKey: "valid_app_key_1234567",
    appSecret: "valid_app_secret_1234567890abcdefghij",
    isPaper: true,
    baseUrl: PAPER_BASE_URL,
    tokenResult: { success: true },
    quoteResult: { status: "real_time", hasValue: true },
    ...overrides,
  };
}

describe("evaluateKisDiagnostic (pure function)", () => {
  beforeEach(() => {
    vi.stubEnv("KIS_APP_KEY", "");
    vi.stubEnv("KIS_APP_SECRET", "");
    vi.stubEnv("KIS_ENABLED", "");
    vi.stubEnv("KIS_IS_PAPER", "");
    vi.stubEnv("KIS_APP_TYPE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disabled → status=disabled, message names KIS", () => {
    const result = evaluateKisDiagnostic(kisInput({ enabled: false }));
    expect(result.status).toBe("disabled");
    expect(result.safeMessage).toContain("KIS");
    expect(result.safeMessage).not.toContain("OPENDART");
  });

  it("empty appKey → credentials_missing", () => {
    const result = evaluateKisDiagnostic(kisInput({ appKey: "" }));
    expect(result.status).toBe("credentials_missing");
  });

  it("empty appSecret → credentials_missing", () => {
    const result = evaluateKisDiagnostic(kisInput({ appSecret: "" }));
    expect(result.status).toBe("credentials_missing");
  });

  it.each([
    ["mock_kis_app_key", "valid_secret_abc123"],
    ["valid_key_abc123", "mock_kis_app_secret"],
    ["mock_", "mock_"],
  ])("placeholder appKey=%s appSecret=%s → credentials_invalid", (appKey, appSecret) => {
    expect(evaluateKisDiagnostic(kisInput({ appKey, appSecret })).status).toBe("credentials_invalid");
  });

  it("paper mode without :29443 port → endpoint_mismatch", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ isPaper: true, baseUrl: "https://openapivts.koreainvestment.com" })
    );
    expect(result.status).toBe("endpoint_mismatch");
    expect(result.safeMessage).toContain("29443");
  });

  it("real mode without :9443 port → endpoint_mismatch", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ isPaper: false, baseUrl: "https://openapi.koreainvestment.com" })
    );
    expect(result.status).toBe("endpoint_mismatch");
    expect(result.safeMessage).toContain("9443");
  });

  // ── NEW: attacker.example with paper port ─────────────────────────────────
  it("rejects attacker origin that only contains the paper port", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ isPaper: true, baseUrl: "https://attacker.example:29443" })
    );
    expect(result.status).toBe("endpoint_mismatch");
  });

  it("rejects attacker origin for real mode with :9443", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ isPaper: false, baseUrl: "https://attacker.example:9443" })
    );
    expect(result.status).toBe("endpoint_mismatch");
  });

  it("rejects SSRF metadata IP with paper port", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ isPaper: true, baseUrl: "http://169.254.169.254:29443" })
    );
    expect(result.status).toBe("endpoint_mismatch");
  });

  it.each([
    "401 Unauthorized: Invalid AppKey",
    "403 Forbidden APPKEY error",
    "인증 오류 발생",
    "invalid token",
  ])("token error '%s' → credentials_invalid without echo", (errMsg) => {
    const result = evaluateKisDiagnostic(
      kisInput({ tokenResult: { success: false, errorMessage: errMsg } })
    );
    expect(result.status).toBe("credentials_invalid");
    expect(result.safeMessage).not.toContain(errMsg);
    expect(result.safeMessage).toContain("KIS가 App Key 또는 App Secret을 거부했습니다");
  });

  it("token network error → token_failed", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ tokenResult: { success: false, errorMessage: "ECONNREFUSED" } })
    );
    expect(result.status).toBe("token_failed");
  });

  it("rate_limited quote → rate_limited", () => {
    expect(
      evaluateKisDiagnostic(kisInput({ quoteResult: { status: "rate_limited", message: "quota" } })).status
    ).toBe("rate_limited");
  });

  it("error quote with auth signal → credentials_invalid", () => {
    expect(
      evaluateKisDiagnostic(kisInput({ quoteResult: { status: "error", message: "인증 실패 401" } })).status
    ).toBe("credentials_invalid");
  });

  it("error quote without auth signal → provider_error, safeMessage not echoed", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status: "error", message: "upstream timeout" } })
    );
    expect(result.status).toBe("provider_error");
    expect(result.safeMessage).not.toContain("upstream timeout");
  });

  it.each(["real_time", "delayed", "eod", "cached"] as const)(
    "quote status=%s hasValue=true → healthy",
    (status) => {
      expect(evaluateKisDiagnostic(kisInput({ quoteResult: { status, hasValue: true } })).status).toBe("healthy");
    }
  );

  // ── NEW: hasValue=false must NOT be healthy ────────────────────────────────
  it("real_time quote with hasValue=false → not healthy", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status: "real_time", hasValue: false } })
    );
    expect(result.status).not.toBe("healthy");
  });

  it("no quoteResult → unverified", () => {
    const result = evaluateKisDiagnostic(kisInput({ quoteResult: undefined }));
    expect(result.status).toBe("unverified");
  });

  it("no tokenResult → unverified", () => {
    const result = evaluateKisDiagnostic(kisInput({ tokenResult: undefined }));
    expect(result.status).toBe("unverified");
  });
});

describe("evaluateOpenDartDiagnostic (pure function)", () => {
  it("disabled → status=disabled, message names OPENDART", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: false,
      apiKey: "valid",
      searchResult: { status: "eod", hasValue: true },
    });
    expect(result.status).toBe("disabled");
    expect(result.safeMessage).toContain("OPENDART");
    expect(result.safeMessage).not.toContain("KIS");
  });

  it("empty apiKey → credentials_missing", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "", searchResult: { status: "eod", hasValue: true } }).status
    ).toBe("credentials_missing");
  });

  it("placeholder apiKey → credentials_invalid", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "mock_opendart_key", searchResult: { status: "eod", hasValue: true } }).status
    ).toBe("credentials_invalid");
  });

  it.each(["eod", "not_found", "real_time"] as const)("searchResult.status=%s hasValue=true → healthy", (status) => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_key_abc123", searchResult: { status, hasValue: true } }).status
    ).toBe("healthy");
  });

  // ── NEW: not_found is evidence of connectivity even without data ───────────
  it("not_found is connectivity evidence (no data required)", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_key", searchResult: { status: "not_found", hasValue: false } }).status
    ).toBe("healthy");
  });

  // ── NEW: eod with hasValue=false → not healthy ─────────────────────────────
  it("eod with hasValue=false → not healthy", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "valid_key_abc123",
      searchResult: { status: "eod", hasValue: false },
    });
    expect(result.status).not.toBe("healthy");
  });

  it("rate_limited → rate_limited", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_key_abc123", searchResult: { status: "rate_limited", message: "limit" } }).status
    ).toBe("rate_limited");
  });

  it("api_required → credentials_missing", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_key", searchResult: { status: "api_required", message: null } }).status
    ).toBe("credentials_missing");
  });

  it("no searchResult → unverified", () => {
    expect(
      evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_key", searchResult: undefined }).status
    ).toBe("unverified");
  });
});

describe("evaluateFinnhubDiagnostic (pure function)", () => {
  it("disabled → disabled", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: false, apiKey: "valid", quoteResult: { status: "real_time", hasValue: true } }).status
    ).toBe("disabled");
  });

  it("empty key → credentials_missing", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: true, apiKey: "", quoteResult: { status: "real_time", hasValue: true } }).status
    ).toBe("credentials_missing");
  });

  it("live quote hasValue=true → healthy", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: true, apiKey: "valid_finnhub_key_abc", quoteResult: { status: "real_time", hasValue: true } }).status
    ).toBe("healthy");
  });

  // ── NEW: live quote hasValue=false must NOT be healthy ─────────────────────
  it("live quote hasValue=false → not healthy", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: true,
      apiKey: "valid_finnhub_key_abc",
      quoteResult: { status: "real_time", hasValue: false },
    });
    expect(result.status).not.toBe("healthy");
  });

  it("rate_limited → rate_limited", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: true, apiKey: "valid_finnhub_key_abc", quoteResult: { status: "rate_limited", message: "quota" } }).status
    ).toBe("rate_limited");
  });

  it("error → credentials_invalid", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: true, apiKey: "valid_finnhub_key_abc", quoteResult: { status: "error", message: "rejected" } }).status
    ).toBe("credentials_invalid");
  });

  it("no quoteResult → unverified", () => {
    expect(
      evaluateFinnhubDiagnostic({ enabled: true, apiKey: "valid_finnhub_key_abc", quoteResult: undefined }).status
    ).toBe("unverified");
  });
});

// ── Shared: null-data fixture across all providers ─────────────────────────
describe("null-data is never healthy", () => {
  it.each([
    ["kis", () => evaluateKisDiagnostic(kisInput({ quoteResult: { status: "real_time", hasValue: false } }))],
    ["opendart", () => evaluateOpenDartDiagnostic({ enabled: true, apiKey: "valid_opendart_key_abc", searchResult: { status: "eod", hasValue: false } })],
    ["finnhub", () => evaluateFinnhubDiagnostic({ enabled: true, apiKey: "valid_finnhub_key_abc", quoteResult: { status: "real_time", hasValue: false } })],
  ] as const)("%s does not report healthy when value is absent", (_name, run) => {
    expect(run().status).not.toBe("healthy");
  });
});
