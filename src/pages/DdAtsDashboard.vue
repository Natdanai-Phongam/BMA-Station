<template>
  <div class="content-wrap">

    <!-- ── White header zone ────────────────────────────────── -->
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            โครงการบูรณาการติดตามแผนยอดจ่ายในการกำกับดูแลการใช้ยาต้านการแข็งตัวของเลือด
          </h1>
          <div class="page-subtitle">
            (Digital Dashboard Integrated Anticoagulant Stewardship Program; DD-ATS)
          </div>
        </div>
      </div>

      <div class="tabs-wrap">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="bma-tab"
          :class="activeTab === tab.value ? 'bma-tab--active' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <!-- ── Gray content zone ─────────────────────────────────── -->
    <div class="main-wrap">

      <!-- Dashboard Tab -->
      <div v-show="activeTab === 'dashboard'">

        <!-- Monitoring cards -->
        <div class="monitoring-grid">
          <div
            v-for="card in cards"
            :key="card.id"
            class="monitoring-card"
          >
            <!-- Card header: icon + title + subtitle -->
            <div class="mc-card-header">
              <div class="mc-icon-wrap" :style="`background:${card.iconBg}`">
                <component
                  :is="iconMap[card.iconName]"
                  :size="18"
                  :color="card.iconColor"
                />
              </div>
              <div>
                <div class="mc-title">{{ card.title }}</div>
                <div class="mc-subtitle">{{ card.subtitle }}</div>
              </div>
            </div>

            <!-- Card body: donut + right panel -->
            <div class="mc-body">
              <div class="donut-wrap">
                <Doughnut
                  :data="chartPropsMap[card.id].data"
                  :options="donutOptions"
                  :plugins="chartPropsMap[card.id].plugins"
                />
              </div>

              <div class="mc-right">
                <!-- In-range box (green) -->
                <div class="mc-in-range-box">
                  <div class="mc-in-range-left">
                    <span class="mc-in-count">{{ card.inRangeCount }} ราย</span>
                    <span class="mc-in-label">
                      {{ card.inRangeLabel }}
                      <template v-if="card.inRangeRange">
                        &nbsp;·&nbsp;( {{ card.inRangeRange }} )
                      </template>
                    </span>
                  </div>
                  <span class="mc-in-pct">{{ card.inRangePct }}</span>
                </div>

                <!-- Out-of-range alert box (red) -->
                <div class="mc-alert-box">
                  <div class="mc-alert-left">
                    <PhWarning :size="13" color="#B72C2C" />
                    ต้องติดตาม {{ card.outOfRangeCount }} ราย
                  </div>
                  <span class="mc-alert-pct">{{ card.outOfRangePct }}</span>
                </div>

                <!-- Stat rows -->
                <div class="mc-stat-list">
                  <div
                    v-for="stat in card.stats"
                    :key="stat.label"
                    class="mc-stat-row"
                  >
                    <span class="mc-stat-dot" :style="`background:${stat.color}`" />
                    <div class="mc-stat-labels">
                      <span class="mc-stat-name">{{ stat.label }}</span>
                      <span v-if="stat.sublabel" class="mc-stat-sub">( {{ stat.sublabel }} )</span>
                      <!-- spacer keeps min-width consistent when no sublabel -->
                    </div>
                    <div class="mc-progress-track">
                      <div
                        class="mc-progress-fill"
                        :style="`width:${(stat.count / card.outOfRangeCount * 100).toFixed(1)}%;background:${stat.color}`"
                      />
                    </div>
                    <span class="mc-stat-count">{{ stat.count }}</span>
                    <span class="mc-stat-pct">{{ stat.pctDisplay }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary section -->
        <div class="section-header">
          <div class="section-icon-wrap">
            <PhBell :size="15" color="#FB8C00" />
          </div>
          สรุปการแจ้งเตือนและปรับขนาดยา
          <span class="section-badge">Consultation &amp; Adjustment Summary</span>
        </div>

        <div class="summary-grid">
          <div
            v-for="card in cards"
            :key="card.id"
            class="summary-card"
          >
            <div class="sc-header">
              <div class="sc-title-wrap">
                <div class="sc-icon" :style="`background:${card.iconBg}`">
                  <component :is="iconMap[card.iconName]" :size="14" :color="card.iconColor" />
                </div>
                <div>
                  <div class="sc-title">{{ card.title }} Monitoring</div>
                  <div class="sc-subtitle">{{ card.subtitle }}</div>
                </div>
              </div>
              <div class="alert-badge">{{ card.alertCount }} Alerts</div>
            </div>
            <div class="sc-divider" />
            <div class="sc-stat-row">
              <div class="sc-stat-label">
                <PhWarning :size="14" color="#8C8C8C" />
                {{ card.outOfRangeLabel }}
              </div>
              <div class="sc-stat-value">{{ card.outOfRangeCount }} ราย</div>
            </div>
            <div class="sc-stat-row">
              <div class="sc-stat-label">
                <PhArrowCircleRight :size="14" color="#8C8C8C" />
                ส่งต่อแพทย์ปรึกษา
              </div>
              <div class="sc-stat-value">{{ card.referralCount }} ราย</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Warfarin patient list ─────────────────────────── -->
      <div v-show="activeTab === 'warfarin'">

        <!-- Main filter bar -->
        <div class="filter-bar">
          <div class="filter-search">
            <PhMagnifyingGlass :size="15" color="#BFBFBF" class="fi-icon" />
            <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่เริ่มต้น" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่สิ้นสุด" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <button class="btn-search">ค้นหา</button>
        </div>

        <!-- Table card -->
        <div class="table-card">
          <!-- Table -->
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-action">คำสั่ง</th>
                <th class="col-name">ชื่อ - นามสกุล</th>
                <th class="col-hospital">โรงพยาบาล</th>
                <th class="col-status">สถานะ</th>
                <th class="col-lab">ผลแล็บ ( CrCl / INR )</th>
                <th class="col-weight">น้ำหนัก ( กก. )</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in patients.warfarin"
                :key="p.id"
                class="data-row"
                :class="`data-row--${p.status}`"
              >
                <td class="col-action">
                  <button class="action-btn" @click="goToPatient(p.id)" title="ดูรายละเอียด">
                    <PhArrowSquareOut :size="16" color="#595959" />
                  </button>
                </td>
                <td class="col-name">
                  <div class="patient-name">{{ p.name }}</div>
                  <div class="patient-hn">{{ p.hn }}</div>
                </td>
                <td>{{ p.hospital }}</td>
                <td class="col-status">
                  <span class="status-badge" :class="`status-badge--${p.status}`">
                    {{ warfarinStatusLabel[p.status] }}
                  </span>
                </td>
                <td class="col-lab">
                  <span class="lab-badge" :class="p.crcl.alert ? 'lab-badge--alert' : ''">
                    CrCl: {{ p.crcl.value }}
                    <PhWarningCircle v-if="p.crcl.alert" :size="11" />
                  </span>
                  <span class="lab-badge" :class="p.inr.alert ? 'lab-badge--alert' : ''">
                    INR: {{ p.inr.value }}
                    <PhWarningCircle v-if="p.inr.alert" :size="11" />
                  </span>
                </td>
                <td class="col-weight">
                  <span class="weight-badge">{{ p.weight.toFixed(1) }} กก.</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="table-footer">
            <span class="pg-info">ข้อมูลที่ 1 ถึง {{ patients.warfarin.length }} จากทั้งหมด 24 รายการ</span>
            <div class="pg-controls">
              <select class="pg-select">
                <option>10</option><option>20</option><option>50</option>
              </select>
              <div class="pagination">
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleLeft :size="13" /></button>
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretLeft :size="13" /></button>
                <button class="pg-btn pg-btn--active">1</button>
                <button class="pg-btn">2</button>
                <button class="pg-btn">3</button>
                <button class="pg-btn">4</button>
                <button class="pg-btn"><PhCaretRight :size="13" /></button>
                <button class="pg-btn"><PhCaretDoubleRight :size="13" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── NOACs patient list ──────────────────────────────── -->
      <div v-show="activeTab === 'noacs'">

        <div class="filter-bar">
          <div class="filter-search">
            <PhMagnifyingGlass :size="15" color="#BFBFBF" class="fi-icon" />
            <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่เริ่มต้น" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่สิ้นสุด" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <button class="btn-search">ค้นหา</button>
        </div>

        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-action">คำสั่ง</th>
                <th class="col-name">ชื่อ - นามสกุล</th>
                <th class="col-hospital">โรงพยาบาล</th>
                <th class="col-status">สถานะ</th>
                <th class="col-lab">ผลแล็บ ( CrCl / eGFR )</th>
                <th class="col-weight">น้ำหนัก ( กก. )</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in patients.noacs"
                :key="p.id"
                class="data-row"
                :class="`data-row--${p.status}`"
              >
                <td class="col-action">
                  <button class="action-btn" @click="goToPatient(p.id)" title="ดูรายละเอียด">
                    <PhArrowSquareOut :size="16" color="#595959" />
                  </button>
                </td>
                <td class="col-name">
                  <div class="patient-name">{{ p.name }}</div>
                  <div class="patient-hn">{{ p.hn }}</div>
                </td>
                <td>{{ p.hospital }}</td>
                <td class="col-status">
                  <span class="status-badge" :class="`status-badge--${p.status}`">
                    {{ noacsStatusLabel[p.status] }}
                  </span>
                </td>
                <td class="col-lab">
                  <span class="lab-badge" :class="p.crcl.alert ? 'lab-badge--alert' : ''">
                    CrCl: {{ p.crcl.value }}
                    <PhWarningCircle v-if="p.crcl.alert" :size="11" />
                  </span>
                  <span class="lab-badge" :class="p.egfr.alert ? 'lab-badge--alert' : ''">
                    eGFR: {{ p.egfr.value }}
                    <PhWarningCircle v-if="p.egfr.alert" :size="11" />
                  </span>
                </td>
                <td class="col-weight">
                  <span class="weight-badge">{{ p.weight.toFixed(1) }} กก.</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="table-footer">
            <span class="pg-info">ข้อมูลที่ 1 ถึง {{ patients.noacs.length }} จากทั้งหมด 48 รายการ</span>
            <div class="pg-controls">
              <select class="pg-select">
                <option>10</option><option>20</option><option>50</option>
              </select>
              <div class="pagination">
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleLeft :size="13" /></button>
                <button class="pg-btn pg-btn--disabled" disabled><PhCaretLeft :size="13" /></button>
                <button class="pg-btn pg-btn--active">1</button>
                <button class="pg-btn">2</button>
                <button class="pg-btn">3</button>
                <button class="pg-btn">4</button>
                <button class="pg-btn"><PhCaretRight :size="13" /></button>
                <button class="pg-btn"><PhCaretDoubleRight :size="13" /></button>
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
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, DoughnutController, Tooltip } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import {
  PhBell, PhArrowCircleRight, PhWarning,
  PhChartBar, PhFirstAid,
  PhMagnifyingGlass, PhCalendar,
  PhArrowSquareOut, PhWarningCircle,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'
import type { AtsDashboardData, AtsMonitoringCard } from '@/data/types/ats'
import type { AtsPatientsData, WarfarinStatus, NoacsStatus } from '@/data/types/ats-patients'
import rawData     from '@/data/mock/ats-dashboard.json'
import rawPatients from '@/data/mock/ats-patients.json'

ChartJS.register(ArcElement, DoughnutController, Tooltip)

const router = useRouter()

// Cast JSON to typed shapes — swap imports for API calls when backend is ready
const data     = rawData     as AtsDashboardData
const patients = rawPatients as AtsPatientsData

// Map icon name strings from JSON to Phosphor components
const iconMap: Record<string, Component> = { PhChartBar, PhFirstAid }

// Stable card array — avoids inline array literal in template creating new ref each render
const cards = computed(() => [data.warfarin, data.noacs])

// Pre-built chart props keyed by card.id.
// Since `data` is static JSON (non-reactive), this computes once and caches forever.
// Both `data` and `plugins` are pre-wrapped so the template never creates a new
// object or array literal — stable references prevent vue-chartjs from triggering
// chart updates or full re-initialization on every render cycle.
const chartPropsMap = computed(() => {
  const map: Record<string, { data: ReturnType<typeof donutChartData>; plugins: ReturnType<typeof makeCenterPlugin>[] }> = {}
  for (const card of cards.value) {
    map[card.id] = {
      data:    donutChartData(card),
      plugins: [makeCenterPlugin(card.totalPatients)],
    }
  }
  return map
})

// Chart.js plugin that draws center text on the canvas itself.
// Runs in afterDraw so the tooltip (drawn after all plugins) always sits on top.
function makeCenterPlugin(total: number) {
  return {
    id: `center-${total}`,
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea } = chart
      const cx = (chartArea.left + chartArea.right) / 2
      const cy = (chartArea.top + chartArea.bottom) / 2
      ctx.save()
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.font         = '900 26px Inter, sans-serif'
      ctx.fillStyle    = '#343330'
      ctx.fillText(String(total), cx, cy - 9)
      ctx.font         = '400 10px Sarabun, sans-serif'
      ctx.fillStyle    = '#8C8C8C'
      ctx.fillText('ผู้ป่วยทั้งหมด', cx, cy + 10)
      ctx.restore()
    },
  }
}

