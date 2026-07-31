/**
 * Pure function tests for provider health diagnostic evaluators.
 *
 * These tests:
 * - Have zero filesystem access (no mocking of store needed)
 * - Have zero network access (no mocking of auth/quote clients needed)
 * - Use vi.stubEnv() for complete env var isolation per test
 * - Verify actual computed {status, safeMessage} — not mock return values
 * - Are not self-fulfilling: the evaluated function computes the result from inputs
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  evaluateKisDiagnostic,
  evaluateOpenDartDiagnostic,
  evaluateFinnhubDiagnostic,
  type KisDiagnosticInput,
} from "./provider-health-diagnostics";

// Guard: ensure no real data/ directory is accessed during this test file
const BLOCKED_PATH_PATTERN = /data\/(settings|secrets|pit)/;
const originalReadFile = (await import("fs/promises")).readFile;
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    readFile: async (path: Parameters<typeof actual.readFile>[0], options?: Parameters<typeof actual.readFile>[1]) => {
      if (BLOCKED_PATH_PATTERN.test(String(path))) {
        throw new Error(
          `TEST ISOLATION VIOLATION: attempted to read production data path '${String(path)}'. ` +
            "Diagnostic evaluator tests must not access the filesystem."
        );
      }
      return actual.readFile(path as any, options as any);
    },
    writeFile: async (path: Parameters<typeof actual.writeFile>[0], data: Parameters<typeof actual.writeFile>[1], options?: Parameters<typeof actual.writeFile>[2]) => {
      if (BLOCKED_PATH_PATTERN.test(String(path))) {
        throw new Error(
          `TEST ISOLATION VIOLATION: attempted to write production data path '${String(path)}'.`
        );
      }
      return actual.writeFile(path as any, data as any, options as any);
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// KIS diagnostic pure function tests
// ─────────────────────────────────────────────────────────────────────────────

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
    // Isolate all KIS env vars per test
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
    // Must name KIS, not OPENDART
    expect(result.safeMessage).toContain("KIS");
    expect(result.safeMessage).not.toContain("OPENDART");
  });

  it("empty appKey → credentials_missing", () => {
    const result = evaluateKisDiagnostic(kisInput({ appKey: "", appSecret: "valid_secret_abcdef" }));
    expect(result.status).toBe("credentials_missing");
  });

  it("empty appSecret → credentials_missing", () => {
    const result = evaluateKisDiagnostic(kisInput({ appKey: "valid_key_abcdef", appSecret: "" }));
    expect(result.status).toBe("credentials_missing");
  });

  it.each([
    ["mock_kis_app_key", "valid_secret_abc123"],
    ["valid_key_abc123", "mock_kis_app_secret"],
    ["mock_", "mock_"],
  ])("placeholder appKey=%s appSecret=%s → credentials_invalid", (appKey, appSecret) => {
    const result = evaluateKisDiagnostic(kisInput({ appKey, appSecret }));
    expect(result.status).toBe("credentials_invalid");
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

  it.each([
    "401 Unauthorized: Invalid AppKey",
    "403 Forbidden APPKEY error",
    "인증 오류 발생",
    "invalid token",
  ])("token error '%s' → credentials_invalid (not raw upstream message)", (errMsg) => {
    const result = evaluateKisDiagnostic(
      kisInput({ tokenResult: { success: false, errorMessage: errMsg } })
    );
    expect(result.status).toBe("credentials_invalid");
    // safeMessage must NOT echo the upstream error body
    expect(result.safeMessage).not.toContain(errMsg);
    expect(result.safeMessage).toContain("KIS가 App Key 또는 App Secret을 거부했습니다");
  });

  it("token network/timeout error → token_failed (not credentials_invalid)", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ tokenResult: { success: false, errorMessage: "ECONNREFUSED" } })
    );
    expect(result.status).toBe("token_failed");
  });

  it("rate_limited quote response → rate_limited", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status: "rate_limited", message: "quota exceeded" } })
    );
    expect(result.status).toBe("rate_limited");
  });

  it("error quote with auth message → credentials_invalid", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status: "error", message: "인증 실패 401" } })
    );
    expect(result.status).toBe("credentials_invalid");
  });

  it("error quote without auth signal → provider_error", () => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status: "error", message: "upstream timeout" } })
    );
    expect(result.status).toBe("provider_error");
    // safeMessage must NOT echo upstream error
    expect(result.safeMessage).not.toContain("upstream timeout");
  });

  it.each([
    ["real_time", true],
    ["delayed", true],
    ["eod", true],
    ["cached", true],
  ] as const)("quote status=%s hasValue=%s → healthy", (status, hasValue) => {
    const result = evaluateKisDiagnostic(
      kisInput({ quoteResult: { status, hasValue } })
    );
    expect(result.status).toBe("healthy");
    expect(result.safeMessage).toContain("성공");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenDART diagnostic pure function tests
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluateOpenDartDiagnostic (pure function)", () => {
  it("disabled → status=disabled, message names OPENDART", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: false,
      apiKey: "valid_key",
      searchResult: { status: "eod", hasValue: true },
    });
    expect(result.status).toBe("disabled");
    expect(result.safeMessage).toContain("OPENDART");
    // Must not say KIS
    expect(result.safeMessage).not.toContain("KIS");
  });

  it("empty apiKey → credentials_missing", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "",
      searchResult: { status: "eod", hasValue: true },
    });
    expect(result.status).toBe("credentials_missing");
  });

  it("placeholder apiKey → credentials_invalid", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "mock_opendart_key",
      searchResult: { status: "eod", hasValue: true },
    });
    expect(result.status).toBe("credentials_invalid");
  });

  it.each(["eod", "not_found", "real_time"] as const)("searchResult.status=%s → healthy", (status) => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "valid_key_abc123",
      searchResult: { status, hasValue: true },
    });
    expect(result.status).toBe("healthy");
  });

  it("rate_limited → rate_limited", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "valid_key_abc123",
      searchResult: { status: "rate_limited", message: "limit exceeded" },
    });
    expect(result.status).toBe("rate_limited");
  });

  it("api_required → credentials_missing (not credentials_invalid)", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "valid_key_abc123",
      searchResult: { status: "api_required", message: null },
    });
    expect(result.status).toBe("credentials_missing");
  });

  it("auth error code 010 in message → credentials_invalid", () => {
    const result = evaluateOpenDartDiagnostic({
      enabled: true,
      apiKey: "valid_key_abc123",
      searchResult: { status: "error", message: "인증 오류 010" },
    });
    expect(result.status).toBe("credentials_invalid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finnhub diagnostic pure function tests
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluateFinnhubDiagnostic (pure function)", () => {
  it("disabled → disabled", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: false,
      apiKey: "valid",
      quoteResult: { status: "real_time", hasValue: true },
    });
    expect(result.status).toBe("disabled");
  });

  it("empty key → credentials_missing", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: true,
      apiKey: "",
      quoteResult: { status: "real_time", hasValue: true },
    });
    expect(result.status).toBe("credentials_missing");
  });

  it("live quote → healthy", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: true,
      apiKey: "valid_finnhub_key_abc",
      quoteResult: { status: "real_time", hasValue: true },
    });
    expect(result.status).toBe("healthy");
  });

  it("rate_limited → rate_limited", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: true,
      apiKey: "valid_finnhub_key_abc",
      quoteResult: { status: "rate_limited", message: "quota" },
    });
    expect(result.status).toBe("rate_limited");
  });

  it("error → credentials_invalid", () => {
    const result = evaluateFinnhubDiagnostic({
      enabled: true,
      apiKey: "valid_finnhub_key_abc",
      quoteResult: { status: "error", message: "rejected" },
    });
    expect(result.status).toBe("credentials_invalid");
  });
});
