# Mock Data — file catalogue

> All data is **generated**, not hand-edited. Run `npx tsx scripts/generate-ats-data.ts` to regenerate; never edit these JSON files by hand. Architecture lives in `/DATA.md`.

~597 patients · window 1 Apr – 31 May 2026 · IDs: `w###` (Warfarin, 292) · `n###` (NOAC, 305). A few curated edge cases up front (e.g. `n002` dialysis, `n003` CrCl<15, `n004` mechanical valve, `n005` major interaction, `n006` DVT, `n007` CAT).

## Files the generator writes (7)

| File | Owns |
|---|---|
| `patient-detail.json` | per-patient demographics, allergies, `currentTherapy`, complications, `vitalStatus` (alive/deceased) + `mortality`, concurrentMedications |
| `warfarin-patients.json` | WF clinical: `profile` + `inrHistory` + `doseAdjustments` + `ttr` (Rosendaal) + `latestInr` |
| `noac-patients.json` | NOAC clinical: `profile` + `dispensingHistory[]` (labData, drug, dose, `clinicalStatus`, `wasTopRecommendation`, override, withhold) |
| `ats-patients.json` | dashboard lists `{warfarin[], noacs[]}` (id, name, HN, hospital, weight, referred, crcl/egfr) |
| `patient-list.json` | **Tier-1** light projection — precomputed `status`, `concordanceClass`, `deceased`, `ttrValue`, `majorInteractions`, `lastDispensedAt` per patient (what the dashboard tables read) |
| `kpi-summary.json` | **per-hospital** pre-aggregated `PeriodMetrics`: `meta` (hospitals, dataMinDate) · `ranges[from\|to][hospitalId]` · `ops[hospitalId][month\|quarter\|year]` |
| `consultations.json` | ATS consult threads |

`physicians.json` is a generator **input** (read, not written). `kpi-operational.json` / `ats-dashboard.json` are legacy and no longer regenerated.

## Cross-file rules

- `patient-detail` ⊇ (WF ∪ NOAC); a patient is in exactly one therapy (no WF/NOAC overlap).
- `currentTherapy` in `patient-detail` is the canonical therapy classification — not the presence of a clinical record.
- `kpi-summary.ranges[*]` counts are additive; summing all hospitals = the all-hospital total (verifiable by re-running `computePeriodMetrics` over the raw data).

## Types — `src/data/types/`

`patient-detail.ts` (PatientDetail, Complication, VitalStatus, Mortality, ConcurrentMedication) · `warfarin.ts` (WarfarinProfile, InrRecord, DoseAdjustment, WARFARIN_STRENGTHS) · `noac.ts` (DrugResult + `criteria`, NoacEngineInput, RecommendationLevel) · `noac-dispensing.ts` (NoacProfile, NoacDispensingRecord, NoacClinicalStatus) · `kpi-operational.ts` (PeriodMetrics, SafetyRow). Repository contracts (KpiSummary, WfListEntry, NoacListEntry) live in `src/data/repository/types.ts`.
