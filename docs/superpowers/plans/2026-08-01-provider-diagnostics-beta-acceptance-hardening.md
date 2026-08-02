# Provider Diagnostics and Beta Acceptance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 Provider 진단과 Real Data Beta Acceptance가 null 데이터, 잘못된 payload, 위조 source, 오래된 timestamp, fallback Provider 응답을 절대로 정상 증거로 승인하지 않게 만든다.

**Architecture:** `provider-health-checker.ts`는 네트워크와 저장만 담당하고 모든 상태 판정은 순수 evaluator 한 곳에서 수행한다. Smoke runner는 Provider를 고정 호출한 뒤 capability별 Zod schema, canonical source, source tier, freshness를 검증한 구조화 증거를 만들고, Acceptance evaluator는 그 증거를 fail-closed 방식으로 집계한다. PIT·전략 Acceptance는 WO-09 완료 뒤 별도 후속 작업으로 연결하며, 이 문서 완료만으로 Real Data Beta GO를 선언하지 않는다.

**Tech Stack:** TypeScript, Next.js 16 App Router, Vitest, Zod 4, DataEnvelope<T>, Node `URL`

---

## 0. 범위와 완료 판정

이 작업은 기존 커밋 `2b2ce55`의 후속 교정 작업이다.

완료로 인정하려면 다음이 모두 참이어야 한다.

- 새 health evaluator가 실제 `checkProviderHealth()`에서 호출된다.
- `hasValue=false`인 응답은 어떤 Provider에서도 `healthy`가 아니다.
- upstream 오류 본문과 secret이 저장 상태 및 API 응답에 포함되지 않는다.
- smoke가 KIS/Finnhub target을 fallback chain이 아니라 지정 Provider로 호출한다.
- 필수 target의 payload schema, source, source tier, updatedAt가 모두 검증된다.
- 누락, skip, null, schema mismatch, source mismatch, tier mismatch, stale timestamp가 각각 exit 1이다.
- 전체 테스트 동안 `data/settings/provider-settings.json`과 `data/secrets/provider-secrets.json` 해시가 바뀌지 않는다.
- 실제 키를 사용한 live smoke를 실행하지 않았다면 결과는 계속 NO-GO다.

이 작업에서 하지 않는 것:

- 주문, 실거래, 모의투자 주문
- WO-09의 PIT 저장소 및 전략 predicate 구현
- 모든 lint warning 일괄 정리
- Keychain/KMS 전환 자체

## 1. 파일 구조

| 파일 | 책임 |
|---|---|
| `src/server/settings/provider-health-diagnostics.ts` | Provider 응답을 `ProviderStatus`와 안전 메시지로 변환하는 유일한 순수 판정기 |
| `src/server/settings/provider-health-checker.ts` | 설정 조회, Provider 호출, evaluator 호출, 상태 저장만 담당 |
| `src/server/settings/provider-health-diagnostics.test.ts` | 입력 조합별 순수 판정 회귀 테스트 |
| `src/server/settings/provider-health-checker-diagnostics.test.ts` | 실제 checker가 evaluator 결과를 정확히 저장하는 orchestration 테스트 |
| `src/server/ops/provider-smoke-contracts.ts` | capability별 Zod value schema와 canonical provenance 정책 |
| `src/server/ops/provider-real-data-smoke-runner.ts` | Provider 고정 호출 및 검증 증거 생성 |
| `src/domain/ops/provider-readiness.ts` | smoke 검증 결과 타입 |
| `src/server/ops/beta-acceptance.ts` | 필수 target 전체를 fail-closed로 집계하는 순수 evaluator |
| `src/server/ops/beta-acceptance.test.ts` | 거짓 PASS fixture와 완전 PASS fixture |
| `scripts/ops/run-beta-acceptance.ts` | CLI 출력과 exit code만 담당 |

---

### Task 1: Health evaluator의 null·origin·단계 계약 수정

**Files:**
- Modify: `src/server/settings/provider-health-diagnostics.ts`
- Modify: `src/server/settings/provider-health-diagnostics.test.ts`

