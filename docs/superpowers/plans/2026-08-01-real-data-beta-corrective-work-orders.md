# Real Data Beta Corrective Work Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** K-Terminal을 API 키 저장 여부만 보여주는 Pre-Beta 상태에서, 실제 KR/US 데이터 경로와 의사결정 무결성을 검증할 수 있는 Real Data Beta 상태로 복구한다.

**Architecture:** 네 개의 독립 트랙으로 진행한다. Track A는 KIS 설정과 운영 엔드포인트 보안을, Track B는 DataEnvelope와 UI 소비 계약을, Track C는 재무·공시·PIT·전략 fail-closed 경로를, Track D는 실제 Provider acceptance와 릴리스 증거를 담당한다. 각 트랙은 자체 테스트를 통과해야 하며 마지막 통합 게이트는 live provider가 없으면 실패해야 한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Zod, Node.js filesystem APIs, KIS Open API, OpenDART, Finnhub, SEC EDGAR.

---

## 0. 현재 판정과 작업 원칙

현재 판정은 **NO-GO**다. 다음 상태를 완료 증거로 인정하지 않는다.

- API Key가 저장되었다는 `configured` 상태
- Provider가 하나도 없는데 exit code 0을 반환하는 acceptance
- `0 errors`지만 warning이 남아 있는 lint
- runtime schema를 검사하지 않는 정규식 기반 DataEnvelope 검사
- fixture 테스트만 통과하고 실제 provider·브라우저 경로를 실행하지 않은 상태
- PIT 파일을 저장하지만 research fact, predicate, strategy에 연결하지 않은 상태

이 작업지시서의 범위에는 실거래, 주문 전송, 모의 주문 및 paper trading이 포함되지 않는다.

### 우선순위와 의존성

| 순서 | 작업 | 심각도 | 선행 조건 | 독립 완료 기준 |
|---|---|---:|---|---|
| 1 | WO-01 KIS 설정 계약 | P0 | 없음 | 설정 조합 테스트 통과 |
| 2 | WO-02 Provider 운영 보안 | P0 | WO-01 타입 | 무인증 호출과 SSRF 차단 |
| 2A | WO-02A Secret 저장소 보안 | P1 | WO-01 타입 | plaintext secret과 과도한 파일 권한 제거 |
| 3 | WO-03 DataEnvelope 런타임 계약 | P0 | 없음 | 모든 금융 route contract 테스트 통과 |
| 4 | WO-04 Market Board 계약 복구 | P0 | WO-03 | snapshot UI 통합 테스트 통과 |
| 5 | WO-05 공시·재무 UI 경로 복구 | P0 | WO-03 | KR/US route/component 계약 통과 |
| 6 | WO-06 클라이언트 데이터 계층 | P1 | WO-03~05 | 중복 호출·이전 종목 잔상 제거 |
| 7 | WO-07 Provider capability 진실성 | P1 | WO-03 | stub provider가 enabled/capable로 노출되지 않음 |
| 8 | WO-08 OpenDART 재무 정확성 | P1 | WO-03 | strict 금액·수정공시 fixture 통과 |
| 9 | WO-09 PIT·전략 fail-closed | P0 | WO-03, WO-08 | PIT 없는 전략은 insufficient_data |
| 10 | WO-10 Acceptance 재작성 | P0 | WO-01~09 | live target 누락 시 반드시 실패 |
| 11 | WO-11 품질·문서 릴리스 게이트 | P1 | WO-10 | 경고 0, 전체 검증 및 증거 기록 |

---

## Track A — Provider 설정과 운영 보안

### WO-01: KIS 설정 계약을 하나로 통합

**문제:** 현재 UI의 `설정됨`은 키 존재만 의미하며 연결 성공과 동일하게 표시된다. 모의투자 URL 기본값에는 `:29443`이 없고, 사용자 저장 URL이 `kisConfig`의 올바른 fallback을 덮어쓴다. 계좌번호는 시세 인증에 사용되지 않지만 필수 필드다.

**Files:**
- Create: `src/domain/settings/kis-runtime-config.ts`
- Create: `src/domain/settings/kis-runtime-config.test.ts`
- Modify: `src/domain/settings/provider-setting-definition.ts`
- Modify: `src/domain/settings/provider-setting-snapshot.ts`
- Modify: `src/server/providers/kis/kis-config.ts`
- Modify: `src/server/settings/provider-config-resolver.ts`
- Modify: `src/components/settings/ProviderSettingCard.tsx`
- Test: `src/server/providers/kis/kis-config.test.ts`
- Test: `src/components/settings/ProviderSettingCard.test.tsx`

- [ ] **Step 1: 실패하는 KIS 설정 매트릭스 테스트 작성**

```ts
import { describe, expect, it } from "vitest";
import { resolveKisRuntimeConfig } from "./kis-runtime-config";

describe("resolveKisRuntimeConfig", () => {
  it.each([
    [true, "https://openapivts.koreainvestment.com:29443"],
    [false, "https://openapi.koreainvestment.com:9443"],
  ])("maps paper=%s to the canonical endpoint", (isPaper, expected) => {
    expect(resolveKisRuntimeConfig({
      enabled: true,
      appKey: "valid-app-key",
      appSecret: "valid-app-secret",
      isPaper,
    }).baseUrl).toBe(expected);
  });

  it("does not require account data for quote-only readiness", () => {
    const result = resolveKisRuntimeConfig({
      enabled: true,
      appKey: "valid-app-key",
      appSecret: "valid-app-secret",
      isPaper: true,
    });
    expect(result.quoteReady).toBe(true);
    expect(result.accountReady).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 기존 구현에서 실패하는지 확인**

Run: `npx vitest run src/domain/settings/kis-runtime-config.test.ts`

Expected: FAIL because `resolveKisRuntimeConfig` does not exist.

- [ ] **Step 3: canonical KIS 런타임 타입과 resolver 구현**

```ts
export type KisRuntimeConfigInput = {
  enabled: boolean;
  appKey: string | null;
  appSecret: string | null;
  isPaper: boolean;
  accountNo?: string | null;
  accountProductCode?: string | null;
};

export type KisRuntimeConfig = {
  enabled: boolean;
  appKey: string;
  appSecret: string;
  isPaper: boolean;
  baseUrl: string;
  quoteReady: boolean;
  accountReady: boolean;
};

