# Plan — Data Scaling & Loading Architecture

> Master reference plan สำหรับงานขยายข้อมูล (40–50 ผู้ป่วย/วัน) + data-loading architecture
> สร้าง: 2026-06-08 · สถานะ: **planning (ยังไม่ implement)**
> ลำดับงานที่ตกลง: **#5 architecture ก่อน → generator ทีหลัง**

---

## 0. Requirement (โจทย์ใหม่)

1. เพิ่ม throughput เป็น **40–50 ผู้ป่วย/วัน** เฉลี่ย WF / NOAC ครึ่งๆ (~20–25 ฝั่งละ)
   รวมคนไข้ใหม่ + คนไข้เดิม follow-up สุ่มรายสัปดาห์
2. ข้อมูลอยู่ในช่วง **1 เม.ย. – 31 พ.ค. 2026** เท่านั้น (mock date = 2026-05-31)
3. ต้องเตรียมรองรับการ **scale เวลาเกิน 31 พ.ค.** ในอนาคต

### Scale math
- Window 1 เม.ย.–31 พ.ค. 2026 = **43 วันทำการ**
- 40–50/วัน → **~1,720–2,150 visits** (WF ~860–1,075 INR + NOAC ~860–1,075 dispensing)
- **unique patients ~600–800 คน** (full realistic)

---

## 1. Decisions log (ยืนยันแล้ว)

| หัวข้อ | ตัดสิน |
|---|---|
| Date window | **Apr–May เท่านั้น** (regen ใหม่หมด, uniform 2-เดือน) |
| Unique pool | **Full realistic ~600–800 คน** (bundle ~5MB ยอมรับ) |
| ข้อมูลเดิม 38+34 | **Regenerate ใหม่หมด + re-inject demo** (w002, w034 valve, +1 DVT) |
| ความสมจริง | **ใช้ engine จริง** (`warfarinDosing.ts` + `noacEngine.ts`) → KPI derive ถูก |
| ลำดับงาน | **#5 architecture ก่อน → generator ทีหลัง** |
| Scope #5 ตอนนี้ | **Scope A** (repo + dynamic import + lazy routes + kpi-summary); Scope B (MSW) เลื่อน |

---

## 2. สถานะระบบปัจจุบัน (baseline)

### ไฟล์ data (5 ไฟล์ต้อง sync กัน)
| ไฟล์ | บทบาท | ตอนนี้ |
|---|---|---|
| `patient-detail.json` | demographics, allergies, complications, หมอ | 69 |
| `ats-patients.json` | dashboard lists (wf[]+noacs[]) | wf 36 / noac 33 |
| `warfarin-patients.json` | profile + inrHistory + doseAdjustments + ttr + schedule | 38 (452KB) |
| `noac-patients.json` | profile + dispensingHistory | 34 |
| `kpi-operational.json` | mock numbers (patientsPerDay ฯลฯ) | — |
| *(เสริม)* physicians.json, consultations.json, ats-dashboard.json | | |

- switching patients (อยู่ทั้ง WF+NOAC): `w002`, `w034`, `n006`
- patient-detail ⊇ (wf ∪ noac) ✓ แต่ count ข้ามไฟล์ไม่ตรง (จะ unify ตอน generate)

### Loading (ปัญหาที่จะแก้ด้วย #5)
- **Router = static** (`component: DdAtsDashboard`) → ทุกอย่างรวมเป็น **chunk เดียว ~1.17MB**
- 4 หน้า import JSON **synchronous ที่ top-level** → defer ไม่ได้
- หลัง scale (~5MB JSON) → chunk เดียว ~6MB (เพดานปัญหา)

import sites: `DdAtsDashboard.vue`, `WarfarinDoseTool.vue`, `NoacAlgorithm.vue`, `AtsPatientDetail.vue`

---

## 3. PART A — Data-loading Architecture (#5, ทำก่อน)

### 3.1 สถาปัตยกรรม: Repository + pluggable driver
```
pages → repository (async interface) → driver (สลับได้)
                                        ├─ staticDriver : dynamic import() ← ทำตอนนี้
                                        └─ apiDriver    : fetch + MSW      ← Scope B (เลื่อน)
```

### 3.2 ไฟล์
**สร้างใหม่:**
- `src/data/repository/types.ts` — `DataRepository` interface + `KpiSummary` types
- `src/data/repository/staticDriver.ts` — dynamic import() + in-memory cache + type cast รวมศูนย์
- `src/data/repository/index.ts` — `export const repo = staticDriver` (จุดสลับ)
- `src/composables/useAsyncData.ts` — helper `{ data, loading, error }`

