<template>
  <div class="content-wrap">
    <div class="page" style="background-color: #FFFFFF; padding: 24px 24px 0px 24px;">
    <!-- Page header -->
      <div class="page-header">
        <h1 class="page-title">รายการส่งปรึกษา</h1>
        <button class="btn-send" @click="() => {}">
          <PhPlus :size="16" />
          ส่งปรึกษา
        </button>
      </div>

    <!-- Tabs -->
      <div class="tabs-wrap">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="bma-tab"
          :class="activeTab === tab.value ? 'bma-tab--active' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span class="tab-count" :class="activeTab === tab.value ? 'tab-count--active' : ''">
            {{ tab.count }}
          </span>
        </div>
      </div>
    </div>

    <div class="main-wrap">
      <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-search">
        <PhMagnifyingGlass :size="15" color="#BFBFBF" class="filter-icon" />
        <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
      </div>
      <div class="filter-date">
        <input class="filter-input" placeholder="วันที่ค้นหา" />
        <PhCalendar :size="15" color="#BFBFBF" class="filter-icon-right" />
      </div>
      <div class="filter-select-wrap">
        <select class="filter-select">
          <option value="">ความเร่งด่วน</option>
          <option>EMERGENCY</option>
          <option>URGENCY</option>
          <option>ELECTIVE</option>
        </select>
        <PhCaretDown :size="14" color="#8C8C8C" class="select-arrow" />
      </div>
      <button class="btn-search">ค้นหา</button>
    </div>

    <!-- Card grid -->
    <div class="card-grid">
      <div
        v-for="card in visibleCards"
        :key="card.id"
        class="consult-card"
      >
        <div class="card-body">
          <div class="card-diag">ข้อวินิจฉัย : {{ card.diagnosis }}</div>

          <div class="badge-row">
            <span class="priority-badge" :class="`priority-badge--${card.priority.toLowerCase()}`">
              <span class="badge-dot" />
              {{ card.priority }}
            </span>
            <span class="status-pill">
              <PhCheckSquare :size="11" color="white" />
              {{ card.statusLabel }}
            </span>
          </div>

          <div class="card-line">
            <span class="card-field">อาการสำคัญ :</span>
            {{ card.chiefComplaint }}
          </div>
          <div class="card-line">
            <span class="card-field">Note :</span>
            {{ card.note }}
          </div>

          <template v-if="!card.details?.length">
            <div class="patient-info">
              <div>ชื่อ - นามสกุล ผู้ป่วย : <strong>{{ card.patientName }}</strong></div>
              <div>แผนก : แผนก {{ card.department }}</div>
              <div>รพ. ส่งปรึกษา : {{ card.sendHospital || '-' }}</div>
              <div>รพ. รับปรึกษา : {{ card.receiveHospital || '-' }}</div>
            </div>
          </template>

          <template v-if="card.details?.length">
            <div class="detail-box">
              <div v-for="(d, i) in card.details" :key="i" class="detail-line">
                <span class="detail-label">{{ d.label }} :</span>
                <span v-if="d.highlight" class="detail-highlight">{{ d.value }}</span>
                <span v-else>{{ d.value }}</span>
              </div>
            </div>
            <div class="patient-info">
              <div>ชื่อ - นามสกุล ผู้ป่วย : <strong>{{ card.patientName }}</strong></div>
              <div>แผนก : แผนก {{ card.department }}</div>
              <div>รพ. ส่งปรึกษา : {{ card.sendHospital || '-' }}</div>
              <div>รพ. รับปรึกษา : {{ card.receiveHospital || '-' }}</div>
            </div>
          </template>
        </div>

        <div v-if="card.waitingLabel" class="waiting-bar">
          <span class="waiting-dot" />
          {{ card.waitingLabel }}
        </div>

        <div v-if="card.counts?.length" class="count-row">
          <span v-for="(c, i) in card.counts" :key="i" class="count-tag">
            <component :is="countIcons[i]?.icon" :size="12" :color="countIcons[i]?.color ?? '#595959'" />
            {{ c }}
          </span>
        </div>

        <div class="card-footer">
          <button class="btn-detail" @click="() => {}">รายละเอียดเพิ่มเติม</button>
          <button class="btn-cancel" @click="() => {}">ยกเลิกปรึกษา</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination-row">
      <div class="pagination">
        <button class="pg-btn pg-btn--disabled" disabled>
          <PhCaretDoubleLeft :size="14" />
        </button>
        <button class="pg-btn pg-btn--disabled" disabled>
          <PhCaretLeft :size="14" />
        </button>
        <button
          v-for="p in 4"
          :key="p"
          class="pg-btn"
          :class="p === currentPage ? 'pg-btn--active' : ''"
          @click="currentPage = p"
        >{{ p }}</button>
        <button class="pg-btn">
          <PhCaretRight :size="14" />
        </button>
        <button class="pg-btn">
          <PhCaretDoubleRight :size="14" />
        </button>
      </div>
      <div class="pg-info">
        ข้อมูลที่ 1 ถึง 10 จากทั้งหมด 24 รายการ
        <select class="pg-select">
          <option>10</option>
          <option>20</option>
          <option>50</option>
        </select>
      </div>
    </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhPlus, PhMagnifyingGlass, PhCalendar, PhCaretDown,
  PhCheckSquare, PhPaperclip, PhChatCircle, PhImage,
  PhVideoCamera, PhMapPin,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'