// Build Doughnut chart data for a monitoring card
function donutChartData(card: AtsMonitoringCard) {
  return {
    labels: [card.inRangeLabel, ...card.stats.map(s => s.label)],
    datasets: [{
      data:            [card.inRangeCount,    ...card.stats.map(s => s.count)],
      backgroundColor: ['#4CAF50',            ...card.stats.map(s => s.color)],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  animation: { duration: 600 },
  // layout.padding gives the tooltip renderer room at the canvas edges
  // so it is never clipped when a segment is near the top/left/right/bottom
  layout: { padding: 8 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: () => '',
        label: (ctx: TooltipItem<'doughnut'>) => {
          const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
          const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
          return `  ${ctx.label}: ${ctx.parsed} ราย (${pct}%)`
        },
      },
    },
  },
} as const

function goToPatient(id: string) {
  router.push(`/dd-ats/patient/${id}`)
}

const warfarinStatusLabel: Record<WarfarinStatus, string> = {
  'in-range':    'In Range',
  'under-range': 'Under Range',
  'over-range':  'Over Range',
}

const noacsStatusLabel: Record<NoacsStatus, string> = {
  'appropriate': 'Appropriate',
  'underdose':   'Underdose',
  'overdose':    'Overdose',
  'contra':      'Contra',
  'interaction': 'Interaction',
}


type TabValue = 'dashboard' | 'warfarin' | 'noacs'
const activeTab = ref<TabValue>('dashboard')

// Reset scroll to top on tab switch.
// Cover all possible scroll containers since Vuetify may scroll v-main__wrap,
// the html element, or the window depending on layout configuration.
watch(activeTab, () => {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  ;(document.querySelector('.v-main__wrap') as HTMLElement | null)?.scrollTo(0, 0)
})

const tabs: { value: TabValue; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard'        },
  { value: 'warfarin',  label: 'การจ่าย Warfarin' },
  { value: 'noacs',     label: 'การจ่าย NOACs'   },
]
</script>

<style scoped>
.content-wrap { min-height: 100%; }

/* ── White header zone ────────────────────────────────────── */
.page { background: var(--bma-surface); padding: 24px 24px 0; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  min-height: 40px;
}

.page-title    { font-size: 18px; font-weight: 700; color: var(--bma-text-primary); line-height: 1.35; margin: 0; }
.page-subtitle { font-size: 13px; color: var(--bma-text-muted); margin-top: 4px; }

/* ── Gray content zone ────────────────────────────────────── */
.main-wrap { padding: 24px; }

/* ── Monitoring grid ──────────────────────────────────────── */
.monitoring-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
  /* Shared label-column width — governs progress bar start/end across all cards */
  --stat-label-col: 138px;
}

