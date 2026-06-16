# Kakao & Telegram Future Adapters Spec

이 문서는 다음 단계(P1/P2)에 도입할 외부 알림 채널 연동 아키텍처 가이드라인입니다.

## 1. 텔레그램 연동 (P1 예정)
* Telegram Bot API `sendMessage` 메서드 사용.
* `TELEGRAM_BOT_TOKEN` 및 `TELEGRAM_ALLOWED_USER_IDS` 필터를 적용하여 악의적인 접근 제어.
* 수신 메세지 커맨드 핸들러 라우터 구현 예정 (`/상태`, `/시장`, `/종목` 등).

## 2. 카카오톡 연동 (P1/P2 예정)
* 비즈니스 알림톡 또는 카카오 나에게 보내기 API 후보 선정 예정.
* 템플릿 사전 승인 및 카카오 비즈니스 채널 인증 절차 고려.
