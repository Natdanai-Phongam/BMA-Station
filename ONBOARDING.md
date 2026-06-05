# BMA Station — Onboarding Guide

> Clinical decision-support platform for Bangkok Metropolitan Administration (BMA) healthcare workers.  
> Primary module in active development: **DD-ATS Warfarin Dose Tool**

---

## What this product is

**BMA Doctor (หมอ กทม.)** is a medical staff-facing web app for BMA clinics. It serves pharmacists (ภก.) and physicians during patient consultations — reviewing INR results, computing warfarin dose adjustments, and recording decisions.

**Goal:** A pharmacist can review an INR, act on a dose suggestion, and record the decision in under 90 seconds. The math is always correct. The audit trail is automatic.

**Register:** `product` — design serves the workflow, not the other way around. This is not a marketing site.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 + TypeScript (`<script setup>`) |
| UI foundation | Vuetify 3 |
| Build | Vite + vite-plugin-vuetify |
| Charts | vue-chartjs + Chart.js v4 |
| Icons | Phosphor Icons (`@phosphor-icons/vue`, Outline weight) |
| Fonts | Sarabun (Thai + Latin body) · Inter (numbers/data) |
| Router | Vue Router 4, hash history |

---

## Project structure (key files)

```
src/
  styles/
    tokens.css          ← All --bma-* CSS custom properties
    main.scss           ← Entry: imports tokens + overrides
  plugins/
    vuetify.ts          ← bmaLight theme + component defaults
  router/index.ts       ← Routes with meta.nav / meta.sub
  layouts/AppLayout.vue ← App shell (nav + main)
  components/
    BmaStatusBadge.vue
    BmaKpiCard.vue
    WfDoseDrawer.vue    ← Warfarin dose adjustment drawer (primary tool)
  pages/
    DdAtsDashboard.vue      ← DD-ATS module entry
    AtsPatientDetail.vue    ← Patient complication history
    WarfarinDoseTool.vue    ← Main warfarin tool (most active file)
  data/
    types/warfarin.ts       ← All warfarin TypeScript types
    mock/warfarin-patients.json
  utils/
    warfarinDosing.ts   ← Pure dose algorithm (computeDosingSuggestion, buildWeeklySchedule)
    inrStatus.ts        ← getInrStatus, inrStatusLabel
```

---

## Design tokens (critical ones)

```css
--bma-green-500: #00744B     /* BMA primary */
--bma-emergency: #B72C2C     /* critical/emergency states */
--bma-font-data: 'Inter', sans-serif
--bma-font-thai: 'Sarabun', sans-serif
--bma-radius-lg: 12px        /* card radius */
--bma-radius-md: 8px         /* button radius */
--bma-border-subtle: ...     /* card internal dividers */
--bma-surface-light: ...     /* card headers/footers */
```

Full app token list: `src/styles/tokens.css`

### Warfarin / INR clinical tokens (`src/styles/tokens-warfarin.css`)

Module-specific token layer — use only inside `WfDoseDrawer.vue` and `WarfarinDoseTool.vue`.

```
Prefix --inr-   INR status colors (6 states × up to 5 roles each)
Prefix --wf-    Warfarin-specific UI (pills, drug interaction flag)
```

```css
/* INR states */
--inr-low-{text|bg|ring}
--inr-therapeutic-ring
--inr-supra-{text|bg|ring|body|hover}
--inr-very-high-{bg|ring|body}
--inr-critical-{text|bg|ring|body}
--inr-emergency-{text|fill|deep|ring|body|hover}

/* Warfarin pills — source of truth: src/data/types/warfarin.ts */
--wf-pill-orange: #E07840     /* 2 mg tablet (ส้ม)   */
--wf-pill-blue:   #4A8FD4     /* 3 mg tablet (น้ำเงิน) */
--wf-pill-pink:   #D94E8A     /* 5 mg tablet (ชมพู)  */

/* Drug interaction flag */
--wf-interact-increase-{text|bg|ring}   /* amber — ↑ INR risk */
--wf-interact-decrease-{text|bg|ring}   /* blue  — ↓ INR effect */
```

---

## Design rules (non-negotiable)

1. **Numbers are the interface.** INR values and dose figures: large, high-contrast, Inter monospace.
2. **State drives layout.** INR 1.4 and INR 7.2 look structurally different — not just different colors.
3. **One decision per screen zone.** Input, computation, and recording never mix visually.
4. **Audit trail without friction.** Recording a dose adjustment is the natural end of the workflow.
5. **Thai clinical context first.** Thai labels, Buddhist era dates where appropriate, 0.5-tablet rounding.