.monitoring-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  padding: 16px 20px 20px;
}

/* Card header row */
.mc-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.mc-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--bma-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mc-title    { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); font-family: var(--bma-font-data); letter-spacing: .02em; }
.mc-subtitle { font-size: 11px; color: var(--bma-text-muted); margin-top: 1px; }

/* Body: donut + right panel */
.mc-body  { display: flex; align-items: flex-start; gap: 18px; }
.mc-right { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.donut-wrap {
  position: relative;
  /* 148px plot area + 8px layout.padding on each side = 164px canvas */
  width: 164px;
  height: 164px;
  flex-shrink: 0;
}

/* In-range green box */
.mc-in-range-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1.5px solid var(--bma-success);
  border-radius: var(--bma-radius-md);
  padding: 8px 12px;
  background: #F6FFF9;
}

.mc-in-range-left { display: flex; flex-direction: column; gap: 1px; }

.mc-in-count {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

.mc-in-label {
  font-size: 11px;
  color: var(--bma-success);
  font-weight: 600;
  white-space: nowrap;
}

.mc-in-pct {
  font-family: var(--bma-font-data);
  font-size: 22px;
  font-weight: 700;
  color: var(--bma-text-primary);
  flex-shrink: 0;
}

/* Alert red box */
.mc-alert-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1.5px solid #F5C0C0;
  border-radius: var(--bma-radius-md);
  padding: 7px 12px;
  background: #FFF5F5;
}