type TabValue = 'waiting' | 'accepted' | 'rejected'
const activeTab = ref<TabValue>('waiting')
const currentPage = ref(1)

const tabs: { value: TabValue; label: string; count: number }[] = [
  { value: 'waiting',  label: 'รอการตอบกลับ',      count: 4 },
  { value: 'accepted', label: 'รับส่งตัวแล้ว',       count: 3 },
  { value: 'rejected', label: 'ปฏิเสธการรับส่งตัว', count: 3 },
]

const countIcons = [
  { icon: PhPaperclip,   color: '#595959' },
  { icon: PhChatCircle,  color: '#595959' },
  { icon: PhImage,       color: '#595959' },
  { icon: PhVideoCamera, color: '#595959' },
  { icon: PhMapPin,      color: '#595959' },
]

interface DetailItem {
  label: string
  value: string
  highlight?: boolean
}

interface ConsultCard {
  id: number
  diagnosis: string
  priority: 'EMERGENCY' | 'URGENCY' | 'ELECTIVE'
  statusLabel: string
  chiefComplaint: string
  note: string
  details?: DetailItem[]
  patientName: string
  department: string
  sendHospital?: string
  receiveHospital?: string
  waitingLabel?: string
  counts?: string[]
}

const cards: ConsultCard[] = [
  {
    id: 1,
    diagnosis: 'Acute ischemic stroke (AIS)',
    priority: 'URGENCY',
    statusLabel: 'สอบถามประวัติเบื้องต้น',
    chiefComplaint: 'แขนขาอ่อนแรงกึ่งซีก ไม่มีแรงยกแขน, หน้าเบี้ยว',
    note: '-',
    details: [
      { label: 'เวลาที่เริ่มมีอาการ',              value: '20/04/69 13:41 น.' },
      { label: 'จุดที่มีการอุดตัน',                 value: 'Anterior wall' },
      { label: 'ผล EKG ล่าสุดเมื่อ',               value: '20/04/69 13:41 น.' },
      { label: 'การจ่ายยาต้านเกล็ดเลือด (P2Y12i)', value: 'Clopidogrel' },
    ],
    patientName:  'นายทดสอบ ลองระบบ',
    department:   'Cardiology',
    waitingLabel: 'รอการตอบกลับ',
    counts:       ['ไฟล์แนบ 3', 'ตอบกลับ 0', 'รูปภาพ 1', 'วีดีโอ 1', 'แผนที่'],
  },
  {
    id: 2,
    diagnosis: 'ทดสอบลองระบบ',
    priority: 'ELECTIVE',
    statusLabel: 'สอบถามประวัติเบื้องต้น',
    chiefComplaint: 'ทดสอบ ทดสอบ',
    note: '-',
    patientName:  'นายทดสอบ ลองระบบ',
    department:   'Cardiology',
    waitingLabel: 'รอการตอบกลับ',
  },
  {
    id: 3,
    diagnosis: 'STEMI (ST-elevation myocardial infarction)',
    priority: 'EMERGENCY',
    statusLabel: 'สอบถามประวัติเบื้องต้น',
    chiefComplaint: 'อาการเจ็บหน้าอกหรือรู้สึกไม่สบายบริเวณหน้าอก',
    note: '-',
    details: [
      { label: 'NIH Stroke Scale/Score',    value: '42',              highlight: true },
      { label: 'เวลาสุดท้ายที่ผู้ป่วยปกติดี', value: '20/04/69 13:41 น.' },
      { label: 'การจ่ายยาละลายลิ่มเลือด',    value: 'ยังไม่ถูกจ่าย' },
      { label: 'ค่าความดัน (BP)',              value: '136/80 mmHg' },
    ],
    patientName:  'นายทดสอบ ลองระบบ',
    department:   'Cardiology',
    waitingLabel: 'รอการตอบกลับ',
    counts:       ['ไฟล์แนบ 3', 'ตอบกลับ 0', 'รูปภาพ 1', 'วีดีโอ 1', 'แผนที่'],
  },
]

