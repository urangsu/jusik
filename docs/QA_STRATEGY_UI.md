# QA_STRATEGY_UI.md

Strategy UI는 실제 데이터 연결 전에는 계산 완료 화면처럼 보이면 안 됩니다.

## Command

```bash
npm run dev
```

## Manual QA Steps

1. 앱을 실행한다.
2. 기본 화면에 진입한다.
3. Watchlist에서 삼성전자를 선택한다.
4. Strategy 탭을 클릭한다.
5. StdDev 탭에서 `가격 OHLCV API 필요`와 데이터 부족 상태를 확인한다.
6. Strategy Agreement 탭에서 `전략 합의 계산 불가`와 데이터 부족 상태를 확인한다.
7. Factor Environment panel이 active 계산 완료처럼 보이지 않는지 확인한다.
8. Risk Decomposition panel이 실제 리스크 계산 완료처럼 보이지 않는지 확인한다.
9. expected alpha, 예상 초과수익률, 기대수익률 문구가 없는지 확인한다.
10. 매수, 매도, 추천, 목표가 문구가 직접 지시로 보이지 않는지 확인한다.
11. 브라우저 console error가 없는지 확인한다.
12. 모바일 폭에서 left/right rail과 Strategy layout이 완전히 깨지지 않는지 확인한다.

## Expected State Before Data Providers

- Strategy tab visible.
- No real financial number unless source is connected.
- No expected alpha display.
- No buy/sell recommendation wording.
- Data missing state visible.
- API required badge visible.
- StdDev does not show z-score without OHLCV.
- Strategy Agreement does not show score without enough valid views.
