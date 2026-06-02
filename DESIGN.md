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

### Spacing — 4-Point Grid System

This project uses a **4-point grid** (the flexible variant of the 8-point grid). Every spacing, sizing, and padding value must be a multiple of 4: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`. No off-grid values.

**Why this matters:** Every screen size divides evenly by 4. At 2× retina density, 4px = 8 physical pixels — clean, no sub-pixel blur. When every element is on the same grid, visual rhythm emerges without effort.

**Token system:**

| Token | Value | Use |
|---|---|---|
| `--bma-space-1` | 4px | Micro gaps, icon-to-label |
| `--bma-space-2` | 8px | Internal badge padding, tight rows |
| `--bma-space-3` | 12px | Card padding (compact), cell padding |
| `--bma-space-4` | 16px | Standard card padding, section gaps |
| `--bma-space-6` | 24px | Between sections |
| `--bma-space-8` | 32px | Large section gaps |
| `--bma-space-12` | 48px | Page-level separation |

**Component size tokens (heights):**

| Token | Value | Use |
|---|---|---|
| `--bma-h-input` | 40px | Filter inputs, text fields |
| `--bma-h-btn-sm` | 32px | Pagination buttons, icon buttons |
| `--bma-h-btn-md` | 40px | Standard action buttons |
| `--bma-h-btn-lg` | 48px | Primary CTAs |
| `--bma-h-chip` | 24px | Status chips, count badges |

**Border-radius scale:**

| Token | Value | Use |
|---|---|---|
| `--bma-radius-xs` | 4px | Micro elements (severity bars) |
| `--bma-radius-sm` | 6px | Small badges, icon wraps, action buttons |
| `--bma-radius-md` | 8px | Inputs, standard buttons |
| `--bma-radius-lg` | 12px | Cards, panels, tooltips |
| `--bma-radius-xl` | 16px | Modals, drawers |
| `--bma-radius-full` | 9999px | Pills, status badges |

**Enforcement rules:**
- Never hardcode px values in component CSS — always use a token or a 4pt-multiple
- `border-width` is exempt: 1px and 2px are standard border conventions, not grid values
- Typography font-size is exempt: 10, 11, 13, 14px are acceptable micro-scale exceptions
- No `1.5px` borders — use 1px or 2px
- No odd numbers (3, 5, 7, 9, 11px) for spacing/sizing — if tempted, round to nearest 4pt multiple

**Common pattern sizes (verified on 4pt grid):**

```css
/* Badges / chips */
padding: 2px 8px;   /* compact chip */
padding: 4px 8px;   /* standard badge */
padding: 4px 12px;  /* wide badge */

/* Table cells */
padding: 10px 14px; /* data table td — note: 10 not ÷4, but accepted as table exception */
padding: 12px;      /* v-data-table override */

/* Gaps */
gap: 4px;   /* icon-to-label, tight row items */
gap: 8px;   /* standard flex gap */
gap: 12px;  /* card internal sections */
gap: 16px;  /* between cards */
```

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

## Clinical Status Color Tokens

Beyond the INR system, the patient table and KPI panels use these semantic color tokens. All are defined in `tokens.css` — never hardcode hex equivalents.

### Row tint backgrounds (table rows by status)

| Token | Hex | Use |
|---|---|---|
| `--bma-row-underdose-bg` | `#FFFBF5` | under-range / underdose row background |
| `--bma-row-underdose-hover` | `#FFF3E0` | hover state |
| `--bma-row-overdose-bg` | `#FFF8F8` | over-range / overdose / contra / interaction row |
| `--bma-row-overdose-hover` | `#FEECEC` | hover state |

### Soft area backgrounds

| Token | Hex | Use |
|---|---|---|
| `--bma-emergency-bg-soft` | `#FFF5F5` | Large-area emergency tint (tooltip overlays, alert boxes) |
| `--bma-urgency-bg-soft` | `#FFF3E0` | Large-area urgency tint |

*Note:* `--bma-emergency-bg` and `--bma-urgency-bg` are rgba — they're for small inline uses. Use the `-soft` variants for large areas where rgba can look washed out over colored backgrounds.

### Extended clinical status text colors

| Token | Hex | Use |
|---|---|---|
| `--bma-underdose-text` | `#E65100` | Under-range / underdose text (deeper than urgency-text) |
| `--bma-interaction-text` | `#7B52AB` | Drug interaction badge text |

### Status badge backgrounds

| Token | Hex | Use |
|---|---|---|
| `--bma-contra-bg` | `#E8EAF6` | Contraindication badge background |
| `--bma-interaction-bg` | `#F3EEFF` | Drug interaction badge background |

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

---

## Extracted Design Patterns — AtsPatientDetail Reference

