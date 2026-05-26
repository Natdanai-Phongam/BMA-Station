# BMA Doctor — Design Brief

> **For Claude Design onboarding.**  
> Read alongside `src/styles/tokens.css` and `src/styles/tokens-warfarin.css` — the token files hold exact values; this document holds design intent, semantic rules, and what the tokens mean clinically.

---

## Product + Users

**BMA Doctor (หมอ กทม.)** is a clinical decision-support tool for pharmacists and physicians in Bangkok Metropolitan Administration (BMA) public health clinics. Primary user: pharmacist reviewing 20–40 patients per session at a desktop workstation in a busy outpatient department. Secondary: supervising physician auditing dose rationale.

**Register: `product`.** This is operational medical software — not a consumer app, not a marketing site. Every element must justify its presence in terms of clinical workflow efficiency. The aesthetic is informed by the environment: bright clinic lighting, time pressure, Thai-language context.

**Success metric for the main screen:** A pharmacist can review an INR result, select or confirm a dose adjustment, and record the decision in **under 90 seconds**.

---

## Visual Identity

### Brand Color

`#00744B` — BMA Green. Used for: active nav, primary CTAs, "therapeutic" INR state, confirmed/saved states. It reads as authority and correctness in the clinical context — *green means safe and in range*.

### Neutral Scale

Warm near-black (`#343330`) to white. Seven steps used for text hierarchy: primary → secondary → tertiary → muted → disabled. Background: `#F5F5F5` (page) over `#FFFFFF` (card/panel).

### Typography

Two fonts, strictly separated by information type:

| Font | Variable | Used for |
|---|---|---|
| **Inter** | `--bma-font-data` | INR values, doses, dates, numeric data, clinical labels, badges |
| **Sarabun** | `--bma-font-thai` | Thai body text, button labels, instructions, notes |

**Rule:** Numbers are never set in Sarabun. Thai prose is never set in Inter.

**INR value display size:** 56px Inter 900 (the largest element on any screen — it is the primary input signal).

### Spacing

4px base grid. Cards use `12px` radius (`--bma-radius-lg`). Buttons/inputs use `8px` radius (`--bma-radius-md`). Badges use `9999px` (pill). Use spacing tokens (`--bma-space-*`) — no ad-hoc values.

### Elevation

Cards: `0 2px 8px rgba(0,0,0,0.08)`. Drawers: `−6px 0 32px rgba(0,0,0,0.14)`. No hard drop shadows on interactive elements.

---

## INR Status Color System

**This is the core design system of the product.** INR (International Normalized Ratio) drives every state change. There are 6 clinical states, each with its own color language. These tokens live in `src/styles/tokens-warfarin.css`.

| State | Trigger | Visual register | Key token |
|---|---|---|---|
| `therapeutic` | INR in target range | Green — calm, confirmed | `--bma-green-500`, `--bma-success-text` |
| `low` | INR below range | Amber — caution, action needed | `--inr-low-text: #B45309` |
| `supra` | INR above range | Deep orange — elevated risk | `--inr-supra-text: #E65100` |
| `very-high` | INR ≥ 4.5 | Red — hold dose | `--bma-emergency` |
| `critical` | INR ≥ 5 | Deeper red — hold + oral Vit K | `--inr-critical-text: #B71C1C` |
| `emergency` | INR ≥ 10 | Darkest red + pulse animation | `--inr-emergency-fill: #B71C1C`, `--inr-emergency-deep: #6A0000` |

**Design rule:** State is not just color — it changes *information hierarchy*. At `therapeutic`, the screen is calm and the CTA is confirmatory. At `emergency`, the screen visually restricts attention: 80% overlay, solid red header, pulsing border.

### State → Layout mapping

```
therapeutic  →  calm layout, green CTA "ยืนยันและบันทึก Visit"
low / supra  →  adjustment layout, orange CTA, dose options visible
very-high    →  hold layout, red CTA, directive list replaces dose options
critical     →  hold layout, deeper red, Vit K dosage shown
emergency    →  maximum severity, full overlay, IV Vit K protocol
```

---

## Two-Zone Page Layout

Every page uses this structure:

```
┌──────────────────────────────────────────────────────┐
│  .page  — white, 18px padding                        │  ← header zone
│  page title  ·  back button  ·  breadcrumb           │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  .main-wrap  — #F5F5F5 background, 24px padding      │  ← content zone
│  cards, tables, charts                               │
└──────────────────────────────────────────────────────┘
```

Cards sit on the gray surface. White card on gray background — not nested white-on-white.

---

## Component Inventory

### `BmaStatusBadge`
Small inline badge for ATS patient severity. Uses BMA semantic colors (emergency/urgency/elective/success). Not used in warfarin screens — the INR badge system is separate.

### `BmaKpiCard`
Stat card for the DD-ATS dashboard. Shows a numeric KPI, label, delta, and optional sparkline. Uses Inter for numbers, Sarabun for labels.