**แก้:** `src/router/index.ts` (lazy) · 4 pages (async) · *(ภายหลัง)* generator emit `kpi-summary.json`

### 3.3 Repository interface (contract)
```ts
export interface DataRepository {
  getDashboardConfig(): Promise<AtsDashboardConfigData>
  getKpiOperational(): Promise<KpiOperationalData>
  getKpiSummary(): Promise<KpiSummary>          // ⭐ ใหม่ — pre-aggregated
  getPhysicians(): Promise<PhysicianData[]>
  getAtsPatients(): Promise<AtsPatientsData>
  getWarfarinPatients(): Promise<Record<string, WarfarinPageData>>
  getWarfarinPatient(id: string): Promise<WarfarinPageData | null>
  getNoacPatients(): Promise<Record<string, NoacPatientData>>
  getNoacPatient(id: string): Promise<NoacPatientData | null>
  getPatientDetail(id: string): Promise<PatientDetailData | null>
  getPatientDetails(): Promise<Record<string, PatientDetailData>>
  getConsultations(): Promise<ConsultationsData>
  // เผื่ออนาคต (Scope B ค่อย implement จริง)
  getWarfarinPatients_windowed?(range: { from: string; to: string }): Promise<Record<string, WarfarinPageData>>
}
```
ทุกอย่าง `Promise` → สลับ static↔fetch โดย pages ไม่รู้

### 3.4 staticDriver (dynamic import + cache)
```ts
const cache = new Map<string, unknown>()
async function load<T>(key: string, loader: () => Promise<{ default: unknown }>, cast: (r: unknown) => T): Promise<T> {
  if (!cache.has(key)) cache.set(key, cast((await loader()).default))
  return cache.get(key) as T
}
export const staticDriver: DataRepository = {
  getWarfarinPatients: () => load('wf',
    () => import('@/data/mock/warfarin-patients.json'),
    r => r as Record<string, WarfarinPageData>),
  getWarfarinPatient: async (id) => (await staticDriver.getWarfarinPatients())[id] ?? null,
  // ...
}
```
- `import('...json')` → Vite code-split เป็น chunk แยก โหลด on-demand
- cache → โหลดไฟล์ละครั้ง/session
- type cast ย้ายมารวมศูนย์ที่นี่ (ออกจาก 4 หน้า)

### 3.5 ⭐ kpi-summary contract (หัวใจของ scale)
generator (งานหน้า) pre-aggregate ไว้ → dashboard อ่านแทนคิดจาก raw:
```ts
export interface KpiSummary {
  generatedAt: string
  mockNow: string
  periods: Record<'month' | 'quarter' | 'year', KpiPeriodSummary>
}
export interface KpiPeriodSummary {
  wf:   { total: number; ttrGoalMet: number; ttrAvg: number; inrInRange: number }
  noac: { total: number; appropriate: number }
  safety: { bleeding: number; thrombosis: number; aeHosp: number; death: number; medError: number; denom: number }
  ats:  { resolutionRate: number; acceptanceRate: number; responseTimeHr: number; resolutionTimeHr: number }
}
```
→ Dashboard KPI section อ่านไฟล์ ~KB ไม่ต้องโหลด raw 5MB เพื่อคำนวณ

### 3.6 Page migration pattern
**ก่อน:**
```ts
import allWarfarinRaw from '@/data/mock/warfarin-patients.json'
const allWarfarin = allWarfarinRaw as Record<string, WarfarinPageData>
const enriched = computed(() => /* ใช้ allWarfarin */)
```
**หลัง:**
```ts
import { repo } from '@/data/repository'
const allWarfarin = ref<Record<string, WarfarinPageData>>({})
const loading = ref(true)
onMounted(async () => {
  allWarfarin.value = await repo.getWarfarinPatients()
  loading.value = false
})
const enriched = computed(() => /* ใช้ allWarfarin.value (default {}) */)
```
+ template `<LoadingState v-if="loading" />`
- **ความเสี่ยง:** computed ที่ assume data พร้อม → ต้องมี default ปลอดภัย ({}/[]) ทุกตัว (mechanical, ตรวจทีละ computed)