**Anti-references:** hospital HIS clutter, consumer health pastels, dark-mode dev tool aesthetics.

---

## DD-ATS Warfarin module — architecture

### INR status system (`src/utils/inrStatus.ts`)
Six states: `low` · `therapeutic` · `supra` · `very-high` · `critical` · `emergency`

### Dose algorithm (`src/utils/warfarinDosing.ts`)
Two pure functions:
- `computeDosingSuggestion(inrValue, profile) → ProtocolSuggestion` — returns direction, options, nextSteps
- `buildWeeklySchedule(totalMgWk, strengthMg) → WeeklySchedule` — distributes dose across 7 days

Protocol thresholds:
```
INR ≥ 10   → emergency  (HOLD + IV Vit K)
INR ≥ 5    → critical   (HOLD + oral Vit K)
INR > 4.5  → very-high  (HOLD 1 dose)
INR > max  → supra      (decrease 5–15%, or hold option)
INR in range → therapeutic (maintain)
INR < min  → low        (increase 10–20%)
```

### WarfarinDoseTool.vue — page structure
```
Row 1: [This Visit card 60%] [TTR card 40%]
Row 2: 7-day schedule card (full width)
Row 3: INR trend chart (full width)   ← chart before log (H1 fix)
Row 4: Adjustment log table (full width)
```

**"This Visit" card (formerly "INR ล่าสุด"):**
- Header: eyebrow "THIS VISIT" + date + saved badge
- Body: INR value (56px Inter) + status badge + directives/note + current dose column
- Footer: single CTA button → always opens WfDoseDrawer
- CTA label adapts to state:
  - `therapeutic` → "ยืนยันและบันทึก Visit"
  - hold states → "ดูโปรโตคอลและบันทึก"
  - adjust states → "ดูคำแนะนำและปรับยา"

### WfDoseDrawer.vue — the primary adjustment tool
3-step flow: (1) Verify INR → (2) Protocol/Options → (3) Confirm & Save

**Key behaviors:**
- `saveDisabled` is `false` immediately for all hold states (no option selection needed)
- `saveLabel` is state-aware: "บันทึกการเยี่ยมชม — คงขนาดยาเดิม" / "บันทึก HOLD" / "บันทึกและอัปเดตตาราง"
- Drawer title is state-aware: "ยืนยัน Visit" / "โปรโตคอล HOLD" / "ปรับขนาดยา"
- Header icon: PhCheckCircle (therapeutic) · PhWarning (hold) · PhCalculator (adjust)
- Overlay intensity adapts to INR severity:
  ```
  therapeutic → 22%   low/supra → 35–38%
  very-high   → 55%   critical  → 70%   emergency → 80%
  ```
- INR can be edited manually (doctor override); confirmation required before save
- Custom dose input with validation (0.5 mg/wk min, 70 mg/wk max, >50% change warning)
- `emit('saved', payload)` → parent (`WarfarinDoseTool`) calls `onDrawerSaved()` to update reactive state

**Design decision — why Drawer not Modal:**
Context (INR trend chart, adjustment log) stays visible at 58% behind the drawer during dose decisions. For a 20–40 patient clinic session, Drawer friction is lower than Modal. Emergency uses 80% overlay to approximate Modal focus without breaking the spatial model.

---

## Active TODOs

_ไม่มี TODO ค้างอยู่ในขณะนี้_ — ทุกรายการจาก backlog ก่อนหน้าเสร็จแล้ว

---

## Design tooling: impeccable

The `/impeccable` skill is installed at `.claude/skills/impeccable/`.  
It reads `PRODUCT.md` (project root) and `DESIGN.md` (if present) for context.

Common commands:
```
/impeccable critique src/pages/WarfarinDoseTool.vue
/impeccable layout src/components/WfDoseDrawer.vue
/impeccable audit src/pages/WarfarinDoseTool.vue
```

Critique snapshots are saved to `.impeccable/critique/`.

---

## Dev setup

```bash
npm install
npm run dev       # http://localhost:5175/BMA-Station-ATS/
npm run build
npx vue-tsc --noEmit   # type check
```

Main warfarin tool route: `/#/dd-ats/patient/w002/dose`
