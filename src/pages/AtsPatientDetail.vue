
<template>
  <div class="content-wrap">

    <!-- ── White header zone ──────────────────────────────── -->
    <div class="page">
      <!-- Breadcrumb -->
      <nav class="page-breadcrumb">
        <button class="bc-link" @click="goToDdAts">DD-ATS</button>
        <span class="bc-sep">›</span>
        <button class="bc-link" @click="goToProgramTab">{{ breadcrumbProgram }}</button>
        <span class="bc-sep">›</span>
        <span class="bc-current">{{ p.name }}</span>
      </nav>

      <!-- Title bar -->
      <div class="page-header">
        <button class="back-btn" @click="router.back()">
          <PhArrowLeft :size="18" color="#595959" />
        </button>
        <h1 class="page-title">รายละเอียดผู้ป่วย</h1>
      </div>

      <!-- ── Patient info card ─────────────────────────── -->
      <AtsPatientHeader
        :patient="p"
        :wf-data="wfData"
        :latest-noac-lab="latestNoacLab"
      />

      <!-- ── Tabs ──────────────────────────────────────────── -->
      <div class="tabs-wrap">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="bma-tab"
          :class="activeTab === tab.value ? 'bma-tab--active' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span v-if="tab.count !== null" class="bma-tab-count">{{ tab.count }}</span>
        </div>
      </div>

    </div>

    <!-- ── Gray content zone ──────────────────────────────── -->
    <div class="main-wrap">

      <!-- Tab: Warfarin Dose Tool -->
      <div v-show="activeTab === 'warfarin'">
        <WarfarinDoseTool :patient-id="patientId" :embedded="true" />
      </div>

      <!-- Tab: NOACs Algorithm -->
      <div v-show="activeTab === 'noac'" class="tab-content">
        <NoacAlgorithm :patient-id="patientId" :embedded="true" />
      </div>

      <!-- Tab: ภาวะแทรกซ้อน -->
      <div v-show="activeTab === 'complications'" class="tab-content">

        <div class="stat-grid">
          <div
            v-for="s in p.complicationSummary"
            :key="s.type"
            class="stat-card"
          >
            <div class="stat-top">
              <span class="stat-type-label">{{ typeLabel[s.type] }}</span>
              <div class="stat-icon-wrap" :style="`background:${cfg[s.type].iconBg}`">
                <component :is="cfg[s.type].icon" :size="20" :color="cfg[s.type].color" />
              </div>
            </div>
            <div class="stat-count">
              {{ s.count }} <span class="stat-unit">ครั้ง</span>
            </div>
            <div class="stat-last">(ครั้งล่าสุด : {{ s.lastDate }})</div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">ภาพรวมของการเกิดภาวะแทรกซ้อนใน 1 ปีที่ผ่านมา</span>
          </div>
          <div class="chart-body">

            <!-- 65% — chart -->
            <div class="chart-main">
              <Bar :data="chartData" :options="chartOptions" :plugins="[peakPlugin]" />
            </div>

            <!-- 35% — stats panel -->
            <div class="chart-stats-panel">

              <div class="csp-section">
                <div class="csp-eyebrow">TOTAL EVENTS</div>
                <div class="csp-value-row">
                  <span class="csp-value">{{ peakStats.totalEvents }}</span>
                  <span class="csp-unit">ครั้ง</span>
                </div>
              </div>

              <div class="csp-divider" />

              <div class="csp-section">
                <div class="csp-eyebrow">PEAK MONTH</div>
                <div class="csp-peak-value">{{ peakStats.peakMonth }}</div>
              </div>

              <div class="csp-divider" />

              <div class="csp-section">
                <div class="csp-eyebrow">BY TYPE</div>
                <div class="csp-type-list">
                  <div v-for="(val, type) in peakStats.byType" :key="type" class="csp-type-row">
                    <span class="csp-dot" :style="`background:${cfg[type as ComplicationType].color}`" />
                    <span class="csp-type-name">{{ typeLabel[type as ComplicationType] }}</span>
                    <span class="csp-type-count">{{ val }}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="history-card">
          <div class="history-header">
            <span class="history-title">ประวัติภาวะแทรกซ้อน</span>
            <button class="btn-export">
              <PhArrowSquareOut :size="13" />
              Export to CSV
            </button>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>คำสั่ง</th>
                <th>วันที่เกิดเหตุ</th>
                <th>ประเภทของภาวะแทรกซ้อน</th>
                <th>รายละเอียด</th>
                <th>ความรุนแรง</th>
                <th>การจัดการที่ได้รับ</th>
                <th>สถานะปัจจุบัน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in p.complications" :key="c.id" class="data-row">
                <td>
                  <button class="action-btn">
                    <PhArrowSquareOut :size="15" color="#595959" />
                  </button>
                </td>
                <td class="date-cell">{{ c.date }}</td>
                <td>
                  <span class="comp-badge" :class="`comp-badge--${c.type}`">
                    {{ typeLabel[c.type] }}
                  </span>
                </td>
                <td>{{ c.detail }}</td>
                <td>
                  <span class="severity-badge" :class="`severity-badge--${c.severity}`">
                    {{ c.severity.toUpperCase() }}
                  </span>
                </td>
                <td>{{ c.treatment }}</td>
                <td>
                  <span class="status-text">
                    <span class="status-dot" />
                    {{ c.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="table-footer">
            <span class="pg-info">
              ข้อมูลที่ 1 ถึง {{ p.complications.length }} จากทั้งหมด {{ p.complications.length }} รายการ
            </span>
            <div class="pg-controls">
              <select class="pg-select"><option>10</option></select>
              <div class="pagination">
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleLeft :size="12" /></button>
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretLeft :size="12" /></button>
                <button class="pg-btn pg-btn--active">1</button>
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretRight :size="12" /></button>
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleRight :size="12" /></button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'
import {
  PhArrowLeft, PhArrowSquareOut,
  PhDrop, PhHeartbeat, PhPill,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { PatientDetail, ComplicationType } from '@/data/types/patient-detail'
import type { WarfarinPageData } from '@/data/types/warfarin'
import type { NoacPatientData } from '@/data/types/noac-dispensing'
import allDetailRaw   from '@/data/mock/patient-detail.json'
import allWarfarinRaw from '@/data/mock/warfarin-patients.json'
import allNoacRaw     from '@/data/mock/noac-patients.json'
import rawPatients    from '@/data/mock/ats-patients.json'
import type { AtsPatientsData } from '@/data/types/ats-patients'
import WarfarinDoseTool  from '@/pages/WarfarinDoseTool.vue'
import NoacAlgorithm     from '@/pages/NoacAlgorithm.vue'
import AtsPatientHeader  from '@/components/AtsPatientHeader.vue'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const router = useRouter()
const route  = useRoute()
const patientId = computed(() => route.params.id as string)

const allDetail   = allDetailRaw   as Record<string, PatientDetail>
const allWarfarin = allWarfarinRaw as Record<string, WarfarinPageData>
const allNoac     = allNoacRaw     as Record<string, NoacPatientData>

// ats-patients.json is the canonical classification of which program each patient belongs to.
// Using this (not warfarin/noac data keys) avoids false positives when a patient's ID
// appears in both data files (e.g. w002 exists in both warfarin and noac mock data).
const patientsList = rawPatients as AtsPatientsData
const noacsIdSet   = new Set(patientsList.noacs.map(p => p.id))

const p        = computed<PatientDetail>(() => allDetail[patientId.value]  ?? allDetail['w002'])
const wfData   = computed(() => allWarfarin[patientId.value] ?? null)
const noacData = computed<NoacPatientData | null>(() => allNoac[patientId.value] ?? allNoac['w002'] ?? null)
const latestNoacLab = computed(() => {
  const history = noacData.value?.dispensingHistory
  if (!history?.length) return null
  return history[history.length - 1].labData
})
type TabValue = 'complications' | 'warfarin' | 'noac'

// Derive therapy from which clinical data source contains this patient.
// This is the canonical source of truth and works even when patient-detail.json
// doesn't have an entry for the patient yet.
const derivedTherapy = computed<'warfarin' | 'noacs'>(() =>
  noacsIdSet.has(patientId.value) ? 'noacs' : 'warfarin'
)

// Default tab follows the patient's active therapy so clicking a NOACs patient
// lands directly on the NOACs view, and a Warfarin patient on the dosing tool.
function defaultTab(therapy: 'warfarin' | 'noacs'): TabValue {
  if (therapy === 'warfarin') return 'warfarin'
  if (therapy === 'noacs')    return 'noac'
  return 'complications'
}
const activeTab = ref<TabValue>(defaultTab(derivedTherapy.value))

// Re-set the default tab when navigating between patients (route id changes).
watch(patientId, () => {
  activeTab.value = defaultTab(derivedTherapy.value)
})

// Only show therapy-specific tabs that match the patient's current enrollment.
// A patient switching therapy will no longer see the previous drug's tool.
const tabs = computed<{ value: TabValue; label: string; count: number | null }[]>(() => [
  { value: 'complications', label: 'ภาวะแทรกซ้อน',           count: p.value.complications.length },
  ...(derivedTherapy.value === 'warfarin' ? [{ value: 'warfarin' as TabValue, label: 'Warfarin Dose Tool',      count: null }] : []),
  ...(derivedTherapy.value === 'noacs'   ? [{ value: 'noac'     as TabValue, label: 'คำแนะนำการจ่ายยา NOACs', count: null }] : []),
])


// ── Page header actions ───────────────────────────────────────────────────────
function goToDdAts() { router.push('/dd-ats') }

function goToProgramTab() {
  const tab = derivedTherapy.value === 'warfarin' ? 'warfarin' : 'noacs'
  router.push({ path: '/dd-ats', query: { tab } })
}

const breadcrumbProgram = computed(() =>
  derivedTherapy.value === 'warfarin' ? 'การจ่าย Warfarin' : 'การจ่าย NOACs'
)

const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const cfg: Record<ComplicationType, { label: string; color: string; iconBg: string; icon: Component }> = {
  'bleeding':        { label: 'Bleeding',        color: '#E57373', iconBg: '#FEECEC', icon: PhDrop      },
  'thromboembolism': { label: 'Thromboembolism', color: '#64B5F6', iconBg: '#E3F2FD', icon: PhHeartbeat },
  'side-effects':    { label: 'Side Effects',    color: '#FFB74D', iconBg: '#FFF3E0', icon: PhPill      },
}

const typeLabel: Record<ComplicationType, string> = {
  'bleeding':        'Bleeding',
  'thromboembolism': 'Thromboembolism',
  'side-effects':    'Side Effects',
}

const chartData = computed(() => {
  const counts: Record<ComplicationType, number[]> = {
    'bleeding':        new Array(12).fill(0),
    'thromboembolism': new Array(12).fill(0),
    'side-effects':    new Array(12).fill(0),
  }
  for (const c of p.value.complications) counts[c.type][c.month - 1]++

  return {
    labels: thaiMonths,
    datasets: [
      { label: 'Bleeding',        data: counts['bleeding'],        backgroundColor: '#E57373' },
      { label: 'Thromboembolism', data: counts['thromboembolism'], backgroundColor: '#64B5F6' },
      { label: 'Side Effects',    data: counts['side-effects'],    backgroundColor: '#FFB74D' },
    ],
  }
})

// ── Pattern 8: Chart + Side Stats Panel ──────────────────────────────────────
// Computes rollup numbers shown in the 35% right panel alongside the chart.
const peakStats = computed(() => {
  const comps = p.value.complications
  const monthTotals = new Array(12).fill(0)
  for (const c of comps) monthTotals[c.month - 1]++

  const maxVal = Math.max(...monthTotals)
  const peakIdx = maxVal > 0 ? monthTotals.indexOf(maxVal) : -1

  return {
    totalEvents:    p.value.totalComplications,
    peakMonthIndex: peakIdx,
    peakMonth:      peakIdx >= 0 ? `${thaiMonths[peakIdx]} (${maxVal} ครั้ง)` : '–',
    byType: {
      'bleeding':        comps.filter(c => c.type === 'bleeding').length,
      'thromboembolism': comps.filter(c => c.type === 'thromboembolism').length,
      'side-effects':    comps.filter(c => c.type === 'side-effects').length,
    } as Record<ComplicationType, number>,
  }
})

// Chart.js inline plugin — draws a small "PEAK" pill above the tallest bar column.
// Uses afterDraw so it renders on top of all bar segments.
// Closes over peakStats (reactive ref) so always uses the latest computed value.
const peakPlugin = {
  id: 'peakAnnotation',
  afterDraw(chart: any) {
    const idx = peakStats.value.peakMonthIndex
    if (idx < 0) return

    const ctx = chart.ctx

    // Find the topmost y position at peak index by scanning all datasets.
    // Lower y = higher on screen. Skip datasets with value 0 at this index.
    let topY = chart.chartArea.bottom
    for (let i = 0; i < chart.data.datasets.length; i++) {
      const val = (chart.data.datasets[i].data[idx] as number) || 0
      if (val > 0) {
        const barEl = chart.getDatasetMeta(i).data[idx] as any
        if (barEl && barEl.y < topY) topY = barEl.y
      }
    }
    if (topY === chart.chartArea.bottom) return

    // x-center of the bar column (same across all stacked datasets)
    const barX = (chart.getDatasetMeta(0).data[idx] as any).x

    ctx.save()
    ctx.font = '700 8.5px Inter, sans-serif'
    const label = 'PEAK'
    const tw    = ctx.measureText(label).width
    const padX  = 5;  const boxH = 13
    const boxW  = tw + padX * 2
    const bx    = barX - boxW / 2
    const by    = topY - boxH - 5

    // Pill background
    ctx.fillStyle = '#3D5A80'
    ctx.fillRect(bx, by, boxW, boxH)

    // Label text
    ctx.fillStyle  = '#FFFFFF'
    ctx.textAlign  = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, barX, by + boxH / 2)
    ctx.restore()
  },
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    // Reserve space at top so the PEAK pill annotation never clips the chart border
    padding: { top: 22, right: 4, bottom: 0, left: 0 },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      filter: (item: TooltipItem<'bar'>) => (item.parsed.y as number) > 0,
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) => items[0]?.label ?? '',
        label: (ctx: TooltipItem<'bar'>) =>
          `  ${ctx.dataset.label ?? ''}: ${ctx.parsed.y} ครั้ง`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid:   { display: false },
      border: { display: false },
      ticks:  { font: { size: 11 } },
    },
    y: {
      stacked:     true,
      beginAtZero: true,
      grid:   { color: '#F0F0F0' },
      border: { display: false },
      ticks:  { stepSize: 1, precision: 0 },
    },
  },
}
</script>

