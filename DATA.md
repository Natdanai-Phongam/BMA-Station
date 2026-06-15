# Architecture & Data

> Engineering reference for BMA Station ATS. Code is the source of truth; this file holds intent + the map. When something here disagrees with code, trust the code and fix this file.

## Stack

Vue 3 + TS (`<script setup>`) · Vuetify 3 (customized, see DESIGN.md) · Vite + vite-plugin-vuetify · Vue Router 4 (hash history) · vue-chartjs/Chart.js v4 · Phosphor Icons · Font: Sarabun (Thai prose + numbers/data).

```bash
npm run dev      # http://localhost:5175/BMA-Station-ATS/
npm run build    # vue-tsc typecheck + vite build
```

## Modules & key files

**DD-ATS Warfarin** — INR review + protocol dosing
- `pages/WarfarinDoseTool.vue` (main) · `components/WfDoseDrawer.vue` (dose drawer)
- `utils/warfarinDosing.ts` (`computeDosingSuggestion`, `buildWeeklySchedule`) · `utils/inrStatus.ts` (6 INR states)

**DD-ATS NOAC** — rule-based NOAC selection + dispensing
- `pages/NoacAlgorithm.vue` (review) · `components/noac/NoacDispensingDrawer.vue` (dispense drawer)
- `components/noac/NoacCurrentVsRecommended.vue` (current↔recommended advisory) · `components/noac/NoacReferenceTable.vue` (drug lookup)
- `utils/noacEngine.ts` (`computeNoacRecommendations`) — sources every dose/cut-off/criterion from **`data/noacReference.ts` (single source of truth)**

**Shared** — `pages/DdAtsDashboard.vue` (KPI + patient tables, hospital filter) · `pages/AtsPatientDetail.vue` · `pages/ConsultList.vue`

## noacReference.ts — single source of truth (NOAC)

`src/data/noacReference.ts` holds all NOAC dosing data: renal CrCl cut-offs, dose-reduction criteria (`evaluateReduction`), structured standard/reduced doses, VTE regimens, follow-up cadence (`followUpDaysForCrCl`: CrCl ≥60→90 / 30–59→60 / <30→30 days). `noacEngine.ts`, the dispensing drawer, the reference table, and the generator all read from it so they can never drift. The engine emits structured `DrugResult.criteria` (value-vs-threshold, met flag) for the live checklist.

## Data loading — repository + two-tier

```
pages → repo (async interface) → staticDriver (dynamic import() → code-split JSON chunks, cached)
src/data/repository/{types,staticDriver,index}.ts   (swap point = index.ts)
```
- **Tier-1 (light):** `patient-list.json` (precomputed status/concordance, ~5 fields/patient) + `kpi-summary.json` → dashboard loads ~250KB, not the ~1.5MB raw.
- **Tier-2 (heavy):** raw `warfarin-patients` / `noac-patients` record loaded only when a detail page opens, via `getWarfarinPatient(id)` / `getNoacPatient(id)`.
- Large read-only maps use `shallowRef` (avoids deep-proxy + structuredClone-on-Proxy crash).
- `kpi-summary` is **per-hospital**: `ranges[fromToKey][hospitalId] = PeriodMetrics` (additive counts) + `ops[hid][mode]`. The dashboard sums selected hospitals' counts, then derives rates. Shared aggregation logic: `utils/kpi-metrics.ts → computePeriodMetrics`.

## Mock data

~597 patients (**WF 292 + NOAC 305**), 4 BMA hospitals, window **1 Apr – 31 May 2026** (`data/config/data-window.ts`, `mockNow` 2026-05-31, mirrors `VITE_MOCK_DATE`). See `src/data/README.md` for the per-file catalogue.

## Generator

`scripts/generate-ats-data.ts` (run: `npx tsx scripts/generate-ats-data.ts`) — seeded, reproducible, builds one in-memory model and serializes all files together (100% cross-file consistency). It imports the **real engines** from `src/` so generated records match runtime logic.

Pipeline (`scripts/gen/*`): `identity` (patients + hospital + edge cases) → `quotas.assignKpiQuotas` (deterministic flags so KPIs hit exact targets) → `schedule` → `warfarin` / `noac` (engine-driven) → `complications` (+ `vitalStatus`) → `lists` (Tier-1 projection) → `kpi` (per-hospital `computePeriodMetrics` + ops) → `consultations`. Seeded RNG keyed by `(patientId, …)` so re-runs keep unchanged records byte-identical.

**Verify after engine/generator changes:** regenerate, then `diff` the mock JSON against a pre-change copy (engine refactors must be byte-identical) + `npm run build`.

## KPIs

Targets in `src/data/config/kpi-targets.ts`. Quality KPIs are tuned (via `assignKpiQuotas`, not faked) to land **below** target: Warfarin appropriateness ~53% · NOAC appropriateness ~62% · TTR-goal ~33%. `clinicalStatus` (appropriate / underdose / overdose) is condition-relative (dose vs what CrCl/weight/criteria require now); `medError` is derived per-record (out-of-range INR / inappropriate NOAC dose), not stored as discrete events.

## Scaling ceiling (future)

Static bundle is fine to ~3–4 months of data. Beyond that: swap `repository/index.ts` to an `apiDriver` (MSW/real API) for windowed/paginated transfer — pages don't change (all `Promise`-based). Deferred until tables actually hurt.
