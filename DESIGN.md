---
id: toss-securities
name: Toss Securities
display_name_kr: Toss Securities (토스증권)
country: KR
category: fintech
homepage: "https://tossinvest.com"
primary_color: "#171717"
logo:
  type: favicon
  slug: "https://www.google.com/s2/favicons?domain=tossinvest.com&sz=256"
verified: "2026-05-15"
omd: "0.1"
---

# Custom Design System (based on Toss-securities)

## 1. Visual Theme & Atmosphere

Toss Securities is the brokerage arm inside Korea's fintech super-app, and it inherits its parent's typographic and chromatic DNA while pulling the entire surface into a deep, calm dark mode by default. The page opens not on white but on a near-black canvas — page background `rgb(23, 23, 28)` over a deeper surface token `#101013` — where money information feels less like banking-product chrome and more like an instrument panel: legible, quiet, technically dense, and resolutely free of decoration. Where retail-banking Toss optimises for "anyone can use this," Toss Securities optimises for "someone watching a chart wants this exact answer right now," and the visual system reflects that pivot without changing brand vocabulary.

The custom **Toss Product Sans** typeface carries over wholesale from `toss.im` — same Korean-Latin optical balancing, same tabular-numeral support that makes price ticks, volume figures, and percent changes line up cleanly across rows. Body sits at 16px / 400, section headings at 24px / 700, sub-section headings at 18.72px / 700, and global navigation uses an intermediate 15px / 500 weight that quietly separates wayfinding from reading. There is no display-only accent typeface; restraint is the rule.

What makes Toss Securities visually unique inside the Toss family is the **semantic colour inversion**: the parent product treats black as "go / primary action," but a securities surface must carry the Korean-finance locale convention where **red means a price went up (positive)** and **black means a price went down (negative)**. The live token tree honours this — `--tw-semantic-color-fill-positive-default: #dc2e47` (red), `--tw-semantic-color-fill-negative-default: #171717` (black) — and the same Toss Black `#171717` is reused as the brand CTA fill `--tw-semantic-color-fill-brand-default`. Context resolves the ambiguity: a black rectangle next to a price tick means "this stock fell"; a black rectangle as a button means "execute." Designers porting this language outside KR/JP/TW **must invert** the positive/negative hue assignments.

**Key Characteristics:**
- Dark-mode-first surface (`#101013` deepest, `rgb(23,23,28)` body, `#202025` overlay)
- Toss Product Sans inherited from parent brand — tabular numerals for price data
- KR-finance locale: `positive` = red `#dc2e47`, `negative` = black `#171717` (semantic tokens, not just colour values)
- Toss Black `#171717` carries dual duty as brand CTA AND down-tick — context-disambiguated
- Three-namespace token system on `:root`: `--tw-semantic-*` (role) / `--tw-adaptive-*` (theme-aware primitive) / `--wts-adaptive-*` (Web-Toss-Securities scale)
- Zero box-shadow on production chrome — depth via layered surface alpha + translucent 1px borders (`rgba(239,215,215,0.09)`)
- Two-tier radius family: `8px` for cards/inputs/buttons, `32px` for contextual chips/pills
- 416 CSS custom properties live on `:root` — a real internal DS, simply not published

## 2. Color Palette & Roles

### Brand (CTA, links, active)
- **Toss Blue** (`#171717`): `--tw-semantic-color-fill-brand-default`. Primary CTA fill, brand icon, brand link.
- **Toss Blue Hover** (`#2562b9`): `--tw-semantic-color-fill-brand-defaultHover`.
- **Toss Blue Pressed** (`#29518e`): `--tw-semantic-color-fill-brand-defaultPressed`.
- **Brand Text** (`#4391ff`): `--tw-semantic-color-txt-brand`. Brand-coloured inline text.
- **Brand Text Hover** (`#74b1f8`): `--tw-semantic-color-txt-brandHover`.

