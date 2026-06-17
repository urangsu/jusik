# Secret Storage Policy (보안키 저장 및 격리 정책)

본 문서는 K-Terminal 내에서 API Key 등 외부 보안 자격 증명(Secrets)을 관리하고 저장하는 보안 정책을 상세히 설명합니다.

## 1. 비밀 정보 격리 (Secret Isolation)

K-Terminal은 비밀 키와 일반 설정 정보를 논리적, 물리적으로 엄격하게 분리하여 보존합니다:
- **물리적 분리**:
  - 일반 설정: `data/settings/provider-settings.json`에 저장 (개발 중 추적 가능).
  - 비밀 정보 (Secret): `data/secrets/provider-secrets.json`에 분리 저장 (로컬 파일 시스템 전용).
- **Git 추적 방지**: `.gitignore` 파일을 통해 `data/secrets/` 디렉터리는 리포지토리에 절대 커밋되거나 유출되지 않도록 강제 차단됩니다.
- **파일 접근 제어**: 리눅스 및 macOS 환경의 로컬 저장 파일 생성 시 권한을 `0600` (소유자 읽기/쓰기 전용)으로 제한 적용하여 로컬 내 다중 사용자 환경에서의 보안성을 높입니다.

## 2. API 및 클라이언트 보호 (Client-Side Redaction)

- **GET 응답 원문 노출 금지**: `/api/settings/providers` 엔드포인트 조회를 포함해 브라우저로 응답을 내보내는 모든 REST API 응답 객체에는 비밀 원문 값이 절대 포함되지 않습니다. 
- **마스킹 마샬링 (Masking)**: 서버에서 비밀 값을 조회할 때 [provider-secret-store.ts](file:///Volumes/무제/jusik/src/server/settings/provider-secret-store.ts) 내에서 다음과 같이 마스킹 변환을 거쳐 브라우저로 내보냅니다:
  - 비밀 정보 문자열 길이가 8자 미만: `********`
  - 비밀 정보 문자열 길이가 8자 이상: 앞 4자리 + `****` + 뒤 4자리 (예: `abcd****wxyz`)
- **수정 시 덮어쓰기 동작**: 사용자가 수정 화면에서 비밀 값을 입력하지 않은 채(마스킹 상태 유지) 다른 일반 설정만 수정하여 제출하면, Secret Store는 기존 비밀 값을 보존하고 임의로 마스킹 문자열로 덮어쓰지 않도록 설계되었습니다.

## 3. 프로덕션 변경 제어 (Write Guard)

- **동작 제한 가드**: 프로덕션 빌드 환경에서 API 설정을 편집/저장하는 쓰기 동작은 기본적으로 원천 차단됩니다.
- **로컬 편집 승인**: 개발(Development) 및 허용된 로컬 관리 시나리오에서는 환경 변수 `LOCAL_SETTINGS_WRITE_ENABLED=true`가 기입된 환경에 한해서만 쓰기 엔드포인트가 허용됩니다. ([settings-write-guard.ts](file:///Volumes/무제/jusik/src/server/security/settings-write-guard.ts))