.mc-alert-left {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--bma-emergency);
}

.mc-alert-pct {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-emergency);
  flex-shrink: 0;
}

/* ── Stat rows — CSS Grid pattern ────────────────────────────
   Columns: [dot] [label — sized by widest row] [bar — equal 1fr] [count] [pct]
   display:contents on .mc-stat-row lifts children into parent grid,
   so the label column is shared across ALL rows in the same card.
   No hardcoded width needed — grid measures the widest label automatically. */
.mc-stat-list {
  display: grid;
  grid-template-columns: 12px var(--stat-label-col) 1fr 24px 52px;
  row-gap: 8px;
  column-gap: 8px;
  align-items: center;
  margin-top: 4px;
}

/* Row element removed from visual tree — children go directly into grid */
.mc-stat-row { display: contents; }

/* Rounded rectangle indicator */
.mc-stat-dot {
  width: 12px;
  height: 8px;
  border-radius: 3px;
}

/* Label + sublabel inline — width auto-determined by grid column */
.mc-stat-labels {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.mc-stat-name { font-size: 12px; color: var(--bma-text-primary); font-weight: 500; white-space: nowrap; }
.mc-stat-sub  { font-size: 10px; color: var(--bma-text-muted); white-space: nowrap; }

.mc-progress-track {
  height: 8px;
  background: #EBEBEB;
  border-radius: var(--bma-radius-full);
  overflow: hidden;
}

.mc-progress-fill {
  height: 100%;
  border-radius: var(--bma-radius-full);
  transition: width .4s ease;
}

.mc-stat-count {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
  text-align: right;
}

.mc-stat-pct {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Summary section ──────────────────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-primary);
  margin-bottom: 14px;
}

