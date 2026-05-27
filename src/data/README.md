# Mock Data — Structure and Relationships

> **Status:** Complete for v1 development. All patient IDs (w001–w013, w002, n001–n006) have full entries across every relevant file.

---

## Patient ID Conventions

| Prefix | Program | Count | Example |
|--------|---------|-------|---------|
| `w`    | Warfarin | 12 patients (w001, w003–w013) | w001 = นาย บุญรอด ขจรศักดิ์ |
| `n`    | NOACs    | 6 patients (n001–n006) | n001 = นางสาว พัชรินทร์ สุวรรณโกมล |
| `w002` | NOACs (therapy-switched) | 1 patient | switched from Warfarin → Apixaban on 2568-01-15 |

> `w002` appears in `warfarin-patients.json` only as **historical pre-switch data**. Their canonical program is NOACs per `ats-patients.json`.

---

## Files and What They Own

### `ats-patients.json` — Canonical program membership list
The **source of truth** for which program a patient belongs to.

- `warfarin[]` — patients currently managed under Warfarin protocol (w001, w003–w013)
- `noacs[]` — patients currently managed under NOACs protocol (w002, n001–n006)
- Includes: id, name, HN, hospital, status, CrCl, eGFR (NOACs only), weight, referred
- Used by: `DdAtsDashboard.vue` (patient lists), `AtsPatientDetail.vue` (`derivedTherapy` computed)

**Do not use `warfarin-patients.json` or `noac-patients.json` to determine therapy classification.**

---

### `patient-detail.json` — Full demographic + clinical profile
One entry per patient. Loaded when opening `AtsPatientDetail`.

- Fields: id, name, HN, age, dob, sex, bloodGroup, phone, insuranceType
- Fields: allergies[], totalComplications, riskLevel, complicationSummary[], complications[]
- Fields: currentTherapy (`"warfarin"` | `"noacs"`)
- Fields: concurrentMedications[] (present for patients with relevant drug interactions — w002, n006)

Coverage: **w001–w013 + n001–n006** ✓

---

### `warfarin-patients.json` — Warfarin clinical data
Dispensing history and dose tracking for Warfarin patients.

- Top-level keys: patient IDs (w001, w002, w003, …w013)
- Per patient: `profile` (indication, targetINR, currentDose, doseHistory[]) + `dispensingHistory[]`
- `w002` entry = **historical data only** (pre-switch period). Kept intentionally for clinical audit trail.

Coverage: **w001–w013 including w002** ✓

---

### `noac-patients.json` — NOACs clinical data
Dispensing history and NOAC recommendation records for NOACs patients.

- Top-level keys: patient IDs (w002, n001–n006)
- Per patient: `profile` (indication, hasBleedScore, currentDrug, currentDose, therapyStartDate, followUpMonths) + `dispensingHistory[]`
- Each `dispensingHistory` record: id, patientId, dispensedAt, labData (weightKg, scrMgDl, crClMlMin, measuredAt), drugDispensed, dose, systemRank, wasTopRecommendation, pharmacistNote, nextFollowUpDate

Coverage: **w002 + n001–n006** ✓

---

### `therapy-switches.json` — Historical therapy change log
One record per therapy switch event.

- Fields: patientId, fromTherapy, toTherapy, switchDate, reason, clinicianNote
- Currently: 1 record — w002 (Warfarin → NOACs, 2568-01-15)

---

### `types/` — TypeScript interface definitions

| File | Interfaces |
|------|-----------|
| `ats-patients.ts` | `AtsPatient`, `AtsWarfarinPatient`, `AtsPatientsData` |
| `patient-detail.ts` | `PatientDetail`, `Complication`, `Allergy`, `ConcurrentMedication` |
| `warfarin.ts` | `WarfarinProfile`, `DispensingRecord`, `DoseHistoryEntry` |
| `noac.ts` | `NoacProfile`, `NoacDispensingRecord`, `NoacLabData`, `NoacRecommendationResult` |

---

## NOACs Patient Status Reference

| Status | Meaning | Patients |
|--------|---------|---------|
| `appropriate` | Dose and drug match clinical guidelines | w002, n001, n003 |
| `underdose` | Dose lower than guideline recommendation | n002 |
| `overdose` | Dose higher than guideline recommendation | n004 |
| `contra` | Drug contraindicated for this patient's renal function | n005 |
| `interaction` | Significant drug-drug interaction detected | n006 |

## Warfarin Patient Status Reference

| Status | Meaning |
|--------|---------|
| `in-range` | INR within therapeutic target (2.0–3.0) |
| `over-range` | INR above target |
| `under-range` | INR below target |

---

## Adding New Patients

When adding a new patient to the system, update files **in this order**:

1. `ats-patients.json` — add to `warfarin[]` or `noacs[]` array (program list)
2. `patient-detail.json` — add demographic + clinical profile entry
3. `warfarin-patients.json` OR `noac-patients.json` — add therapy-specific clinical data
4. `therapy-switches.json` — only if patient has switched programs

Use the next available ID:
- Warfarin: next after `w013` → `w014`
- NOACs: next after `n006` → `n007`
