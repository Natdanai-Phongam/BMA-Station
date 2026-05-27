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
          <div class="table-scroll-wrap">
            <table class="data-table data-table--warfarin">
              <thead>
                <tr>
                  <th class="col-action">คำสั่ง</th>
                  <th class="col-name">ชื่อ - นามสกุล</th>
                  <th class="col-hospital">โรงพยาบาล</th>
                  <th class="col-status">สถานะ</th>
                  <th class="col-inr">INR</th>
                  <th class="col-ttr">TTR (%)</th>
                  <th class="col-dose">ขนาดยา / สัปดาห์</th>
                  <th class="col-ixn">Drug Interaction</th>
                  <th class="col-concordance">แนวทางการจ่ายยา</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in enrichedWarfarin"
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
                    <div class="patient-hn-row">
                      <span class="patient-hn">{{ p.hn }}</span>
                    </div>
                  </td>
                  <td>{{ p.hospital }}</td>
                  <td class="col-status">
                    <span class="status-badge" :class="`status-badge--${p.status}`">
                      {{ warfarinStatusLabel[p.status] }}
                    </span>
                  </td>
                  <td class="col-inr">
                    <span class="inr-val" :class="p.inr.alert ? 'inr-val--alert' : ''">
                      {{ p.inr.value }}
                    </span>
                  </td>
                  <td class="col-ttr">
                    <template v-if="p.wf">
                      <div class="ttr-display">
                        <span class="ttr-val" :class="`ttr--${p.wf.ttr.status}`">{{ p.wf.ttr.value }}%</span>
                        <span class="ttr-status-badge" :class="`ttr-badge--${p.wf.ttr.status}`">{{ ttrStatusLabel[p.wf.ttr.status] }}</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-dose">
                    <template v-if="p.wf">
                      <div class="dose-display">
                        <span class="dose-val">{{ p.wf.profile.currentDoseMgWk }}</span>
                        <span class="dose-unit">mg/สป.</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-ixn">
                    <v-tooltip
                      v-if="majorIxnCount(p.wf) > 0"
                      location="top"
                      :max-width="340"
                      content-class="ixn-tt-overlay"
                    >
                      <template #activator="{ props: ttProps }">
                        <span v-bind="ttProps" class="ixn-badge ixn-badge--hoverable">
                          <PhWarning :size="11" />
                          {{ majorIxnCount(p.wf) }}
                        </span>
                      </template>
                      <div class="ixn-tt-header">Drug Interactions · Major</div>
                      <div
                        v-for="med in getMajorIxns(p.wf)"
                        :key="med.name"
                        class="ixn-tt-row"
                      >
                        <div class="ixn-tt-name-row">
                          <span class="ixn-tt-name">{{ med.name }}</span>
                          <span class="ixn-tt-effect" :class="`ixn-effect--${med.effect}`">
                            {{ effectLabel[med.effect] }}
                          </span>
                        </div>
                        <div class="ixn-tt-note">{{ med.note }}</div>
                      </div>
                    </v-tooltip>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-concordance">
                    <template v-if="p.wf?.doseAdjustments?.length">
                      <span
                        class="concordance-badge"
                        :class="wfConcordanceBadgeClass(lastDoseAdjustment(p.wf))"
                      >
                        {{ wfConcordanceLabel(lastDoseAdjustment(p.wf)) }}
                      </span>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="table-footer">
            <span class="pg-info">ข้อมูลที่ 1 ถึง {{ warfarinTotal }} จากทั้งหมด {{ warfarinTotal }} รายการ</span>
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
          <div class="table-scroll-wrap">
            <table class="data-table data-table--noacs">
              <thead>
                <tr>
                  <th class="col-action">คำสั่ง</th>
                  <th class="col-name">ชื่อ - นามสกุล</th>
                  <th class="col-hospital">โรงพยาบาล</th>
                  <th class="col-status">สถานะ</th>
                  <th class="col-drug">ยาที่ใช้ / ขนาด</th>
                  <th class="col-crcl">CrCl</th>
                  <th class="col-weight">น้ำหนัก</th>
                  <th class="col-concordance">แนวทางการจ่ายยา</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in enrichedNoacs"
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
                    <div class="patient-hn-row">
                      <span class="patient-hn">{{ p.hn }}</span>
                      <span v-if="p.noac" class="indication-chip">
                        {{ indicationChipLabel[p.noac.profile.indication] }}
                      </span>
                    </div>
                  </td>
                  <td>{{ p.hospital }}</td>
                  <td class="col-status">
                    <span class="status-badge" :class="`status-badge--${p.status}`">
                      {{ noacsStatusLabel[p.status] }}
                    </span>
                  </td>
                  <td class="col-drug">
                    <template v-if="p.noac">
                      <div class="drug-inline">
                        <span class="drug-name">{{ drugDisplayLabel[p.noac.profile.currentDrug] }}</span>
                        <span class="drug-sep">·</span>
                        <span class="drug-dose">{{ p.noac.profile.currentDose }}</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-crcl">
                    <span class="lab-badge" :class="p.crcl.alert ? 'lab-badge--alert' : ''">
                      {{ p.crcl.value }}
                      <PhWarningCircle v-if="p.crcl.alert" :size="11" />
                    </span>
                  </td>
                  <td class="col-weight">
                    <div class="weight-display">
                      <span class="weight-val" :class="p.weight <= 60 ? 'weight-val--low' : ''">
                        {{ p.weight.toFixed(1) }}
                      </span>
                      <span class="weight-unit">กก.</span>
                    </div>
                  </td>
                  <td class="col-concordance">
                    <template v-if="p.noac?.dispensingHistory?.length">
                      <span
                        class="concordance-badge"
                        :class="concordanceBadgeClass(lastDispensing(p.noac))"
                      >
                        {{ concordanceLabel(lastDispensing(p.noac)) }}
                      </span>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-footer">
            <span class="pg-info">ข้อมูลที่ 1 ถึง {{ noacsTotal }} จากทั้งหมด {{ noacsTotal }} รายการ</span>
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
import type { AtsDashboardConfigData, AtsMonitoringCard } from '@/data/types/ats'
import type { AtsPatientsData, WarfarinStatus, NoacsStatus } from '@/data/types/ats-patients'
import type { WarfarinPageData, DoseAdjustment } from '@/data/types/warfarin'
import type { NoacPatientData, NoacDispensingRecord } from '@/data/types/noac-dispensing'
import type { NoacDrug, NoacIndication } from '@/data/types/noac'
import rawConfig      from '@/data/mock/ats-dashboard.json'
import rawPatients    from '@/data/mock/ats-patients.json'
import allWarfarinRaw from '@/data/mock/warfarin-patients.json'
import allNoacRaw     from '@/data/mock/noac-patients.json'

