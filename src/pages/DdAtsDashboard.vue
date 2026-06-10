<template>
  <div class="content-wrap">

    <!-- ── Loading state ────────────────────────────────────── -->
    <div v-if="loading" class="dash-loading">กำลังโหลดข้อมูล…</div>

    <template v-else>
    <!-- ── White header zone ────────────────────────────────── -->
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            โครงการบูรณาการดิจิทัลแดชบอร์ดเพื่อสนับสนุนการใช้ยาต้านการแข็งตัวของเลือดอย่างสมเหตุผล
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
          <span v-if="tab.count !== null" class="bma-tab-count">{{ tab.count }}</span>
        </div>
      </div>
    </div>

    <!-- ── Gray content zone ─────────────────────────────────── -->
    <div class="main-wrap">

      <!-- ── KPI Strip — reactive to active tab ──────────────── -->
      <div class="kpi-strip">
        <div v-for="(metric, idx) in activeKpi" :key="idx" class="kpi-cell">
          <div class="kpi-eyebrow">{{ metric.eyebrow }}</div>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ metric.value }}</span>
            <span v-if="metric.unit" class="kpi-unit">{{ metric.unit }}</span>
            <span
              v-if="metric.badge"
              class="kpi-badge"
              :class="metric.badge.good ? 'kpi-badge--good' : 'kpi-badge--alert'"
     
              >{{ metric.badge.label }}</span>
          </div>
          <div class="kpi-context">{{ metric.context }}</div>
        </div>
      </div>

      <!-- ── KPI period strip — bare, visible only on KPI tab ───── -->
      <Transition name="kpi-period-strip-slide">
        <div v-if="activeTab === 'kpi'" class="kpi-period-strip">
          <!-- Hospital multi-select — scopes the KPI numbers to selected hospitals -->
          <div class="kpi-hospital-row">
            <span class="kpi-period-scope">โรงพยาบาล</span>
            <div class="kpi-hosp-group">
              <button
                v-for="h in hospitalList" :key="h.id"
                class="kpi-hosp-chip"
                :class="{ 'kpi-hosp-chip--on': selectedHospitals.includes(h.id) }"
                @click="toggleHospital(h.id)"
              >
                <span class="kpi-hosp-check">
                  <PhCheck v-if="selectedHospitals.includes(h.id)" :size="11" weight="bold" />
                </span>
                {{ h.name }}
              </button>
            </div>
          </div>
          <div class="kpi-period-strip-row">
            <div class="kpi-period-panel-left">
              <button class="kpi-refresh-btn" @click="refreshKpiData" title="รีเฟรชข้อมูล">
                <PhArrowsClockwise :size="13" />
              </button>
              <span class="kpi-period-scope">ช่วงเวลา</span>
              <span class="kpi-period-current">{{ kpiPeriodLabel }}</span>
            </div>
            <div class="kpi-period-seg">
              <button
                v-for="m in KPI_MODES" :key="m.value"
                class="kpi-seg-btn"
                :class="{ 'kpi-seg-btn--on': kpiMode === m.value }"
                @click="kpiMode = m.value"
              >{{ m.label }}</button>
            </div>
          </div>
          <Transition name="kpi-custom-slide">
            <div v-if="kpiMode === 'month'" class="kpi-custom-row kpi-custom-row--strip">
              <PhCalendar :size="13" color="var(--bma-text-muted)" />
              <span class="kpi-custom-label">ช่วงเดือน</span>
              <div class="kpi-custom-inputs">
                <!-- Month from — Vuetify month picker -->
                <v-menu v-model="monthFromMenu" :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props: mp }">
                    <button class="kpi-month-btn" v-bind="mp">{{ monthFrom ? thaiMonth(dateToYM(monthFrom)) : 'เลือกเดือน' }}</button>
                  </template>
                  <KpiMonthPicker
                    v-model="monthFrom"
                    :min="dataMinDate"
                    :max="monthTo ?? monthToMax"
                    @update:model-value="monthFromMenu = false"
                  />
                </v-menu>
                <span class="kpi-custom-sep">ถึง</span>
                <v-menu v-model="monthToMenu" :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props: mp }">
                    <button class="kpi-month-btn" v-bind="mp">{{ monthTo ? thaiMonth(dateToYM(monthTo)) : 'เลือกเดือน' }}</button>
                  </template>
                  <KpiMonthPicker
                    v-model="monthTo"
                    :min="monthFrom ?? dataMinDate"
                    :max="monthToMax"
                    @update:model-value="monthToMenu = false"
                  />
                </v-menu>
              </div>
            </div>
            <div v-else-if="kpiMode === 'quarter'" class="kpi-custom-row kpi-custom-row--strip">
              <PhCalendar :size="13" color="var(--bma-text-muted)" />
              <span class="kpi-custom-label">ปี</span>
              <select class="kpi-year-select" v-model.number="quarterYear">
                <option v-for="y in availableYears" :key="y" :value="y">{{ y + 543 }}</option>
              </select>
              <div class="kpi-q-seg">
                <button
                  v-for="q in ([1,2,3,4] as const)" :key="q"
                  class="kpi-q-btn"
                  :class="{ 'kpi-q-btn--on': quarterNum === q, 'kpi-q-btn--disabled': isQuarterDisabled(q) }"
                  :disabled="isQuarterDisabled(q)"
                  @click="quarterNum = q"
                >Q{{ q }}</button>
              </div>
            </div>
            <div v-else-if="kpiMode === 'year'" class="kpi-custom-row kpi-custom-row--strip">
              <PhCalendar :size="13" color="var(--bma-text-muted)" />
              <span class="kpi-custom-label">ปี</span>
              <select class="kpi-year-select" v-model.number="yearNum">
                <option v-for="y in availableYears" :key="y" :value="y">{{ y + 543 }}</option>
              </select>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Dashboard Tab -->
      <div v-show="activeTab === 'dashboard'">

        <!-- Monitoring cards -->
        <div class="monitoring-grid">
          <MonitoringCard
            v-for="card in cards"
            :key="card.id"
            :card="card"
            :chart-data="chartPropsMap[card.id].data"
            :chart-plugins="chartPropsMap[card.id].plugins"
          />
        </div>

        <!-- Summary section -->
        <div class="summary-container">
          <div class="section-header">
            <div class="section-icon-wrap">
              <PhBell :size="15" color="var(--bma-urgency)" />
            </div>
            สรุปการแจ้งเตือนและปรับขนาดยา
            <span class="section-badge">Consultation &amp; Adjustment Summary</span>
          </div>

          <div class="summary-grid">
            <SummaryPanel
              v-for="card in cards"
              :key="card.id"
              :card="card"
              :out-of-range-patients="getSummaryPatients(card.id, 'outOfRange')"
              :referral-patients="getSummaryPatients(card.id, 'referrals')"
              @go-to-patient="goToPatient"
            />
          </div>
        </div>
      </div>

      <!-- ── Warfarin patient list ─────────────────────────── -->
      <div v-show="activeTab === 'warfarin'">
        <WfPatientTable
          :rows="enrichedWarfarin"
          @go-to-patient="goToPatient"
        />
      </div>

      <!-- ── NOACs patient list ──────────────────────────────── -->
      <div v-show="activeTab === 'noacs'">
        <NoacPatientTable
          :rows="enrichedNoacs"
          @go-to-patient="goToPatient"
        />
      </div>

      <!-- ── KPI Tab ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'kpi'">

        <!-- ── Primary KPIs container ──────────────────────────── -->
        <div class="kpi-container">
          <div class="kpi-container-header">
            <span class="kpi-st-text">ตัวชี้วัดหลัก</span>
          </div>
          <div class="kpi-container-grid kpi-container-grid--primary">
            <KpiSafetySection :rows="safetyRows" />
            <KpiQualitySection
              :rows="qualityBarRows"
              :avg-l-o-s="liveKpi.quality.avgLOS"
              :los-status="losStatus"
            />
          </div>
        </div>

        <!-- ── Secondary KPIs container ─────────────────────────── -->
        <div class="kpi-container">
          <div class="kpi-container-header">
            <span class="kpi-st-text">ตัวชี้วัดรอง</span>
          </div>
          <div class="kpi-container-grid kpi-container-grid--half">
            <KpiAtsSection :rows="atsRows" />
            <KpiEfficiencySection
              :staff-items="staffItems"
              :efficiency="liveKpi.efficiency"
              :patient-count="liveKpi.patientCount"
            />
          </div>
        </div>

      </div>

    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  PhBell,
  PhCalendar,
  PhArrowsClockwise,
  PhCheck,
} from '@phosphor-icons/vue'
import type { AtsDashboardConfigData, AtsMonitoringCard } from '@/data/types/ats'
import type { WarfarinStatus, NoacsStatus, SummaryPatientEntry } from '@/data/types/ats-patients'
import type { KpiPeriodData, KpiMode, KpiMetric } from '@/data/types/ats-kpi'
import { getAppDate, getAppYearMonth, monthToQuarter, monthStart, monthEnd } from '@/utils/app-date'
import type { PeriodMetrics, StatusLevel, SafetyRow, QualityBarRow, AtsRow } from '@/data/types/kpi-operational'
import { thaiMonth }                   from '@/utils/date'
import { parsePct }                    from '@/utils/number-helpers'
import { warfarinStatusLabel }          from '@/utils/warfarin-helpers'
import { noacsStatusLabel }             from '@/utils/noac-helpers'
import WfPatientTable   from '@/components/dd-ats/WfPatientTable.vue'
import NoacPatientTable from '@/components/dd-ats/NoacPatientTable.vue'
import KpiMonthPicker   from '@/components/dd-ats/KpiMonthPicker.vue'
import MonitoringCard        from '@/components/dd-ats/MonitoringCard.vue'
import SummaryPanel          from '@/components/dd-ats/SummaryPanel.vue'
import KpiSafetySection      from '@/components/dd-ats/KpiSafetySection.vue'
import KpiQualitySection     from '@/components/dd-ats/KpiQualitySection.vue'
import KpiAtsSection         from '@/components/dd-ats/KpiAtsSection.vue'
import KpiEfficiencySection  from '@/components/dd-ats/KpiEfficiencySection.vue'
import { safetyStatus, qualityStatus, safetyStatusLabel, qualityStatusLabel } from '@/utils/kpi-status'
import { makeCenterPlugin, donutChartData } from '@/composables/useChartPlugins'
import { KPI_SAFETY_TARGETS, KPI_QUALITY_TARGETS, KPI_ATS_TARGETS } from '@/data/config/kpi-targets'
import { repo } from '@/data/repository'
import type { PatientListData, KpiSummary } from '@/data/repository'
import { emptyPeriodMetrics } from '@/utils/kpi-metrics'
import { DATA_WINDOW } from '@/data/config/data-window'