export function resolveKisRuntimeConfig(input: KisRuntimeConfigInput): KisRuntimeConfig {
  const appKey = input.appKey?.trim() ?? "";
  const appSecret = input.appSecret?.trim() ?? "";
  const accountNo = input.accountNo?.trim() ?? "";
  const accountProductCode = input.accountProductCode?.trim() ?? "";
  return {
    enabled: input.enabled,
    appKey,
    appSecret,
    isPaper: input.isPaper,
    baseUrl: input.isPaper
      ? "https://openapivts.koreainvestment.com:29443"
      : "https://openapi.koreainvestment.com:9443",
    quoteReady: input.enabled && appKey.length >= 5 && appSecret.length >= 5,
    accountReady: /^\d{8}$/.test(accountNo) && /^\d{2}$/.test(accountProductCode),
  };
}
```

- [ ] **Step 4: UI 필드와 상태 모델 정리**

`KIS_BASE_URL` 직접 입력 필드를 제거하고 `KIS_IS_PAPER`에서 endpoint를 파생한다. `KIS_ACCOUNT_NO`와 `KIS_ACCOUNT_PRODUCT_CODE`는 quote-only Beta에서 `required: false`로 바꾼다.

```ts
export type ProviderConfigurationState = "missing" | "saved";

export type ProviderConnectionState =
  | "untested"
  | "testing"
  | "healthy"
  | "disabled"
  | "credentials_missing"
  | "credentials_invalid"
  | "endpoint_mismatch"
  | "token_failed"
  | "rate_limited"
  | "provider_error";

export type ProviderSettingSnapshot = {
  providerId: ProviderId;
  enabled: boolean;
  values: Record<string, string | number | boolean | MaskedSecretValue | null>;
  configurationState: ProviderConfigurationState;
  connectionState: ProviderConnectionState;
  lastCheckedAt: string | null;
  message: string | null;
};
```

UI에는 `저장 상태`와 `연결 상태`를 별도 행으로 표시한다. 저장 직후 연결 상태는 `untested`이며 자동으로 `healthy`가 되면 안 된다.

- [ ] **Step 5: 설정 resolver와 KIS client를 새 타입으로 연결**

`kisConfig.baseUrl`, `kisConfig.isConfigured`, `providerRegistry.isEnabled("kis")`가 모두 같은 `resolveKisRuntimeConfig` 결과를 사용하게 한다. `KIS_APP_TYPE`과 자유 입력 `KIS_BASE_URL` 분기를 제거한다.

- [ ] **Step 6: 단위 및 컴포넌트 테스트 실행**

Run: `npx vitest run src/domain/settings/kis-runtime-config.test.ts src/server/providers/kis/kis-config.test.ts src/components/settings/ProviderSettingCard.test.tsx`

Expected: PASS; 모의/실전 endpoint, quote/account readiness, 저장됨/연결됨 표시가 모두 검증됨.

- [ ] **Step 7: 커밋**

```bash
git add src/domain/settings/kis-runtime-config.ts src/domain/settings/kis-runtime-config.test.ts src/domain/settings/provider-setting-definition.ts src/domain/settings/provider-setting-snapshot.ts src/server/providers/kis/kis-config.ts src/server/settings/provider-config-resolver.ts src/components/settings/ProviderSettingCard.tsx src/server/providers/kis/kis-config.test.ts src/components/settings/ProviderSettingCard.test.tsx
git commit -m "fix: unify KIS runtime configuration"
```

### WO-02: Provider health와 smoke 엔드포인트 보안 및 진단 개선

**문제:** health-check는 실제 KIS/Finnhub quota를 소비하지만 인증이 없다. provider smoke는 임의 `baseUrl`을 받아 SSRF가 가능하고, real-provider smoke는 요청 origin으로 내부 smoke key를 외부에 전달할 수 있다.

**Files:**
- Create: `src/server/security/internal-operation-guard.ts`
- Create: `src/server/security/trusted-service-origin.ts`
- Create: `src/server/security/internal-operation-guard.test.ts`
- Modify: `src/app/api/settings/providers/[providerId]/health-check/route.ts`
- Modify: `src/app/api/ops/provider-readiness/smoke/route.ts`
- Modify: `src/app/api/ops/real-provider-smoke/run/route.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Modify: `src/server/settings/provider-health-checker.ts`
- Test: corresponding route tests

- [ ] **Step 1: 무인증·임의 origin 실패 테스트 작성**

```ts
it("rejects health check without internal authorization", async () => {
  const response = await POST(new NextRequest("http://localhost/api/settings/providers/kis/health-check", {
    method: "POST",
  }), { params: Promise.resolve({ providerId: "kis" }) });
  expect(response.status).toBe(401);
});

it("rejects a caller supplied smoke baseUrl", async () => {
  const response = await POST(new NextRequest("http://localhost/api/ops/provider-readiness/smoke", {
    method: "POST",
    body: JSON.stringify({ baseUrl: "http://169.254.169.254" }),
  }));
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: 내부 작업 guard 구현**

```ts
import crypto from "node:crypto";
import { NextRequest } from "next/server";

export function isAuthorizedInternalOperation(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_OPERATION_KEY ?? "";
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
```

401 응답도 `DataEnvelope<null>`로 반환하고 secret 값을 message에 포함하지 않는다.

- [ ] **Step 3: trusted origin을 서버 설정으로 고정**

```ts
export function getTrustedServiceOrigin(): string {
  const raw = process.env.INTERNAL_SERVICE_ORIGIN ?? "http://127.0.0.1:3000";
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INTERNAL_SERVICE_ORIGIN must use http or https");
  }
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("INTERNAL_SERVICE_ORIGIN must be loopback");
  }
  return url.origin;
}
```

request body의 `baseUrl`과 `request.nextUrl.origin`을 smoke 목적지로 사용하지 않는다. 가능하면 HTTP self-call을 제거하고 service를 직접 호출한다.

- [ ] **Step 4: health 진단 단계 분리**

`checkProviderHealth("kis")`는 config presence → endpoint → token → quote 순서로 실행하고 WO-01의 `ProviderConnectionState`를 반환한다. 401/403은 `credentials_invalid`, 429는 `rate_limited`, DNS/TLS는 `provider_error`, canonical endpoint 불일치는 `endpoint_mismatch`로 매핑한다.

- [ ] **Step 5: quota 보호 추가**

Provider별 30초 캐시와 in-flight Promise map을 추가해 동일 Provider 동시 요청을 한 번만 실행한다. route에는 사용자/IP 기준 rate limit도 적용한다.

- [ ] **Step 6: 보안 테스트 실행**

Run: `npx vitest run src/server/security/internal-operation-guard.test.ts src/app/api/settings/providers/'[providerId]'/health-check/route.test.ts src/app/api/ops/provider-readiness/smoke/route.test.ts src/app/api/ops/real-provider-smoke/run/route.test.ts`

Expected: 모든 무인증 호출, 사설 IP baseUrl, 공격자 Host가 거부되고 authorized loopback만 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/server/security src/app/api/settings/providers src/app/api/ops src/server/ops src/server/settings/provider-health-checker.ts
git commit -m "fix: secure provider health and smoke operations"
```