- [ ] **Step 1: 실패하는 null-data 및 위장 origin 테스트를 추가한다**

```ts
it.each([
  ["kis", () => evaluateKisDiagnostic(kisInput({
    quoteResult: { status: "real_time", hasValue: false },
  }))],
  ["opendart", () => evaluateOpenDartDiagnostic({
    enabled: true,
    apiKey: "valid_opendart_key",
    searchResult: { status: "eod", hasValue: false },
  })],
  ["finnhub", () => evaluateFinnhubDiagnostic({
    enabled: true,
    apiKey: "valid_finnhub_key",
    quoteResult: { status: "real_time", hasValue: false },
  })],
])("%s does not report healthy when value is absent", (_name, run) => {
  expect(run().status).not.toBe("healthy");
});

it("rejects an attacker origin that only contains the paper port", () => {
  const result = evaluateKisDiagnostic(kisInput({
    isPaper: true,
    baseUrl: "https://attacker.example:29443",
  }));
  expect(result.status).toBe("endpoint_mismatch");
});
```

- [ ] **Step 2: 테스트가 기존 코드에서 실패하는지 확인한다**

Run:

```bash
npx vitest run src/server/settings/provider-health-diagnostics.test.ts
```

Expected: `hasValue=false` 세 케이스와 attacker origin 케이스가 FAIL.

- [ ] **Step 3: optional stage evidence와 canonical origin을 구현한다**

`KisDiagnosticInput.tokenResult`, `quoteResult`, OpenDART `searchResult`, Finnhub `quoteResult`를 optional로 변경한다. 아직 해당 단계 증거가 없으면 `unverified`를 반환한다.

```ts
const KIS_PAPER_ORIGIN = "https://openapivts.koreainvestment.com:29443";
const KIS_LIVE_ORIGIN = "https://openapi.koreainvestment.com:9443";

function isExpectedKisOrigin(baseUrl: string, isPaper: boolean): boolean {
  try {
    return new URL(baseUrl).origin === (isPaper ? KIS_PAPER_ORIGIN : KIS_LIVE_ORIGIN);
  } catch {
    return false;
  }
}
```

각 evaluator의 성공 조건을 다음처럼 고정한다.

```ts
if (!input.quoteResult) {
  return { status: "unverified", safeMessage: "실제 시세 조회가 아직 실행되지 않았습니다." };
}

if (LIVE_STATUSES.has(input.quoteResult.status)) {
  return input.quoteResult.hasValue
    ? { status: "healthy", safeMessage: "KIS Open API 시세 연결 및 인증 테스트 성공" }
    : { status: "provider_error", safeMessage: "KIS 응답에 사용 가능한 시세 데이터가 없습니다." };
}
```

OpenDART의 `not_found`는 API 연결 증거로는 인정하되, `eod` 또는 `real_time`이면 반드시 `hasValue=true`여야 한다. Finnhub도 live status와 `hasValue=true`가 동시에 충족돼야 한다.

- [ ] **Step 4: 모든 evaluator 테스트를 통과시킨다**

Run:

```bash
npx vitest run src/server/settings/provider-health-diagnostics.test.ts
```

Expected: PASS. `hasValue=false → healthy` 케이스가 0개.

- [ ] **Step 5: 독립 커밋한다**

```bash
git add src/server/settings/provider-health-diagnostics.ts src/server/settings/provider-health-diagnostics.test.ts
git commit -m "fix(settings): make provider diagnostics value-aware"
```

---

### Task 2: Production health checker를 evaluator에 연결하고 오류를 비식별화

**Files:**
- Modify: `src/server/settings/provider-health-checker.ts`
- Modify: `src/server/settings/provider-health-checker-diagnostics.test.ts`
- Modify: `src/app/api/settings/providers/[providerId]/health-check/route.test.ts`

- [ ] **Step 1: production checker가 evaluator 결과를 저장하는 실패 테스트를 작성한다**

기존 `getProviderSettings()` 반환값만 검사하는 assertion을 제거하고 저장 인자를 직접 검사한다.