const visibleCards = computed(() => cards)
</script>

<style scoped>
.content-wrap {
  min-height: 100%;
}

/* ── Page header ──────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  margin-bottom: 24px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #343330;
}
.btn-send {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 16px;
  background: #00744B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Sarabun', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.btn-send:hover { background: #006A33; }

/* ── Tabs ─────────────────────────────────────────────────── */
.tabs-wrap {
  display: flex;
  border-bottom: 2px solid #E0E0E0;
}
.bma-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
  transition: color .15s;
}
.bma-tab:hover { color: #00744B; background: rgba(255,255,255,.25); }
.bma-tab--active { color: #00744B; font-weight: 700; border-bottom-color: #00744B; }

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 24px;
  padding: 8px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  background: #F0F0F0;
  color: #595959;
  transition: background .15s, color .15s;
}
.tab-count--active { background: #00744B; color: #fff; }

.main-wrap {
  padding: 24px;
}

/* ── Filter bar ───────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,.05);
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.filter-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
}
.filter-icon       { position: absolute; left: 11px; pointer-events: none; }
.filter-icon-right { position: absolute; right: 11px; pointer-events: none; }
.filter-date {
  position: relative;
  width: 180px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.filter-input {
  width: 100%;
  height: 40px;
  border: 1.5px solid #D9D9D9;
  border-radius: 8px;
  font-family: 'Sarabun', sans-serif;
  font-size: 14px;
  color: #343330;
  background: #fff;
  outline: none;
  transition: border-color .15s;
}
.filter-search .filter-input { padding: 0 12px 0 36px; }
.filter-date   .filter-input { padding: 0 36px 0 12px; }
.filter-input::placeholder   { color: #BFBFBF; }
.filter-input:focus { border-color: #00744B; box-shadow: 0 0 0 3px rgba(0,116,75,.08); }
.filter-select-wrap {
  position: relative;
  width: 170px;
  flex-shrink: 0;
}
.filter-select {
  width: 100%;
  height: 40px;
  border: 1.5px solid #D9D9D9;
  border-radius: 8px;
  padding: 0 32px 0 12px;
  font-family: 'Sarabun', sans-serif;
  font-size: 14px;
  color: #343330;
  background: #fff;
  appearance: none;
  outline: none;
  cursor: pointer;
}
.filter-select:focus { border-color: #00744B; }
.select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.btn-search {
  height: 40px;
  padding: 0 22px;
  background: #00744B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Sarabun', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s;
}
.btn-search:hover { background: #006A33; }

/* ── Card grid ────────────────────────────────────────────── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.consult-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.consult-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,.10);
  border-color: #D9D9D9;
}

.card-body { padding: 14px 16px 10px; flex: 1; }

.card-diag {
  font-size: 14px;
  font-weight: 700;
  color: #343330;
  margin-bottom: 10px;
  line-height: 1.4;
}
.badge-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .03em;
  white-space: nowrap;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.priority-badge--emergency { background: #B72C2C; color: #fff; }
.priority-badge--emergency .badge-dot { background: rgba(255,255,255,.5); }

.priority-badge--urgency { background: #FB8C00; color: #fff; }
.priority-badge--urgency .badge-dot { background: rgba(255,255,255,.5); }

.priority-badge--elective { background: rgba(43,71,139,.10); color: #2B478B; border: 1px solid rgba(43,71,139,.25); }
.priority-badge--elective .badge-dot { background: #2B478B; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  background: #00744B;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.card-line {
  font-size: 13px;
  color: #595959;
  margin-bottom: 4px;
  line-height: 1.5;
}
.card-field { font-weight: 700; color: #343330; margin-right: 3px; }

.patient-info {
  font-size: 13px;
  color: #595959;
  line-height: 1.75;
  margin-top: 8px;
}
.patient-info strong { color: #343330; }

.detail-box {
  background: #FAFAFA;
  border: 1px dashed #D9D9D9;
  border-radius: 7px;
  padding: 9px 11px;
  margin: 10px 0;
  font-size: 12px;
  color: #595959;
}
.detail-line  { line-height: 1.8; }
.detail-label { font-weight: 700; color: #343330; margin-right: 3px; }
.detail-highlight {
  display: inline-block;
  background: #B72C2C;
  color: #fff;
  padding: 1px 7px;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  margin-left: 3px;
}

.waiting-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 16px 10px;
  padding: 7px 12px;
  border-radius: 8px;
  background: rgba(251,140,0,.09);
  font-size: 13px;
  font-weight: 700;
  color: #D97706;
}
.waiting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FB8C00;
  flex-shrink: 0;
}

.count-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding: 0 16px 8px;
}
.count-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px;
  border-radius: 99px;
  background: #F5F5F5;
  border: 1px solid #EBEBEB;
  font-size: 11px;
  color: #595959;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid #F0F0F0;
  margin-top: auto;
}
.btn-detail,
.btn-cancel {
  flex: 1;
  height: 36px;
  border-radius: 7px;
  font-family: 'Sarabun', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.btn-detail { background: #00744B; color: #fff; border: none; }
.btn-detail:hover { background: #006A33; }
.btn-cancel { background: #fff; color: #B72C2C; border: 1.5px solid #B72C2C; }
.btn-cancel:hover { background: rgba(183,44,44,.05); }

/* ── Pagination ───────────────────────────────────────────── */
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pagination { display: flex; gap: 4px; align-items: center; }
.pg-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1.5px solid #D9D9D9;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #454545;
  transition: all .15s;
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover {
  border-color: #00744B;
  color: #00744B;
  background: #E6F5EE;
}
.pg-btn--active   { background: #00744B; border-color: #00744B; color: #fff; font-weight: 700; }
.pg-btn--disabled { color: #D9D9D9; cursor: not-allowed; }

.pg-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #8C8C8C;
}
.pg-select {
  height: 28px;
  border: 1.5px solid #D9D9D9;
  border-radius: 6px;
  padding: 0 22px 0 8px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  background: #fff url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%238c8c8c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 6px center;
  cursor: pointer;
  appearance: none;
  outline: none;
}
</style>
