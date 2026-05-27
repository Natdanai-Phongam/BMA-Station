---
target: TARGET INR .inr-target-ref block in WarfarinDoseTool.vue
total_score: 23
p0_count: 1
p1_count: 2
timestamp: 2026-05-26T04-51-56Z
slug: src-pages-warfarindosetool-vue-inr-target-ref
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | INR value + badge present, but relationship to target range invisible |
| 2 | Match System / Real World | 3 | "TARGET INR" is correct clinical language |
| 3 | User Control & Freedom | 3 | Display-only, N/A |
| 4 | Consistency & Standards | 1 | 8px label violates DESIGN.md minimum 10px; "2–3" vs "5.0" inconsistent decimal precision |
| 5 | Error Prevention | 2 | No visual pre-attentive signal of how far out of range |
| 6 | Recognition Rather Than Recall | 1 | Pharmacist must mentally compute distance from range |
| 7 | Flexibility & Efficiency | 2 | 90-second workflow target depends on instant scanning |
| 8 | Aesthetic & Minimalist Design | 3 | Clean, but crossed from minimal into inert |
| 9 | Error Recovery | 3 | N/A |
| 10 | Help & Documentation | 3 | N/A |
| **Total** | | **23/40** | **Needs Work** |

## Anti-Patterns Verdict

No AI slop. Opposite problem: over-minimised to the point of being inert. CSS comment literally says "passive context" — an intentional decision that went too far.

CLI detector: unavailable (bundled detector not found). Browser visualization: not run. Fallback: manual source review.

## Overall Impression

Two most important numbers on screen — current INR and target INR — sit adjacent with zero visual relationship. The pharmacist must do mental subtraction that is the machine's job.

## What's Working

1. Position — directly below INR value, natural eye flow
2. Typography hierarchy — 56px vs 11px correctly signals relative importance

## Priority Issues

**[P0] Recognition → Recall failure — no visual relationship between current INR and target range**
- Why it matters: 90-second workflow, 30-40 patients per session; mental arithmetic accumulates
- Fix: INR range micro-track — 4px tall track showing target zone and current value marker

**[P1] 8px label violates DESIGN.md minimum (10px)**
- Why it matters: WCAG AA violation at this size; public health system accessibility risk
- Fix: Increase to 10px

**[P2] "2–3" — precision inconsistent with "5.0"**
- Why it matters: Inconsistent decimal display across the same card; "2–3" reads as integer bounds
- Fix: "2.0–3.0"

## Persona Red Flags

**Power clinical user (pharmacist):** Must mentally compute 5.0 − 3.0 = 2.0 for each patient × 35 patients = unnecessary cognitive load accumulation.

**Reviewing physician:** Target ref adds nothing beyond the badge that already exists.

## Minor Observations

- No unit on range — ambiguous outside clinical context
- Range value not state-colored — "2.0–3.0" in --bma-success-text when therapeutic would reinforce "good"