```ts
await checkProviderHealth("kis");

expect(updateProviderStatus).toHaveBeenCalledWith(
  "kis",
  "credentials_invalid",
  "KIS가 App Key 또는 App Secret을 거부했습니다.",
);
```

null quote와 raw upstream 오류도 추가한다.

```ts
expect(updateProviderStatus).toHaveBeenCalledWith(
  "kis",
  "provider_error",
  "KIS 응답에 사용 가능한 시세 데이터가 없습니다.",
);

expect(updateProviderStatus).not.toHaveBeenCalledWith(
  "kis",
  expect.anything(),
  expect.stringContaining("upstream-secret-body"),
);
```

- [ ] **Step 2: 기존 production checker 테스트가 실패하는지 확인한다**

Run:

```bash
npx vitest run src/server/settings/provider-health-checker-diagnostics.test.ts
```

Expected: exact `updateProviderStatus` assertion이 FAIL.

- [ ] **Step 3: checker에서 중복 판정 분기를 제거하고 evaluator를 호출한다**

`provider-health-checker.ts`는 다음 순서만 갖게 한다.

```ts
const initial = evaluateKisDiagnostic({
  enabled: isEnabled,
  appKey: kisConfig.appKey,
  appSecret: kisConfig.appSecret,
  isPaper: kisConfig.isPaper,
  baseUrl: kisConfig.baseUrl,
});
if (initial.status !== "unverified") return persist(providerId, initial);

let tokenResult: KisDiagnosticInput["tokenResult"];
try {
  await KisAuthClient.getAccessToken();
  tokenResult = { success: true };
} catch (error) {
  tokenResult = { success: false, errorMessage: classifyProviderError(error) };
}

const afterToken = evaluateKisDiagnostic({ ...baseInput, tokenResult });
if (afterToken.status !== "unverified") return persist(providerId, afterToken);

const quote = await kisDomesticStockProvider.getQuote("005930");
return persist(providerId, evaluateKisDiagnostic({
  ...baseInput,
  tokenResult,
  quoteResult: isDataStatus(quote.status)
    ? { status: quote.status, hasValue: quote.value !== null }
    : { status: quote.status, message: null },
}));
```

`persist()`는 safe message만 저장한다.

```ts
async function persist(providerId: ProviderId, result: DiagnosticResult) {
  await updateProviderStatus(providerId, result.status, result.safeMessage);
  return getProviderSettings(providerId);
}
```

`classifyProviderError()`는 raw body를 반환하지 않고 `401`, `403`, `429`, `network`, `unknown` 중 하나만 반환해야 한다. route catch도 `err.message`를 그대로 반환하지 말고 고정 메시지 `Provider 연결 테스트 중 오류가 발생했습니다.`를 사용한다.

```ts
const DATA_STATUSES = new Set(["real_time", "delayed", "eod", "cached"] as const);

function isDataStatus(status: string): status is "real_time" | "delayed" | "eod" | "cached" {
  return DATA_STATUSES.has(status as "real_time" | "delayed" | "eod" | "cached");
}

function classifyProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/401/i.test(message)) return "401";
  if (/403/i.test(message)) return "403";
  if (/429|rate.?limit/i.test(message)) return "429";
  if (/ENOTFOUND|ECONN|ETIMEDOUT|fetch failed/i.test(message)) return "network";
  return "unknown";
}
```

- [ ] **Step 4: orchestration과 route 정보노출 테스트를 통과시킨다**

Run:

```bash
npx vitest run \
  src/server/settings/provider-health-diagnostics.test.ts \
  src/server/settings/provider-health-checker-diagnostics.test.ts \
  'src/app/api/settings/providers/[providerId]/health-check/route.test.ts'
```

Expected: PASS. production checker 테스트는 `updateProviderStatus` exact args를 검사하고 raw upstream body가 응답에 없음.

- [ ] **Step 5: 독립 커밋한다**

