<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Non-negotiable financial data rules

- Do not display fake financial numbers.
- Do not convert null financial values to 0.
- Every market, filing, financial, news, factor, strategy, and portfolio response must use DataEnvelope<T>.
- AI must explain only from provided data.
- AI must not invent prices, ratios, target prices, filings, news, or buy/sell instructions.
- Strategy tabs must not output a trading instruction unless all required data contracts are satisfied.
- If required data is missing, show api_required, not_supported, not_found, or insufficient_data.
- Live trading and broker order placement are out of scope.
- Paper trading is also out of scope for this work order.

## Design rules

- Follow DESIGN.md.
- No emojis in UI.
- Use semantic tokens only.
- Use KR finance convention: positive/up = red, negative/down = blue.
- Do not hard-code red/blue directly in components.
- Use one icon library only: lucide-react.
- Do not use box-shadow for elevation.
- Use translucent borders and layered dark surfaces.

## Strategy rules

- Strategy outputs are diagnostic signals, not investment advice.
- Do not label a signal as "매수 확정", "매도 확정", "수익 보장", or "추천 확정".
- Use labels such as "검토", "관망", "주의", "위험", "데이터 부족".
- Every strategy score must include dataQualityScore and vetoReasons.
- Strategy agreement score must not be calculated if minimum required strategy data is missing.

## Verification commands

Before reporting completion, run:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```
