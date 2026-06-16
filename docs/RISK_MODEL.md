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