### `WfDoseDrawer` — **primary tool**
Right-side drawer panel (42% width, min 440px). 3-step clinical workflow:
1. **Verify INR** — display INR value with edit affordance
2. **Protocol / Dose Options** — hold box or selectable dose cards
3. **Confirm & Save** — dose summary, remarks field, save CTA

Overlay intensity scales with INR severity (`22%` therapeutic → `80%` emergency).

The drawer title, header icon, and save button label all adapt to INR state. See `src/components/WfDoseDrawer.vue` for full state machine.

### Inline pages

| Page | Route | Summary |
|---|---|---|
| `ConsultList` | `/` | Patient queue list for the Consult module |
| `DdAtsDashboard` | `/dd-ats` | ATS overview: doughnut charts + patient tables |
| `AtsPatientDetail` | `/dd-ats/patient/:id` | Single patient: complication history + bar chart |
| `WarfarinDoseTool` | `/dd-ats/patient/:id/dose` | **Main warfarin screen** — INR hero, schedule, chart, log |

---

## WarfarinDoseTool — Screen Map

This is the most complex screen. Four card rows, full-width layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Row 1: [THIS VISIT card  60%] [TTR card  40%]                       │
├──────────────────────────────────────────────────────────────────────┤
│  Row 2: 7-day tablet schedule (full width)                           │
├──────────────────────────────────────────────────────────────────────┤
│  Row 3: INR trend line chart (full width)                            │
├──────────────────────────────────────────────────────────────────────┤
│  Row 4: Dose adjustment log table (full width)                       │
└──────────────────────────────────────────────────────────────────────┘
```

### THIS VISIT card anatomy

```
┌─ Header ──────────────────────────────────────────────┐
│  eyebrow: "THIS VISIT"  ·  date chip  ·  saved badge  │
├─ Body ─────────────────────────────────────────────────┤
│  [INR value 56px] [status badge]  │  [current dose]   │
│  [directive note / hold steps]    │  [mg/wk]          │
├─ Footer ───────────────────────────────────────────────┤
│  [CTA button — state-adaptive label]                   │
└────────────────────────────────────────────────────────┘
```

Header and footer use `--bma-surface-light` (#FAFAFA) background. Body is white. This 3-part structure is the canonical BMA card pattern.

### TTR card
Solid color card (green/red/gray depending on TTR status). White text throughout. Shows TTR %, method, status badge.

---

## Design Constraints

### Must
- Thai text primary; English only for technical labels (INR, TTR, HOLD, mg/wk)
- Buddhist era dates: `20/04/69` format
- Numbers always Inter; prose always Sarabun
- Minimum 14px body text; clinical data labels minimum 10px
- WCAG AA contrast on all text
- No color-only encoding for severity — always pair with label or icon
- Pill rounding to 0.5 tablet

### Must not
- No emoji anywhere in the UI
- No consumer-app pastels or rounded illustration style
- No dark mode aesthetics (neon, terminal colors)
- No decorative elements that carry no clinical information
- No looping animations except the EMERGENCY pulse (clinically necessary attention signal)
- Never reduce data density "for aesthetics" — this is not a portfolio piece

---

## Drug Interaction Flag

When a patient has INR-modulating concurrent medications, a small chip appears in the INR hero card:

```
↑ INR  →  amber chip  (--wf-interact-increase-*)
↓ INR  →  blue chip   (--wf-interact-decrease-*)
```

Blue mirrors the 5mg tablet color (`--wf-pill-blue: #1565C0`). Amber mirrors the low-INR warning color (`--inr-low-text`).

---

## Warfarin Pill Visual System

Two pill variants rendered as physical colored shapes in the 7-day schedule:

| Shape | Color | Meaning |
|---|---|---|
| Full oval | `--wf-pill-blue` `#1565C0` | 5 mg tablet |
| Half oval | `--wf-pill-blue` / `--wf-pill-pink` | 0.5 tablet |
| Full oval | `--wf-pill-pink` `#C2185B` | 3 mg tablet |

---

## Anti-references

When generating anything for this product, explicitly avoid:

1. **Hospital HIS aesthetics** — gray form grids, nested tabs, tiny Comic Sans–era fonts
2. **Consumer health pastel palette** — soft mints, baby blues, rounded friendly icons
3. **Wellness app register** — motivational copy, progress rings, gamification
4. **Dev tool dark mode** — terminal blacks, neon greens/purples
5. **Marketing landing pages** — hero sections, gradient backgrounds, large illustrations

The reference aesthetic is closer to Bloomberg Terminal (density, Inter, data-first) than to any consumer product — but warm, Thai, and legible rather than cold and English-only.

---

*Source files: `src/styles/tokens.css` · `src/styles/tokens-warfarin.css` · `src/components/WfDoseDrawer.vue` · `src/pages/WarfarinDoseTool.vue`*
