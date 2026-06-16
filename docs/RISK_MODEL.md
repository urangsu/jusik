# RISK_MODEL.md

리스크 분해는 variance 기준으로 계산합니다.

```txt
totalVariance = factorVariance + specificVariance
totalVolatility = sqrt(totalVariance)
```

포트폴리오 variance는 다음 구조를 따릅니다.

```txt
w' B Sigma_F B' w + w' D w
```

P0는 long-only 포트폴리오를 가정합니다. `sum(assetWeights) <= 1.0`은 허용하며 남은 비중은 cash로 처리합니다.

## Factor Model

```txt
Portfolio Variance = w' B Sigma_F B' w + w' D w
```

- `w`: asset weight vector.
- `B`: factor exposure matrix.
- `Sigma_F`: factor covariance matrix.
- `D`: specific variance diagonal matrix.

## Missing Exposure

missing factor exposure는 0으로 대체하지 않고 warning으로 남깁니다. P0 함수는 계산 가능한 부분만 사용하되 `warnings`에 누락 asset/factor를 기록해야 합니다.

## Negative Variance

negative factor variance, specific variance, total variance는 invalid input입니다. volatility 계산 전에 차단해야 합니다.

## Weight Sum

P0는 long-only를 가정합니다.

- `sum(assetWeights) <= 1.0`: 허용, `cashWeight = 1 - sum(assetWeights)`.
- `sum(assetWeights) > 1.0 + tolerance`: warning.
- leverage, short, margin은 P0 범위 밖입니다.

## Runtime Rule

UI는 risk decomposition이 실제 포트폴리오 데이터로 계산되지 않은 상태를 completed처럼 표시하지 않습니다. 데이터 부족, 연결 전, 계산 대기 문구를 사용합니다.
