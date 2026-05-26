---
target: INR hero card in WarfarinDoseTool.vue
total_score: 22
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-05-25T04-56-11Z
slug: src-pages-warfarindosetool-vue-inr-hero-card
---
## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status badge, emergency pulse, toast — no data loading states |
| 2 | Match System / Real World | 3 | Strong Thai clinical language; EN/TH label mixing unsystematic |
| 3 | User Control and Freedom | 2 | No undo after saving dose adjustment |
| 4 | Consistency and Standards | 3 | "ขนาดยาปัจจุบัน" (TH) vs "TARGET INR" (EN) in same card |
| 5 | Error Prevention | 2 | Half-tablet warning good; no dose entry guardrails |
| 6 | Recognition Rather Than Recall | 3 | Range mini makes target visible; interaction flag links to Drawer |
| 7 | Flexibility and Efficiency | 1 | Zero keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Nested bordered panel; duplicate 9px INR value; dose competes as co-hero |
| 9 | Error Recovery | 2 | Log edit exists; no path to flag erroneous INR |
| 10 | Help and Documentation | 1 | Range panel unexplained; no tooltips |
| **Total** | | **22/40** | **Acceptable** |

## Priority Issues
- [P1] Nested card inside card on range mini panel — remove border/bg/radius, remove duplicate marker tip
- [P1] Flat meta hierarchy — badge 11px smaller than note 12px; badge must dominate after the number
- [P2] Low INR value uses emergency-red — use amber #B45309 instead
- [P2] Action strip dose 20px/900 reads as co-hero metric — reduce to 16px/700