<style scoped>
/* ── Two-zone layout ──────────────────────────────────── */
.content-wrap { display: flex; flex-direction: column; height: 100%; }
.page { background: var(--bma-surface); padding: 24px 24px 0; }

/* ── Breadcrumb ─────────────────────────────────────────── */
.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.bc-link {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-tertiary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color var(--bma-transition-fast);
}
.bc-link:hover { color: var(--bma-green-500); text-decoration: underline; }

.bc-sep {
  font-size: 11px;
  color: var(--bma-text-disabled);
  user-select: none;
  line-height: 1;
}

.bc-current {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-muted);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Title bar ──────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 40px;
  margin-bottom: 20px;
}
.page-title { font-size: 18px; font-weight: 700; color: var(--bma-text-primary); margin: 0; line-height: 1.35; }

.back-btn {
  width: 36px; height: 36px;
  border-radius: var(--bma-radius-md); border: 1.5px solid var(--bma-border);
  background: var(--bma-surface); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background var(--bma-transition-fast);
}
.back-btn:hover { background: var(--bma-surface-subtle); }

/* ── Tabs ────────────────────────────────────────────── */
.tabs-wrap { margin-top: 12px; }

/* ── Content area ─────────────────────────────────────── */
.main-wrap {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}
.tab-content { display: flex; flex-direction: column; gap: 16px; }