ChartJS.register(ArcElement, DoughnutController, Tooltip)

const router = useRouter()

// Cast JSON to typed shapes — swap imports for fetch() calls when backend is ready
const dashConfig  = rawConfig      as AtsDashboardConfigData
const patients    = rawPatients    as AtsPatientsData
const allWarfarin = allWarfarinRaw as Record<string, WarfarinPageData>
const allNoac     = allNoacRaw     as Record<string, NoacPatientData>

// Enriched patient lists — join ats-patients summary with therapy-specific clinical data
const enrichedWarfarin = computed(() =>
  patients.warfarin.map(p => ({ ...p, wf: allWarfarin[p.id] ?? null }))
)
const enrichedNoacs = computed(() =>
  patients.noacs.map(p => ({ ...p, noac: allNoac[p.id] ?? null }))
)

// Map icon name strings from JSON to Phosphor icon components
const iconMap: Record<string, Component> = { PhChartBar, PhFirstAid }

// ── Derive monitoring card stats from the actual patient list ─────────────────
// Produces a fully-typed AtsMonitoringCard from display config + patient counts.
// Replace the patient list source (fetch → reactive ref) to get live updates.
const cards = computed<AtsMonitoringCard[]>(() => {
  const wList = patients.warfarin
  const nList = patients.noacs

  // Warfarin
  const wTotal   = wList.length
  const wIn      = wList.filter(p => p.status === dashConfig.warfarin.inRangeStatusKey).length
  const wOut     = wTotal - wIn
  const wAlerts  = wList.filter(p => p.crcl.alert || p.inr.alert).length
  const wRefer   = wList.filter(p => p.referred).length
  const wCard: AtsMonitoringCard = {
    ...dashConfig.warfarin,
    totalPatients:   wTotal,
    inRangeCount:    wIn,
    inRangePct:      wTotal > 0 ? `${Math.round(wIn / wTotal * 100)}%`  : '0%',
    outOfRangeCount: wOut,
    outOfRangePct:   wTotal > 0 ? `${Math.round(wOut / wTotal * 100)}%` : '0%',
    alertCount:      wAlerts,
    referralCount:   wRefer,
    stats: dashConfig.warfarin.stats.map(s => {
      const count = wList.filter(p => p.status === s.statusKey).length
      const pct   = wTotal > 0 ? ((count / wTotal) * 100).toFixed(1) : '0'
      return { ...s, count, pctDisplay: `(${pct}%)` }
    }),
  }

  // NOACs
  const nTotal   = nList.length
  const nIn      = nList.filter(p => p.status === dashConfig.noacs.inRangeStatusKey).length
  const nOut     = nTotal - nIn
  const nAlerts  = nList.filter(p => p.crcl.alert || p.egfr.alert).length
  const nRefer   = nList.filter(p => p.referred).length
  const nCard: AtsMonitoringCard = {
    ...dashConfig.noacs,
    totalPatients:   nTotal,
    inRangeCount:    nIn,
    inRangePct:      nTotal > 0 ? `${Math.round(nIn / nTotal * 100)}%`  : '0%',
    outOfRangeCount: nOut,
    outOfRangePct:   nTotal > 0 ? `${Math.round(nOut / nTotal * 100)}%` : '0%',
    alertCount:      nAlerts,
    referralCount:   nRefer,
    stats: dashConfig.noacs.stats.map(s => {
      const count = nList.filter(p => p.status === s.statusKey).length
      const pct   = nTotal > 0 ? ((count / nTotal) * 100).toFixed(1) : '0'
      return { ...s, count, pctDisplay: `(${pct}%)` }
    }),
  }

  return [wCard, nCard]
})