### WO-02A: Secret 저장소를 실제 보안 설명과 일치

**문제:** 설정 UI는 API Key가 암호화·격리 보존된다고 설명하지만 현재 `provider-secrets.json`은 평문 JSON이다. 기존 파일 권한이 넓으면 `mode: 0600`을 write 옵션에 넣어도 교정되지 않고, fallback write는 기본 umask 권한으로 생성될 수 있다. 계좌번호도 일반 설정값으로 저장되어 브라우저 응답과 파일에서 평문이 될 수 있다.

**Files:**
- Create: `src/server/settings/provider-secret-store.interface.ts`
- Create: `src/server/settings/encrypted-file-secret-store.ts`
- Create: `src/server/settings/encrypted-file-secret-store.test.ts`
- Modify: `src/server/settings/provider-secret-store.ts`
- Modify: `src/server/settings/provider-settings-store.ts`
- Modify: `src/domain/settings/provider-setting-definition.ts`
- Modify: `src/components/settings/ProviderApiSettingsPanel.tsx`

- [ ] **Step 1: 평문·권한·symlink 실패 테스트 작성**

```ts
it("never persists a secret as plaintext", async () => {
  await store.set("kis", "KIS_APP_KEY", "secret-value-123");
  const bytes = await fs.readFile(storePath);
  expect(bytes.includes(Buffer.from("secret-value-123"))).toBe(false);
});

it("forces owner-only permissions after every write", async () => {
  await fs.chmod(storePath, 0o644);
  await store.set("kis", "KIS_APP_SECRET", "secret-value-456");
  expect((await fs.stat(storePath)).mode & 0o777).toBe(0o600);
});

it("rejects a symlink secret path", async () => {
  await fs.symlink(outsidePath, storePath);
  await expect(store.set("kis", "KIS_APP_KEY", "secret")).rejects.toThrow("symlink");
});
```

- [ ] **Step 2: secret store interface와 암호화 저장 구현**

```ts
export interface ProviderSecretStore {
  get(providerId: ProviderId, key: string): Promise<string | null>;
  set(providerId: ProviderId, key: string, value: string): Promise<void>;
  delete(providerId: ProviderId, key: string): Promise<void>;
  getMasked(providerId: ProviderId, key: string): Promise<MaskedSecretValue>;
}
```

AES-256-GCM을 사용할 경우 암호문마다 random 96-bit IV와 authentication tag를 저장한다. master key는 repository나 같은 JSON 파일에 저장하지 않고 `KTERMINAL_SECRET_MASTER_KEY`에서만 읽는다. production에서 master key가 없으면 설정 쓰기를 fail-closed한다. macOS 전용 배포에서는 동일 interface 뒤에 Keychain adapter를 둘 수 있다.

- [ ] **Step 3: atomic write와 권한 강제**

temp file을 `wx`, mode `0600`으로 생성하고 fsync 후 rename한다. final file에 매 write 후 `chmod(0o600)`을 실행한다. `lstat`으로 symlink를 거부하고 update를 mutex/single-flight로 직렬화한다.

- [ ] **Step 4: 계좌정보를 secret 취급**

`KIS_ACCOUNT_NO`를 secret field로 옮기고 API snapshot에는 `MaskedSecretValue`만 반환한다. 상품코드는 민감도가 낮지만 계좌번호와 결합된 raw record가 browser에 반환되지 않게 한다.

- [ ] **Step 5: UI 설명을 실제 저장 방식과 일치**

암호화 store가 활성화된 경우에만 “암호화 보존”이라고 표시한다. local permission-only fallback을 허용한다면 이를 “로컬 전용 파일, 소유자 권한 제한”으로 정확히 표시하고 production에서는 fallback을 금지한다.

- [ ] **Step 6: 테스트와 커밋**

Run: `npx vitest run src/server/settings/encrypted-file-secret-store.test.ts src/server/settings/provider-secret-store.test.ts src/server/settings/provider-settings-store.test.ts src/components/settings/ProviderApiSettingsPanel.test.tsx`

```bash
git add src/server/settings src/domain/settings/provider-setting-definition.ts src/components/settings/ProviderApiSettingsPanel.tsx
git commit -m "fix: secure provider secret persistence"
```

---

## Track B — API와 UI 데이터 계약

### WO-03: DataEnvelope를 런타임 계약으로 강제

**문제:** `scripts/check-data-envelope-routes.mjs`의 `REQUIRED_ENVELOPE_FIELDS`는 사용되지 않는다. `createSafeEnvelopeResponse`도 redaction만 하며 schema와 status/value 불변식을 검증하지 않는다.

**Files:**
- Create: `src/domain/common/data-envelope.schema.ts`
- Create: `src/domain/common/data-envelope.schema.test.ts`
- Modify: `src/server/security/data-envelope-response.ts`
- Replace: `scripts/check-data-envelope-routes.mjs`
- Test: `src/server/security/data-envelope-response.test.ts`

- [ ] **Step 1: envelope 불변식 실패 테스트 작성**

```ts
it.each([
  [{ status: "real_time", value: null }, "available status requires value"],
  [{ status: "api_required", value: { price: 1 } }, "unavailable status forbids value"],
  [{ status: "real_time", value: { price: 1 }, updatedAt: null }, "available status requires updatedAt"],
])("rejects invalid envelope %j", (partial) => {
  expect(() => parseDataEnvelope({
    source: "test",
    sourceTier: "official",
    warnings: [],
    updatedAt: new Date().toISOString(),
    ...partial,
  })).toThrow();
});
```