/* ── Stat cards ───────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.stat-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  padding: 16px 20px;
}
.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.stat-type-label { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.stat-icon-wrap {
  width: 36px; height: 36px;
  border-radius: var(--bma-radius-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-count {
  font-family: var(--bma-font-data);
  font-size: 28px; font-weight: 700; color: var(--bma-text-primary); line-height: 1.1;
}
.stat-unit { font-size: 18px; font-family: var(--bma-font-thai); }
.stat-last { font-size: 12px; color: var(--bma-text-muted); margin-top: 4px; }

/* ── Chart card — Pattern 8: 65/35 split layout ──────── */
.chart-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  padding: 18px 20px;
}
.chart-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.chart-title { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }

/* Two-column body: 65% chart + 35% stats */
.chart-body {
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 0;
  min-height: 200px;
}

/* Left zone: chart canvas */
.chart-main { height: 200px; }

/* Right zone: stats panel */
.chart-stats-panel {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--bma-border-subtle);
  padding-left: 20px;
  margin-left: 20px;
}

.csp-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 0;
}

.csp-divider {
  height: 1px;
  background: var(--bma-border-subtle);
  flex-shrink: 0;
  margin: 0;
}

/* Eyebrow label — all-caps data font */
.csp-eyebrow {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--bma-text-muted);
  text-transform: uppercase;
  margin-bottom: 5px;
}