// ── Chart helpers ─────────────────────────────────────────────────────────────
// chartPropsMap is keyed by card.id so the template can look up stable props.
// Stable references prevent vue-chartjs from triggering full chart re-initialization
// on every render cycle.
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

// ── Navigation ────────────────────────────────────────────────────────────────
function goToPatient(id: string) {
  router.push(`/dd-ats/patient/${id}`)
}

// ── Status labels ─────────────────────────────────────────────────────────────
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

// ── Warfarin enrichment helpers ───────────────────────────────────────────────
function majorIxnCount(wf: WarfarinPageData | null): number {
  if (!wf?.profile.concurrentMeds) return 0
  return wf.profile.concurrentMeds.filter(m => m.severity === 'major').length
}

function getMajorIxns(wf: WarfarinPageData | null) {
  return wf?.profile.concurrentMeds?.filter(m => m.severity === 'major') ?? []
}

const effectLabel: Record<string, string> = {
  increase: '↑ เพิ่ม INR',
  decrease: '↓ ลด INR',
  none:     'ไม่มีผล',
}

const ttrStatusLabel: Record<string, string> = {
  'goal-met':          'ผ่านเกณฑ์',
  'below-goal':        'ต่ำกว่าเกณฑ์',
  'insufficient-data': 'ข้อมูลไม่พอ',
}

function lastDoseAdjustment(wf: WarfarinPageData | null): DoseAdjustment | undefined {
  const adj = wf?.doseAdjustments
  return adj?.length ? adj[adj.length - 1] : undefined
}

function wfConcordanceBadgeClass(adj: DoseAdjustment | undefined): string {
  if (!adj) return 'concordance--none'
  if (adj.systemSuggested) return 'concordance--yes'
  return adj.overrideReason ? 'concordance--adjusted' : 'concordance--no'
}