.section-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #FFF3E0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-badge {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
  background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-card);
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.summary-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  padding: 16px 20px;
}

.sc-header     { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.sc-title-wrap { display: flex; align-items: flex-start; gap: 10px; }
.sc-icon       { width: 32px; height: 32px; border-radius: var(--bma-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-title      { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.sc-subtitle   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; }
.alert-badge   { background: var(--bma-emergency); color: var(--bma-surface); border-radius: var(--bma-radius-full); padding: 2px 10px; font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.sc-divider    { height: 1px; background: var(--bma-border-subtle); margin-bottom: 12px; }
.sc-stat-row   { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; }
.sc-stat-label { display: flex; align-items: center; gap: 5px; color: var(--bma-text-tertiary); }
.sc-stat-value { font-family: var(--bma-font-data); font-weight: 700; color: var(--bma-text-primary); font-size: 14px; }


/* ── Filter bar (main) ────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  margin-bottom: 16px;
}

.filter-search {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.filter-date {
  position: relative;
  width: 170px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.fi-icon   { position: absolute; left: 10px; pointer-events: none; }
.fi-icon-r { position: absolute; right: 10px; pointer-events: none; }

.filter-input {
  width: 100%;
  height: 38px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-primary);
  background: var(--bma-surface);
  outline: none;
  transition: border-color var(--bma-transition-fast);
}
.filter-search .filter-input { padding: 0 12px 0 34px; }
.filter-date   .filter-input { padding: 0 34px 0 12px; }
.filter-input::placeholder   { color: var(--bma-text-disabled); }
.filter-input:focus { border-color: var(--bma-green-500); }

.btn-search {
  height: 38px;
  padding: 0 20px;
  background: var(--bma-green-500);
  color: var(--bma-surface);
  border: none;
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-search:hover { background: var(--bma-green-600); }

/* ── Table card ───────────────────────────────────────────── */
.table-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  overflow: hidden;
}

/* ── Data table ───────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead tr {
  background: var(--bma-surface-light);
  border-bottom: 1.5px solid var(--bma-border-subtle);
}

.data-table th {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--bma-text-muted);
  text-align: left;
  white-space: nowrap;
}

.data-row {
  border-bottom: 1px solid var(--bma-surface-subtle);
  transition: background .12s;
}
.data-row:hover { background: var(--bma-surface-light); }
.data-row:last-child { border-bottom: none; }

/* Row tint by status — background encodes severity without side-stripe */
.data-row--under-range,
.data-row--underdose   { background: #FFFBF5; }
.data-row--under-range:hover,
.data-row--underdose:hover { background: #FFF3E0; }

.data-row--over-range,
.data-row--overdose,
.data-row--contra,
.data-row--interaction { background: #FFF8F8; }
.data-row--over-range:hover,
.data-row--overdose:hover,
.data-row--contra:hover,
.data-row--interaction:hover { background: #FEECEC; }

.data-table td { padding: 10px 14px; color: var(--bma-text-primary); vertical-align: middle; }

.col-action   { width: 52px; }
.col-name     { min-width: 180px; }
.col-hospital { min-width: 140px; }
.col-status   { width: 130px; }
.col-lab      { width: 200px; }
.col-weight   { width: 120px; }

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1.5px solid var(--bma-border-card);
  background: var(--bma-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color var(--bma-transition-fast), background var(--bma-transition-fast);
}
.action-btn:hover { border-color: var(--bma-green-500); background: var(--bma-green-50); }

.patient-name { font-size: 13px; font-weight: 600; color: var(--bma-text-primary); }
.patient-hn   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; font-family: var(--bma-font-data); }

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge--in-range,
.status-badge--appropriate { background: #E8F5E9; color: #2E7D32; }
.status-badge--under-range,
.status-badge--underdose   { background: #FFF3E0; color: #E65100; }
.status-badge--over-range,
.status-badge--overdose    { background: #FCE4EC; color: var(--bma-emergency); }
.status-badge--contra      { background: #E8EAF6; color: var(--bma-elective); }
.status-badge--interaction { background: #F3EEFF; color: #7B52AB; }

/* Lab value badges */
.col-lab { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

.lab-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border-muted);
  background: var(--bma-surface);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 600;
  color: var(--bma-text-primary);
  white-space: nowrap;
}
.lab-badge--alert {
  border-color: #E57373;
  background: #FFF5F5;
  color: var(--bma-emergency);
}

/* Weight badge */
.weight-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border-muted);
  background: var(--bma-surface-light);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 600;
  color: var(--bma-text-primary);
}

/* ── Table footer / Pagination ────────────────────────────── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--bma-border-subtle);
}

.pg-info {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}

.pg-controls { display: flex; align-items: center; gap: 10px; }

.pg-select {
  height: 30px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  padding: 0 24px 0 8px;
  font-family: var(--bma-font-data);
  font-size: 12px;
  background: var(--bma-surface) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%238c8c8c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 6px center;
  appearance: none;
  cursor: pointer;
}

.pagination { display: flex; gap: 3px; }

.pg-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border);
  background: var(--bma-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 500;
  color: var(--bma-text-secondary);
  transition: all var(--bma-transition-fast);
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover { border-color: var(--bma-green-500); color: var(--bma-green-500); background: var(--bma-green-50); }
.pg-btn--active   { background: var(--bma-green-500); border-color: var(--bma-green-500); color: var(--bma-surface); font-weight: 700; }
.pg-btn--disabled { color: var(--bma-border); cursor: not-allowed; }

</style>