/* TOTAL EVENTS row */
.csp-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.csp-value {
  font-family: var(--bma-font-data);
  font-size: 30px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}
.csp-unit {
  font-family: var(--bma-font-thai);
  font-size: 13px;
  color: var(--bma-text-secondary);
}

/* PEAK MONTH value */
.csp-peak-value {
  font-family: var(--bma-font-data);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1.4;
}

/* BY TYPE list */
.csp-type-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.csp-type-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.csp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.csp-type-name {
  flex: 1;
  font-size: 12px;
  color: var(--bma-text-secondary);
}
.csp-type-count {
  font-family: var(--bma-font-data);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}

/* ── History card ─────────────────────────────────────── */
.history-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.history-title { font-size: 15px; font-weight: 700; color: var(--bma-text-primary); }
.btn-export {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 1.5px solid var(--bma-border); border-radius: 7px;
  background: var(--bma-surface); font-family: var(--bma-font-thai);
  font-size: 13px; color: var(--bma-text-tertiary); cursor: pointer;
}
.btn-export:hover { background: var(--bma-surface-subtle); }

/* ── Data table ───────────────────────────────────────── */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead tr { background: var(--bma-surface-light); border-bottom: 1.5px solid var(--bma-border-subtle); }
.data-table th {
  padding: 10px 14px;
  font-size: 12px; font-weight: 700; color: var(--bma-text-muted);
  text-align: left; white-space: nowrap;
}
.data-row { border-bottom: 1px solid var(--bma-surface-subtle); transition: background .1s; }
.data-row:last-child { border-bottom: none; }
.data-row:hover { background: var(--bma-surface-light); }
.data-table td { padding: 10px 14px; color: var(--bma-text-primary); vertical-align: middle; }
.date-cell { white-space: nowrap; font-family: var(--bma-font-data); font-size: 12px; }

