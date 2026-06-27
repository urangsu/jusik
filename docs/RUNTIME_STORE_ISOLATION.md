# Runtime Store Isolation

This document describes the Runtime Store Isolation system (`WO017-N`).

> [!IMPORTANT]
> 파일 기반 store는 runtime/test root를 분리합니다.
> generated data는 git에 커밋하지 않습니다. `.gitkeep`만 유지합니다.

---

## 1. Design

All file-based stores resolve their root directory through a single function:

```ts
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
```

This function uses the following priority:

| Priority | Environment Variable | Usage |
|---|---|---|
| 1 (highest) | `JUSIK_TEST_DATA_ROOT` | Test harnesses — temp dir per test file |
| 2 | `JUSIK_DATA_ROOT` | Production deployments |
| 3 (default) | `process.cwd()` | Development |

---

## 2. Applied Stores

The following store path files use `resolveRuntimeDataPath`:

| Store | Path File |
|---|---|
| AI Explanation Cache | `src/server/ai/ai-explanation-cache-store-paths.ts` |
| AI Explanation Replay Ledger | `src/server/ai/ai-explanation-replay-ledger-store-paths.ts` |
| Operational Smoke | `src/server/ops/operational-smoke-store-paths.ts` |

---

## 3. Test Isolation

Use `createTestDataRoot` in test files that write to the filesystem:

```ts
import { createTestDataRoot } from "@/test-utils/create-test-data-root";

beforeEach(async () => {
  const testRoot = await createTestDataRoot("my-store-test");
  process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
  cleanup = testRoot.cleanup;
});

afterEach(async () => {
  await cleanup();
});
```

This ensures each test file uses a completely separate directory, preventing:
- Cross-test data contamination
- Parallel test conflicts

> [!NOTE]
> 테스트는 가능하면 JUSIK_TEST_DATA_ROOT를 사용합니다.
> 각 테스트는 별도 temp dir을 생성하여 충돌을 방지합니다.

---

## 4. Path Traversal Guard

`resolveRuntimeDataPath` throws if the resolved path escapes the root:

```ts
// Throws: "Path traversal detected: ..."
resolveRuntimeDataPath("../../etc/passwd");
```

---

## 5. Vitest Parallelism

Current setting: `fileParallelism: false` (in `vitest.config.ts`).

After applying `createTestDataRoot` to the key store tests, parallelism was tested:

```bash
npx vitest run src/server/ai/ --fileParallelism=true
```

See Phase 3 decision below.

---

## 6. Git Policy

- `data/` directories are ignored (`.gitignore`)
- `.gitkeep` files maintain directory structure
- No generated runtime data is committed