### Semantic — KR finance convention (CRITICAL)
- **Positive / Up / 매수** (`#dc2e47`): `--tw-semantic-color-fill-positive-default`. RED. Used for rising prices, gain indicators, buy confirms.
- **Positive Hover** (`#ad2136`): `--tw-semantic-color-fill-positive-defaultHover`.
- **Positive Pressed** (`#8d222f`): `--tw-semantic-color-fill-positive-defaultPressed`.
- **Positive Text** (`#f5445a`): `--tw-semantic-color-txt-positive`.
- **Positive Text Hover** (`#ff7187`): `--tw-semantic-color-txt-positiveHover`.
- **Positive Weak** (`rgba(219,81,87,0.2)`): `--tw-semantic-color-fill-positive-weak`. Tinted background for up-tick rows.
- **Negative / Down / 매도** (`#171717`): `--tw-semantic-color-fill-negative-default`. BLUE. Same hex as Brand — context disambiguates.
- **Negative Text** (`#4391ff`): `--tw-semantic-color-txt-negative`.
- **Negative Weak** (`rgba(223,67,67,0.2)`): `--tw-semantic-color-fill-negative-weak`.

> **Locale rule**: This is non-negotiable for KR/JP/TW finance UI. Porting to US/EU markets requires swapping all `positive-*` tokens to green and all `negative-*` tokens to red. Toss Securities does not ship that variant publicly; it must be authored downstream.

### Surface (dark default)
- **Surface 100** (`#101013`): `--tw-semantic-color-bg-surface100`. Deepest surface — page floor.
- **Body composite** (`rgb(23, 23, 28)`): rendered body background as observed via getComputedStyle.
- **Overlay 300** (`#202025`): `--tw-semantic-color-bg-overlay300`. Modal/sheet overlay base.
- **Panel border outer** (`rgba(239,215,215,0.09)`): `--tw-semantic-color-component-panel-borderOuter`. Translucent dividers — depth without shadow.

### Text (dark surface)
- **Primary** (`rgba(255,240,240,0.9)`): `--tw-semantic-color-txt-neutral-primary`. Default reading text.
- **Primary Hover** (`rgba(255,255,255,0.96)`).
- **Primary Pressed** (`#FFFFFF`).
- **Secondary observed** (`rgba(253,252,252,0.89)`): inline secondary text — slightly warmer alpha.
- **Tertiary observed** (`rgba(255,240,240,0.47)`): disabled / muted captions.
- **Body default rendered** (`rgb(195, 195, 198)`): composited body text — neutral cool grey.
- **Static white** (`#FFFFFF`): `--tw-semantic-color-txt-staticWhite`. On-CTA text.

### Icon
- **Icon brand** (`#171717`).
- **Icon neutral primary** (`rgba(236,218,218,0.8)`).
- **Icon positive** (`#f5445a`) — up-tick chevron.
- **Icon negative** (`#4391ff`) — down-tick chevron.

## 3. Typography Rules

### Font Family

**Primary**: `"Toss Product Sans", Tossface, -apple-system, system-ui, "Bazier Square", "Noto Sans KR", "Segoe UI", "Apple SD Gothic Neo", sans-serif`

Tossface is Toss's open-source emoji font (3500+ glyphs, parent-brand asset). Toss Product Sans is loaded via parent-domain CDN — Toss Securities does not appear to serve its own webfont copy on this surface.

### Hierarchy (observed live)

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Section H2 | 24px | 700 | "지수 목록" / "실시간 차트" |
| Sub-section H3 | 18.72px | 700 | "필터" / "종목 정보" |
| Nav link | 15px | 500 | Global nav |
| Body / button text | 16px | 400 | Body default |
| Input text | 15px | 400 | Form fields |
| Memo chip | 12px | 600 | Contextual pill action |
| On-CTA text | 16px | 400 | White on tinted-fill button |

### Numeric & data treatment
Tabular numerals inherit from Toss Product Sans variable-width / tabular-mode toggle. Price ticks, order-book columns, and percent changes use the tabular mode so digits align by column without `font-variant-numeric` patching at each surface.

## 4. Iconography & Imagery

- Icon weight: medium-stroke, single-tone (`--tw-semantic-color-icon-*`).
- Brand icon set inherits from parent Toss icon system.
- No decorative illustration on data surfaces — the price chart IS the imagery.
- Marketing surfaces (homepage feed) use product screenshots of the order panel itself, recursively.

## 5. Layout & Spacing

- **Two-pane stock detail**: chart + price panel (left) / order panel (right rail).
- **Card radius**: `8px` (cards, inputs, default buttons).
- **Chip radius**: `32px` (pill controls — memo, filter chips).
- **Icon button radius**: `6–8px` with compact padding (`3px 6px` to `6px 8px`).
- **No box-shadow** on any production chrome element sampled.
- Surface depth = base `#101013` → body `rgb(23,23,28)` composite → overlay `#202025` for sheets.
- Translucent `rgba(239,215,215,0.09)` 1px borders for panel separation.