const router = useRouter()
const route  = useRoute()

// Data is loaded via the repository (see onMounted). Refs default to empty
// shapes; the template is guarded behind `loading`, and every data-derived
// computed is template-only, so none read the empty shells before data arrives.
const loading     = ref(true)
// shallowRef: large read-only source maps — avoid deep-proxying the dataset (perf at scale)
const dashConfig  = shallowRef<AtsDashboardConfigData>({} as AtsDashboardConfigData)
// Tier-1 light projection (generator-produced) — the dashboard reads this instead
// of joining ats-patients with the heavy raw records. status/concordance/ttr are
// precomputed (§3.11). kpiSummary holds PeriodMetrics per period range.
const patientList = shallowRef<PatientListData>({ generatedAt: '', warfarin: [], noacs: [] })
const kpiSummary  = shallowRef<KpiSummary>({ meta: { generatedAt: '', mockNow: '', dataMinDate: DATA_WINDOW.start, hospitals: [] }, ranges: {}, ops: {} })

const enrichedWarfarin = computed(() => patientList.value.warfarin)
const enrichedNoacs    = computed(() => patientList.value.noacs)

// Map icon name strings from JSON to Phosphor icon components

// ── Derive monitoring card stats from the actual patient list ─────────────────
// Produces a fully-typed AtsMonitoringCard from display config + patient counts.
// Replace the patient list source (fetch → reactive ref) to get live updates.
const cards = computed<AtsMonitoringCard[]>(() => {
  const wList = enrichedWarfarin.value
  const nList = enrichedNoacs.value

  // Warfarin
  const wTotal   = wList.length
  const wIn      = wList.filter(p => p.status === dashConfig.value.warfarin.inRangeStatusKey).length
  const wOut     = wTotal - wIn
  const wAlerts  = wList.filter(p => p.crcl.alert || p.inr.alert).length
  const wRefer   = wList.filter(p => p.referred).length
  const wCard: AtsMonitoringCard = {
    ...dashConfig.value.warfarin,
    totalPatients:   wTotal,
    inRangeCount:    wIn,
    inRangePct:      wTotal > 0 ? `${Math.round(wIn / wTotal * 100)}%`  : '0%',
    outOfRangeCount: wOut,
    outOfRangePct:   wTotal > 0 ? `${Math.round(wOut / wTotal * 100)}%` : '0%',
    alertCount:      wAlerts,
    referralCount:   wRefer,
    stats: (() => {
      const byStatus = new Map<string, number>()
      for (const p of wList) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1)
      return dashConfig.value.warfarin.stats.map(s => {
        const count = byStatus.get(s.statusKey) ?? 0
        const pct   = wTotal > 0 ? ((count / wTotal) * 100).toFixed(1) : '0'
        return { ...s, count, pctDisplay: `(${pct}%)` }
      })
    })(),
  }

  // NOACs
  const nTotal   = nList.length
  const nIn      = nList.filter(p => p.status === dashConfig.value.noacs.inRangeStatusKey).length
  const nOut     = nTotal - nIn
  const nAlerts  = nList.filter(p => p.crcl.alert || p.egfr.alert).length
  const nRefer   = nList.filter(p => p.referred).length
  const nCard: AtsMonitoringCard = {
    ...dashConfig.value.noacs,
    totalPatients:   nTotal,
    inRangeCount:    nIn,
    inRangePct:      nTotal > 0 ? `${Math.round(nIn / nTotal * 100)}%`  : '0%',
    outOfRangeCount: nOut,
    outOfRangePct:   nTotal > 0 ? `${Math.round(nOut / nTotal * 100)}%` : '0%',
    alertCount:      nAlerts,
    referralCount:   nRefer,
    stats: (() => {
      const byStatus = new Map<string, number>()
      for (const p of nList) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1)
      return dashConfig.value.noacs.stats.map(s => {
        const count = byStatus.get(s.statusKey) ?? 0
        const pct   = nTotal > 0 ? ((count / nTotal) * 100).toFixed(1) : '0'
        return { ...s, count, pctDisplay: `(${pct}%)` }
      })
    })(),
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


// ── Navigation ────────────────────────────────────────────────────────────────
function goToPatient(id: string) {
  router.push(`/dd-ats/patient/${id}`)
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────
const activeKpi = computed<KpiMetric[]>(() => {
  const wCard = cards.value[0]
  const nCard = cards.value[1]
  if (!wCard || !nCard) return []

  if (activeTab.value === 'dashboard') {
    const total     = wCard.totalPatients   + nCard.totalPatients
    const inRange   = wCard.inRangeCount    + nCard.inRangeCount
    const outRange  = wCard.outOfRangeCount + nCard.outOfRangeCount
    const alerts    = wCard.alertCount      + nCard.alertCount
    const referrals = wCard.referralCount   + nCard.referralCount
    const pct = total > 0 ? Math.round(inRange / total * 100) : 0
    return [
      {
        eyebrow: 'ผู้ป่วยทั้งหมด · ทุกโปรแกรม',
        value: total,
        unit: 'ราย',
        context: `Warfarin ${wCard.totalPatients} · NOACs ${nCard.totalPatients} ราย`,
      },
      {
        eyebrow: 'อยู่ในช่วงเป้าหมาย',
        value: pct,
        unit: '%',
        badge: { label: pct >= 65 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 65 },
        context: `${inRange} ราย จากทั้งหมด ${total} ราย`,
      },
      {
        eyebrow: 'ต้องติดตามผล',
        value: outRange,
        unit: 'ราย',
        badge: alerts > 0 ? { label: `${alerts} แจ้งเตือน`, good: false } : undefined,
        context: 'ต้องติดตามและปรับแผนการรักษา',
      },
      {
        eyebrow: 'ส่งต่อแพทย์ · ช่วงนี้',
        value: referrals,
        unit: 'ราย',
        context: 'ส่งต่อแพทย์ปรึกษาทั้งสองโปรแกรม',
      },
    ]
  }

  if (activeTab.value === 'warfarin') {
    const card = wCard
    const pct  = parsePct(card.inRangePct)
    return [
      {
        eyebrow: 'ผู้ป่วย · Warfarin',
        value: card.totalPatients,
        unit: 'ราย',
        context: 'ผู้ป่วยในโปรแกรม Warfarin ทั้งหมด',
      },
      {
        eyebrow: 'อยู่ในช่วง TTR · INR 2.0–3.0',
        value: pct,
        unit: '%',
        badge: { label: pct >= 65 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 65 },
        context: `${card.inRangeCount} ราย อยู่ใน TTR เป้าหมาย`,
      },
      {
        eyebrow: 'ต้องติดตามผล',
        value: card.outOfRangeCount,
        unit: 'ราย',
        badge: card.alertCount > 0 ? { label: `${card.alertCount} แจ้งเตือน`, good: false } : undefined,
        context: `คิดเป็น ${card.outOfRangePct} ของผู้ป่วยทั้งหมด`,
      },
      {
        eyebrow: 'ส่งต่อแพทย์ · Warfarin',
        value: card.referralCount,
        unit: 'ราย',
        context: 'ส่งต่อแพทย์ปรึกษา',
      },
    ]
  }

  // NOACs
  const card = nCard
  const pct  = parsePct(card.inRangePct)
  if (activeTab.value === 'noacs') return [
    {
      eyebrow: 'ผู้ป่วย · NOACs',
      value: card.totalPatients,
      unit: 'ราย',
      context: 'ผู้ป่วยในโปรแกรม NOACs ทั้งหมด',
    },
    {
      eyebrow: 'ได้รับขนาดยาที่เหมาะสม',
      value: pct,
      unit: '%',
      badge: { label: pct >= 80 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 80 },
      context: `${card.inRangeCount} ราย ขนาดยาเหมาะสม`,
    },
    {
      eyebrow: 'พบผลตรวจผิดปกติ · CrCl / น้ำหนัก',
      value: card.alertCount,
      unit: 'ราย',
      badge: card.alertCount > 0 ? { label: 'ต้องตรวจสอบ', good: false } : undefined,
      context: 'ค่า CrCl หรือน้ำหนักผิดปกติ',
    },
    {
      eyebrow: 'ส่งต่อแพทย์ · NOACs',
      value: card.referralCount,
      unit: 'ราย',
      context: 'ส่งต่อแพทย์ปรึกษา',
    },
  ]

  // ── KPI tab strip ─────────────────────────────────────────────────────────
  const d    = liveKpi.value
  const s    = d.safety
  // medError is a dispensing-appropriateness metric, not a complication → excluded
  const totalAE = s.bleeding.events + s.thrombosis.events + s.aeHospitalization.events
                + s.death.events
  const ttr  = d.quality.wfTtrGoal
  const acc  = d.atsResponse.acceptanceRate
  return [
    {
      eyebrow:  'ภาวะแทรกซ้อน · ' + kpiPeriodLabel.value,
      value:    totalAE,
      unit:     'เหตุการณ์',
      badge:    totalAE > 0
        ? { label: 'ต้องติดตาม', good: false }
        : { label: 'ไม่มีรายงาน', good: true },
      context: `เลือดออก ${s.bleeding.events} · ลิ่มเลือด ${s.thrombosis.events} · นอน รพ. ${s.aeHospitalization.events}`,
    },
    {
      eyebrow:  `Warfarin TTR ≥ ${KPI_QUALITY_TARGETS.wfTtrGoal}%`,
      value:    ttr.value,
      unit:     '%',
      badge:    { label: ttr.value >= ttr.target ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเป้า', good: ttr.value >= ttr.target },
      context:  `${ttr.n} จาก ${ttr.d} ราย · เป้า ≥ ${ttr.target}%`,
    },
    {
      eyebrow:  'ปฏิบัติตามคำแนะนำ ATS',
      value:    acc.value,
      unit:     '%',
      badge:    { label: acc.value >= acc.target ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเป้า', good: acc.value >= acc.target },
      context:  acc.n != null ? `${acc.n} จาก ${acc.d} ครั้ง · เป้า ≥ ${acc.target}%` : `เป้า ≥ ${acc.target}%`,
    },
    {
      eyebrow:  'ผู้ป่วยในโปรแกรม',
      value:    d.patientCount,
      unit:     'ราย',
      context:  `Warfarin ${warfarinTotal.value} · NOACs ${noacsTotal.value} ราย`,
    },
  ]
})

// ── Summary section — hoverable patient lists ─────────────────────────────────
const summaryPatientLists = computed(() => {
  const wList = enrichedWarfarin.value
  const nList = enrichedNoacs.value

  const toWEntry = (p: typeof wList[number]): SummaryPatientEntry => ({
    id:          p.id,
    name:        p.name,
    hn:          p.hn,
    status:      p.status,
    statusLabel: warfarinStatusLabel[p.status as WarfarinStatus] ?? p.status,
  })

  const toNEntry = (p: typeof nList[number]): SummaryPatientEntry => ({
    id:          p.id,
    name:        p.name,
    hn:          p.hn,
    status:      p.status,
    statusLabel: noacsStatusLabel[p.status as NoacsStatus] ?? p.status,
  })

  return {
    warfarin: {
      outOfRange: wList.filter(p => p.status !== dashConfig.value.warfarin.inRangeStatusKey).map(toWEntry),
      referrals:  wList.filter(p => p.referred).map(toWEntry),
    },
    noacs: {
      outOfRange: nList.filter(p => p.status !== dashConfig.value.noacs.inRangeStatusKey).map(toNEntry),
      referrals:  nList.filter(p => p.referred).map(toNEntry),
    },
  }
})

function getSummaryPatients(cardId: string, type: 'outOfRange' | 'referrals'): SummaryPatientEntry[] {
  const lists = summaryPatientLists.value
  if (cardId === 'warfarin') return lists.warfarin[type]
  if (cardId === 'noacs')    return lists.noacs[type]
  return []
}

// ── Patient list counts (for KPI strip) ─────────────────────────────────────
const warfarinTotal = computed(() => patientList.value.warfarin.length)
const noacsTotal    = computed(() => patientList.value.noacs.length)


// ── KPI tab ───────────────────────────────────────────────────────────────────
// ── Hospital filter (KPI tab) — multi-select, default all ─────────────────────
const selectedHospitals = ref<string[]>([])   // hospitalIds; seeded in onMounted
const hospitalList = computed(() => kpiSummary.value.meta.hospitals)
function toggleHospital(id: string) {
  const s = new Set(selectedHospitals.value)
  s.has(id) ? s.delete(id) : s.add(id)
  // never allow empty selection → fall back to all
  selectedHospitals.value = s.size ? [...s] : hospitalList.value.map(h => h.id)
}
/** Hospital ids in effect (selection, or all if somehow empty). */
const effectiveHospitals = computed(() =>
  selectedHospitals.value.length ? selectedHospitals.value : hospitalList.value.map(h => h.id),
)

onMounted(async () => {
  try {
    const [config, list, summary] = await Promise.all([
      repo.getDashboardConfig(),
      repo.getPatientList(),
      repo.getKpiSummary(),
    ])
    dashConfig.value  = config
    patientList.value = list
    kpiSummary.value  = summary
    selectedHospitals.value = summary.meta.hospitals.map(h => h.id)
  } catch (e) {
    console.error('[DdAtsDashboard] load failed', e)
  } finally {
    loading.value = false
  }
})

const KPI_MODES: Array<{ value: KpiMode; label: string }> = [
  { value: 'month',   label: 'เดือน'  },
  { value: 'quarter', label: 'ไตรมาส' },
  { value: 'year',    label: 'ปี'     },
]

// ── KPI period state ──────────────────────────────────────────────────────────
const _now          = getAppDate()
const _curYear      = _now.getFullYear()
const _curMonth     = _now.getMonth() + 1
const _curYearMonth = getAppYearMonth()

// Earliest date with actual data — scan all sources, take the minimum
// Earliest date present in the data → lower bound for the month picker.
// Read from the pre-computed kpi-summary meta (reactive — set after async load).
const dataMinDate = computed(() => {
  const d = kpiSummary.value.meta.dataMinDate || `${_curYearMonth}-01`
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day || 1)
})

const kpiMode = ref<KpiMode>('month')

// Month mode: from/to range (default = current month) — same Date|null pattern as WfPatientTable
const monthFrom = ref<Date | null>(new Date(_curYear, _curMonth - 1, 1))
const monthTo   = ref<Date | null>(new Date(_curYear, _curMonth - 1, 1))

// Menu state for Vuetify month pickers
const monthFromMenu = ref(false)
const monthToMenu   = ref(false)

/** Convert Date → 'YYYY-MM' string */
function dateToYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Max allowed Date for the To-picker (current month) */
const monthToMax = computed(() => new Date(_curYear, _curMonth - 1, 1))

// Quarter mode
const quarterYear = ref<number>(_curYear)
const quarterNum  = ref<1|2|3|4>(monthToQuarter(_curMonth))

// Year mode
const yearNum = ref<number>(_curYear)

// Available years for year/quarter pickers (current + 2 past years)
const availableYears = Array.from(
  { length: 3 },
  (_, i) => _curYear - i,
).reverse()

// Is a given quarter disabled (hasn't started yet in the selected year)?
function isQuarterDisabled(q: number): boolean {
  const qStart = (q - 1) * 3 + 1
  if (quarterYear.value < _curYear) return false
  if (quarterYear.value > _curYear) return true
  return qStart > _curMonth
}

// ── ISO date range derived from mode + sub-selection ─────────────────────────
const periodDateRange = computed<[string, string]>(() => {
  if (kpiMode.value === 'month') {
    const from = monthFrom.value ?? new Date(_curYear, _curMonth - 1, 1)
    const to   = monthTo.value   ?? from
    return [monthStart(from.getFullYear(), from.getMonth() + 1), monthEnd(to.getFullYear(), to.getMonth() + 1)]
  }

  if (kpiMode.value === 'quarter') {
    const qy  = quarterYear.value
    const qsm = (quarterNum.value - 1) * 3 + 1
    const qem = quarterNum.value * 3
    const endM = qy >= _curYear ? Math.min(qem, _curMonth) : qem
    return [monthStart(qy, qsm), monthEnd(qy, endM)]
  }

  // year: Jan 1 → Dec 31 for past years; cap at current month for current year
  const y    = yearNum.value
  const endM = y >= _curYear ? _curMonth : 12
  return [monthStart(y, 1), monthEnd(y, endM)]
})

// ── Period label shown next to the mode selector ──────────────────────────────
const kpiPeriodLabel = computed(() => {
  if (kpiMode.value === 'month') {
    const fromYM = monthFrom.value ? dateToYM(monthFrom.value) : _curYearMonth
    const toYM   = monthTo.value   ? dateToYM(monthTo.value)   : fromYM
    if (fromYM === toYM) return thaiMonth(fromYM)
    return `${thaiMonth(fromYM)} – ${thaiMonth(toYM)}`
  }
  if (kpiMode.value === 'quarter') {
    return `ไตรมาส ${quarterNum.value}/${quarterYear.value + 543}`
  }
  return `ปี ${yearNum.value + 543}`
})

// ── Period metrics — read pre-computed PeriodMetrics from kpi-summary ──────────
// The generator pre-aggregates PeriodMetrics for every selectable period range
// (scripts/gen/kpi.ts + src/utils/kpi-metrics.ts) → the dashboard looks up the
// result by "from|to" instead of scanning the full raw dataset.
function refreshKpiData() { /* data is static mock; refresh is a no-op */ }

/** Sum PeriodMetrics across hospitals (all fields are additive counts). */
function sumMetrics(list: PeriodMetrics[]): PeriodMetrics {
  const a = emptyPeriodMetrics()
  for (const m of list) {
    a.comps.bleeding += m.comps.bleeding
    a.comps.thrombosis += m.comps.thrombosis
    a.comps.aeHospitalization += m.comps.aeHospitalization
    a.comps.death += m.comps.death
    a.comps.medError += m.comps.medError
    a.wf.active += m.wf.active; a.wf.appropriate += m.wf.appropriate
    a.wf.ttrGoalMet += m.wf.ttrGoalMet; a.wf.ttrTotal += m.wf.ttrTotal
    a.wf.adjTotal += m.wf.adjTotal; a.wf.adjAccepted += m.wf.adjAccepted
    a.noac.active += m.noac.active; a.noac.appropriate += m.noac.appropriate
    a.noac.dispTotal += m.noac.dispTotal; a.noac.dispAccepted += m.noac.dispAccepted
  }
  return a
}

const currentPeriodMetrics = computed<PeriodMetrics>(() => {
  const [from, to] = periodDateRange.value
  const byHid = kpiSummary.value.ranges[`${from}|${to}`] ?? {}
  return sumMetrics(effectiveHospitals.value.map(h => byHid[h]).filter(Boolean))
})

// ── Operational mock, aggregated over the selected hospitals ──────────────────
// Counts (staff / patients-per-day) sum; rates (LOS / resolution / times) are
// averaged weighted by each hospital's active-patient count in the period.
const currentKpiOps = computed(() => {
  const [from, to] = periodDateRange.value
  const byHid = kpiSummary.value.ranges[`${from}|${to}`] ?? {}
  const opsAll = kpiSummary.value.ops
  let pharmacist = 0, physician = 0, nurse = 0, patientsPerDay = 0
  let wLOS = 0, wRes = 0, wRT = 0, wResT = 0, wSum = 0
  for (const h of effectiveHospitals.value) {
    const o = opsAll[h]?.[kpiMode.value]
    if (!o) continue
    pharmacist += o.staff.pharmacist; physician += o.staff.physician; nurse += o.staff.nurse
    patientsPerDay += o.patientsPerDay
    const m = byHid[h]
    const w = (m ? m.wf.active + m.noac.active : 0) || 1
    wLOS += o.avgLOS * w; wRes += o.resolutionRate * w; wRT += o.responseTimeHr * w; wResT += o.resolutionTimeHr * w; wSum += w
  }
  const total = pharmacist + physician + nurse
  const wavg = (x: number) => (wSum > 0 ? Math.round((x / wSum) * 10) / 10 : 0)
  return {
    label: kpiPeriodLabel.value,
    avgLOS:            { value: wavg(wLOS) },
    atsResolution:     { value: wavg(wRes) },
    atsResponseTime:   { value: wavg(wRT) },
    atsResolutionTime: { value: wavg(wResT) },
    efficiency: {
      staff: { pharmacist, physician, nurse, total },
      patientsPerDay,
      workloadRatio: total > 0 ? Math.round((patientsPerDay / total) * 10) / 10 : 0,
    },
  }
})

// ── Live KPI — currentPeriodMetrics + operational mock ────────────────────────
const liveKpi = computed<KpiPeriodData>(() => {
  const ops   = currentKpiOps.value
  const m     = currentPeriodMetrics.value
  const total = m.wf.active + m.noac.active
  const pct   = (n: number) => total > 0 ? parseFloat((n / total * 100).toFixed(1)) : 0

  return {
    label:        ops.label,
    patientCount: total,

    safety: {
      bleeding:          { events: m.comps.bleeding,          pct: pct(m.comps.bleeding),          prev: 0,          target: KPI_SAFETY_TARGETS.bleeding          },
      thrombosis:        { events: m.comps.thrombosis,        pct: pct(m.comps.thrombosis),        prev: 0,        target: KPI_SAFETY_TARGETS.thrombosis        },
      aeHospitalization: { events: m.comps.aeHospitalization, pct: pct(m.comps.aeHospitalization), prev: 0, target: KPI_SAFETY_TARGETS.aeHospitalization },
      death:             { events: m.comps.death,             pct: pct(m.comps.death),             prev: 0,             target: KPI_SAFETY_TARGETS.death             },
      // medError = out-of-range / inappropriate dispensings ÷ total dispensings
      // (informational — no target/trend; see safetyRows)
      medError:          { events: m.comps.medError, pct: (() => { const dn = m.wf.adjTotal + m.noac.dispTotal; return dn > 0 ? parseFloat((m.comps.medError / dn * 100).toFixed(1)) : 0 })(), prev: 0, target: 0 },
    },

    quality: {
      wfAppropriateness: {
        value: m.wf.active > 0 ? parseFloat((m.wf.appropriate / m.wf.active * 100).toFixed(1)) : 0,
        n: m.wf.appropriate, d: m.wf.active,
        prev: 0, target: KPI_QUALITY_TARGETS.wfAppropriateness,
      },
      noacAppropriateness: {
        value: m.noac.active > 0 ? parseFloat((m.noac.appropriate / m.noac.active * 100).toFixed(1)) : 0,
        n: m.noac.appropriate, d: m.noac.active,
        prev: 0, target: KPI_QUALITY_TARGETS.noacAppropriateness,
      },
      wfTtrGoal: {
        value: m.wf.ttrTotal > 0 ? parseFloat((m.wf.ttrGoalMet / m.wf.ttrTotal * 100).toFixed(1)) : 0,
        n: m.wf.ttrGoalMet, d: m.wf.ttrTotal,
        prev: 0, target: KPI_QUALITY_TARGETS.wfTtrGoal,
      },
      avgLOS: { ...ops.avgLOS, prev: 0, target: KPI_QUALITY_TARGETS.avgLOS },
    },

    atsResponse: {
      resolutionRate: { ...ops.atsResolution, prev: 0, target: KPI_ATS_TARGETS.resolutionRate },
      acceptanceRate: (() => {
        // Combined WF dose adjustment + NOAC dispensing concordance
        const combinedTotal    = m.wf.adjTotal    + m.noac.dispTotal
        const combinedAccepted = m.wf.adjAccepted + m.noac.dispAccepted
        return {
          value: combinedTotal > 0 ? parseFloat((combinedAccepted / combinedTotal * 100).toFixed(1)) : 0,
          n: combinedAccepted,
          d: combinedTotal,
          prev: 0, target: KPI_ATS_TARGETS.acceptanceRate,
        }
      })(),
      responseTimeHr: { ...ops.atsResponseTime, prev: 0, target: KPI_ATS_TARGETS.responseTimeHr },
      resolutionTimeHr: { ...ops.atsResolutionTime, prev: 0, target: KPI_ATS_TARGETS.resolutionTimeHr },
    },

    efficiency: {
      staff:          ops.efficiency.staff,
      patientsPerDay: ops.efficiency.patientsPerDay,
      workloadRatio:  ops.efficiency.workloadRatio,
    },
  }
})


// ── Safety rows — informational (count + rate only; no target/trend/badge) ────
const safetyRows = computed<SafetyRow[]>(() => {
  const s = liveKpi.value.safety
  return [
    { key: 'bleeding',          name: 'เลือดออกรุนแรง',        events: s.bleeding.events,          pct: s.bleeding.pct          },
    { key: 'thrombosis',        name: 'ลิ่มเลือดอุดตัน',        events: s.thrombosis.events,        pct: s.thrombosis.pct        },
    { key: 'aeHospitalization', name: 'นอน รพ. จากผลข้างเคียง', events: s.aeHospitalization.events, pct: s.aeHospitalization.pct },
    { key: 'death',             name: 'เสียชีวิต',              events: s.death.events,             pct: s.death.pct             },
    { key: 'medError',          name: 'ความคลาดเคลื่อนทางยา',   events: s.medError.events,          pct: s.medError.pct          },
  ]
})

// ── Quality bar rows ──────────────────────────────────────────────────────────
const qualityBarRows = computed<QualityBarRow[]>(() => {
  const q = liveKpi.value.quality
  const defs = [
    { key: 'wfAppropriateness',  name: 'Warfarin ขนาดยาเหมาะสม', m: q.wfAppropriateness  },
    { key: 'noacAppropriateness',name: 'NOAC ขนาดยาเหมาะสม',     m: q.noacAppropriateness },
    { key: 'wfTtrGoal',          name: 'Warfarin TTR ≥ 65%',      m: q.wfTtrGoal           },
  ]
  return defs.map(({ key, name, m }) => {
    const status = qualityStatus(m.value, m.target)
    return { key, name, value: m.value, n: m.n, d: m.d, target: m.target, status, statusLabel: qualityStatusLabel[status] }
  })
})

const losStatus = computed<StatusLevel>(() =>
  liveKpi.value.quality.avgLOS.value <= liveKpi.value.quality.avgLOS.target ? 'pass' : 'fail'
)

// ── ATS response rows ─────────────────────────────────────────────────────────
// Decimal hours → "H:MM" (e.g. 18.5 → "18:30")
function fmtHrMin(hours: number): string {
  const h = Math.floor(hours)
  let m = Math.round((hours - h) * 60)
  if (m === 60) return `${h + 1}:00`
  return `${h}:${String(m).padStart(2, '0')}`
}

const atsRows = computed<AtsRow[]>(() => {
  const r = liveKpi.value.atsResponse
  const rows: AtsRow[] = [
    (() => { const s = qualityStatus(r.resolutionRate.value, r.resolutionRate.target); return {
      key: 'resolution', name: 'แก้ปัญหาสำเร็จ',
      displayValue: `${r.resolutionRate.value.toFixed(1)}%`,
      targetLabel:  `เป้า ≥ ${r.resolutionRate.target}%`,
      status: s, statusLabel: qualityStatusLabel[s],
    }})(),
    (() => { const s = qualityStatus(r.acceptanceRate.value, r.acceptanceRate.target); return {
      key: 'acceptance', name: 'ยอมรับคำแนะนำยา',
      displayValue: `${r.acceptanceRate.value.toFixed(1)}%`,
      targetLabel:  `เป้า ≥ ${r.acceptanceRate.target}%`,
      status: s, statusLabel: qualityStatusLabel[s],
    }})(),
    (() => { const s = safetyStatus(r.responseTimeHr.value, r.responseTimeHr.target); return {
      key: 'responseTime', name: 'เวลาตอบสนองการส่งต่อ',
      displayValue: `${r.responseTimeHr.value.toFixed(1)} ชม.`,
      targetLabel:  `เป้า ≤ ${r.responseTimeHr.target} ชม.`,
      status: s, statusLabel: safetyStatusLabel[s],
    }})(),
    (() => { const s = safetyStatus(r.resolutionTimeHr.value, r.resolutionTimeHr.target); return {
      key: 'resolutionTime', name: 'เวลาแก้ไขปัญหาหลังแจ้งเตือน',
      displayValue: `${fmtHrMin(r.resolutionTimeHr.value)} ชม.`,
      targetLabel:  `เป้า < ${r.resolutionTimeHr.target} ชม.`,
      status: s, statusLabel: safetyStatusLabel[s],
    }})(),
  ]
  return rows
})

// ── Staff chip items ──────────────────────────────────────────────────────────
const staffItems = computed(() => {
  const s = liveKpi.value.efficiency.staff
  return [
    { key: 'pharmacist', count: s.pharmacist, label: 'เภสัชกร' },
    { key: 'physician',  count: s.physician,  label: 'แพทย์'   },
    { key: 'nurse',      count: s.nurse,      label: 'พยาบาล'  },
    { key: 'total',      count: s.total,      label: 'รวม'      },
  ]
})

// ── Tabs + scroll reset ───────────────────────────────────────────────────────
type TabValue = 'dashboard' | 'warfarin' | 'noacs' | 'kpi'
const activeTab = ref<TabValue>('dashboard')

// Sync active tab from ?tab= query param (e.g. navigating back via breadcrumb)
onMounted(() => {
  const q = route.query.tab
  if (q === 'warfarin' || q === 'noacs' || q === 'kpi') activeTab.value = q as TabValue
})

watch(activeTab, (tab) => {
  // Keep URL in sync — replace (not push) so tab-switching doesn't stack history entries
  router.replace({ path: '/dd-ats', query: tab !== 'dashboard' ? { tab } : {} })

  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  ;(document.querySelector('.v-main__wrap') as HTMLElement | null)?.scrollTo(0, 0)
})

const tabs = computed(() => [
  { value: 'dashboard' as TabValue, label: 'Dashboard',        count: null as number | null },
  { value: 'warfarin'  as TabValue, label: 'การจ่าย Warfarin', count: warfarinTotal.value   },
  { value: 'noacs'     as TabValue, label: 'การจ่าย NOACs',    count: noacsTotal.value      },
  { value: 'kpi'       as TabValue, label: 'KPIs ระบบ',        count: null                  },
])
</script>

<style scoped>
.content-wrap { min-height: 100%; }
.dash-loading {
  padding: 48px 24px;
  text-align: center;
  font-family: var(--bma-font-thai);
  font-size: var(--bma-text-sm);
  color: var(--bma-text-tertiary);
}

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
  grid-template-columns: var(--bma-cols-monitoring);
  gap: 16px;
  margin-bottom: 32px;
  /* Shared label-column width — governs progress bar start/end across all cards */
  --stat-label-col: 138px;
}


/* ── Summary section ──────────────────────────────────────── */
.summary-container {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  overflow:      hidden;
}

.section-header {
  display:       flex;
  align-items:   center;
  gap:           8px;
  font-size:     15px;
  font-weight:   700;
  color:         var(--bma-text-primary);
  padding:       16px 20px;
  border-bottom: 1px solid var(--bma-border-subtle);
}

.section-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: var(--bma-radius-sm);
  background: var(--bma-urgency-bg-soft);
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
  grid-template-columns: var(--bma-cols-summary);
}

.summary-panel {
  padding: 16px 20px;
}
.summary-panel:first-child {
  border-right: 1px solid var(--bma-border-subtle);
}

.sc-header     { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.sc-title-wrap { display: flex; align-items: flex-start; gap: 8px; }
.sc-icon       { width: 32px; height: 32px; border-radius: var(--bma-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-title      { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.sc-subtitle   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; }
.alert-badge   { background: var(--bma-emergency); color: var(--bma-surface); border-radius: var(--bma-radius-full); padding: 2px 10px; font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.sc-divider    { height: 1px; background: var(--bma-border-subtle); margin-bottom: 8px; }
.sc-stat-row   { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; font-size: 13px; }
.sc-stat-row--primary   { padding-bottom: 9px; }
.sc-stat-row--secondary { padding-top: 9px; border-top: 1px solid var(--bma-border-subtle); }
.sc-stat-label { display: flex; align-items: center; gap: 4px; color: var(--bma-text-secondary); font-size: 13px; }
.sc-stat-value { font-family: var(--bma-font-data); font-weight: 700; color: var(--bma-text-primary); font-size: 14px; }
.sc-stat-value--lg { font-size: 16px; }

/* Right-side container: value + hint icon inline */
.sc-stat-right {
  display:     flex;
  align-items: center;
  gap:         4px;
}

/* ⓘ hint icon — muted at rest, sharpens on row hover */
.sc-hint-icon {
  color:      var(--bma-text-disabled);
  flex-shrink: 0;
  transition: color var(--bma-transition-fast);
}
.sc-stat-row--hoverable:hover .sc-hint-icon {
  color: var(--bma-text-muted);
}



/* ── KPI Strip ────────────────────────────────────────────── */
.kpi-strip {
  display: grid;
  grid-template-columns: var(--bma-cols-kpi-strip);
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: var(--bma-shadow-card);
  margin-bottom: 20px;
  overflow: hidden;
}

.kpi-cell {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid var(--bma-border-subtle);
}
.kpi-cell:last-child { border-right: none; }

.kpi-eyebrow {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bma-text-muted);
  line-height: 1;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.kpi-value {
  font-family: var(--bma-font-data);
  font-size: 30px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

.kpi-unit {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 400;
  color: var(--bma-text-muted);
  line-height: 1;
}


.kpi-context {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-muted);
  line-height: 1.4;
}

/* Hoverable badge hint */

/* ── Summary stat row — hoverable variant ─────────────────── */
.sc-stat-row--hoverable {
  cursor: pointer;
  border-radius: var(--bma-radius-sm);
  transition: background var(--bma-transition-fast);
  padding: 8px;
  margin: 0 -8px;
}
.sc-stat-row--hoverable:hover {
  background: var(--bma-surface-subtle);
}
.sc-stat-row--hoverable .sc-stat-label {
  transition: color var(--bma-transition-fast);
}
.sc-stat-row--hoverable:hover .sc-stat-label {
  color: var(--bma-text-secondary);
}

</style>

<!-- Unscoped styles — applied globally so child components (WfPatientTable,
     NoacPatientTable) can inherit table structure, row, filter, and pagination
     styles. Class names are specific to this module; no collision risk. -->
<style>

/* ── KPI panel content — accessible to KPI sub-components ──── */

/* Unified KPI status badge (strip: --good/alert; panels: --pass/warn/fail) */
.kpi-badge {
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  padding:         2px 8px;
  border-radius:   var(--bma-radius-full);
  font-family:     var(--bma-font-data);
  font-size:       10px;
  font-weight:     700;
  white-space:     nowrap;
  line-height:     1.4;
}
.kpi-badge--good  { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kpi-badge--alert { background: var(--bma-emergency-bg); color: var(--bma-emergency); }
.kpi-badge--pass  { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kpi-badge--warn  { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.kpi-badge--fail  { background: var(--bma-emergency-bg); color: var(--bma-emergency); }

.kpi-sub-section { padding: 16px 20px; }
.kpi-sub-section--sep { border-left: 1px solid var(--bma-border-subtle); }

.kpi-panel-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 16px; padding-bottom: 12px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.kpi-ph-name { font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }
.kpi-ph-sub  { font-family: var(--bma-font-data); font-size: 10px; font-weight: 600; color: var(--bma-text-disabled); letter-spacing: .04em; text-transform: uppercase; flex: 1; }
.kpi-ph-tally { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.kpi-tally { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: var(--bma-radius-full); font-family: var(--bma-font-data); font-size: 10px; font-weight: 700; letter-spacing: .02em; }
.kpi-tally--ok   { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kpi-tally--warn { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.kpi-tally--ng   { background: var(--bma-emergency-bg); color: var(--bma-emergency); }

/* Safety grid — columns: name | events | pct | trend | target | badge */
.ksafe-grid { display: grid; grid-template-columns: var(--bma-cols-ksafe); column-gap: 12px; }
/* Every cell = same height + vertically centered → equal row heights & aligned dividers */
.ksafe-cell { display: flex; align-items: center; min-height: 40px; border-bottom: 1px solid var(--bma-border-subtle); }
.ksafe-cell--last { border-bottom: none; }
.ksafe-name { font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600; color: var(--bma-text-secondary); }
.ksafe-events { gap: 4px; justify-content: flex-end; }
.ksafe-en { font-family: var(--bma-font-data); font-size: 15px; font-weight: 700; color: var(--bma-text-primary); }
.ksafe-en--nz { color: var(--bma-emergency); }
.ksafe-eu { font-family: var(--bma-font-thai); font-size: 10px; color: var(--bma-text-muted); }
.ksafe-pct { justify-content: flex-end; font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; color: var(--bma-text-muted); }

/* Quality rows */
.kqual-rows { display: flex; flex-direction: column; gap: 0; }
.kqual-row { padding: 8px 0; border-bottom: 1px solid var(--bma-border-subtle); }
.kqual-row:first-child { padding-top: 0; }
.kqual-row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.kqual-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.kqual-metric-name { font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600; color: var(--bma-text-secondary); }
.kqual-frac { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }
.kqual-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
.kqual-track { position: relative; height: 6px; background: var(--bma-neutral-100); border-radius: 3px; overflow: visible; }
.kqual-fill { height: 100%; border-radius: 3px; transition: width 400ms cubic-bezier(.22,.68,0,1.2); }
.kqual-fill--pass { background: var(--bma-green-200); }
.kqual-fill--warn { background: var(--bma-urgency-bg-solid); }
.kqual-fill--fail { background: var(--bma-emergency-bg-solid); }
.kqual-target-line { position: absolute; top: -4px; bottom: -4px; width: 2px; transform: translateX(-1px); background: var(--bma-neutral-500); border-radius: 1px; opacity: 0.35; }
.kqual-bar-labels { display: flex; justify-content: space-between; align-items: center; }
.kqual-bar-val { font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; }
.kqual-bval--pass { color: var(--bma-success-text); }
.kqual-bval--warn { color: var(--bma-urgency-text); }
.kqual-bval--fail { color: var(--bma-emergency); }
.kqual-bar-target { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }
.kqual-los { padding-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.kqual-los-body { display: flex; align-items: baseline; gap: 8px; }
.kqual-los-val { font-family: var(--bma-font-data); font-size: 22px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.kqual-los-unit { font-family: var(--bma-font-thai); font-size: 12px; color: var(--bma-text-muted); }
.kqual-los-bench { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); margin-left: 4px; }

/* ATS response grid — columns: name | value | target | badge */
.kats-grid { display: grid; grid-template-columns: var(--bma-cols-kats); column-gap: 16px; }
/* Every cell = same height + vertically centered → row heights equal & dividers align */
.kats-grid > * { display: flex; align-items: center; min-height: 40px; border-bottom: 1px solid var(--bma-border-subtle); }
.kats-grid > *:nth-last-child(-n+4) { border-bottom: none; }
.kats-name { font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600; color: var(--bma-text-secondary); }
.kats-val { justify-content: flex-end; font-family: var(--bma-font-data); font-size: 15px; font-weight: 700; }
.kats-val--pass { color: var(--bma-success-text); }
.kats-val--warn { color: var(--bma-urgency-text); }
.kats-val--fail { color: var(--bma-emergency); }
.kats-target { justify-content: flex-end; font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }
.kats-cell-badge { justify-content: flex-start; }   /* badge stays a pill, left-aligned in the fixed column */

/* System efficiency panel */
.keff-staff-label { font-family: var(--bma-font-thai); font-size: 11px; font-weight: 600; color: var(--bma-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
.keff-staff-row { display: flex; gap: 8px; flex-wrap: wrap; }
.keff-staff-chip { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 12px; background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card); border-radius: var(--bma-radius-md); min-width: 52px; }
.keff-staff-chip--total { background: var(--bma-green-50); border-color: var(--bma-green-200); }
.keff-staff-n { font-family: var(--bma-font-data); font-size: 20px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.keff-staff-chip--total .keff-staff-n { color: var(--bma-green-700); }
.keff-staff-role { font-family: var(--bma-font-thai); font-size: 10px; font-weight: 600; color: var(--bma-text-muted); white-space: nowrap; }
.keff-staff-chip--total .keff-staff-role { color: var(--bma-green-700); }
.keff-divider { margin: 16px 0 12px; height: 1px; background: var(--bma-border-subtle); }
.keff-workload { display: flex; flex-direction: column; gap: 0; }
.keff-wl-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bma-border-subtle); }
.keff-wl-row:last-child { border-bottom: none; padding-bottom: 0; }
.keff-wl-name { font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600; color: var(--bma-text-secondary); }
.keff-wl-val { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }

/* ── Filter bar ───────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
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
/* Hospital filter — matches .filter-input, native select with chevron */
.filter-select {
  flex-shrink: 0;
  height: 38px;
  max-width: 220px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-primary);
  background: var(--bma-surface) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%238c8c8c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center;
  padding: 0 30px 0 12px;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color var(--bma-transition-fast);
}
.filter-select:focus { border-color: var(--bma-green-300); }
.filter-input:focus          { border-color: var(--bma-green-500); }
.btn-search {
  height: 38px; padding: 0 20px;
  background: var(--bma-green-500); color: var(--bma-surface);
  border: none; border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai); font-size: 14px; font-weight: 700;
  cursor: pointer; flex-shrink: 0;
}
.btn-search:hover { background: var(--bma-green-600); }

/* ── Table structure ──────────────────────────────────────── */
.table-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  overflow: hidden;
}
.table-scroll-wrap {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bma-border) transparent;
}
.table-scroll-wrap::-webkit-scrollbar        { height: 5px; }
.table-scroll-wrap::-webkit-scrollbar-track  { background: transparent; }
.table-scroll-wrap::-webkit-scrollbar-thumb  { background: var(--bma-border); border-radius: 3px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead tr { background: var(--bma-surface-light); border-bottom: 1.5px solid var(--bma-border-subtle); }
.data-table th { padding: 8px 16px; font-size: 12px; font-weight: 700; color: var(--bma-text-muted); text-align: left; white-space: nowrap; }
.data-table td { padding: 10px 16px; color: var(--bma-text-primary); vertical-align: middle; }
.data-row { border-bottom: 1px solid var(--bma-surface-subtle); transition: background .12s; }
.data-row:hover      { background: var(--bma-surface-light); }
.data-row:last-child { border-bottom: none; }

/* Row tint by status */
.data-row--under-range, .data-row--underdose { background: var(--bma-row-underdose-bg); }
.data-row--under-range:hover, .data-row--underdose:hover { background: var(--bma-row-underdose-hover); }
.data-row--over-range, .data-row--overdose, .data-row--contra, .data-row--interaction { background: var(--bma-row-overdose-bg); }
.data-row--over-range:hover, .data-row--overdose:hover, .data-row--contra:hover, .data-row--interaction:hover { background: var(--bma-row-overdose-hover); }
/* Deceased — outcome highlight, takes precedence over status tints (defined later) */
.data-row--deceased, .data-row--deceased:hover { background: var(--bma-emergency-bg-soft); }
.data-row--deceased .patient-name { color: var(--bma-text-secondary); }

/* ── Shared column widths ─────────────────────────────────── */
.col-action      { width: var(--bma-col-action-w); }
.col-name        { min-width: var(--bma-col-name-min); }
.col-hospital    { min-width: var(--bma-col-hospital-min); }
.col-status      { width: var(--bma-col-status-w); }
.col-concordance { width: var(--bma-col-concordance-w); }

/* ── Patient name cell ────────────────────────────────────── */
.patient-name    { font-size: 13px; font-weight: 600; color: var(--bma-text-primary); }
.deceased-chip {
  display: inline-block; margin-left: 6px; padding: 1px 7px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-emergency-bg); color: var(--bma-emergency);
  font-family: var(--bma-font-thai); font-size: 10px; font-weight: 700;
  vertical-align: middle; white-space: nowrap;
}
.patient-hn      { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; font-family: var(--bma-font-data); }
.patient-hn-row  { display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap; }
/* action-btn removed — table row action buttons now use v-btn icon size="small" */

/* ── Status badges ────────────────────────────────────────── */
.status-badge { display: inline-block; padding: 4px 12px; border-radius: var(--bma-radius-full); font-size: 12px; font-weight: 600; white-space: nowrap; }
.status-badge--in-range, .status-badge--appropriate { background: var(--bma-success-bg);      color: var(--bma-success-text); }
.status-badge--under-range, .status-badge--underdose { background: var(--bma-urgency-bg-soft);  color: var(--bma-underdose-text); }
.status-badge--over-range, .status-badge--overdose   { background: var(--bma-emergency-bg);     color: var(--bma-emergency); }
.status-badge--contra      { background: var(--bma-contra-bg);       color: var(--bma-elective); }
.status-badge--interaction { background: var(--bma-interaction-bg);  color: var(--bma-interaction-text); }

/* ── Concordance badge ────────────────────────────────────── */
.concordance-badge { display: inline-block; padding: 4px 8px; border-radius: var(--bma-radius-full); font-family: var(--bma-font-thai); font-size: 11px; font-weight: 600; white-space: nowrap; }
.concordance--yes      { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.concordance--adjusted { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.concordance--no       { background: var(--bma-emergency-bg); color: var(--bma-emergency); }
.col-dash { color: var(--bma-text-disabled); font-size: 14px; }

/* ── Frequency chip (BID/OD) — global; schedule is a distinct data type from dose ──
   Neutral so it never collides with the green therapeutic semantic. Used by the
   NOACs advisory panel + dispensing drawer. */
.freq-chip {
  display: inline-flex; align-items: center;
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary); background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border);
  padding: 1px 7px; border-radius: var(--bma-radius-full); letter-spacing: .02em;
}
.freq-chip--sm { font-size: 10px; padding: 0 6px; }

/* ── Tab section header ───────────────────────────────────── */
.tab-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tab-section-title  { font-size: 15px; font-weight: 700; color: var(--bma-text-primary); font-family: var(--bma-font-thai); }
.tab-section-count  { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-muted); }

/* Table footer + pagination — moved to BmaTablePagination.vue (scoped) */

/* Tooltip styles — .v-overlay__content rules moved to overrides.scss (Layer 4)
   Vuetify teleports overlay to <body> — global scope required, centralised there. */

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
  gap: 8px;
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
.ixn-tt-overlay .ixn-effect--increase { background: var(--inr-very-high-bg); color: var(--bma-emergency); }
.ixn-tt-overlay .ixn-effect--decrease { background: var(--bma-urgency-bg-soft); color: var(--inr-supra-text); }
.ixn-tt-overlay .ixn-effect--none     { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

.ixn-tt-overlay .ixn-tt-note {
  font-family: var(--bma-font-thai);
  font-size: 11.5px;
  color: var(--bma-text-secondary);
  line-height: 1.55;
}

/* ── Scrollable body — shared across all tooltip overlays ──── */
/* Header stays pinned; this wrapper holds the scrollable rows  */
.tt-scroll-body {
  max-height:      200px;
  overflow-y:      auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bma-border) transparent;
}
.tt-scroll-body::-webkit-scrollbar       { width: 4px; }
.tt-scroll-body::-webkit-scrollbar-track { background: transparent; }
.tt-scroll-body::-webkit-scrollbar-thumb {
  background:    var(--bma-border);
  border-radius: 2px;
}

/* ── Summary hover overlay — .v-overlay__content moved to overrides.scss ──── */

.summ-tt-overlay .summ-tt-header {
  font-family:    var(--bma-font-data);
  font-size:      10px;
  font-weight:    700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color:          var(--bma-text-muted);
  padding-bottom: 8px;
  margin-bottom:  4px;
  border-bottom:  1px solid var(--bma-border-subtle);
}

.summ-tt-overlay .summ-tt-row {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             10px;
  padding:         8px 0;
}
.summ-tt-overlay .summ-tt-row + .summ-tt-row {
  border-top: 1px solid var(--bma-border-subtle);
}

.summ-tt-overlay .summ-tt-info {
  display:        flex;
  flex-direction: column;
  gap:            3px;
  min-width:      0;
}

.summ-tt-overlay .summ-tt-name {
  font-family:   var(--bma-font-thai);
  font-size:     13px;
  font-weight:   600;
  color:         var(--bma-text-primary);
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
}

.summ-tt-overlay .summ-tt-sub {
  display:     flex;
  align-items: center;
  gap:         6px;
}

.summ-tt-overlay .summ-tt-hn {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
}

.summ-tt-overlay .summ-tt-badge {
  display:       inline-block;
  padding:       2px 8px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
  white-space:   nowrap;
}

/* Status colors — Warfarin */
.summ-tt-overlay .summ-st--in-range    { background: var(--bma-success-bg); color: var(--bma-success-text); }
.summ-tt-overlay .summ-st--under-range { background: var(--bma-urgency-bg-soft); color: var(--inr-supra-text); }
.summ-tt-overlay .summ-st--over-range  { background: var(--bma-emergency-bg-soft); color: var(--bma-emergency); }
/* Status colors — NOACs */
.summ-tt-overlay .summ-st--appropriate { background: var(--bma-success-bg); color: var(--bma-success-text); }
.summ-tt-overlay .summ-st--underdose   { background: var(--bma-urgency-bg-soft); color: var(--inr-supra-text); }
.summ-tt-overlay .summ-st--overdose    { background: var(--bma-emergency-bg-soft); color: var(--bma-emergency); }
.summ-tt-overlay .summ-st--contra      { background: var(--bma-contra-bg); color: var(--bma-elective); }
.summ-tt-overlay .summ-st--interaction { background: var(--bma-interaction-bg); color: var(--bma-interaction-text); }

.summ-tt-overlay .summ-tt-nav {
  width:       28px;
  height:      28px;
  border-radius: var(--bma-radius-sm);
  border:      1.5px solid var(--bma-border-card);
  background:  var(--bma-surface);
  display:     flex;
  align-items: center;
  justify-content: center;
  cursor:      pointer;
  color:       var(--bma-text-secondary);
  flex-shrink: 0;
  transition:  border-color 0.12s, background 0.12s, color 0.12s;
}
.summ-tt-overlay .summ-tt-nav:hover {
  border-color: var(--bma-green-500);
  background:   var(--bma-green-50);
  color:        var(--bma-green-700);
}

/* ══════════════════════════════════════════════════════════════
   KPI Tab — ตัวชี้วัดระบบ
   ══════════════════════════════════════════════════════════════ */

.kpi-st-text {
  font-family: var(--bma-font-thai);
  font-size:   14px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}

.kpi-period-current {
  font-family: var(--bma-font-data);
  font-size:   11px;
  font-weight: 600;
  color:       var(--bma-text-muted);
  letter-spacing: .02em;
}

/* Segmented period toggle */
.kpi-period-seg {
  display:       flex;
  background:    var(--bma-surface-subtle);
  border:        1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-sm);
  padding:       2px;
  gap:           2px;
}
.kpi-seg-btn {
  height:        26px;
  padding:       0 12px;
  border:        none;
  background:    transparent;
  border-radius: 4px;
  font-family:   var(--bma-font-thai);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-muted);
  cursor:        pointer;
  transition:    background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.kpi-seg-btn--on {
  background:  var(--bma-surface);
  color:       var(--bma-text-primary);
  box-shadow:  var(--bma-shadow-xs);
}

/* ── KPI period strip — bare, sits between KPI strip and containers ── */
.kpi-period-strip {
  border-top:    1px solid var(--bma-border-subtle);
  border-bottom: 1px solid var(--bma-border-subtle);
  background:    var(--bma-surface-light);
  margin:        0 -24px 16px;   /* bleed to main-wrap edges */
  padding:       0 24px;
}
.kpi-period-strip-row {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             12px;
  padding:         8px 0;
}
.kpi-period-panel-left {
  display:     flex;
  align-items: center;
  gap:         8px;
}
.kpi-period-scope {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  color:       var(--bma-text-muted);
}
/* sub-controls inside the strip inherit strip bg, use border-top */
.kpi-custom-row--strip {
  margin:  0 -24px;
  padding: 8px 24px;
}
/* Hospital multi-select row */
.kpi-hospital-row {
  display:       flex;
  align-items:   center;
  gap:           12px;
  flex-wrap:     wrap;
  padding:       8px 0;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.kpi-hosp-group { display: flex; flex-wrap: wrap; gap: 8px; }
.kpi-hosp-chip {
  display:       inline-flex;
  align-items:   center;
  gap:           6px;
  height:        30px;
  padding:       0 12px 0 8px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-full);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-thai);
  font-size:     12px;
  color:         var(--bma-text-tertiary);
  cursor:        pointer;
  transition:    background var(--bma-transition-fast), border-color var(--bma-transition-fast), color var(--bma-transition-fast);
}
.kpi-hosp-chip:hover { border-color: var(--bma-green-300); }
.kpi-hosp-chip--on {
  background:   var(--bma-green-50);
  border-color: var(--bma-green-500);
  color:        var(--bma-green-700);
  font-weight:  600;
}
.kpi-hosp-check {
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  width:           16px;
  height:          16px;
  border-radius:   var(--bma-radius-xs);
  border:          1.5px solid var(--bma-border);
  background:      var(--bma-surface);
  color:           var(--bma-neutral-0);
}
.kpi-hosp-chip--on .kpi-hosp-check {
  background:   var(--bma-green-500);
  border-color: var(--bma-green-500);
}

/* slide transition for the period strip itself */
.kpi-period-strip-slide-enter-active,
.kpi-period-strip-slide-leave-active {
  transition: opacity 150ms ease, max-height 200ms ease;
  overflow: hidden;
  max-height: 120px;
}
.kpi-period-strip-slide-enter-from,
.kpi-period-strip-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ── Container (wraps 2 sub-sections — like summary-container) ── */
.kpi-container {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  overflow:      hidden;
  margin-bottom: 14px;
}
.kpi-container-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             12px;
  padding:         12px 20px;
  border-bottom:   1px solid var(--bma-border-subtle);
}
.kpi-refresh-btn {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           22px;
  height:          22px;
  border:          none;
  border-radius:   50%;
  background:      transparent;
  color:           var(--bma-text-muted);
  cursor:          pointer;
  transition:      background 0.12s, color 0.12s;
  flex-shrink:     0;
}
.kpi-refresh-btn:hover {
  background: var(--bma-neutral-100, #F5F5F5);
  color:      var(--bma-text-secondary);
}

/* Grid inside the container */
.kpi-container-grid {
  display: grid;
}
.kpi-container-grid--primary { grid-template-columns: var(--bma-cols-kpi-primary); }
.kpi-container-grid--half    { grid-template-columns: var(--bma-cols-kpi-half);    }


/* ── Custom date range row ───────────────────────────────────── */
.kpi-custom-row {
  display:    flex;
  align-items: center;
  gap:         12px;
  padding:     10px 20px;
  background:  var(--bma-surface-light);
  border-top:  1px solid var(--bma-border-subtle);
}
.kpi-custom-label {
  font-family:  var(--bma-font-thai);
  font-size:    12px;
  font-weight:  600;
  color:        var(--bma-text-muted);
  white-space:  nowrap;
}
.kpi-custom-inputs {
  display:     flex;
  align-items: center;
  gap:         8px;
}
/* kpi-month-input kept as fallback; kpi-month-btn is the Vuetify activator */
.kpi-month-btn {
  height:        32px;
  padding:       0 12px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-data);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-primary);
  cursor:        pointer;
  transition:    border-color 150ms ease, background 150ms ease;
  white-space:   nowrap;
}
.kpi-month-btn:hover { border-color: var(--bma-green-500); background: var(--bma-green-50); }
.kpi-custom-sep {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  color:       var(--bma-text-muted);
}
.kpi-custom-range-display {
  font-family:  var(--bma-font-data);
  font-size:    11px;
  font-weight:  600;
  color:        var(--bma-green-700);
  background:   var(--bma-green-50);
  border:       1px solid var(--bma-green-200);
  border-radius: var(--bma-radius-full);
  padding:      2px 9px;
  white-space:  nowrap;
  margin-left:  2px;
}

/* ── Quarter sub-controls ──────────────────────────────────── */
.kpi-year-select {
  height:        30px;
  padding:       0 8px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-data);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-primary);
  cursor:        pointer;
  outline:       none;
}
.kpi-year-select:focus { border-color: var(--bma-green-500); }

.kpi-q-seg {
  display: flex;
  gap:     4px;
}
.kpi-q-btn {
  height:        28px;
  padding:       0 12px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-data);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-secondary);
  cursor:        pointer;
  transition:    background 120ms, border-color 120ms, color 120ms;
}
.kpi-q-btn:hover:not(:disabled) {
  background:    var(--bma-green-50);
  border-color:  var(--bma-green-200);
  color:         var(--bma-green-600);
}
.kpi-q-btn--on {
  background:    var(--bma-green-500);
  border-color:  var(--bma-green-500);
  color:         white;
}
.kpi-q-btn--disabled {
  opacity: 0.38;
  cursor:  not-allowed;
}

/* Slide transition for the custom row */
.kpi-custom-slide-enter-active,
.kpi-custom-slide-leave-active {
  transition: max-height 200ms cubic-bezier(.4,0,.2,1), opacity 180ms ease, padding 200ms ease;
  overflow: hidden;
  max-height: 52px;
}
.kpi-custom-slide-enter-from,
.kpi-custom-slide-leave-to {
  max-height: 0;
  opacity:    0;
  padding-top:    0;
  padding-bottom: 0;
}

</style>