> Patterns extracted from visual analysis of the AtsPatientDetail screen.  
> Each pattern is graded by clinical information density vs. pixel cost.  
> Apply these to any new page or component before defaulting to generic card grids.

---

### Pattern 1 — Progressive Information Depth (Top → Bottom)

**What it does:** Information density increases as you scroll. Identity (who) is at the top, snapshot metrics (what's urgent) follow, then analytics (trend), then full history (audit trail).

```
Layer 1: Patient identity — name, HN, demographics, allergies
Layer 2: Clinical snapshot — INR, TTR, NOACS metrics (decision inputs)
Layer 3: Aggregated analytics — KPI strip, category cards, chart
Layer 4: Raw history — searchable, filterable table
```

**Why it works clinically:** A pharmacist scanning quickly can stop at the layer they need. If the INR alone is enough, they never need to reach layer 4. No decision requires scrolling past its supporting data.

**Apply to:** Any patient-facing page. Never mix layer 3 analytics above layer 2 clinical snapshot. Never put raw tables above KPI summaries.

---

### Pattern 2 — Tab Badges as Volumetric Signals

**What it does:** Each tab label carries a count badge showing how many records exist inside, before the user enters.

```
ภาวะแทรกซ้อน [5]  |  Warfarin Dose Tool  |  INR History [14]  |  ยาที่ใช้ [7]
```

**Why it works:** Zero cost — replaces "open tab, read count, close tab" with a single glance. Clinically: a pharmacist immediately knows if the complication history is 0 or 14 before spending time.

**Rules:**
- Only show badge when count > 0. Empty tabs show no badge, not [0].
- Tabs without a natural record count (tools, calculators) carry no badge — don't force a number.
- Badge uses Inter, same token as all numeric data: `--bma-font-data`.

**Apply to:** All tabs that contain a list of clinical records.

---

### Pattern 3 — Clinical Module Summary Block (Header-Right Zone)

**What it does:** The page header splits into two columns. Left: patient demographics. Right: a "Clinical Modules" panel listing the active treatment protocols, each showing its 3 most critical metrics inline.

```
┌─ Patient Info ─────────────────┬─ CLINICAL MODULES ─────────────────────┐
│  ชื่อ-นามสกุล                  │  ● WARFARIN                             │
│  นายสมชาย มั่นคง  HN 67123456  │  INR 10.5 EMERGENCY │ 35mg │ TTR 29%   │
│  อายุ / เพศ / กรุ่เลือด         ├─────────────────────────────────────────┤
│  สิทธิการรักษา                  │  ● NOACS                                │
│  ● Penicillin  ● Aspirin        │  65kg │ SCR 1.5 mg/dL │ CRCL 58mL/min  │
└────────────────────────────────┴─────────────────────────────────────────┘
```

**Why it works:** A clinician managing both Warfarin and NOACs for the same patient can see both protocol summaries without navigating. The right panel is a decision gate — it tells you whether to act before you even reach the tabs.

**Color coding:** Each module dot color matches the severity state. Warfarin red dot = active alert; NOACS green dot = no alert.

**Apply to:** Any patient detail page where more than one clinical protocol is active.

---

### Pattern 4 — Four-Metric KPI Strip

**What it does:** A single horizontal card holds 4 metrics, each with: a primary number, a unit, a trend indicator (badge or chip), and a context line.

```
┌─────────────────┬──────────────────────┬──────────────┬───────────────────┐
│  TOTAL EVENTS   │  DAYS SINCE LAST     │  SEVERITY    │  EVENT RATE       │
│  12 MO          │  EVENT               │  INDEX       │  TREND            │
│  5 ครั้ง  ↗+2   │  23 วัน  12 มิ.ย.68  │  1/5 severe  │  0.42/mo  ↘-18%  │
│  เพิ่มจาก 3 ครั้ง │  Bleeding · UGIB     │  mod 1 · mild 3│  rolling 90 วัน  │
└─────────────────┴──────────────────────┴──────────────┴───────────────────┘
```

**Typography rules:**
- Primary number: Inter 28–32px 700
- Unit: Inter 13px 400, color muted, positioned inline after the number
- Trend badge: filled pill, Inter 12px — `↗ +2` red fill, `↘ -18%` green fill
- Context line: Sarabun 12px muted — explains the metric scope in Thai

**Why it works:** Four decisions, one glance, zero navigation. The context line prevents the number from being ambiguous (is this 5 events per month or 5 events ever?).

**Do not use for:** Metrics that require explanation longer than one short line. If a metric needs a tooltip to understand, it belongs in a detail section, not the strip.

---

### Pattern 5 — Interactive Filter Cards (Dual-Function Category Cards)

**What it does:** Summary cards for each data category serve double duty: they display the category's stats AND act as filter controls for the table below.

```
┌─ Bleeding ──────────────────────────────┐
│  เลือดออก            ล่าสุด 12 มิ.ย. 68  │
│  2 ครั้ง/ปี    ╱‾╲____sparkline________  │
│  ━━━━━━━━━━━━━━━░░░░░░░░░  severity bar  │
│  ● severe 1    ● mild 1                  │
└──────────────────────────────────────────┘
```

**Anatomy:**
1. **Header row:** category name + dot color + last-event date (right-aligned, Inter 11px muted)
2. **Count row:** primary count (Inter 28px 700) + sparkline chart (60px wide, 32px tall, inline)
3. **Severity bar:** full-width proportional bar split by severity colors
4. **Legend row:** dot + label + count per severity level

**Selected state:** Border color matches category color at full opacity; background tints slightly (4% opacity of category color). No heavy shadow — the border change is enough.

**Filter hint:** A single line "คลิกการ์ดเพื่อกรองตาราง" right-aligned above the card grid, 11px muted. Appears once; disappears after first interaction.

**Apply to:** Any page with multiple data categories that feed a single table. Never use regular tabs for this — the card format lets you compare category volumes at a glance.

---

### Pattern 6 — Inline Sparkline in Compact Cards

**What it does:** A micro line chart (approx. 60×32px) sits inside the count row of a compact card, showing the trend over time without consuming a full chart panel.

**Rules:**
- No axes, no grid lines, no labels — pure shape
- Stroke weight: 1.5px
- Color matches the category (red for Bleeding, blue for Thromboembolism, orange/amber for Side Effects)
- Area fill: category color at 10–15% opacity
- Render via Chart.js with `tension: 0.4`, `pointRadius: 0`

**Why it works:** A sparkline in 60×32px answers "is this trending up or down?" without requiring the user to read a chart. It takes less space than a single digit.

**Do not use for:** Time series with more than 2 visible peaks — the shape becomes unreadable at sparkline scale. Use a full chart instead.

---

### Pattern 7 — Severity Proportional Bar

**What it does:** A full-width horizontal bar split into colored segments representing severity distribution. Below: a dot-label legend per segment.

```
━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░
● severe 1                 ● mild 1
```

**Colors:**
- Severe: `--bma-emergency` red
- Moderate: `--bma-warning` orange  
- Mild: `--bma-success` green

**Rules:**
- Bar height: 6px, border-radius: 3px (pill ends)
- Segment proportional to count (not fixed width per segment)
- Legend uses dot (8px circle) + Sarabun 12px label + Inter 12px count

**Why it works:** Shows severity distribution as a shape, not a table. A quick glance reveals whether a patient's bleeding events are predominantly severe or mostly mild — without reading any numbers.

**Apply to:** Any breakdown of a categorical count by severity or status.

---

### Pattern 8 — Chart + Side Stats Panel Layout

**What it does:** A full-width section splits horizontally: the chart occupies ~65% of the width, and a stats summary panel occupies the remaining ~35%.

```
┌─ Chart (65%) ──────────────────────────┬─ Summary (35%) ──────────┐
│                                         │  TOTAL EVENTS             │
│    ▓  PEAK                              │  5 ครั้ง / 12 เดือน       │
│    ▓  ▓                                 │  เฉลี่ย 0.42 ครั้ง/เดือน  │
│  ▓ ▓  ▓ ▓                              │                            │
│  ─────────── ม.ค. ก.พ. มี.ค. ...       │  PEAK MONTH               │
│                                         │  พ.ค. 2568                │
│  Legend chips row                       │  BY TYPE                  │
│  ● Bleeding  ● Thromboembolism  ● Side  │  ● Bleeding  2            │
└─────────────────────────────────────────┴───────────────────────────┘
```

**Rules:**
- Chart uses CSS grid: `grid-template-columns: 1fr 280px` (or similar fixed right panel)
- Right panel contains only computed/derived stats, never raw data
- Right panel background: same `#FFFFFF` card, separated by a 1px divider or gap — no nested card border

**Why it works:** A chart alone requires the viewer to interpret peaks visually. The stats panel does the interpretation — "PEAK MONTH: พ.ค. 2568, 3 ครั้ง" — so the chart and text reinforce each other.

---

### Pattern 9 — Direct Chart Annotation (PEAK Marker)

**What it does:** The tallest bar in the chart receives a direct annotation: a "PEAK" label above the bar with a dashed vertical line pointing down into it.

**Implementation:** Chart.js custom plugin or `afterDraw` hook — draw `PEAK` text (Inter 10px uppercase, muted color) + a 1px dashed vertical line from the label down to the bar top.

**Rules:**
- Only one PEAK marker per chart
- Annotation only appears if the peak is clearly defined (one month > all others by ≥2 events)
- If all months are equal, no annotation
- The PEAK label links semantically to the "PEAK MONTH" stat in the right panel

**Apply to:** Any bar or line chart where a single outlier period is clinically significant.

---

### Pattern 10 — Triple-Encoding Temporal Data

**What it does:** Date-sensitive data in a table is displayed with three concurrent encodings:

1. **Absolute date in Buddhist Era:** `12 มิ.ย. 2568` — the canonical clinical record
2. **Relative time:** `23 วันที่แล้ว` — immediate human readability
3. **Recency heat:** Row position (newest at top) implies recency without additional UI

**Typography:**
- Absolute date: Sarabun 14px 600, primary color
- Relative time: Sarabun 12px muted, below the date

**Why it works:** A pharmacist reading the table needs both: the absolute date for documentation and the relative time for clinical urgency (was this last week or last year?). Showing only one forces mental arithmetic.

---

### Pattern 11 — Allergy Chip Pattern

**What it does:** Drug allergies display as inline pill chips with a colored dot prefix, inside the patient info section.

```
● Penicillin   ● Aspirin
```

**Rules:**
- Background: light amber tint (`--bma-warning` at 10% opacity)
- Border: `--bma-warning` at 30% opacity
- Dot: solid `--bma-warning` orange (8px)
- Text: Sarabun 13px, color `--bma-warning-dark`
- Chips wrap inline; they do not truncate

**Why it works:** Allergies are a safety-critical data type. The amber color signals caution without screaming emergency. The dot is a second signal encoding (not color-only). The chip format lets multiple allergies coexist without a list.

**Do not use this format for:** Non-safety categorical data (blood type, insurance type). Those are plain text. The amber chip carries clinical weight — use it only for contraindications and allergy flags.

---

### Pattern 12 — Dual CTA Hierarchy in Page Header

**What it does:** The page header's right side holds exactly two action buttons with clearly different visual weight.

```
[  พิมพ์สรุป  ]    [ เริ่ม Warfarin Dose Tool ]
   secondary           primary
   outline             filled BMA green
```

**Rules:**
- Never more than one filled (primary) button in the header
- Secondary action: outlined button, same border-radius as primary, no background fill
- If there are three or more actions, collapse secondary actions into a `...` overflow menu
- Primary CTA label names the main workflow continuation, not a generic "Continue" or "Next"

**Why it works:** A pharmacist's eye goes directly to the filled green button — no ambiguity about which action is primary. The outline button is available but subordinate.

---

### Pattern 13 — Severity Badge System (Table Cells)

**What it does:** Clinical severity in table cells uses filled, high-contrast, all-caps badges — not text, not soft chips.

| Severity | Background | Text |
|---|---|---|
| SEVERE | `--bma-emergency` (#B72C2C) | white |
| MODERATE | `--bma-warning` (#FB8C00) | white |
| MILD | `--bma-success` (#4CAF50) | white |

**Rules:**
- All-caps: yes — severity is a classification, not prose. All-caps differentiates it visually from type labels (which use Title Case)
- No border, only background fill — a bordered badge at this scale reads as weaker than its clinical weight
- Border-radius: `--bma-radius-sm` (4px) — square-ish, not pill. Pill shape is for status/state (e.g., "สิ้นสุดการรักษา"); square is for categorical severity

**Do not use for:** Non-severity categorical labels. The filled badge carries the semantic weight of a clinical judgment.

---

### Pattern 14 — Table Record Count Display

**What it does:** The table header shows the current record window and total count in a single phrase.

```
ประวัติภาวะแทรกซ้อน  แสดง 5 / 5 รายการ
```

**Format:** `แสดง [visible] / [total] รายการ`

**Rules:**
- Position: inline with the table title, not below it
- Typography: Sarabun 13px muted — supporting info, not primary
- When filtered: `แสดง 2 / 5 รายการ` — the denominator stays total, making it clear a filter is active
- When showing all: `แสดง 5 / 5 รายการ` — still show it, so the pharmacist knows this is the complete history

---

## Pattern Application Priority

When building a new page in BMA Doctor, apply these patterns in this order:

1. **Page structure:** Two-zone layout (Pattern from Two-Zone section above)
2. **Patient context:** Clinical Module Summary Block if patient-specific (Pattern 3)
3. **Tabs:** Volumetric badges if tabs contain records (Pattern 2)
4. **Summary layer:** KPI Strip for aggregate metrics (Pattern 4)
5. **Category breakdown:** Interactive Filter Cards if multiple types exist (Pattern 5)
6. **Visualization:** Chart + Side Stats Panel for time-series data (Pattern 8)
7. **Details layer:** Table with record count, dual-date format, severity badges (Patterns 13, 14, 10)

> Source: Visual analysis of `AtsPatientDetail` screenshots, cross-referenced against `PRODUCT.md` clinical workflow requirements.