```bash
git add src/server/settings/provider-health-checker.ts \
  src/server/settings/provider-health-checker-diagnostics.test.ts \
  'src/app/api/settings/providers/[providerId]/health-check/route.test.ts'
git commit -m "fix(settings): wire pure diagnostics into health checks"
```

---

### Task 3: Capability별 smoke schema와 canonical provenance 계약 추가

**Files:**
- Create: `src/server/ops/provider-smoke-contracts.ts`
- Create: `src/server/ops/provider-smoke-contracts.test.ts`
- Modify: `src/domain/ops/provider-readiness.ts`

- [ ] **Step 1: 거짓 payload와 위조 provenance 실패 테스트를 작성한다**

```ts
it.each([
  ["quote", {}],
  ["quote", "75000"],
  ["ohlcv", { candles: [] }],
  ["filings", { list: "not-an-array" }],
  ["financials", { symbol: "005930" }],
])("rejects invalid %s value", (capability, value) => {
  expect(validateSmokeValue(capability as ProviderRealDataSmokeCapability, value).success).toBe(false);
});

it("rejects source text that merely contains the provider name", () => {
  expect(validateSmokeProvenance("kis", "attacker-not-kis", "official").success).toBe(false);
});
```

- [ ] **Step 2: 테스트가 구현 부재로 실패하는지 확인한다**

Run:

```bash
npx vitest run src/server/ops/provider-smoke-contracts.test.ts
```

Expected: module 또는 export 부재로 FAIL.

- [ ] **Step 3: Zod schema와 exact provenance map을 구현한다**

`provider-smoke-contracts.ts`에 다음 정책을 정의한다.

```ts
export const PROVIDER_PROVENANCE = {
  kis: { source: "KIS Open API", sourceTier: "official" },
  opendart: { source: "OpenDART", sourceTier: "official" },
  finnhub_free: { source: "Finnhub Free", sourceTier: "free_limited" },
} as const;

const quoteSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  price: z.number().finite(),
  currency: z.enum(["KRW", "USD"]),
  updatedAt: z.string().datetime(),
  source: z.string().min(1),
});

const ohlcvSchema = z.object({
  assetId: z.string().min(1),
  candles: z.array(z.object({
    timestamp: z.string().datetime(),
    open: z.number().finite(),
    high: z.number().finite(),
    low: z.number().finite(),
    close: z.number().finite(),
    volume: z.number().finite().nonnegative(),
  })).min(1),
});

const filingsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  list: z.array(z.object({
    rcept_no: z.string().min(1),
    rcept_dt: z.string().regex(/^\d{8}$/),
    report_nm: z.string().min(1),
  })).min(1),
});

const financialsSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  corpCode: z.string().length(8),
  bsnsYear: z.string().regex(/^\d{4}$/),
  receiptNo: z.string().min(1),
  currency: z.literal("KRW"),
  basis: z.enum(["CFS", "OFS"]),
  updatedAt: z.string().datetime(),
});

const VALUE_SCHEMAS = {
  quote: quoteSchema,
  ohlcv: ohlcvSchema,
  filings: filingsSchema,
  financials: financialsSchema,
} satisfies Record<Exclude<ProviderRealDataSmokeCapability, "news">, z.ZodType>;

export function validateSmokeValue(
  capability: Exclude<ProviderRealDataSmokeCapability, "news">,
  value: unknown,
) {
  return VALUE_SCHEMAS[capability].safeParse(value);
}

export function validateSmokeProvenance(
  providerId: keyof typeof PROVIDER_PROVENANCE,
  source: string | null,
  sourceTier: string | null,
) {
  const expected = PROVIDER_PROVENANCE[providerId];
  return {
    success: source === expected.source && sourceTier === expected.sourceTier,
    expected,
  };
}
```

`ProviderRealDataSmokeResult`에 아래 필드를 추가한다.

```ts
schemaValid: boolean;
schemaIssues: string[];
provenanceValid: boolean;
freshnessValid: boolean;
ageMs: number | null;
```

- [ ] **Step 4: contract 테스트를 통과시킨다**

Run:

```bash
npx vitest run src/server/ops/provider-smoke-contracts.test.ts
npm run typecheck
```

Expected: PASS. 위조 source와 잘못된 payload가 모두 실패.

- [ ] **Step 5: 독립 커밋한다**

```bash
git add src/server/ops/provider-smoke-contracts.ts \
  src/server/ops/provider-smoke-contracts.test.ts \
  src/domain/ops/provider-readiness.ts
git commit -m "feat(ops): add typed provider smoke contracts"
```

---

### Task 4: Smoke runner를 Provider 고정 호출과 검증 증거 생성기로 변경

**Files:**
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.test.ts`
- Modify: `src/app/api/market/quote/route.test.ts`
- Modify: `src/app/api/market/ohlcv/route.test.ts`

- [ ] **Step 1: Provider pinning과 freshness 실패 테스트를 작성한다**

```ts
expect(fetch).toHaveBeenCalledWith(
  expect.stringContaining("providerId=finnhub_free"),
  expect.objectContaining({
    headers: expect.objectContaining({ "x-internal-smoke-key": "test-smoke-key" }),
  }),
);

expect(result).toMatchObject({
  providerId: "finnhub_free",
  provenanceValid: true,
  schemaValid: true,
  freshnessValid: true,
  passed: true,
});
```

추가 fixture:

- `updatedAt=null`
- 파싱 불가능한 timestamp
- 허용 시간보다 오래된 timestamp
- `source="fake-finnhub"`
- `sourceTier="manual_import"`
- non-null이지만 schema-invalid value

모두 `passed:false`여야 한다.

- [ ] **Step 2: 기존 runner에서 테스트가 실패하는지 확인한다**

Run:

```bash
npx vitest run src/server/ops/provider-real-data-smoke-runner.test.ts
```

Expected: providerId/header/schema/freshness assertion이 FAIL.

- [ ] **Step 3: URL과 내부 key를 안전하게 구성한다**

문자열 결합 대신 `URL`을 사용한다. market target에는 Provider ID를 강제로 설정한다.

```ts
const url = new URL(profile.endpoint, baseUrl);
if (profile.capability === "quote" || profile.capability === "ohlcv") {
  url.searchParams.set("providerId", providerId);
}

const smokeKey = process.env.INTERNAL_SMOKE_KEY;
if (!smokeKey) {
  return failedSmoke(providerId, profile, "INTERNAL_SMOKE_KEY가 설정되지 않았습니다.");
}

const response = await fetch(url, {
  method: "GET",
  headers: {
    accept: "application/json",
    "x-internal-smoke-key": smokeKey,
  },
});
```

`failedSmoke()`는 누락 필드 없이 fail-closed 결과를 생성한다.

```ts
function failedSmoke(
  providerId: RuntimeProviderId,
  profile: SmokeProfile,
  message: string,
): ProviderRealDataSmokeResult {
  return {
    providerId,
    capability: profile.capability,
    symbol: profile.symbol,
    region: profile.region,
    attempted: false,
    skippedReason: message,
    envelopeStatus: null,
    dataAvailable: false,
    source: null,
    sourceTier: null,
    warnings: [],
    updatedAt: null,
    message,
    passed: false,
    schemaValid: false,
    schemaIssues: [message],
    provenanceValid: false,
    freshnessValid: false,
    ageMs: null,
    checkedAt: new Date().toISOString(),
  };
}
```

`baseUrl`은 loopback origin 또는 `INTERNAL_APP_ORIGIN`과 정확히 일치할 때만 허용한다. Host header나 request body에서 받은 임의 외부 origin으로 smoke key를 전송하지 않는다.

- [ ] **Step 4: schema·provenance·freshness를 runner에서 계산한다**

Beta target freshness 정책은 다음으로 고정한다.

| Target | 허용 status | 최대 age |
|---|---|---:|
| KIS quote | `real_time`, `delayed` | 20분 |
| KIS OHLCV | `delayed`, `eod` | 48시간 |
| Finnhub quote | `real_time`, `delayed` | 20분 |
| OpenDART filings | `eod` | 24시간 |
| OpenDART financials | `eod` | 24시간 |

KIS/Finnhub quote acceptance는 해당 시장 정규장 또는 사전 승인된 delayed-data 검증 창에서 실행한다. 주말·휴장일에는 live quote PASS를 만들지 말고 `insufficient_data` 성격의 실패 증거로 남긴다.

- [ ] **Step 5: runner와 route 테스트를 통과시킨다**

Run:

```bash
npx vitest run \
  src/server/ops/provider-real-data-smoke-runner.test.ts \
  src/app/api/market/quote/route.test.ts \
  src/app/api/market/ohlcv/route.test.ts
