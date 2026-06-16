# Notification Hub Spec

이 문서는 Channel-Agnostic Notification Hub와 Cooldown, 중복 발송 방지 기능에 대해 다룹니다.

## 1. Cooldown & Fingerprinting
동일 이벤트가 과도하게 중복 전송되는 것을 차단하기 위해 알림 핑거프린트(`AlertFingerprint`)를 생성하여 관리합니다:
* **구조**: `ruleId:eventType:assetId:conditionHash`
* **작동**: 이벤트 생성 시 핑거프린트에 대해 설정된 cooldown 시간(예: 30분, 60분)이 지나기 전에는 발송을 강제로 스킵(`skipped`) 처리하며, 이력에는 기록합니다.

## 2. Quiet Hours (무음 시간)
* **기본값**: 23:00 ~ 07:00 (Asia/Seoul)
* **규칙**:
  - `web_inbox` 및 `console` 같은 로컬 채널은 무음 시간에도 제한 없이 전송이 허용됩니다.
  - 텔레그램, 카카오톡, 이메일과 같은 외부 채널은 무음 시간인 경우 `critical` 알림을 제외하고 발송을 차단/보류합니다.