.action-btn {
  width: 30px; height: 30px;
  border-radius: var(--bma-radius-sm); border: 1.5px solid var(--bma-border-card);
  background: var(--bma-surface); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color var(--bma-transition-fast), background var(--bma-transition-fast);
}
.action-btn:hover { border-color: var(--bma-green-500); background: var(--bma-green-50); }

.comp-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-size: 12px; font-weight: 600; white-space: nowrap;
}
.comp-badge--bleeding        { background: #FEECEC; color: var(--bma-emergency); }
.comp-badge--thromboembolism { background: #E3F2FD; color: #1565C0; }
.comp-badge--side-effects    { background: #FFF3E0; color: #E65100; }

.severity-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-sm);
  font-family: var(--bma-font-data);
  font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--bma-surface);
}
.severity-badge--severe   { background: var(--bma-emergency); }
.severity-badge--moderate { background: var(--bma-urgency); }
.severity-badge--mild     { background: var(--bma-success); }

.status-text {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--bma-green-500);
}
.status-dot {
  width: 7px; height: 7px;
  border-radius: 50%; background: var(--bma-success); flex-shrink: 0;
}

/* ── Table footer / Pagination ────────────────────────── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--bma-border-subtle);
}
.pg-info { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-muted); }
.pg-controls { display: flex; align-items: center; gap: 10px; }
.pg-select {
  height: 28px; border: 1.5px solid var(--bma-border); border-radius: var(--bma-radius-sm);
  padding: 0 22px 0 8px; font-size: 12px; font-family: var(--bma-font-data);
  background: var(--bma-surface); appearance: none; cursor: pointer;
}
.pagination { display: flex; gap: 3px; }
.pg-btn {
  width: 28px; height: 28px;
  border-radius: var(--bma-radius-sm); border: 1.5px solid var(--bma-border);
  background: var(--bma-surface); display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-family: var(--bma-font-data);
  font-size: 12px; font-weight: 500; color: var(--bma-text-secondary); transition: all var(--bma-transition-fast);
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover {
  border-color: var(--bma-green-500); color: var(--bma-green-500); background: var(--bma-green-50);
}
.pg-btn--active   { background: var(--bma-green-500); border-color: var(--bma-green-500); color: var(--bma-surface); font-weight: 700; }
.pg-btn--disabled { color: var(--bma-border); cursor: not-allowed; }
</style>