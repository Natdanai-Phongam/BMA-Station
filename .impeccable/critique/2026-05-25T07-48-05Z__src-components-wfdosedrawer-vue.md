---
target: src/components/WfDoseDrawer.vue
total_score: 20
p0_count: 1
p1_count: 2
timestamp: 2026-05-25T07-48-05Z
slug: src-components-wfdosedrawer-vue
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "ยืนยัน INR" button invisible until dirty; no persistent confirmed-state indicator |
| 2 | Match System / Real World | 3 | Thai clinical language strong; "Override Reason" leaks English |
| 3 | User Control and Freedom | 2 | No undo after save; option cards can't be deselected; custom card has no cancel path |
| 4 | Consistency and Standards | 3 | Mostly cohesive; confirm button style inconsistency between Step 1 and custom card |
| 5 | Error Prevention | 2 | No dose sanity guard on custom input; no save confirmation; tab-out of INR doesn't auto-confirm |
| 6 | Recognition Rather Than Recall | 2 | Conditional button requires recall of flow; "กำหนดเอง" card gives no expansion affordance |
| 7 | Flexibility and Efficiency | 1 | Enter on INR input works but invisible; no keyboard path for option card selection |
| 8 | Aesthetic and Minimalist Design | 2 | All 3 steps simultaneously; header repeats INR + dose already in Step 1 body |
| 9 | Error Recovery | 2 | Toast clear; save error appears below Step 3, not near the empty selection area |
| 10 | Help and Documentation | 1 | No contextual tooltips; Override Reason unexplained; no protocol reference |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

### Priority Issues

**[P0] The INR confirmation model is a silent trap** — button only appears when dirty, no persistent confirmed state, stale-warn is reactive not proactive. Fix: always-visible button (disabled when clean), green confirmed ring on input, auto-confirm on blur.

**[P1] Three steps rendered simultaneously break the step metaphor** — Step 3 save is never actually blocked by Steps 1/2 state. Fix: lock save button with annotation until selection exists; move current-dose-block to header (Option C).

**[P1] Custom dose input has no clinical sanity guard** — no warning for extreme deviations. Fix: inline warning in custom card when |pct| > 30%.

**[P2] Context duplication header vs Step 1 body** — current dose shown twice within 100px. Fix: remove dwr-current-dose-block from Step 1.

**[P2] Option cards are keyboard-dead** — div elements with no tabindex, role, or keydown handlers. Fix: tabindex="0" + role="button" + @keydown.enter on all option cards.

### Persona Red Flags

**ภก. ปรีชา (experienced BMA pharmacist):** Types new INR, badge updates, assumes system registered it, proceeds to Step 2. Saved dose calculated on previous INR because confirmedInr never updated. Override Reason field in English — unclear if mandatory.

**Alex (power user):** Tab order to "ยืนยัน INR" unreliable. Must reach for mouse to click option cards — hard break for keyboard workflows.

**Sam (screen reader):** INR input has no label for. Toast has no ARIA live region. Option cards have no ARIA role.

### Minor Observations

- "Override Reason" should be Thai: "เหตุผลที่เบี่ยงเบนจากแนวทาง"
- saveLabel uses em dash — replace with colon
- HOLD states have no save path; no guidance on next steps
- Step 1→2 gap should be larger than 2→3 to reinforce decision hierarchy
