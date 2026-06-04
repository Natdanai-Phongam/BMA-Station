<template>
  <div class="content-wrap">
    <div class="page" style="background-color: var(--bma-surface); padding: 24px 24px 0px 24px;">
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
        <PhMagnifyingGlass :size="15" color="var(--bma-text-disabled)" class="filter-icon" />
        <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
      </div>
      <div class="filter-date">
        <input class="filter-input" placeholder="วันที่ค้นหา" />
        <PhCalendar :size="15" color="var(--bma-text-disabled)" class="filter-icon-right" />
      </div>
      <div class="filter-select-wrap">
        <select class="filter-select">
          <option value="">ความเร่งด่วน</option>
          <option>EMERGENCY</option>
          <option>URGENCY</option>
          <option>ELECTIVE</option>
        </select>
        <PhCaretDown :size="14" color="var(--bma-text-muted)" class="select-arrow" />
      </div>
      <button class="btn-search">ค้นหา</button>
    </div>

    <!-- Card grid -->
    <div class="card-grid">
      <div
        v-for="card in cards"
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
            <span class="bma-status-pill">
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
            <div class="bma-detail-box">
              <div v-for="(d, i) in card.details" :key="i" class="detail-line">
                <strong>{{ d.label }} :</strong>
                <span v-if="d.highlight" class="bma-detail-highlight">{{ d.value }}</span>
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

        <div v-if="card.waitingLabel" class="bma-waiting-bar" style="margin: 0 16px 10px">
          {{ card.waitingLabel }}
        </div>

        <div v-if="card.counts?.length" class="count-row">
          <span v-for="(c, i) in card.counts" :key="i" class="bma-count-tag">
            <component :is="countIcons[i]?.icon" :size="12" :color="countIcons[i]?.color ?? 'var(--bma-text-tertiary)'" />
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
import { ref } from 'vue'
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
  { icon: PhPaperclip,   color: 'var(--bma-text-tertiary)' },
  { icon: PhChatCircle,  color: 'var(--bma-text-tertiary)' },
  { icon: PhImage,       color: 'var(--bma-text-tertiary)' },
  { icon: PhVideoCamera, color: 'var(--bma-text-tertiary)' },
  { icon: PhMapPin,      color: 'var(--bma-text-tertiary)' },
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
  min-height: 40px;
  margin-bottom: 20px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1.35;
  margin: 0;
}
.btn-send {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 16px;
  background: var(--bma-green-500);
  color: var(--bma-surface);
  border: none;
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--bma-transition-fast);
}
.btn-send:hover { background: var(--bma-green-600); }

/* ── Tabs — .tabs-wrap / .bma-tab are global (main.scss) ─── */
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 24px;
  padding: 8px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 700;
  background: var(--bma-border-subtle);
  color: var(--bma-text-tertiary);
  transition: background var(--bma-transition-fast), color var(--bma-transition-fast);
}
.tab-count--active { background: var(--bma-green-500); color: var(--bma-surface); }

.main-wrap {
  padding: 24px;
}

/* ── Filter bar ───────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
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
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-primary);
  background: var(--bma-surface);
  outline: none;
  transition: border-color var(--bma-transition-fast);
}
.filter-search .filter-input { padding: 0 12px 0 36px; }
.filter-date   .filter-input { padding: 0 36px 0 12px; }
.filter-input::placeholder   { color: var(--bma-text-disabled); }
.filter-input:focus { border-color: var(--bma-green-500); box-shadow: 0 0 0 3px rgba(0,116,75,.08); }
.filter-select-wrap {
  position: relative;
  width: 170px;
  flex-shrink: 0;
}
.filter-select {
  width: 100%;
  height: 40px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  padding: 0 32px 0 12px;
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-primary);
  background: var(--bma-surface);
  appearance: none;
  outline: none;
  cursor: pointer;
}
.filter-select:focus { border-color: var(--bma-green-500); }
.select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.btn-search {
  height: 40px;
  padding: 0 22px;
  background: var(--bma-green-500);
  color: var(--bma-surface);
  border: none;
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--bma-transition-fast);
}
.btn-search:hover { background: var(--bma-green-600); }

/* ── Card grid ────────────────────────────────────────────── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.consult-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow var(--bma-transition-default), border-color var(--bma-transition-default);
}
.consult-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,.10);
  border-color: var(--bma-border);
}

.card-body { padding: 14px 16px 10px; flex: 1; }

.card-diag {
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
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
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .03em;
  white-space: nowrap;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.priority-badge--emergency { background: var(--bma-emergency); color: var(--bma-surface); }
.priority-badge--emergency .badge-dot { background: rgba(255,255,255,.5); }

.priority-badge--urgency { background: var(--bma-urgency); color: var(--bma-surface); }
.priority-badge--urgency .badge-dot { background: rgba(255,255,255,.5); }

.priority-badge--elective { background: var(--bma-elective-bg); color: var(--bma-elective); border: 1px solid var(--bma-elective-ring); }
.priority-badge--elective .badge-dot { background: var(--bma-elective); }

.card-line {
  font-size: 13px;
  color: var(--bma-text-tertiary);
  margin-bottom: 4px;
  line-height: 1.5;
}
.card-field { font-weight: 700; color: var(--bma-text-primary); margin-right: 3px; }

.patient-info {
  font-size: 13px;
  color: var(--bma-text-tertiary);
  line-height: 1.75;
  margin-top: 8px;
}
.patient-info strong { color: var(--bma-text-primary); }

/* .bma-detail-box, .bma-waiting-bar, .bma-count-tag, .bma-status-pill are global (main.scss) */
.detail-line { line-height: 1.8; }

.count-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding: 0 16px 8px;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--bma-border-subtle);
  margin-top: auto;
}
.btn-detail,
.btn-cancel {
  flex: 1;
  height: 36px;
  border-radius: 7px;
  font-family: var(--bma-font-thai);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--bma-transition-fast);
}
.btn-detail { background: var(--bma-green-500); color: var(--bma-surface); border: none; }
.btn-detail:hover { background: var(--bma-green-600); }
.btn-cancel { background: var(--bma-surface); color: var(--bma-emergency); border: 1.5px solid var(--bma-emergency); }
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
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border);
  background: var(--bma-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 500;
  color: var(--bma-text-secondary);
  transition: all var(--bma-transition-fast);
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover {
  border-color: var(--bma-green-500);
  color: var(--bma-green-500);
  background: var(--bma-green-50);
}
.pg-btn--active   { background: var(--bma-green-500); border-color: var(--bma-green-500); color: var(--bma-surface); font-weight: 700; }
.pg-btn--disabled { color: var(--bma-border); cursor: not-allowed; }

.pg-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}
.pg-select {
  height: 28px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  padding: 0 22px 0 8px;
  font-family: var(--bma-font-data);
  font-size: 12px;
  background: var(--bma-surface) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%238c8c8c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 6px center;
  cursor: pointer;
  appearance: none;
  outline: none;
}
</style>