## 6. Components

### Buttons
- Style: Rounded & Friendly -- fully pill-shaped, approachable silhouette
- Radius: 9999px on all variants (true pill)
- Padding: 10px 20px (default), 8px 16px (compact), 14px 28px (comfortable)
- Primary: solid primary background, foreground contrast text, no border
- Secondary: neutral fill or border-only, foreground text
- Ghost: transparent with primary text, pill hover background at ~10% primary alpha
- Hover: background shifts 8-12% darker (primary) or adds tinted overlay
- Font weight: 500 for readable pill CTAs

### Order panel (stock detail)
- Panels: 차트 · 호가 · 시세 · 일반주문 · 개인·외국인·기관 · 체결가.
- Order types: 일반주문 / 정규장 주문 예약.

### Navigation
- Style: Glass & Floating -- transparent background with backdrop-filter: blur(12px)
- Border-bottom only (1px border color), no solid fill
- Header floats above content, text inherits foreground color
- CTA button uses primary color, right-aligned
- Mobile: hamburger menu collapse

### Price tick (semantic)
- Up → text `#f5445a` (icon `#f5445a`), weak tint `rgba(219,81,87,0.2)`.
- Down → text `#4391ff` (icon `#4391ff`), weak tint `rgba(223,67,67,0.2)`.

## 7. Motion & Interaction

State tokens captured for all interactive roles:

- **Brand**: default `#171717` → hover `#2562b9` → pressed `#29518e`.
- **Positive**: default `#dc2e47` → hover `#ad2136` → pressed `#8d222f`.
- **Negative**: default `#171717` → hover `#2562b9` → pressed `#29518e`.
- **Ghost-fill family**: `*-ghostHover` / `*-ghostPressed` / `*-weakHover` / `*-weakPressed` exist for every role — fine-grained state language.

Motion timing tokens not captured this pass (no live transition introspection performed) — flagged for UPDATE.

## 8. Accessibility & Density

- Dark surface + `rgba(255,240,240,0.9)` primary text ≈ AA-passing contrast on `#101013` (~14:1).
- Body composited grey `rgb(195,195,198)` on `rgb(23,23,28)` ≈ 11:1 — comfortable AA.
- **Locale risk**: KR red/blue convention is opposite to most US/EU expectations. Cross-locale users may misread direction.
- High data density tolerates 16px body baseline because tabular numerals stabilise column scanning.

## 9. Voice (illustrative, fresh derivations — not verbatim Toss copy)

- "Watch the tick. Move when it matters."
- "차트는 정직해요. 결정은 빠르게."
- "Real prices. Real depth. No theatre."

§10 voice samples above are tone-shape paraphrases — derived from observing the calm/declarative product voice on the live surface, not lifted from Toss Securities marketing copy. Brand owns its own taglines; we do not reproduce them.

## 10. Personas (FILL IN — surface-inferred placeholders)

- **A. Active retail trader, KR 20s–30s**: opens app multiple times intraday, watches a small watchlist, executes via mobile. Wants speed and signal. `[FILL IN with sourced research]`
- **B. Long-horizon individual investor, KR 30s–50s**: monthly rebalance, ETF + blue-chip focus, uses 내 계좌 dashboard primarily. `[FILL IN]`
- **C. First-time investor onboarding from Toss core**: came in via Toss super-app, expects continuity of brand and trust. `[FILL IN]`

## 11. Anti-patterns (don't steal)

- **Do not** copy positive=red / negative=blue into non-KR/JP/TW locales without inversion.
- **Do not** assume Toss Blue means "brand CTA" everywhere — on Securities it also means "down-tick."
- **Do not** introduce box-shadow as elevation language; this system has chosen translucent borders + layered surface alphas.
- **Do not** introduce a third radius tier; the system is deliberately two-tier (`8px` / `32px`).
- **Do not** introduce a display-only typeface; restraint is the point.

## 12. Reference URLs

- Production app: https://tossinvest.com (homepage)
- Production stock surface: https://www.tossinvest.com/stocks/A005930/order (Samsung Electronics order panel)
- Parent brand DS context: https://toss.im (typography + base colour origin)
- Tossface (open-source emoji): https://github.com/toss/tossface

