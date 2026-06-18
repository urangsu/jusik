# INFLUENCER_VIEW_POLICY.md

인플루언서 뷰는 알파 엔진이 아닙니다.

허용:

* 공개 콘텐츠에서 지표 해석 프레임 추출.
* deterministic rule과 현재 데이터의 매칭 설명.
* 출처, 만료시간, 신뢰도 표시.

금지:

* AI가 점수 생성.
* AI가 현재 종목 라벨 결정.
* 포지션 크기 변경.
* 오래된 콘텐츠를 현재 신호처럼 표시.

## LLM Boundary

LLM은 다음 작업만 수행할 수 있습니다.

- 공개 콘텐츠의 발화, 지표, 조건, 기간을 구조화.
- 출처 문장과 timestamp를 정리.
- 사람이 읽기 쉬운 설명을 생성.

LLM은 점수, current label, position size, expected return을 생성하지 않습니다.

## Deterministic Matching

추출된 rule은 deterministic matcher가 현재 데이터와 비교합니다. matcher도 source data, engine version, config hash, expiryAt을 기록해야 합니다.

## Evidence and Expiry

모든 extracted item은 source evidence와 expiryAt이 있어야 합니다. expiryAt이 지난 콘텐츠는 Strategy Agreement에 참여할 수 없습니다.

## Strong Label Ban

Influencer overlay는 `strong_watch`를 출력할 수 없습니다. 최대 역할은 explanation, caution, risk review, data required입니다.

## Macro Note Approvals

Macro Playbook 수동 정리 메모는 `userReviewStatus`가 `reviewed` 상태로 승인된 분석 내용만 레짐과 결합하여 전략에 영향(감쇄 조절)을 미치도록 격리 조치해야 합니다. `draft` 및 `rejected` 상태의 메모는 어떠한 전략 적합도 계산에서도 제외됩니다.

## Media Crawler Exclusions

[PRODUCT_SCOPE_POLICY.md](file:///Volumes/무제/jusik/docs/PRODUCT_SCOPE_POLICY.md)에 의거하여, 외부 분석가 동영상을 자동으로 수집/스크랩하는 YouTube API, GPT Vision, Selenium 등을 이용한 기계적 자동 분석 기능은 제품 범위에서 영구 배제됩니다. 오직 사용자가 수동 작성하여 검토 및 승인한 거시 의견(Manual Note) 데이터만 매크로 플레이북 메모로 사용됩니다.

