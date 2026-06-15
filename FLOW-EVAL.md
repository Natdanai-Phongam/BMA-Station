# Flow Evaluation — BMA Station ATS

> ประเมิน flow การใช้งานทั้งระบบ เน้นหน้าอ่านคำแนะนำ Warfarin / NOAC. เกณฑ์ = โมเดลที่ซื่อตรง **"decision-log ไม่ใช่ system-of-record"** (ดู PRODUCT.md / greenfield memory). อ้างอิงเร็ว ไม่ใช่ spec.

## North-star flow (เกณฑ์ประเมิน)

แอปนี้ **ไม่ใช่** HIS/EMR — เป็น decision-support + decision-log เหนือระบบคลินิกภายนอก. ใบยาจริงถูกเขียนใน HIS นอกแอป.

```
READ    คำแนะนำ legible บนหน้า (ทั้ง 2 therapy เท่ากัน)
COMPUTE engine แนะนำ (warfarin titration / NOAC match)
DECIDE  drawer โมเดลเดียว: state → recommendation → accept/override+เหตุผล
LOG     append-only · อดีตแก้ไม่ได้ (supersede) · ชุดเดียวต่อคนไข้
ENACT   ขอบเขตชัด — "ดำเนินการสั่งจ่ายในระบบ HIS"
```

## 1. แผนที่ flow ปัจจุบัน (as-is)

```
2 ทางเข้า:  ConsultList (/) คิวปรึกษา  ·  DdAtsDashboard (/dd-ats)
                              ↓ เลือกคนไข้
        AtsPatientDetail (hub แบบ tab) — คนไข้ 1 คน = therapy เดียว
   [therapy tab อ่านคำแนะนำ +CTA→drawer] [complications] [consult chat+drawer]
                              ↓ drawer "ยอมรับตามคำแนะนำ" → mutate in-memory (กึ่ง record)
```

หน้าคำแนะนำ Warfarin/NOAC = component ฝังใน AtsPatientDetail (`:embedded="true"`) ไม่ใช่ route เดี่ยว.

## 2. 2 หน้าคำแนะนำ — "อ่าน → ลงมือ"

| | Warfarin (`WarfarinDoseTool`) | NOAC (`NoacAlgorithm`) |
|---|---|---|
| ลำดับอ่าน | status-first: INR hero → TTR → schedule → chart → log | rule-eval: indication → ไต(CrCl) → ข้อห้าม → **คำแนะนำ** → history → reference |
| คำแนะนำ legible | แสดงแค่ status — dose ที่แนะนำเผยใน drawer | เห็นบนหน้า (`NoacCurrentVsRecommended`) |
| CTA | ปุ่มเดียวสีตามสถานะ (hero footer) | `na-dispense-cta` (footer การ์ดคำแนะนำ) |
| log/history | ~~แก้ inline ได้~~ → **read-only แล้ว (#1)** | read-only |

## 3. ผลประเมิน — เรียงตามผลกระทบ

### 🔴 A. Correctness (ไม่ใช่แค่ UX)
1. **Warfarin data 2 ชุด** — embedded tool (`onDrawerSaved`) กับ hub (`onConsultSaved`) ต่าง mutate copy ของตัวเอง → divergent ได้จริง. NOAC embed ชุดเดียว ไม่มีปัญหานี้.
2. **Drawer เปิดได้จาก 2 tab** (therapy CTA + consult CTA) เขียนคนละ copy → "การตัดสินใจ canonical อยู่ที่ไหน?"

### 🟠 B. ปม record-vs-log
3. ~~WF log แก้ past adjustment ได้~~ → **แก้แล้ว (#1)**: read-only ทั้ง 2 หน้า. อดีต = supersede ไม่ใช่ edit.
4. ทั้งคู่ยัง mutate "ขนาด/ยาปัจจุบัน" ตอน save ราวเขียน record → ต้องยุบเป็น decision-log (#2 / greenfield #3).

### 🟡 C. 2 mental model (greenfield #3 รูปธรรม)
5. legibility ของงานหลัก "อ่านคำแนะนำ" ไม่เท่ากัน — NOAC อ่าน recommendation ได้ก่อนลงมือ, WF ต้องเปิด drawer ถึงเห็น dose ที่แนะนำ.
6. แยกให้ออก: *divergence ที่ควรมี* (titration vs match — DESIGN.md รับรอง) vs *divergence โดยบังเอิญ* (ตำแหน่ง CTA, history แก้ได้/ไม่ได้ [แก้แล้ว], การวาง recommendation).

### 🟢 D. IA / ทางเข้า
7. 2 ทางเข้า (queue + dashboard) — บทบาท/ความสัมพันธ์ยังไม่ชัด.
8. ConsultList ปุ่มยัง static no-op — คิวยังไม่ต่อ thread จริง.

## 4. ลำดับที่เสนอให้แก้ (เล็ก → ฐานราก)

1. ✅ **Quick honesty (DONE)** — WF log → read-only (เลิก inline edit) + toast ขอบเขต HIS ("บันทึกการตัดสินใจแล้ว — ดำเนินการสั่งจ่ายในระบบ HIS") ทั้ง WF + NOAC drawer. ลบความสับสน record-vs-log + ทำ 2 หน้าสม่ำเสมอ.
2. **Correctness** — ยุบ warfarin 2 copy → workspace store ชุดเดียว (greenfield #2).
3. **Legibility** — ทำ recommendation ให้เห็นบนหน้า WF ก่อนเปิด drawer (ให้เท่า NOAC).
4. **แล้วค่อยต่อ** approval feature บนฐานที่สะอาด (decision-log model — ดู greenfield memory).