- [ ] **Step 2: Zod envelope schema 구현**

```ts
import { z } from "zod";

const available = new Set(["real_time", "delayed", "eod", "cached", "stale"]);

export const DataEnvelopeSchema = z.object({
  value: z.unknown().nullable(),
  status: z.enum(["real_time", "delayed", "eod", "cached", "stale", "api_required", "rate_limited", "not_supported", "not_found", "error", "insufficient_data", "plan_restricted"]),
  source: z.string().min(1),
  sourceTier: z.enum(["official", "free_limited", "licensed_free", "personal_fallback", "manual_import"]),
  warnings: z.array(z.enum(["none", "unofficial", "personal_use_only", "license_review_required", "commercial_use_not_allowed", "manual_import_required", "plan_restricted"])),
  updatedAt: z.string().datetime().nullable(),
  delayMinutes: z.number().nonnegative().optional(),
  errorCode: z.string().optional(),
  message: z.string().optional(),
}).superRefine((envelope, ctx) => {
  if (available.has(envelope.status) && envelope.value === null) {
    ctx.addIssue({ code: "custom", message: "available status requires value" });
  }
  if (available.has(envelope.status) && envelope.updatedAt === null) {
    ctx.addIssue({ code: "custom", message: "available status requires updatedAt" });
  }
});
```

- [ ] **Step 3: response boundary에 schema 적용**

개발·테스트에서는 malformed envelope를 throw하고, production에서는 안전한 `status:error`, `value:null` envelope와 HTTP 500으로 변환한다. 원래 payload는 응답과 로그에 출력하지 않는다.

- [ ] **Step 4: route checker를 실행 기반 contract test로 교체**

정규식으로 source를 스캔하지 않는다. 금융 route fixture 목록을 가져와 각 handler 결과 JSON을 `DataEnvelopeSchema.safeParse`로 검증한다. market, filing, financial, news, factor, strategy, portfolio route가 목록에 없으면 검사 자체가 실패해야 한다.

- [ ] **Step 5: 테스트 실행 및 커밋**

Run: `npx vitest run src/domain/common/data-envelope.schema.test.ts src/server/security/data-envelope-response.test.ts`

Expected: malformed success/null과 필수 필드 누락이 모두 FAIL.

```bash
git add src/domain/common/data-envelope.schema.ts src/domain/common/data-envelope.schema.test.ts src/server/security/data-envelope-response.ts src/server/security/data-envelope-response.test.ts scripts/check-data-envelope-routes.mjs
git commit -m "fix: enforce DataEnvelope at runtime boundaries"
```

### WO-04: Market Board route/client 계약과 refresh job 복구

**문제:** API가 `DataEnvelope<MarketBoardSnapshot>`으로 변경됐지만 UI는 응답 전체를 snapshot으로 저장해 `snapshot.tiles`에서 깨진다. GET `refresh=true`는 인증 없이 KIS 전체 snapshot job을 실행한다. 혼합 tile 중 하나만 real-time이어도 전체 envelope를 real-time으로 승격한다.

**Files:**
- Create: `src/client/market-board/market-board-client.ts`
- Create: `src/client/market-board/market-board-client.test.ts`
- Modify: `src/components/market-board/MarketBoardPage.tsx`
- Modify: `src/app/api/markets/snapshot/route.ts`
- Create: `src/app/api/markets/snapshot/refresh/route.ts`
- Test: both routes and `MarketBoardPage`

- [ ] **Step 1: 현재 crash를 재현하는 통합 테스트 작성**

```tsx
it("unwraps the snapshot envelope before rendering tiles", async () => {
  server.use(http.get("/api/markets/snapshot", () => HttpResponse.json({
    value: makeSnapshot([{ symbol: "005930", price: 70000 }]),
    status: "eod",
    source: "market-board-snapshot-store",
    sourceTier: "official",
    warnings: [],
    updatedAt: "2026-08-01T00:00:00.000Z",
  })));
  render(<MarketBoardPage />);
  expect(await screen.findByText("005930")).toBeInTheDocument();
});
```

- [ ] **Step 2: client parser 구현**

```ts
export async function fetchMarketBoardSnapshot(universeId: string): Promise<DataEnvelope<MarketBoardSnapshot>> {
  const response = await fetch(`/api/markets/snapshot?universeId=${encodeURIComponent(universeId)}`);
  const raw = await response.json();
  return parseTypedEnvelope(MarketBoardSnapshotSchema, raw);
}
```

UI는 usable envelope의 `value`만 snapshot state에 저장한다. unavailable 상태는 이전 universe snapshot이 아니라 명시적 empty/unavailable view로 표시한다.

- [ ] **Step 3: GET에서 refresh 제거 및 protected POST 생성**

GET은 read-only로 유지한다. `/api/markets/snapshot/refresh` POST에 WO-02 internal guard, rate limit, single-flight lock을 적용한다.

- [ ] **Step 4: snapshot 상태를 보수적으로 집계**

모든 값이 동일 freshness일 때만 해당 상태를 반환한다. mixed source/freshness는 `cached`와 coverage warning을 반환하고 각 tile provenance를 유지한다.

- [ ] **Step 5: 테스트와 커밋**

Run: `npx vitest run src/client/market-board/market-board-client.test.ts src/components/market-board/MarketBoardPage.test.tsx src/app/api/markets/snapshot/route.test.ts src/app/api/markets/snapshot/refresh/route.test.ts`

```bash
git add src/client/market-board src/components/market-board/MarketBoardPage.tsx src/app/api/markets/snapshot
git commit -m "fix: restore market board envelope contract"
```

### WO-05: 공시·재무 canonical route 복구

**문제:** filings hook은 `symbol`과 `provider`를 보내지만 OpenDART route는 `stockCode`/`corpCode`를 받는다. 응답도 `Filing[]`가 아니며, 미국 종목도 OpenDART route를 호출한다.