### 3.7 Lazy routes
```ts
{ path: '/dd-ats', component: () => import('@/pages/DdAtsDashboard.vue') }
```
entry เหลือแค่ shell

### 3.8 Phasing (commit ทีละก้อน)
1. **P1** — สร้าง repository (types + staticDriver + index + useAsyncData) เพิ่มอย่างเดียว build ผ่าน
2. **P2** — migrate ทีละหน้า: NoacAlgorithm (เล็กสุด) → WarfarinDoseTool → AtsPatientDetail → DdAtsDashboard (ใหญ่สุด) commit ทีละหน้า
3. **P3** — lazy routes
4. **P4** — เพิ่ม `getKpiSummary`; ชั่วคราวให้ staticDriver คำนวณจาก raw → ภายหลัง generator gen ไฟล์จริงมาแทน (interface เดิม)

### 3.9 Verification (ทุก phase)
- `tsc` 0 · `npm run build` ✓ + เช็ค chunk (entry เล็กลง, JSON แยก chunk)
- dev: เปิดทุกหน้า loading→data ครบ, KPI เท่าเดิม, tables/detail/drawer ทำงาน, demo (w002/w034) ถูก

### 3.10 ⚠️ Caveats (honest)
- **Scope A แก้:** entry bundle + การคำนวณ KPI ของ dashboard (ผ่าน kpi-summary) + หน้าอื่นเบาลง
- **Scope A ยังไม่แก้:** dashboard/list **tables ยังโหลด raw เต็มชุด** (แสดงทุกแถว) — static dynamic-import slice ราย-page ไม่ได้
- **slice tables จริง (windowing ระดับ transfer)** = ต้อง **Scope B (MSW/API)** → เลื่อนจน table ใหญ่จนเจ็บ

### 3.11 ⭐ Two-tier data model (list projection) — แก้ list โหลดช้า
ตาราง list ใช้จาก record หนักแค่ ~5 fields/คน (status, ttr, dose, major-ixn, last-concordance) **ไม่ใช้ inrHistory/dispensingHistory** (ตัวกินขนาด ~90%)
- **Tier-1 `patient-list` (เบา):** generator pre-project `WfListEntry`/`NoacListEntry` (status & concordance precomputed) → dashboard อ่านแค่นี้ (~300-400KB ที่ 600 คน vs ~5MB) + ไม่ต้องโหลด allWarfarin/allNoac/allDetail (คู่กับ kpi-summary)
- **Tier-2 raw record (หนัก):** โหลดเฉพาะตอนเปิด detail ผ่าน `getWarfarinPatient(id)`/`getNoacPatient(id)`
- contract: `getPatientList(): Promise<PatientListData>` + `WfListEntry`/`NoacListEntry`/`PatientListData` ใน `repository/types.ts` (**วางแล้ว**) — generator เติม
- เสริม: **virtualization/pagination** (`BmaTablePagination`) สำหรับ render 600 แถว (render ไม่ใช่ load)

---

## 4. PART B — Generator (ทำหลัง #5)

### 4.1 เครื่องมือ
`scripts/generate-ats-data.ts` รันผ่าน `npx tsx` (import util จริงจาก src)
→ seeded RNG (reproducible) → in-memory model เดียว → serialize ทุกไฟล์พร้อมกัน (consistency 100%)

### 4.2 Future-proofing ที่ฝังตั้งแต่แรก (เผื่อ scale เวลา)
1. **config-driven** — รับ `{ startDate, endDate, mockNow, visitsPerDay }` → ขยายเวลา = แก้ param + รันใหม่
2. **couple `mockNow` ↔ `VITE_MOCK_DATE`** — constant กลาง (`data-window.ts`) ทั้ง generator + app อ่านตัวเดียว
3. **seed keyed ด้วย `(patientId, date)`** ไม่ใช่ global sequential → รันซ้ำ window ยาวขึ้น record เดิมไม่เปลี่ยน (diff สะอาด)
4. **patient lifecycle** (`activeFrom/activeTo`, enroll/exit/switch) → pool ไม่โตไม่จำกัด, active-per-period สมจริง

