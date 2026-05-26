# Critique: WarfarinDoseTool.vue
**Date:** 2026-05-25  
**Slug:** `src-pages-warfarindosetool-vue`  
**Register:** product  
**Assessment B:** DEGRADED — bundled detector not found; scores based on source review only.

---

## Executive Summary

Visual clustering is real and measurable. The page stacks 4 dense cards vertically — INR hero, 7-day schedule, 7-column log table, chart — with uniform 16px gaps and identical card treatments. Every zone competes at the same visual weight. The result is a page that's hard to scan vertically: a clinician looking for "what do I do next" can't extract it quickly because the decision zone (INR hero + CTA) doesn't visually dominate the supporting context (schedule, log, chart).

The **schedule card footer** and **log card position** are the two highest-priority issues. Both are fixable without restructuring the overall layout.

---

## Zone-by-Zone Analysis

### Zone 1: INR Hero Card (top-left, 60%)
**Density score: 6/10** (lower = more cluttered)

The large INR value (56px) is correct. The scan path hits it first. Problems emerge in the **meta column** — status badge + note text + interaction flag — stacked at `gap: 6px` with font sizes 13px → 11px → 10px. Three distinct elements at progressively smaller type, no spatial breathing room between them. The interaction flag at 10px is borderline legible.

The dose block on the right is now structurally correct (full-height column), but the `rgba(255,255,255,0.55)` background makes it visually soft against the card — it reads as a section rather than a distinct action zone.

**Violations against product principles:**
- *"State drives layout"* — the meta column doesn't change structure between therapeutic and emergency states; only color shifts. The information load is the same at INR 1.8 and INR 9.5.

### Zone 2: TTR Card (top-right, 40%)
**Density score: 8/10** — Not the problem.

Clean hierarchy: eyebrow → big value → meta → badge → detail. The "ANTICOAGULANT STEWARDSHIP (ATS)" eyebrow is slightly verbose but acceptable.

### Zone 3: Schedule Card (full-width, row 2)
**Density score: 4/10** — Primary clustering source.

Two sub-problems:

**3a. Day grid (5 layers per column × 7 columns = 35 data points)**  
Each column shows: day label → pill icon(s) → tablet count → unit word → mg amount. The tablet count (18px, bold) is the clinical number. The mg amount is a verification number for safety. But the pill icon *and* the tablet count say the same thing (how many pills) in two different visual formats. This redundancy costs vertical space and adds visual noise without adding clinical information.

**3b. Schedule footer (3 elements, no hierarchy)**  
Total dose, pill reference legend, and safety warning share one `flex-wrap` row. The safety warning uses an amber-background chip (`#FFFBF2` / `#FCD34D` border) that draws more visual attention than the total dose. But the total dose (35.00 mg/wk, styled in `--bma-green-500`) is the *more important* number — it's a clinical confirmation of the weekly plan. The amber warning is static, unchanging, important but not urgent. Currently it out-shouts the total.

### Zone 4: Log Card (full-width, row 3)
**Density score: 3/10** — Secondary clustering source.

**Column count**: 7 columns. Date · INR · Old dose · New dose · Δ% · Remarks · Edit. The INR chip at adjustment and the Δ% badge are the most visually complex columns (colored chips) but carry contextual-historical information. For a clinician making a decision *now*, the log is a supporting audit trail, not a primary input.

**Position problem**: The log sits between the schedule card (primary workflow) and the chart (supporting context). This creates a dense "information wall" at rows 2–3, after which the chart appears — but many users may not scroll to it. The chart is clinically more relevant for understanding INR trends than the log table is for making the next dose decision.

**Default visible rows**: 3 visible, with truncation at LOG_PREVIEW_COUNT. This is the right instinct. But 3 rows × 7 columns still renders 21 cells of content on initial load.

### Zone 5: INR Trend Chart (full-width, row 4)
**Density score: 7/10** — Mostly fine, mispositioned.

220px height is reasonable. The target-band + out-of-range points pattern is clear. The problem is position: it's last on the page, after the log table, so it functions as "more detail if you scroll" rather than "context to read alongside the INR value."

---

## Heuristic Scores

| Zone | Signal/Noise | Scan Path | Density | Hierarchy | Action | **Total** |
|---|---|---|---|---|---|---|
| INR Hero | 7 | 9 | 6 | 7 | 8 | **37/50** |
| TTR Card | 8 | 8 | 8 | 7 | 6 | **37/50** |
| Schedule | 5 | 6 | 4 | 4 | 7 | **26/50** |
| Log | 4 | 4 | 3 | 5 | 6 | **22/50** |
| Chart | 8 | 5 | 8 | 6 | 2 | **29/50** |
| **Page** | 6 | 7 | 5 | 5 | 7 | **30/50** |

---

## Prioritized Fixes

### H1 — Reorder: Chart before Log *(structure)*
Move `.chart-card--wide` above `.log-card`. INR trend history is contextually paired with the current INR value — seeing the trend line helps interpret "is 2.1 trending up or down?" The adjustment log is an audit tool; it doesn't need to interrupt the review-and-decide flow.

**Effort:** 2-line template reorder. Zero CSS changes.

### H2 — Schedule footer hierarchy *(density)*
Give the total dose (`35.00 mg/wk`) visual priority:
- Increase `sched-total-val` font size from 22px → 28px
- Separate the safety warning into its own row, full-width, below the footer data
- Make the pill reference legend lighter weight (reduce from `font-weight: 600` → `500`, shrink label to 8px)

**Effort:** ~10 CSS lines.

### H3 — Log table: reduce to 6 columns *(density)*
Remove the `ขนาดยาเดิม` (old dose) column, or merge it with `ขนาดยาใหม่` as "เดิม → ใหม่" in a single cell. The Δ% badge already conveys the direction and magnitude. Old dose is recoverable from the previous row's new dose — it's not adding clinical signal.

**Effort:** 1 template column + 1 th/td removal, minor CSS.

### M4 — INR meta column spacing *(density)*
Increase `gap` in `.inr-hero-meta` from `6px` → `10px`. Bump interaction flag font from `10px` → `11px`. This gives the warning flag enough presence to be read without squinting.

**Effort:** 2 CSS lines.

### M5 — Day grid: hide mg value by default *(density)*
`.day-mg` (the "X.X mg" line) shows the same fact as tablet count but in absolute mg. It's a verification number, not a primary number. Hide it by default with `display: none` on `.day-col`; surface it on hover for desktop, or via a "แสดงมิลลิกรัม" toggle. Removes 7 data points from the grid instantly.

**Effort:** 3 CSS lines + optional toggle.

---

## Not Recommended

- **Reducing the INR value size** — 56px is correct for this product register.
- **Removing the adjustment log** — audit trail is a core product requirement.
- **Dark mode** — day-shift clinical workflow; white surface is correct.
- **Collapsing the schedule card** — the 7-day view is the primary output the patient takes home.