**Files:**
- Create: `src/app/api/filings/asset/route.ts`
- Create: `src/app/api/filings/asset/route.test.ts`
- Create: `src/domain/filing/filing.schema.ts`
- Modify: `src/client/filings/use-asset-filings.ts`
- Modify: `src/components/asset/AssetFilings.tsx`
- Modify: `src/server/services/filing-data-service.ts`
- Modify: `src/server/providers/sec-edgar-provider.ts`

- [ ] **Step 1: KR/US route contract 테스트 작성**

```ts
it.each([
  ["005930", "KR", "opendart"],
  ["AAPL", "US", "sec edgar"],
])("routes %s/%s to %s", async (symbol, region, source) => {
  const response = await GET(new NextRequest(`http://localhost/api/filings/asset?symbol=${symbol}&region=${region}`));
  const body = await response.json();
  expect(DataEnvelopeSchema.parse(body).source.toLowerCase()).toContain(source);
});
```

- [ ] **Step 2: canonical query schema 구현**

```ts
const AssetFilingsQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  region: z.enum(["KR", "US"]),
});
```

route는 `filingDataService.getFilings({ symbol, region })`만 호출한다. client는 provider를 선택하거나 OpenDART 전용 파라미터를 만들지 않는다.

- [ ] **Step 3: SEC EDGAR를 실제로 지원하거나 capability를 제거**

Beta 범위에서 US filings가 필수이면 SEC submissions JSON을 `Filing[]`로 normalize한다. 구현하지 못하면 `sec_edgar`의 filings capability와 enabled 상태를 제거하고 US acceptance를 실패시킨다. `not_supported` stub를 완료로 간주하지 않는다.

- [ ] **Step 4: typed envelope를 UI에서 소비**

`FilingSchema.array()`로 value를 검증하고, `api_required`, `not_supported`, `not_found`, `error`를 서로 다른 문구로 렌더링한다.

- [ ] **Step 5: 테스트와 커밋**

Run: `npx vitest run src/app/api/filings/asset/route.test.ts src/client/filings/use-asset-filings.test.tsx src/components/asset/AssetFilings.test.tsx src/server/providers/sec-edgar-provider.test.ts`

```bash
git add src/app/api/filings/asset src/domain/filing src/client/filings src/components/asset/AssetFilings.tsx src/server/services/filing-data-service.ts src/server/providers/sec-edgar-provider.ts
git commit -m "fix: add canonical asset filings contract"
```

### WO-06: 클라이언트 요청 중복과 이전 종목 잔상 제거

**문제:** AssetOverview와 AssetChart가 각각 `useAssetMarketData`를 호출해 quote/OHLCV를 중복 요청한다. 종목 변경 시 financial/filing state를 초기화하지 않고 5xx와 network 오류를 삼켜 이전 종목 값이 새 종목 아래 남을 수 있다.

**Files:**
- Create: `src/client/query/query-client-provider.tsx`
- Modify: `src/client/market-data/use-asset-market-data.ts`
- Modify: `src/client/financials/use-asset-financials.ts`
- Modify: `src/client/filings/use-asset-filings.ts`
- Modify: `src/components/shell/TerminalShell.tsx`
- Modify: asset components to receive envelopes via props
- Test: all three hooks and TerminalShell

- [ ] **Step 1: 중복 호출과 stale flash 실패 테스트 작성**

```tsx
it("issues one quote and one OHLCV request per selected asset", async () => {
  render(<TerminalShell />);
  await selectAsset("KR:005930");
  expect(fetchSpy.mock.calls.filter(([url]) => String(url).includes("/quote")).length).toBe(1);
  expect(fetchSpy.mock.calls.filter(([url]) => String(url).includes("/ohlcv")).length).toBe(1);
});

