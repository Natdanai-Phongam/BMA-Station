# งานค้าง / Pending Work

> บันทึกสถานะ ณ ตอนพัก — อ้างอิงเร็ว ไม่ใช่ spec. ลบรายการที่ทำเสร็จออกได้เลย.

## 1. ยังไม่ commit (งานทั้ง session นี้อยู่ใน working tree)

พร้อม commit เมื่อสั่ง — กลุ่มงาน:
- **Hospital + Quality KPIs** — 4 รพ. (ตากสิน/กลาง/เจริญกรุง/ราชพิพัฒน์) + tune KPI เป็น WF 53% / NOAC 62% / TTR 33% (deterministic ผ่าน `assignKpiQuotas`) + hospital filter หน้า KPI + safety section simplify + pagination fix + table filters
- **NOAC reference single-source** — `noacReference.ts` (ทุก cutoff/criteria/dose/cadence) · `noacEngine` refactor อ่านจากมัน (behavior byte-identical) · `NoacReferenceTable.vue` (ตาราง lookup, ตอนนี้ `:default-open="true"`)
- **NOAC dispensing drawer redesign** — dose-level choice (standard/reduced) + `clinicalStatus` จริง (under/over) + criteria checklist + segmented selector `.ndd-seg` + days-supply ตรง cadence (`followUpDaysForCrCl`)
- **NOAC comparison card** — `NoacCurrentVsRecommended.vue` (ปัจจุบัน→ที่ควรเป็น, state tint, verdict ในกล่อง) merge เป็นหัวของ "คำแนะนำการจ่ายยา" + ยาที่ใช้ร่วมอยู่ขวา
- **ปุ่ม save drawer ทั้ง 2 ระบบ** → "ยอมรับตามคำแนะนำ" (interim)
- **Shared consult store** — `useConsultStore.ts` (seed repo + appends persist localStorage) · toggle "ส่งเข้าห้องปรึกษา" ใน WfDoseDrawer · dose จากแท็บเครื่องมือ post เข้า thread ได้ · attribution = เภสัช (CURRENT_USER) · w001 มี curated consult thread
- **Docs consolidation** — เหลือ PRODUCT/DESIGN/DATA/README (ลบ ONBOARDING + PLAN-DATA-SCALING) + DATA.md ใหม่
- **Font: Sarabun ล้วน (permanent)** — `--bma-font-data` alias `--bma-font-thai` (ทั้งคู่ = Sarabun) · ลบ Inter ออกจาก `@import` + เพิ่ม weight 800 (รองรับ font-weight:900 ที่ใช้อยู่) · อัปเดต DESIGN.md hard rule + DATA.md + comment ที่เหลือทั้งหมด

## 2. Deferred / ก้าวถัดไป (ยังไม่ทำ)

- **Flow evaluation → `FLOW-EVAL.md`** (เอกสารใหม่ — ประเมิน flow ทั้งระบบ vs โมเดล "decision-log ไม่ใช่ record"):
  - **#1 ✅ DONE (Quick honesty)** — WF visit log → read-only (ถอด inline edit + toast orphaned) ให้ตรง NOAC · toast save ทั้ง 2 drawer → ขอบเขต HIS ("บันทึกการตัดสินใจแล้ว — ดำเนินการสั่งจ่ายในระบบ HIS")
  - **#2 (ต่อไป)** ยุบ warfarin 2 copy (embedded tool vs hub `onConsultSaved`) → workspace store ชุดเดียว
  - **#3** ทำ recommendation legible บนหน้า WF ก่อนเปิด drawer (ให้เท่า NOAC `NoacCurrentVsRecommended`)
  - **#4** approval feature บน decision-log (ดู [project-greenfield-priorities]) — ปุ่ม "ส่งต่อปรึกษาเคส" (เพิ่มแล้วทั้ง 2 drawer, ตอนนี้ stub emit `forwardConsult`) + role-switch "ดูในมุมแพทย์" ที่ chat header + append-only request/response (`replyTo`) · v1 = Warfarin ก่อน
- **Vuetify alignment** (ดู memory [feedback-vuetify-first] + DESIGN.md "Vuetify customization protocol"):
  - **กลยุทธ์ (ยืนยันแล้ว):** "Vuetify for behaviour, tokens for looks" — Vuetify เฉพาะ form/dialog/table/nav, presentation (card/badge) คง plain element + token (coupling = 0) · งานวิจัยเจอ: per-component SASS var override ไม่ได้ → per-component shape ต้องใช้ runtime `defaults`
  - **#2 ✅ DONE** — `settings.scss` override `$rounded` map ทั้ง map (sm/md/lg/xl = 4/8/12/16) · VCard ใช้ `rounded:'lg'`+`border:'thin'` defaults → ลบ border-radius/border `!important` 2 จุด · ลบ VBtn outlined-error `!important` ซ้ำซ้อน 2 จุด (theme.error = #B72C2C = --bma-emergency)
  - **#3 ✅ resolved by strategy** — *ไม่* migrate custom card เข้า VCard (เพิ่ม coupling) · VCard config จบแล้ว เหลือแค่ box-shadow `!important` ×2 (legit Layer 4 — custom token)
  - **#1 (ยังไม่ทำ)** รวม token source เดียว — alias `--bma-*` → `--v-theme-*` เฉพาะสีที่มีใน theme (ต้อง map + verify ทีละสี ไม่ free)
  - **(low-confidence, ต้อง verify ตอนเปิดดูจริง)** ลอง `!important` ออกจาก hover-bg (primary) + appbar/navdrawer border ว่า specificity ยังชนะไหม
- **ทิศ product ใหม่ (idea-stage — ดู memory [project-greenfield-priorities]):** read-only + log-only telemetry · multi-role (UI เดียว) · `DecisionLog` เป็นสิ่งเดียวที่เขียน + powers KPI · ต้องถอด in-memory mutation ทั้งระบบ
- **Greenfield priorities:** action-contract → single-state ต่อคนไข้ + identity/role → decision surface เดียว 2 module → IA workspace เดียว
- **(เลื่อนนานแล้ว)** repository Scope B — apiDriver/MSW (อ่าน external) แทน staticDriver

## 3. Nuances ที่ควรเก็บกวาดทีหลัง

- **Consult composer** ยัง post เป็น 'doctor' (จงใจไม่แตะ) — ถ้าอยากให้ตรงกับการ์ด dose (เภสัช) ค่อยแก้
- **Warfarin data 2 copy** (embedded WarfarinDoseTool vs parent AtsPatientDetail) ยังแยกกัน — รวมเฉพาะ consult thread แล้ว, warfarin data ยังไม่รวม (= ก้าว single-source-state)
