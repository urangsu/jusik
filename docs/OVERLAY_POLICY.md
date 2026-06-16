# OVERLAY_POLICY.md

Overlay는 core alpha가 아닙니다.

* StdDev overlay는 tactical timing assist입니다.
* Hedge fund overlay는 funding, liquidity, crowding risk 경고 계층입니다.
* Influencer overlay는 공개 콘텐츠 기반 설명 보조 계층입니다.

Overlay는 단독으로 core rank를 뒤집거나 position size를 만들 수 없습니다.

## StdDev Overlay

StdDev overlay는 tactical timing assist입니다.

- rolling z-score는 통계적 위치 진단입니다.
- oversold를 trading instruction으로 표시하지 않습니다.
- overbought를 direct exit instruction으로 표시하지 않습니다.
- 실제 OHLCV가 없으면 z-score와 band를 표시하지 않습니다.
- 단독 `strong_watch` 금지.

## Hedge Fund Overlay

Hedge fund overlay는 narrative가 아니라 funding, liquidity, crowding risk gate입니다.

- BAB score.
- funding stress proxy.
- beta compression.
- liquidity condition.
- crowding state.

이 overlay는 risk-up/risk-down context를 제공하지만 core rank를 대체하지 않습니다.

## Influencer Overlay

Influencer overlay는 public content explanation layer입니다.

- LLM은 source에서 structured item을 추출할 수 있습니다.
- deterministic rule matching만 신호 후보로 사용합니다.
- source evidence와 expiryAt이 필수입니다.
- 오래된 콘텐츠를 현재 신호처럼 표시하지 않습니다.

## Forbidden Behavior

- Overlay 단독 strong label.
- position size 변경.
- expected return 생성.
- AI 점수 생성.
- core alpha rank 뒤집기.
