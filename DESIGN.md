# BMA Doctor — Design System

> Design intent + rules. **Exact values live in `src/styles/tokens.css` + `tokens-warfarin.css`** — never restate them here; point to the token. Register: `product` (design serves the workflow). Product/users/principles: see `PRODUCT.md`.

---

## Visual identity

- **Brand:** `#00744B` BMA green = authority/correctness, "in range", confirmed/saved. Use via `--bma-green-*`.
- **Neutrals:** warm near-black → white, tinted toward the brand hue. Never pure `#000`/`#fff`. Tokens `--bma-text-*`, `--bma-surface-*`, `--bma-border-*`.
- **Typography (hard rule):** **Sarabun** for everything — `--bma-font-data` (numbers/doses/dates/labels/badges) and `--bma-font-thai` (Thai prose/buttons) are both Sarabun (`--bma-font-data` aliases `--bma-font-thai`). INR hero = 56px Sarabun 800 (largest element on screen, 800 = heaviest available Sarabun weight, used wherever 900 is specified).
- **Spacing = 4pt grid.** Every size/pad/gap is a multiple of 4 (`--bma-space-*`). Exempt: border-width (1/2px), font-size micro-scale (10/11/13/14px). No odd values (3/5/7/9/11). Heights via `--bma-h-*`, radius via `--bma-radius-*`.
- **Font-size justification:** any size outside {12,14,16,18,20,24,32} or <12px needs a code comment with WCAG AA proof. Never `--bma-text-muted` (#8C8C8C) under 18px (fails AA).
- **Elevation:** cards `--bma-shadow-card`. Drawers `−6px 0 32px rgba(0,0,0,.14)`.

---

## INR status system — the core

INR drives every state change in the Warfarin module. 6 states, each a colour language (tokens in `tokens-warfarin.css`). **State changes information hierarchy, not just colour.**

| State | Trigger | Register |
|---|---|---|
| `therapeutic` | in range | green, calm, confirmatory CTA |
| `low` | below range | amber, action needed |
| `supra` | above range | deep orange |
| `very-high` | ≥ 4.5 | red, hold dose |
| `critical` | ≥ 5 | deeper red, hold + oral Vit K |
| `emergency` | ≥ 10 | darkest red + pulse, 80% overlay, IV Vit K |

`WfDoseDrawer` overlay intensity scales with severity (22% therapeutic → 80% emergency); title/icon/CTA label adapt to state. Drawer (not modal) so the trend chart + log stay visible during the decision.

## NOAC module design

NOAC dosing is **rule-based** (engine computes the correct drug/dose from CrCl/weight), so the decision is *match vs mismatch*, not titration.

- **`NoacCurrentVsRecommended`** — `ปัจจุบัน → ที่ควรเป็นวันนี้`. Current faded (the "from"), recommended in a **state-tinted box** (green = keep / amber = change), verdict + reason inside the box. Arrow always shown. Sits as the head of the "คำแนะนำการจ่ายยา" card; concurrent meds beside it (2-col).
- **`NoacDispensingDrawer`** — drug cards expand on select to show a **criteria checklist** (patient value vs threshold, ✓/✗, met rows amber-tinted) + an explicit **dose-level choice** (standard/reduced); picking a non-recommended dose → real `clinicalStatus` (under/overdose) + required override reason. Shared `.ndd-seg` segmented selector for dose + days-supply (native, not Vuetify chips).
- **`NoacReferenceTable`** — collapsible drug-agnostic lookup (all 4 NOACs × scenarios), reads `noacReference.ts`.
- Status chips on a same-hue tint get `border: 1px solid currentColor` so they lift off.

---

## Layout & patterns

**Two-zone page:** white header zone (title/back/breadcrumb, 16–24px) over `#F5F5F5` content zone (cards/tables, 20–24px). White cards on grey — never nested white-on-white, never nested cards.

**Reusable patterns** (extracted from AtsPatientDetail; apply before defaulting to generic card grids):
1. Progressive depth — identity → snapshot → analytics → raw table, top to bottom.
2. Tab badges as volumetric counts (only when >0).
3. Clinical-module summary block (header-right): per-protocol 3 critical metrics.
4. Four-metric KPI strip (number + unit + trend + context line).
5. Interactive filter cards (category stats double as table filters).
6. Inline sparkline in compact cards (≤2 peaks).
7. Severity proportional bar + dot legend.
8. Chart + side-stats panel (`1fr 280px`).
9. Direct chart annotation (single PEAK marker).
10. Triple-encoded dates (BE absolute + relative + row recency).
11. Allergy chips (amber, dot prefix) — safety data only.
12. Dual-CTA header (one filled primary max).
13. Severity badges in cells (filled, all-caps, `radius-sm`).
14. Table record count `แสดง N / N รายการ` (denominator stays total when filtered).

---

## Vuetify customization protocol

**Decision rule — Vuetify for behaviour, tokens for looks.** Reach for a Vuetify component when *behaviour* is the value (form, dialog, menu, data-table, date-picker, pagination, nav) — rebuilding that is worse than a few Layer-4 overrides. For pure *presentation* (card, KPI strip, badge, status pill) use a plain element + `--bma-*` tokens: zero coupling to Vuetify internals, trivially controllable. The design system's source of truth is the **tokens + SASS scale + theme**, which *both* Vuetify components and custom elements consume — consistency without forcing everything through Vuetify. Don't migrate a working token-styled element into a Vuetify component just to "use Vuetify"; that *adds* coupling.

Push every customization to the **highest lever it can live on**, in this order before any external CSS:
1. **Theme** (`vuetify.ts`) — semantic colour roles + `variables` (border-color, opacities, shadows).
2. **Global defaults** (`vuetify.ts`) — default props per component (`rounded`/`border`/`variant`/`density`). The only way to give one component a different shape than the global scale — Vuetify 3 **cannot** override per-component SASS vars (`$card-border-radius` etc.) via configFile; they only cascade from globals.
3. **SASS vars** (`settings.scss`) — compile-time *scale* overrides (`$border-radius-root`, the `$rounded` map, `$typography`). Reshapes the whole system; use for system-wide decisions, not single-component fixes.
4. **CSS overrides** (`overrides.scss`) — only structural CSS layers 1–3 can't reach; **natural specificity matching Vuetify's selector depth**.
5. **Scoped CSS** — component presentation only; never to override Vuetify internals.

**Layer-4 guardrail.** The real maintenance liability is *depth into Vuetify's DOM* (`.v-card__overlay`, `.v-pagination__item--is-active` = private API that breaks on upgrades), not line count. If a component needs **>3** Layer-4 overrides it's fighting Vuetify → move it to a custom element instead. **No `:deep`/`!important` "มั่วๆ".** `!important` only to counter Vuetify's own `!important`. Target the narrowest selector; document why each Layer-4 override (every `!important`, every `.v-*__*` selector) is needed in one line.

---

## Collaboration protocol — ถามก่อนเสมอเมื่อไม่แน่ใจ

Design decisions affect a real clinical workflow; a wrong guess costs more than asking. **Ask before implementing** when: (1) a colour/pattern/layout not already in tokens/DESIGN; (2) a trade-off between principles; (3) ambiguous UX requirement; (4) a non-standard font size (needs contrast proof); (5) a non-token fixed width/height. Format: state the context → 2–3 options with trade-offs → a recommendation → wait for confirmation. Don't "ลองก่อนแล้วค่อยถาม" on design — reverting after implementation costs more.

## Must / must-not

Thai primary (English only for INR/TTR/HOLD/mg-wk) · BE dates `20/04/69` · numbers and prose both Sarabun · body ≥14px, data labels ≥10px · WCAG AA on all text · **no colour-only severity** (always pair with label/icon) · 0.5-tablet rounding.

No emoji · no consumer pastels / rounded-illustration style · no dark-mode/neon/terminal aesthetics · no decorative non-clinical elements · no looping animation except the emergency pulse · never reduce data density "for aesthetics".

**Anti-references:** hospital HIS clutter · consumer health pastels · wellness gamification · dev-tool dark mode · marketing hero/gradient pages. Reference register ≈ Bloomberg Terminal (dense, data-first) but warm, Thai, legible.