```

Expected: PASS. target Provider가 아닌 fallback 응답은 PASS 불가.

- [ ] **Step 6: 독립 커밋한다**

```bash
git add src/server/ops/provider-real-data-smoke-runner.ts \
  src/server/ops/provider-real-data-smoke-runner.test.ts \
  src/app/api/market/quote/route.test.ts \
  src/app/api/market/ohlcv/route.test.ts
git commit -m "fix(ops): pin smoke probes to target providers"
```

---

### Task 5: Acceptance evaluator를 완전한 fail-closed gate로 강화

**Files:**
- Modify: `src/server/ops/beta-acceptance.ts`
- Modify: `src/server/ops/beta-acceptance.test.ts`
- Modify: `scripts/ops/run-beta-acceptance.ts`

- [ ] **Step 1: 남은 거짓 PASS fixture를 추가한다**

다음 각 fixture는 독립 테스트로 `exitCode:1`을 검증한다.

```ts
it.each([
  ["schema invalid", { schemaValid: false }],
  ["provenance invalid", { provenanceValid: false }],
  ["freshness invalid", { freshnessValid: false }],
  ["missing updatedAt", { updatedAt: null, freshnessValid: false }],
])("fails closed when %s", (_name, patch) => {
  const report = makeCompletePassingReport();
  Object.assign(report.smokeResults[0], patch);
  expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
});
```

optional Provider 실패 정책도 고정한다. `canRunSmoke=true`인 Provider의 attempted smoke가 실패했다면 Beta 전체를 실패시킨다.

```ts
it("fails when an attempted configured provider smoke fails", () => {
  const report = makeCompletePassingReport();
  report.smokeResults.push({
    providerId: "fmp_free",
    capability: "quote",
    symbol: "AAPL",
    region: "US",
    attempted: true,
    skippedReason: null,
    envelopeStatus: "error",
    dataAvailable: false,
    source: "FMP Free",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: null,
    message: "provider request failed",
    passed: false,
    schemaValid: false,
    schemaIssues: ["value is null"],
    provenanceValid: true,
    freshnessValid: false,
    ageMs: null,
    checkedAt: "2026-08-01T00:00:00.000Z",
  });
  report.failureCount = 1;
  expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
});
```

- [ ] **Step 2: 기존 evaluator에서 테스트가 실패하는지 확인한다**

Run:

```bash
npx vitest run src/server/ops/beta-acceptance.test.ts
```

Expected: schema, provenance, freshness, extra attempted failure fixture가 FAIL.

- [ ] **Step 3: violation reason과 전칭 조건을 추가한다**

`AcceptanceViolation.reason`에 다음 값을 추가한다.

```ts
| "schema_invalid"
| "provenance_invalid"
| "freshness_invalid"
| "attempted_smoke_failed";
```

`BetaAcceptanceTarget`에서 substring 계약을 제거하고 exact provenance와 freshness 정책을 명시한다.

```ts
export type BetaAcceptanceTarget = {
  readonly providerId: RuntimeProviderId;
  readonly capability: ProviderRealDataSmokeCapability;
  readonly symbol: string;
  readonly expectedSource: string;
  readonly expectedSourceTier: SourceUsagePolicy;
  readonly allowedStatuses: readonly DataStatus[];
  readonly maxAgeMs: number;
};