it("never renders the previous asset value after selection changes", async () => {
  await selectAsset("KR:005930");
  await selectAsset("US:AAPL");
  expect(screen.queryByText("70,000 KRW")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: canonical query keys와 runtime parser 사용**

```ts
export const assetQueryKeys = {
  quote: (assetId: string) => ["asset", assetId, "quote"] as const,
  ohlcv: (assetId: string, range: string, interval: string) => ["asset", assetId, "ohlcv", range, interval] as const,
  financials: (assetId: string) => ["asset", assetId, "financials"] as const,
  filings: (assetId: string) => ["asset", assetId, "filings"] as const,
};
```

프로젝트에 TanStack Query를 도입한다면 하나의 QueryClientProvider만 배치한다. 새 의존성을 원하지 않으면 TerminalShell에서 한 번 fetch하고 typed envelope를 자식에 props로 전달한다. 두 방식을 혼합하지 않는다.

- [ ] **Step 3: error와 asset 전환 처리**

새 asset 요청 시작 즉시 해당 asset의 loading envelope로 전환한다. non-2xx도 body의 DataEnvelope를 parse하며 network 실패는 `status:error` envelope로 state에 기록한다. request generation/assetId가 현재 선택과 같을 때만 commit한다.

- [ ] **Step 4: 테스트와 커밋**

Run: `npx vitest run src/client/market-data/use-asset-market-data.test.tsx src/client/financials/use-asset-financials.test.tsx src/client/filings/use-asset-filings.test.tsx src/components/shell/TerminalShell.test.tsx`

```bash
git add src/client src/components/shell/TerminalShell.tsx src/components/asset
git commit -m "fix: deduplicate asset data requests"
```

### WO-07: Provider capability registry를 실제 구현과 일치

**문제:** SEC EDGAR, FMP, Alpha Vantage는 `not_supported` stub인데 capability와 enabled profile이 남아 있다. yfinance와 Stooq도 실제 구현 없이 capability를 광고한다.

**Files:**
- Modify: `src/domain/source/provider-profile.ts`
- Modify: `src/server/providers/provider-registry.ts`
- Modify: `src/server/services/market-data-service.ts`
- Test: `src/server/providers/provider-contracts.test.ts`
- Test: `src/server/services/market-data-service.test.ts`

- [ ] **Step 1: capability가 operation 성공 가능성과 일치하는 테스트 작성**

```ts
it("does not expose enabled capabilities backed only by not_supported stubs", () => {
  for (const profile of providerRegistry.getProfiles()) {
    for (const capability of profile.capabilities) {
      expect(hasImplementedOperation(profile.id, capability)).toBe(true);
    }
  }
});
```

- [ ] **Step 2: Beta 지원표 고정**

필수 최소 지원표:

- KIS: KR quote, KR OHLCV
- OpenDART: KR filings, KR financials
- Finnhub: US quote; OHLCV는 live plan 확인 전 optional
- SEC EDGAR: US filings/financials는 구현 완료 시에만 enabled
- FMP/Alpha/yfinance/Stooq: 구현과 계약 테스트가 없으면 disabled 및 capability 미노출

- [ ] **Step 3: fallback 선택에서 stale을 최후 후보로 유지**

fresh data와 stale data를 동일한 `hasUsableData`로 처리하지 않는다. provider chain은 fresh candidate를 계속 찾고, 없을 때만 가장 적절한 stale candidate를 반환한다.

- [ ] **Step 4: 테스트와 커밋**

Run: `npx vitest run src/server/providers/provider-contracts.test.ts src/server/services/market-data-service.test.ts`

```bash
git add src/domain/source/provider-profile.ts src/server/providers/provider-registry.ts src/server/services/market-data-service.ts src/server/providers/provider-contracts.test.ts src/server/services/market-data-service.test.ts
git commit -m "fix: align provider capabilities with implementations"
```

---

## Track C — 재무, PIT, 전략 무결성

### WO-08: OpenDART 재무 정규화와 ratio 상태 수정

**문제:** `parseFloat`가 `1000garbage`를 1000으로 승인한다. 수정공시·CFS/OFS·중복 concept 우선순위가 없고 테스트가 없다. ratios는 quote를 사용하지 않으면서 quote가 없으면 ROE까지 차단한다.

**Files:**
- Modify: `src/server/opendart/financial-statement-client.ts`
- Modify: `src/server/opendart/financial-statement-normalizer.ts`
- Create: `src/server/opendart/financial-statement-normalizer.test.ts`
- Modify: `src/server/financials/financial-data-service.ts`
- Create: `src/server/financials/financial-data-service.test.ts`
- Modify: financial route query validation and tests
- Create: `src/server/security/provider-call-policy.ts`
- Test: `src/server/security/provider-call-policy.test.ts`

- [ ] **Step 1: 오염 금액과 우선순위 실패 fixture 작성**

```ts
it.each(["1,000garbage", "1.2.3", "KRW 1000", ""])("rejects malformed amount %s", (raw) => {
  expect(parseOpenDartAmount(raw)).toBeNull();
});

it("selects the latest amended receipt deterministically", () => {
  const result = normalizeOpenDartFinancialStatements(/* fixture with two receipts */);
  expect(result.receiptNo).toBe("20260801000002");
});
```

- [ ] **Step 2: strict 금액 parser 구현**

```ts
export function parseOpenDartAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, "").trim();
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
```

- [ ] **Step 3: report/basis/revision 정책 명시**

요청 basis와 report period가 일치하는 row만 사용하고 최신 receipt를 먼저 선택한다. 동일 receipt 내 중복 concept는 canonical account ID 우선순위 배열로 결정하며 입력 순서에 의존하지 않는다.

- [ ] **Step 4: ratios를 metric별 부분 가용성으로 반환**

ROE는 statement만으로 계산한다. PER/PBR에 필요한 EPS/BPS 또는 shares/market cap이 없으면 해당 metric만 null로 유지하고 warnings에 operand 누락을 기록한다. 사용하지 않는 quote dependency는 제거한다.

- [ ] **Step 5: query Zod 검증 추가**

`region`, `basis`, `period`, symbol 형식을 cast하지 말고 400 DataEnvelope로 거부한다.

- [ ] **Step 6: upstream 호출 제한과 cache/coalescing 추가**

```ts
export type ProviderCallPolicy = {
  providerId: "opendart" | "kis" | "finnhub_free";
  operation: "financials" | "quote" | "filings";
  cacheTtlMs: number;
  maxRequestsPerMinute: number;
};
```

financial statement GET은 동일 symbol/year/basis/period 요청을 single-flight로 합치고 EOD 결과를 cache한다. ratios는 statement cache를 재사용한다. route가 사내용이면 WO-02 guard를 적용하고, 공개 read API로 유지하면 IP/session rate limit을 적용한다. invalid query는 provider budget을 소비하기 전에 400으로 종료해야 한다.

- [ ] **Step 7: 테스트와 커밋**

Run: `npx vitest run src/server/opendart/financial-statement-normalizer.test.ts src/server/financials/financial-data-service.test.ts src/server/security/provider-call-policy.test.ts src/app/api/financials`

```bash
git add src/server/opendart src/server/financials src/server/security/provider-call-policy.ts src/server/security/provider-call-policy.test.ts src/app/api/financials
git commit -m "fix: harden OpenDART financial normalization"
```

### WO-09: PIT 저장소를 안전하게 만들고 전략 경로에 실제 연결

**문제:** 신규 file PIT store는 `assetId`와 caller `dataVersionId`로 경로 순회가 가능하고 `Date.now()` 파일명이 충돌한다. 테스트가 production `data/pit`을 오염시킨다. 저장소는 research fact와 strategy predicate에 연결되지 않았다.

**Files:**
- Modify: `src/server/data/file-pit-store.ts`
- Modify: `src/server/data/pit-revision-selector.ts`
- Modify: `src/server/data/pit-store.test.ts`
- Create: `src/server/data/file-pit-store.test.ts`
- Modify: `.gitignore`
- Modify: `scripts/check-runtime-data.mjs`
- Create: `src/domain/research/verified-typed-fact.ts`
- Create: `src/domain/research/executable-predicate.ts`
- Create: `src/server/research/decision-evidence-gate.ts`
- Modify: `src/server/research/research-workspace-service.ts`
- Modify: `src/server/strategy/strategy-suitability-service.ts`
- Test: research and strategy fail-closed tests

- [ ] **Step 1: 경로 순회·동시성·오염 실패 테스트 작성**

```ts
it.each(["../escape", "a/../../escape", "a\\..\\escape"])("rejects unsafe assetId %s", async (assetId) => {
  await expect(store.save(makeEnvelope({ assetId }))).rejects.toThrow("invalid assetId");
});

it("preserves every concurrent revision", async () => {
  const saved = await Promise.all(Array.from({ length: 20 }, () => store.save(makeEnvelope())));
  expect(new Set(saved.map((item) => item.dataVersionId)).size).toBe(20);
});
```

- [ ] **Step 2: root 주입과 안전 경로 구현**

```ts
export class FilePitStore {
  constructor(private readonly root: string) {}

  private resolveAssetDir(capability: PitCapability, assetId: string): string {
    if (!/^[A-Z]{2}:[A-Za-z0-9._-]{1,32}$/.test(assetId)) {
      throw new Error("invalid assetId");
    }
    const candidate = path.resolve(this.root, capability, assetId.replace(":", "_"));
    const relative = path.relative(this.root, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("unsafe PIT path");
    return candidate;
  }
}
```

version ID와 temp filename은 `crypto.randomUUID()`를 사용한다. exclusive create, fsync, atomic rename, immutable no-overwrite를 보장한다. read 시 schema와 contentHash를 검증한다.

- [ ] **Step 3: 테스트 root 격리**

각 테스트에서 `fs.mkdtemp`를 사용하고 `afterEach`에서 해당 임시 디렉터리만 삭제한다. repository `data/pit`에 테스트 파일을 쓰지 않는다. `.gitignore`와 runtime data guard에 `data/pit/`을 추가한다.

- [ ] **Step 4: verified typed fact와 executable predicate 정의**

```ts
export type VerifiedTypedFact<T> = {
  factId: string;
  assetId: string;
  field: string;
  value: T;
  unit: string | null;
  dataVersionId: string;
  contentHash: string;
  effectiveAt: string;
  ingestedAt: string;
  verifiedAt: string;
};

export type ExecutablePredicate<T> = {
  predicateId: string;
  requiredFields: string[];
  evaluate(facts: ReadonlyMap<string, VerifiedTypedFact<unknown>>): T;
};
```

- [ ] **Step 5: decision evidence gate 구현**

전략 점수 계산 전에 PIT revision, verified fact, predicate가 모두 존재하고 hash가 일치하는지 확인한다. 하나라도 없으면 `value:null`, `status:insufficient_data`를 반환한다. warning만 추가하고 기존 점수를 유지하는 동작은 금지한다.

- [ ] **Step 6: fail-closed 회귀 테스트 작성**

```ts
it.each([
  "missing_pit_revision",
  "missing_verified_fact",
  "content_hash_mismatch",
  "missing_executable_predicate",
])("blocks strategy output for %s", async (reason) => {
  const result = await evaluateWithBrokenEvidence(reason);
  expect(result.status).toBe("insufficient_data");
  expect(result.value).toBeNull();
});
```

- [ ] **Step 7: 테스트와 커밋**

Run: `npx vitest run src/server/data src/server/research src/server/strategy/strategy-suitability-service.test.ts`

```bash
git add src/server/data src/domain/research src/server/research src/server/strategy/strategy-suitability-service.ts src/server/strategy/strategy-suitability-service.test.ts .gitignore scripts/check-runtime-data.mjs
git commit -m "fix: connect hardened PIT evidence to strategy gates"
```

---

## Track D — Acceptance와 릴리스 증거

### WO-10: 실제 Provider가 없으면 실패하는 Acceptance 재작성

**문제:** `run-beta-acceptance.ts`는 KIS/OpenDART/Finnhub가 모두 없어도 PASS한다. 일부 provider만 준비돼도 `failureCount`만 보며, smoke runner는 success status에 null value여도 passed로 처리한다. target provider identity도 검증하지 않는다.

**Files:**
- Replace: `scripts/ops/run-beta-acceptance.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Modify: `src/domain/ops/provider-readiness.ts`
- Create: `src/server/ops/beta-acceptance.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 거짓 PASS 시나리오 테스트 작성**

```ts
it.each([
  ["no provider configured", makeReport({ attempted: 0 }), 1],
  ["partial provider set", makeReport({ missingTargets: ["opendart.financials"] }), 1],
  ["null success", makeReport({ status: "eod", value: null }), 1],
  ["provider mismatch", makeReport({ expected: "kis", actual: "finnhub_free" }), 1],
  ["all required live targets", makeCompleteLiveReport(), 0],
])("returns expected exit code for %s", async (_name, report, expected) => {
  expect(evaluateBetaAcceptance(report).exitCode).toBe(expected);
});
```

- [ ] **Step 2: 필수 target matrix 정의**

```ts
export const REQUIRED_BETA_TARGETS = [
  { providerId: "kis", capability: "quote", symbol: "005930", requireData: true },
  { providerId: "kis", capability: "ohlcv", symbol: "005930", requireData: true },
  { providerId: "opendart", capability: "filings", symbol: "005930", requireData: true },
  { providerId: "opendart", capability: "financials", symbol: "005930", requireData: true },
  { providerId: "finnhub_free", capability: "quote", symbol: "AAPL", requireData: true },
] as const;
```

US OHLCV와 SEC filings/financials가 Beta 필수 범위이면 이 배열에 포함한다. 지원하지 않기로 결정하면 UI와 provider profile에서도 제거하고 제한 사항을 릴리스 문서에 명시한다.

- [ ] **Step 3: PASS 조건을 전칭 조건으로 구현**

모든 required target이 `attempted=true`, provider identity 일치, expected source 일치, runtime schema 통과, `dataAvailable=true`여야 exit code 0이다. no-key, skipped, partial, null-success, server unreachable은 모두 실패다.

- [ ] **Step 4: PIT 및 전략 acceptance 추가**

실제 수집 envelope를 PIT에 저장하고 동일 `asOf`로 revision을 조회한다. 해당 revision으로 typed fact와 predicate를 실행하며, hash 불일치 및 미래 revision이 선택되지 않음을 검증한다.

- [ ] **Step 5: package script와 테스트 실행**

```json
{
  "scripts": {
    "acceptance:beta": "tsx scripts/ops/run-beta-acceptance.ts"
  }
}
```

Run: `npx vitest run src/server/ops/beta-acceptance.test.ts`

Expected: 다섯 개 거짓 PASS fixture가 모두 exit code 1, 완전한 live report만 0.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ops/run-beta-acceptance.ts src/server/ops src/domain/ops/provider-readiness.ts package.json
git commit -m "fix: make beta acceptance require live evidence"
```

### WO-11: 테스트 harness, lint, dependency, 문서 증거 정리

**문제:** 현재 lint는 0 errors이지만 806 warnings다. client-focused tests는 invalid relative fetch와 React act warning을 stderr에 남기고 신규 hooks/components를 실행하지 않는다. Next와 eslint-config-next 버전도 다르다. 완료 문서는 live 검증과 fixture 검증을 구분하지 않는다.

**Files:**
- Modify: `vitest.setup.ts`
- Modify: `eslint.config.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/IMPLEMENTATION_INVENTORY.md`
- Create: `docs/release/REAL_DATA_BETA_EVIDENCE.md`
- Add missing hook/component/provider tests

- [ ] **Step 1: unexpected console과 unhandled fetch를 테스트 실패로 전환**

```ts
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((...args) => {
    throw new Error(`Unexpected console.error: ${args.map(String).join(" ")}`);
  });
  vi.spyOn(console, "warn").mockImplementation((...args) => {
    throw new Error(`Unexpected console.warn: ${args.map(String).join(" ")}`);
  });
});
```

의도한 warning은 개별 테스트에서 명시적으로 spy를 재정의해 assertion한다. global relative fetch 실패를 무시하지 않는다.

- [ ] **Step 2: KIS/Finnhub/OpenDART fixture matrix 완성**

각 operation에 valid, empty, malformed, null, 401/403, 429, provider error, plan restricted fixture를 만든다. KIS 숫자 schema는 `75000garbage`, `1.63%`, `12000000shares`를 거부해야 한다.

- [ ] **Step 3: lint warning을 0으로 감소**

신규·변경 파일부터 `any`, unused imports, swallowed errors를 제거한다. 전체 저장소 warning은 유형별 mechanical commit으로 나누되 rule disable로 숫자만 감추지 않는다.

Run: `npm run lint -- --max-warnings=0`

Expected: exit 0, `0 errors, 0 warnings`.

- [ ] **Step 4: Next dependency 버전 정렬과 audit**

`next`와 `eslint-config-next`를 동일 버전으로 맞춘다. 변경 전 `node_modules/next/dist/docs/`의 현재 버전 migration/deprecation 문서를 읽는다.

Run: `npm audit --omit=dev`

Expected: production high/critical vulnerability 0.

- [ ] **Step 5: 전체 정적·fixture 검증**

Run in order:

```bash
npm install
npm run typecheck
npm run lint -- --max-warnings=0
npm run test
npm run build
```

Expected: 모든 명령 exit 0, console warning/error 0, untracked test artifact 0.

- [ ] **Step 6: live acceptance와 브라우저 QA**

Run:

```bash
npm run dev
npm run acceptance:beta -- --base-url=http://127.0.0.1:3000
```

브라우저에서 KIS 설정 저장 → 연결 테스트 → 삼성전자 선택 → quote/OHLCV → OpenDART 공시/재무 → AAPL quote → 종목 빠른 전환을 검증한다. Network 탭에서 동일 asset quote/OHLCV 중복 호출이 없고 Console error/warning이 없어야 한다.

- [ ] **Step 7: 증거 문서 작성**

`REAL_DATA_BETA_EVIDENCE.md`에 다음 표를 작성한다.

```md
| Gate | Command/User path | Provider | Evidence timestamp | Result | Limitations |
|---|---|---|---|---|---|
| KR quote | acceptance:beta | KIS | ISO timestamp | PASS/FAIL | market session status |
| KR filings | acceptance:beta | OpenDART | ISO timestamp | PASS/FAIL | report availability |
| Browser asset switch | manual browser QA | mixed | ISO timestamp | PASS/FAIL | browser/version |
```

실행하지 않은 항목은 `UNVERIFIED`로 기록하고 `Runtime Verified`라고 표시하지 않는다.

- [ ] **Step 8: 최종 커밋**

```bash
git add vitest.setup.ts eslint.config.mjs package.json package-lock.json docs src
git commit -m "chore: enforce Real Data Beta release gates"
```

---

## 최종 GO/NO-GO 체크리스트

아래 항목이 전부 체크되기 전에는 Real Data Beta 완료로 보고하지 않는다.

- [ ] KIS App Key/Secret 저장 상태와 실제 연결 상태가 UI에서 분리됨
- [ ] 모의/실전 endpoint와 포트가 canonical resolver에서만 결정됨
- [ ] Provider secret과 KIS 계좌번호가 평문 파일·브라우저 payload에 노출되지 않음
- [ ] provider health, smoke, snapshot refresh가 인증·rate limit·single-flight로 보호됨
- [ ] arbitrary baseUrl과 Host header로 내부 secret 또는 서버 fetch를 외부로 보낼 수 없음
- [ ] 모든 금융 API가 runtime-validated `DataEnvelope<T>`를 반환함
- [ ] Market Board가 envelope value를 정상 소비하고 mixed freshness를 과장하지 않음
- [ ] KR/US filings route가 symbol/region 계약으로 동작함
- [ ] 종목 전환 중 이전 종목 데이터가 새 종목 아래 노출되지 않음
- [ ] 동일 asset quote/OHLCV 요청이 한 번만 발생함
- [ ] stub provider가 enabled capability로 노출되지 않음
- [ ] OpenDART malformed amount와 수정공시 우선순위 테스트 통과
- [ ] PIT 경로 순회·동시성·테스트 오염이 차단됨
- [ ] 전략 결과가 PIT revision, verified typed fact, executable predicate 없이는 생성되지 않음
- [ ] live provider가 없거나 일부만 준비된 acceptance가 반드시 실패함
- [ ] `npm run typecheck`, lint warnings 0, 전체 test, build 통과
- [ ] production dependency high/critical vulnerability 0
- [ ] 실제 KIS/OpenDART/Finnhub smoke 증거 기록
- [ ] 브라우저 Network/Console/user-path QA 증거 기록

## 중단 조건

다음 중 하나가 발생하면 다음 작업으로 넘어가지 말고 해당 작업을 실패로 보고한다.

- secret 값이 로그, 응답, fixture 또는 git diff에 노출됨
- unavailable data가 success status 또는 숫자 0으로 변환됨
- live provider 미실행을 PASS로 기록함
- schema validation을 `as`, `any`, 정규식 source scan으로 우회함
- 테스트가 repository `data/`에 runtime artifact를 남김
- strategy가 evidence gate 실패 후에도 점수·검토·주의 같은 의사결정 label을 반환함