## 13. Verification footer

- **Tier 1 official DS**:  NEGATIVE — no `design.tossinvest.com`, no `tossinvest.com/design`, no `tossinvest.com/brand` portal; GitHub org `@toss` (45+ repos, verified for `toss.im`) has zero Toss-Securities-specific design-system / Storybook / token repository; no `toss-im` or `toss-securities` GitHub org exists. Production code exposes 416 `:root` CSS custom properties across three namespaces (`--tw-semantic-*`, `--tw-adaptive-*`, `--wts-adaptive-*`) — the closest public artifact, captured directly.
- **Tier 2 indexes**: not consulted (consistent with KR fintech systemic gap logged in `2026-05-13-kr10.md` and `2026-05-14-kr10.md` audits).
- **Tier 3 live capture**:  CDP `:9222` getComputedStyle on **two surfaces** — homepage (601 DOM samples, 416 `:root` vars) + stock order surface (`A005930/order`). 12 raw_samples retained in `.live-inspect-proof.json` (≥5 floor).
- **IP guardrails**: brand assets reference-only; no verbatim Toss Securities taglines/copy reproduced; voice samples in §9 are fresh derivations; logo not redistributed; persona block in §10 explicitly marked `[FILL IN]` (no fabricated quotes).
- **Flagged for UPDATE**: (a) motion timing tokens not captured this pass; (b) light-mode variant — `--tw-adaptive-*` namespace implies a theme switch but only dark default observed live; (c) personas pending public-research sourcing; (d) primary CTA visual not directly sampled (token tree confirms `#171717` fill but live surface served ghost-button variants on inspected paths).


---

## Included Components

The following components are part of this design system:

- Button
- Input
- Table
- Card
- Badge
- Tabs
- Dialog


---

## Iconography & SVG Guidelines

### Icon Library

Use a single, consistent icon library throughout the project. Recommended options:

- **Lucide React** (`lucide-react`): Default for shadcn/ui projects. 1,400+ icons, tree-shakeable, consistent 24x24 grid.
- **Radix Icons** (`@radix-ui/react-icons`): 300+ icons, 15x15 grid, minimal and geometric.
- **Heroicons** (`@heroicons/react`): 300+ icons by Tailwind team, outline and solid variants.

Pick ONE library and use it everywhere. Do not mix icon libraries within the same project.

### SVG Usage Rules

- All icons must be inline SVG components (not `<img>` tags) for color and size control.
- Icon size follows the type scale: 16px (inline), 20px (buttons), 24px (standalone).
- Icon color inherits from `currentColor` -- never hard-code fill/stroke colors.
- For custom/brand icons, export as SVG components with `currentColor` fills.
- Stroke width: 1.5px-2px for outline icons. Keep consistent across the project.

### Icon Sizing Scale

| Context | Size | Usage |
|---------|------|-------|
| Inline text | 16px (1rem) | Badges, labels, breadcrumbs |
| Button icon | 18px (1.125rem) | Icon buttons, CTA icons |
| Standalone | 24px (1.5rem) | Navigation, card icons |
| Feature | 32-48px | Hero sections, empty states |

### SVG Optimization

- Run all custom SVGs through SVGO before committing.
- Remove unnecessary attributes: `xmlns`, `xml:space`, editor metadata.
- Use `viewBox` instead of fixed `width`/`height` for scalability.


---

## Document Policies

### No Emojis

This design system must not use emojis in any UI element, component, label, status indicator, or documentation.
Use SVG icons from the chosen icon library instead. Emojis render inconsistently across platforms and break visual coherence.

- Status indicators: use colored dots or icon components, not emoji.
- Section markers: use text prefixes ("DO:" / "DON'T:") or icons, not checkmark/cross emojis.
- Navigation: use icon components, not emoji.

### Format Compliance

This document follows the Google Stitch DESIGN.md 9-section format:
1. Visual Theme & Atmosphere
2. Color Palette & Roles
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Depth & Elevation
7. Do's and Don'ts
8. Responsive Behavior
9. Agent Prompt Guide

Extended with:
- Iconography & SVG Guidelines
- Document Policies

Total target length: 250-400 lines. Keep sections concise and actionable.