export const REQUIRED_BETA_TARGETS: readonly BetaAcceptanceTarget[] = [
  { providerId: "kis", capability: "quote", symbol: "005930", expectedSource: "KIS Open API", expectedSourceTier: "official", allowedStatuses: ["real_time", "delayed"], maxAgeMs: 20 * 60_000 },
  { providerId: "kis", capability: "ohlcv", symbol: "005930", expectedSource: "KIS Open API", expectedSourceTier: "official", allowedStatuses: ["delayed", "eod"], maxAgeMs: 48 * 60 * 60_000 },
  { providerId: "opendart", capability: "filings", symbol: "005930", expectedSource: "OpenDART", expectedSourceTier: "official", allowedStatuses: ["eod"], maxAgeMs: 24 * 60 * 60_000 },
  { providerId: "opendart", capability: "financials", symbol: "005930", expectedSource: "OpenDART", expectedSourceTier: "official", allowedStatuses: ["eod"], maxAgeMs: 24 * 60 * 60_000 },
  { providerId: "finnhub_free", capability: "quote", symbol: "AAPL", expectedSource: "Finnhub Free", expectedSourceTier: "free_limited", allowedStatuses: ["real_time", "delayed"], maxAgeMs: 20 * 60_000 },
] as const;
```

필수 target은 아래 순서로 검증한다.

```ts
function addViolation(
  target: BetaAcceptanceTarget,
  reason: AcceptanceViolation["reason"],
  detail: string,
) {
  violations.push({ target, reason, detail });
}

if (!match.schemaValid) {
  addViolation(target, "schema_invalid", match.schemaIssues.join("; "));
  continue;
}
if (!match.provenanceValid) {
  addViolation(target, "provenance_invalid", "canonical source or tier mismatch");
  continue;
}
if (!match.freshnessValid) {
  addViolation(target, "freshness_invalid", `updatedAt=${match.updatedAt}`);
  continue;
}
```

모든 target 검증 뒤 실행된 smoke 실패를 검사한다.

```ts
const attemptedFailures = report.smokeResults.filter((result) => result.attempted && !result.passed);
if (attemptedFailures.length > 0 && violations.length === 0) {
  const failed = attemptedFailures[0];
  const matchingTarget = targets.find(
    (target) =>
      target.providerId === failed.providerId &&
      target.capability === failed.capability &&
      target.symbol === failed.symbol,
  ) ?? {
    providerId: failed.providerId,
    capability: failed.capability,
    symbol: failed.symbol ?? "unknown",
    expectedSource: failed.source ?? "unknown",
    expectedSourceTier: failed.sourceTier ?? "manual_import",
    allowedStatuses: [],
    maxAgeMs: 0,
  };
  violations.push({
    target: matchingTarget,
    reason: "attempted_smoke_failed",
    detail: failed.message ?? "attempted smoke failed",
  });
}
```

CLI는 `failureCount`, verified target 수, schema/provenance/freshness 결과를 출력하고 하나라도 실패하면 exit 1을 유지한다.

- [ ] **Step 4: Acceptance 테스트를 통과시킨다**

Run:

```bash
npx vitest run \
  src/server/ops/provider-smoke-contracts.test.ts \
  src/server/ops/provider-real-data-smoke-runner.test.ts \
  src/server/ops/beta-acceptance.test.ts
```

Expected: PASS. 거짓 PASS fixture 전부 exit 1, 완전한 증거 fixture만 exit 0.

- [ ] **Step 5: 독립 커밋한다**

```bash
git add src/server/ops/beta-acceptance.ts \
  src/server/ops/beta-acceptance.test.ts \
  scripts/ops/run-beta-acceptance.ts