function wfConcordanceLabel(adj: DoseAdjustment | undefined): string {
  if (!adj) return '—'
  if (adj.systemSuggested) return '✓ ตามแนวทาง'
  return adj.overrideReason ? '✗ ปรับโดยมีเหตุผล' : '✗ ไม่ระบุเหตุผล'
}

// ── NOACs enrichment helpers ──────────────────────────────────────────────────
function lastDispensing(noacData: NoacPatientData | null): NoacDispensingRecord | undefined {
  const h = noacData?.dispensingHistory
  return h?.length ? h[h.length - 1] : undefined
}

function concordanceBadgeClass(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return 'concordance--none'
  if (disp.wasTopRecommendation) return 'concordance--yes'
  return disp.overrideReason ? 'concordance--adjusted' : 'concordance--no'
}

function concordanceLabel(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return '—'
  if (disp.wasTopRecommendation) return '✓ ตามแนวทาง'
  return disp.overrideReason ? '✗ ปรับโดยมีเหตุผล' : '✗ ไม่ระบุเหตุผล'
}

const drugDisplayLabel: Record<NoacDrug, string> = {
  apixaban:    'Apixaban',
  rivaroxaban: 'Rivaroxaban',
  dabigatran:  'Dabigatran',
  edoxaban:    'Edoxaban',
}

const indicationChipLabel: Record<NoacIndication, string> = {
  NVAF: 'NVAF', DVT: 'DVT', PE: 'PE', CAT: 'CAT',
}

// ── Patient list counts (real, for pagination display) ────────────────────────
const warfarinTotal = computed(() => patients.warfarin.length)
const noacsTotal    = computed(() => patients.noacs.length)

// ── Tabs + scroll reset ───────────────────────────────────────────────────────
type TabValue = 'dashboard' | 'warfarin' | 'noacs'
const activeTab = ref<TabValue>('dashboard')

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
  margin-bottom: 20px;
  min-height: 40px;
}

.page-title    { font-size: 18px; font-weight: 700; color: var(--bma-text-primary); line-height: 1.35; margin: 0; }
.page-subtitle { font-size: 12px; color: var(--bma-text-muted); margin-top: 3px; }

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

/* ── Table horizontal scroll ──────────────────────────────── */
.table-scroll-wrap {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bma-border) transparent;
}
.table-scroll-wrap::-webkit-scrollbar        { height: 5px; }
.table-scroll-wrap::-webkit-scrollbar-track  { background: transparent; }
.table-scroll-wrap::-webkit-scrollbar-thumb  { background: var(--bma-border); border-radius: 3px; }

.data-table--warfarin { min-width: 960px; }
.data-table--noacs    { min-width: 880px; }

/* ── Column widths ────────────────────────────────────────── */
/* TTR: wider — "88% [ผ่านเกณฑ์]" inline chip needs ~148px  */
/* Dose: narrower — single line "35 mg/สป."                  */
/* Drug: wider — "Rivaroxaban · 20mg qd" needs ~155px        */
.col-action      { width: 48px; }
.col-status      { width: 110px; }
.col-inr         { width: 68px; }
.col-ttr         { width: 152px; }
.col-dose        { width: 90px; }
.col-crcl        { width: 72px; }
.col-ixn         { width: 110px; }
.col-drug        { width: 160px; }
.col-weight      { width: 88px; }
.col-concordance { width: 148px; }

/* ── Patient HN row (chips inline) ───────────────────────── */
.patient-hn-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}

/* Indication chip (NOACs) */
.indication-chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-green-50);
  border: 1px solid var(--bma-green-200);
  color: var(--bma-green-700);
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── INR display ──────────────────────────────────────────── */
.inr-display { display: flex; flex-direction: column; gap: 3px; }

.inr-val {
  font-family: var(--bma-font-data);
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}
.inr-val--alert { color: var(--bma-emergency); }