### 4.3 Phases
| # | Phase | ผลลัพธ์ |
|---|---|---|
| G1 | Identity & enrollment | ~320 WF + ~480 NOAC unique → patient-detail · re-inject demo (w002, w034 valve, +1 DVT) |
| G2 | Visit scheduling | 43 วันทำการ × ~20–25/ฝั่ง = new + follow-up (WF 1–4 สัปดาห์, NOAC รายเดือน) สุ่มรายสัปดาห์ |
| G3 | WF records (ผ่าน warfarinDosing) | INR + computeDosingSuggestion + buildWeeklySchedule + TTR (Rosendaal, เทียบ 70) + doseAdjustments |
| G4 | NOAC dispensing (ผ่าน noacEngine) | computeNoacRecommendations → dispensed/override + clinicalStatus + concordance + withhold |
| G5 | Complications | แจก bleeding/thrombosis/aeHosp/death/medError → safety KPI ต่ำกว่าเป้า |
| G6 | ats-patients.json + **patient-list.json** | wf[]/noacs[] lists จาก model เดียว + ⭐ Tier-1 projection (§3.11: status/concordance precomputed) |
| G7 | kpi-summary.json + kpi-operational | ⭐ pre-aggregate ตาม §3.5 + patientsPerDay ≈ 45 |
| G8 | Verify | tsc + build + KPI สมเหตุผล + tables เต็ม + demo ครบ |

### 4.4 ค่า default ที่จะใช้ (ปรับได้ก่อนรัน)
- NOAC indication mix: ~80% NVAF, ~20% DVT/PE/CAT (โชว์ phased dosing)
- Concordance/appropriateness: ~75–80% (ผ่านเป้าแบบสมจริง)
- TTR: ~72–75% ของ WF ถึง ≥70
- Safety: complication rate ต่ำกว่าเป้า (bleeding<2% ฯลฯ)

---

## 5. เพดาน + ทางขยายอนาคต (#5 Scope B)

- static bundle เพดาน ~3–4 เดือน (~10MB) → เกินนั้นต้อง:
  - **lazy-load per period** (windowed) / **MSW mock API** + pagination / **split ไฟล์รายเดือน**
- เปลี่ยน static→API = แก้ `src/data/repository/index.ts` บรรทัดเดียว (`export const repo = apiDriver`)
- endgame: API คืน pre-aggregated summary + paginated tables → dashboard ไม่ต้องดึง raw เลย

---

## 6. KPI targets (อ้างอิง — `src/data/config/kpi-targets.ts`)

- Safety (upper bound %): bleeding 2, thrombosis 2, aeHosp 5, death 1, medError 1
- Quality: wfAppropriateness 70, noacAppropriateness 80, **wfTtrGoal 70** (per-patient), avgLOS ≤5
- ATS: resolutionRate 80, acceptanceRate 75, responseTimeHr ≤2, **resolutionTimeHr ≤24**

---

## 7. สถานะ checklist

- [x] #5 P1 — repository layer (types/staticDriver/index/useAsyncData)
- [x] #5 P2 — migrate 4 pages (Noac/Warfarin/Detail/Dashboard → repo, loading guards)
- [x] #5 P3 — lazy routes (3 routes → dynamic import)
- [x] #5 verify — build code-split ✓ (entry 1,105KB เดียว → entry ~510KB + JSON/pages เป็น chunk แยก on-demand, warning >500KB หาย)
- [x] #5 fix — DataCloneError: data maps → `shallowRef` (เลิก deep-proxy dataset ใหญ่, perf) + seedStore → JSON clone (proxy-safe) + try/catch/finally hardening ทั้ง 4 หน้า
- [x] #5 §3.11 — two-tier contract วางใน types.ts (`PatientListData`/`WfListEntry`/`NoacListEntry` + getPatientList commented)
- [ ] #5 P4 — getKpiSummary + getPatientList → **fold เข้า generator** (เลี่ยง throwaway; generator emit ไฟล์จริงตาม contract แล้วเพิ่ม method + wire dashboard)
- [ ] Generator G1–G8 (รวม emit kpi-summary.json + patient-list.json + wire dashboard ให้ใช้ list/summary)
- [ ] wire dashboard tables → getPatientList (เลิกโหลด allWarfarin/allNoac/allDetail) + virtualization/pagination
- [ ] (เลื่อน) #5 Scope B — MSW mock API

### Build chunk baseline (หลัง P1–P3, 2026-06-08)
entry: index 264KB + 245KB · pages: ConsultList 29 / DdAtsDashboard 95 / AtsPatientDetail 185KB ·
data (on-demand): warfarin-patients 189 / noac 48 / patient-detail 23 / ats-patients 10 / consultations 6 / kpi-ops 2 / physicians 1 / config 1 KB