git commit -m "fix(ops): require typed fresh evidence for beta acceptance"
```

---

### Task 6: 안전한 전체 검증과 증거 기록

**Files:**
- Create: `docs/release/REAL_DATA_BETA_EVIDENCE.md` only after a real live run
- Modify: `docs/superpowers/plans/2026-08-01-real-data-beta-corrective-work-orders.md`

- [ ] **Step 1: production store 해시를 기록한다**

```bash
shasum -a 256 data/settings/provider-settings.json data/secrets/provider-secrets.json
```

Expected: 두 해시를 터미널 증거에 보존.

- [ ] **Step 2: 정적·fixture 검증을 실행한다**

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected:

- install exit 0
- typecheck exit 0
- lint errors 0; warning 수는 기록하며 WO-11 완료 전에는 warning 0으로 주장하지 않음
- 전체 test exit 0
- build exit 0

- [ ] **Step 3: store 불변성을 확인한다**

```bash
shasum -a 256 data/settings/provider-settings.json data/secrets/provider-secrets.json
git status --short
```

Expected: Step 1과 해시가 동일. `data/settings`와 `data/secrets`에 새 변경 없음.

- [ ] **Step 4: no-provider와 server-unreachable failure를 확인한다**

```bash
npm run acceptance:beta -- --base-url=http://127.0.0.1:9
```

Expected: exit 1. 절대로 `[PASS]`를 출력하지 않음.

- [ ] **Step 5: 실제 Provider 검증은 명시적 조건에서만 실행한다**

필수 환경:

```text
KIS_ENABLED=true
KIS_APP_KEY=<real credential in approved secret store>
KIS_APP_SECRET=<real credential in approved secret store>
KIS_IS_PAPER=true
OPENDART_ENABLED=true
OPENDART_API_KEY=<real credential in approved secret store>
FINNHUB_ENABLED=true
FINNHUB_API_KEY=<real credential in approved secret store>
INTERNAL_SMOKE_KEY=<server and CLI shared random secret>
INTERNAL_APP_ORIGIN=http://127.0.0.1:3000
```

Run:

```bash
npm run dev
npm run acceptance:beta -- --base-url=http://127.0.0.1:3000
```

Expected: 다섯 필수 target 모두 `attempted=true`, `schemaValid=true`, `provenanceValid=true`, `freshnessValid=true`. 실제 실행 전에는 이 PASS를 문서에 미리 기입하지 않는다.

- [ ] **Step 6: 기존 작업지시서 상태를 사실대로 갱신한다**

기존 WO-10 체크박스는 다음 기준으로만 표시한다.

- Step 1~3, 5~6: 위 fixture와 구현이 실제 커밋됐을 때 체크
- Step 4 PIT 및 전략 Acceptance: WO-09 완료 전 계속 미체크
- 최종 GO/NO-GO: live smoke와 브라우저 QA 전 계속 NO-GO

- [ ] **Step 7: 문서만 독립 커밋한다**

```bash
git add docs/superpowers/plans/2026-08-01-real-data-beta-corrective-work-orders.md
git commit -m "docs: record verified beta acceptance status"
```

실제 live run이 성공한 경우에만 `docs/release/REAL_DATA_BETA_EVIDENCE.md`를 같은 커밋에 포함한다.

---

## 중단 조건

다음 중 하나라도 발생하면 다음 Task로 넘어가지 않는다.

- pure evaluator가 production checker에서 import되지 않음
- `hasValue=false`가 `healthy` 또는 Acceptance PASS가 됨
- attacker origin 또는 substring source가 통과함
- smoke key가 임의 외부 `baseUrl`로 전송될 수 있음
- schema-invalid payload 또는 `updatedAt=null`이 PASS함
- 테스트가 실제 settings/secret 파일 해시를 변경함
- no-provider, partial-provider, server-unreachable 실행이 exit 0임
- live Provider 미실행 결과를 실제 연결 성공으로 문서화함

## 최종 판정표

| 항목 | 이 문서 완료 후 가능한 판정 |
|---|---|
| Health 진단 판정/연결 | PASS 가능 |
| Provider 고정 smoke | PASS 가능 |
| Typed/fresh Acceptance | PASS 가능 |
| PIT·전략 evidence | WO-09 완료 전 NO-GO |
| 관리자 인증·CSRF·secret manager | 별도 WO-02/02A 완료 전 NO-GO |
| Real Data Beta 전체 | 실제 live smoke·브라우저 QA 전 NO-GO |