.inr-target-badge {
  display: inline-block;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 600;
  color: var(--bma-text-muted);
  background: var(--bma-surface-light);
  border: 1px solid var(--bma-border-subtle);
  border-radius: 3px;
  padding: 1px 5px;
  width: fit-content;
}

/* ── TTR display ──────────────────────────────────────────── */
.ttr-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 5px;
}

.ttr-val {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}
.ttr--goal-met          { color: var(--bma-success-text); }
.ttr--below-goal        { color: var(--bma-emergency); }
.ttr--insufficient-data { color: var(--bma-text-muted); }

.ttr-status-badge {
  display: inline-block;
  font-family: var(--bma-font-thai);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}
.ttr-badge--goal-met          { background: var(--bma-success-bg);     color: var(--bma-success-text); }
.ttr-badge--below-goal        { background: var(--bma-emergency-bg);   color: var(--bma-emergency); }
.ttr-badge--insufficient-data { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

/* ── Dose display ─────────────────────────────────────────── */
.dose-display { display: flex; align-items: baseline; gap: 2px; flex-wrap: nowrap; }

.dose-val {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.dose-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Interaction badge ────────────────────────────────────── */
.ixn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-urgency-bg);
  color: var(--bma-urgency-text);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
}

/* ── Drug display (NOACs) ─────────────────────────────────── */
.drug-inline {
  display: flex;
  align-items: baseline;
  flex-wrap: nowrap;
  gap: 3px;
}
.drug-name {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
  flex-shrink: 0;
}
.drug-sep {
  font-size: 10px;
  color: var(--bma-text-muted);
  flex-shrink: 0;
}
.drug-dose {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Weight display (NOACs) ───────────────────────────────── */
.weight-display { display: flex; align-items: baseline; gap: 2px; }

.weight-val {
  font-family: var(--bma-font-data);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.weight-val--low { color: var(--bma-urgency-text); }
.weight-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}
/* Weight criterion chip */
.weight-flag-chip {
  display: inline-block;
  margin-top: 3px;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  color: #E65100;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}


/* ── Concordance badge ────────────────────────────────────── */
.concordance-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.concordance--yes      { background: var(--bma-success-bg);    color: var(--bma-success-text); }
.concordance--adjusted { background: var(--bma-urgency-bg);    color: var(--bma-urgency-text); }
.concordance--no       { background: var(--bma-emergency-bg);  color: var(--bma-emergency); }

/* ── Generic dash placeholder ─────────────────────────────── */
.col-dash { color: var(--bma-text-disabled); font-size: 14px; }

/* Hoverable badge hint */
.ixn-badge--hoverable { cursor: pointer; }

</style>

<!-- Tooltip content styles — NOT scoped: Vuetify teleports tooltip to <body>,
     so scoped selectors can't reach it. Use specific class names to avoid leaking. -->
<style>
.ixn-tt-overlay.v-overlay__content {
  background: var(--bma-surface) !important;
  border: 1px solid var(--bma-border-card) !important;
  border-radius: 10px !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16) !important;
  padding: 12px 14px !important;
  color: var(--bma-text-primary) !important;
}

.ixn-tt-overlay .ixn-tt-header {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bma-text-muted);
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--bma-border-subtle);
}

.ixn-tt-overlay .ixn-tt-row {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ixn-tt-overlay .ixn-tt-row + .ixn-tt-row {
  border-top: 1px solid var(--bma-border-subtle);
}

.ixn-tt-overlay .ixn-tt-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ixn-tt-overlay .ixn-tt-name {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}

.ixn-tt-overlay .ixn-tt-effect {
  display: inline-block;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ixn-tt-overlay .ixn-effect--increase { background: #FEECEC; color: #B72C2C; }
.ixn-tt-overlay .ixn-effect--decrease { background: #FFF3E0; color: #E65100; }
.ixn-tt-overlay .ixn-effect--none     { background: #F5F5F5; color: #8C8C8C; }

.ixn-tt-overlay .ixn-tt-note {
  font-family: var(--bma-font-thai);
  font-size: 11.5px;
  color: var(--bma-text-secondary);
  line-height: 1.55;
}
</style>
