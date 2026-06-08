
<template>
  <div class="content-wrap" :class="{ 'content-wrap--consult': activeTab === 'consult' }">

    <!-- ── Loading state ──────────────────────────────────── -->
    <div v-if="loading" class="apd-loading">กำลังโหลดข้อมูล…</div>

    <template v-else>
    <!-- ── White header zone ──────────────────────────────── -->
    <div class="page">
      <div class="page-header">
        <button class="back-btn" @click="router.back()" aria-label="ย้อนกลับ">
          <PhArrowLeft :size="18" />
        </button>
        <h1 class="page-title">รายละเอียดผู้ป่วย</h1>
      </div>

      <!-- ── Patient info card ─────────────────────────── -->
      <AtsPatientHeader
        :patient="p"
        :wf-data="wfData"
        :latest-noac-lab="latestNoacLab"
        :active-therapy="derivedTherapy"
      />

      <!-- ── Tabs ──────────────────────────────────────────── -->
      <div role="tablist" class="tabs-wrap">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          role="tab"
          :data-tab="tab.value"
          :aria-selected="activeTab === tab.value"
          :tabindex="activeTab === tab.value ? 0 : -1"
          class="bma-tab"
          :class="activeTab === tab.value ? 'bma-tab--active' : ''"
          @click="activeTab = tab.value"
          @keydown="handleTabKey($event, tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== null" class="bma-tab-count">{{ tab.count }}</span>
        </div>
      </div>

    </div>

    <!-- ── Gray content zone ──────────────────────────────── -->
    <div class="main-wrap">

      <!-- Tab: Warfarin Dose Tool -->
      <div v-show="activeTab === 'warfarin'" class="tab-content">
        <WarfarinDoseTool :patient-id="patientId" :embedded="true" />
      </div>

      <!-- Tab: NOACs Algorithm -->
      <div v-show="activeTab === 'noac'" class="tab-content">
        <NoacAlgorithm :patient-id="patientId" :embedded="true" />
      </div>

      <!-- Tab: ภาวะแทรกซ้อน -->
      <div v-show="activeTab === 'complications'" class="tab-content">

        <div v-if="p.complicationSummary.length > 0" class="stat-grid">
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
            <button class="btn-export" disabled title="ฟีเจอร์นี้กำลังพัฒนา">
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
              <tr v-for="c in pagedComplications" :key="c.id" class="data-row">
                <td>
                  <button class="action-btn">
                    <PhArrowSquareOut :size="15" />
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

          <BmaTablePagination
            :page="compPage"
            :pageCount="compPageCount"
            :pageSize="compPageSize"
            :filteredTotal="p.complications.length"
            :total="p.complications.length"
            :isFiltered="false"
            @update:page="compPage = $event"
            @update:pageSize="compPageSize = $event"
          />
        </div>

      </div>

      <!-- Tab: ห้องปรึกษา ──────────────────────────────────── -->
      <div v-show="activeTab === 'consult'" class="consult-wrap">

        <!-- ── Left: Chat ──────────────────────────────────── -->
        <div class="chat-panel">

          <!-- Panel header -->
          <div class="chat-panel-hd">
            <span class="chat-panel-title">บันทึกการปรึกษา</span>
          </div>

          <!-- Message list -->
          <div class="chat-messages" ref="chatScrollEl">
            <template v-if="chatItems.length">
              <template v-for="item in chatItems" :key="(item as any)._sep ? (item as any).key : (item as any).id">
                <!-- Date separator chip -->
                <div v-if="(item as any)._sep" class="chat-date-sep">
                  <span class="chat-date-chip">{{ (item as any).label }}</span>
                </div>
                <!-- Message bubble or dose-adjustment card -->
                <div
                  v-else
                  class="chat-row"
                  :class="[
                    (item as any).role === 'doctor' ? 'chat-row--self' : '',
                    !(item as any).isFirst ? 'chat-row--continuation' : ''
                  ]"
                >
                  <div class="chat-bubble-wrap">
                    <!-- Dose adjustment notification card -->
                    <template v-if="(item as any).msgType === 'dose-adjustment'">
                      <div class="dose-adj-card">
                        <div class="dose-adj-header">
                          <span class="dose-adj-title">ปรับขนาด Warfarin</span>
                          <span class="dose-adj-saved">บันทึกแล้ว ✓</span>
                        </div>
                        <!-- Row 1: dose numbers only — no overflow risk -->
                        <div class="dose-adj-numbers">
                          <span class="dose-adj-old">{{ (item as any).doseData.oldDose.toFixed(1) }}</span>
                          <span class="dose-adj-arrow">→</span>
                          <span class="dose-adj-new">{{ (item as any).doseData.newDose.toFixed(1) }}</span>
                          <span class="dose-adj-unit">mg/wk</span>
                        </div>
                        <!-- Row 2: delta badge on its own line -->
                        <div class="dose-adj-delta">
                          <span
                            class="dose-adj-pct"
                            :class="(item as any).doseData.pct > 0 ? 'dose-adj-pct--up' : (item as any).doseData.pct < 0 ? 'dose-adj-pct--down' : 'dose-adj-pct--flat'"
                          >{{ (item as any).doseData.pct > 0 ? '+' : '' }}{{ (item as any).doseData.pct.toFixed(1) }}%</span>
                        </div>
                        <div class="dose-adj-meta">INR ณ วันที่ปรับ: {{ (item as any).doseData.inr.toFixed(1) }}</div>
                        <!-- 7-day schedule from adj.weeklySchedule -->
                        <div class="dose-adj-divider" />
                        <div class="dose-adj-grid">
                          <div
                            v-for="(day, i) in DAY_KEYS_TH"
                            :key="day"
                            class="dose-adj-day"
                            :class="(item as any).doseData.schedule.days[DAY_KEYS_EN[i]].mg > 0 ? 'dose-adj-day--active' : 'dose-adj-day--zero'"
                          >
                            <span class="dose-adj-day-name">{{ day }}</span>
                            <div class="consult-pill-wrap">
                              <template v-if="(item as any).doseData.schedule.days[DAY_KEYS_EN[i]].mg > 0">
                                <span
                                  v-for="fi in Math.floor((item as any).doseData.schedule.days[DAY_KEYS_EN[i]].tablets)"
                                  :key="`f${fi}`"
                                  class="consult-pill-dot"
                                  :class="`consult-pill-dot--${PILL_CONFIG[(item as any).doseData.schedule.days[DAY_KEYS_EN[i]].pillMg as PillStrengthMg].color}`"
                                />
                                <span
                                  v-if="(item as any).doseData.schedule.days[DAY_KEYS_EN[i]].tablets % 1 !== 0"
                                  class="consult-pill-dot consult-pill-dot--half"
                                  :class="`consult-pill-dot--${PILL_CONFIG[(item as any).doseData.schedule.days[DAY_KEYS_EN[i]].pillMg as PillStrengthMg].color}`"
                                />
                              </template>
                              <span v-else class="consult-pill-empty" />
                            </div>
                            <span class="dose-adj-day-tabs">
                              {{ (item as any).doseData.schedule.days[DAY_KEYS_EN[i]].tablets || '—' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <!-- Standard chat bubble -->
                    <template v-else>
                      <div
                        v-if="(item as any).isFirst && (item as any).role !== 'doctor'"
                        class="chat-sender-row"
                      >
                        <span class="chat-role-dot" :class="`chat-role-dot--${(item as any).role}`"></span>
                        <span class="chat-sender-name">{{ (item as any).sender }}</span>
                      </div>
                      <div class="chat-bubble" :class="`chat-bubble--${(item as any).role}`">
                        {{ (item as any).text }}
                      </div>
                    </template>
                    <span class="chat-time">{{ (item as any).time }}</span>
                  </div>
                </div>
              </template>
            </template>
            <div v-else class="chat-empty">
              <span class="chat-empty-main">ยังไม่มีข้อความ</span>
              <span class="chat-empty-sub">เริ่มการปรึกษาโดยพิมพ์ข้อความด้านล่าง</span>
            </div>
          </div>

          <!-- ConsultComposer: native input + suggestions + file attach -->
          <ConsultComposer
            ref="composerRef"
            :suggestions="chatSuggestions"
            :sender-name="attendingPhysician?.name ?? 'แพทย์'"
            :sender-role="'doctor'"
            :inr-status="consultInrStatus"
            @send="onComposerSend"
          />
        </div>

        <!-- ── Right: Unified info panel (no card wrappers) ──── -->
        <div class="consult-info">

          <!-- ทีมผู้รักษา — attending featured + participants consistent list -->
          <div v-if="attendingPhysician" class="cinfo-section cinfo-people">
            <span class="cinfo-eyebrow">ทีมผู้รักษา</span>

            <!-- Attending: dot + name (14px bold) + role badge -->
            <div class="cinfo-attending">
              <span class="cinfo-attending-dot" />
              <div class="cinfo-attending-body">
                <div class="cinfo-attending-name-row">
                  <span class="consult-doctor-name">{{ attendingPhysician.name }}</span>
                  <span class="cinfo-role-badge cinfo-role-badge--attending">เจ้าของไข้</span>
                </div>
                <span class="consult-doctor-spec">{{ attendingPhysician.specialization }}</span>
              </div>
            </div>

            <!-- Participants: indented, role as text label -->
            <!-- Grouped by role: chip once per group, names wrap inline -->
            <div v-if="groupedParticipants.length" class="cinfo-participants-list">
              <div
                v-for="group in groupedParticipants"
                :key="group.role"
                class="cinfo-participant-group"
              >
                <span class="cinfo-role-chip" :class="`cinfo-role-chip--${group.role}`">
                  {{ consultRoleLabel[group.role] }}
                </span>
                <span class="cinfo-participant-names">
                  <template v-for="(name, i) in group.names" :key="name">{{ name }}<span
                    v-if="i < group.names.length - 1"
                    class="cinfo-name-sep"
                  > · </span></template>
                </span>
              </div>
            </div>
          </div>

          <div class="cinfo-divider" />

          <!-- Therapy header — zone eyebrow with therapy badge + duration inline -->
          <div class="cinfo-section cinfo-therapy-hd">
            <span class="cinfo-eyebrow cinfo-eyebrow--inline">สรุปการรักษา</span>
            <div class="cinfo-therapy-meta">
              <span class="consult-therapy-badge" :class="derivedTherapy === 'warfarin' ? 'therapy--wf' : 'therapy--noac'">
                {{ derivedTherapy === 'warfarin' ? 'Warfarin' : 'NOACs' }}
              </span>
              <span v-if="therapyDuration" class="cinfo-duration-chip">{{ therapyDuration }}</span>
            </div>
          </div>

          <!-- WF clinical data -->
          <template v-if="derivedTherapy === 'warfarin' && wfData">
            <div class="consult-stats-row cinfo-section">
              <div class="consult-stat">
                <span class="consult-stat-label">INR ล่าสุด</span>
                <span class="consult-stat-val" :class="`wf-num--${consultInrStatus}`">
                  {{ wfData.latestInr?.inrValue.toFixed(1) ?? '—' }}
                </span>
              </div>
              <div class="consult-stat">
                <span class="consult-stat-label">TTR</span>
                <span class="consult-stat-val">{{ wfData.ttr?.value.toFixed(0) ?? '—' }}<span class="consult-stat-unit">%</span></span>
              </div>
              <div class="consult-stat">
                <span class="consult-stat-label">ขนาดยา/สัปดาห์</span>
                <span class="consult-stat-val">{{ wfData.profile?.currentDoseMgWk.toFixed(1) ?? '—' }}<span class="consult-stat-unit">mg</span></span>
              </div>
            </div>

            <!-- Protocol callout — styled tint within clinical zone, not a separate zone -->
            <div v-if="consultProtocolNote" class="cinfo-section">
              <div class="cinfo-protocol-callout" :class="`cinfo-callout--${consultInrStatus}`">
                <span class="cinfo-protocol-dot" :class="`cinfo-dot--${consultInrStatus}`" />
                <span class="cinfo-protocol-text">{{ consultProtocolNote }}</span>
              </div>
            </div>

            <div class="cinfo-section">
              <button
                class="consult-dose-cta"
                :class="{ 'consult-dose-cta--reviewing': consultDrawerOpen }"
                :disabled="consultDrawerOpen"
                @click="consultDrawerOpen = true"
              >
                {{ consultDrawerOpen ? 'กำลังตรวจสอบ Dose...' : 'ปรับขนาดยา Warfarin' }}
                <PhArrowRight v-if="!consultDrawerOpen" :size="13" />
              </button>
            </div>

            <template v-if="currentSchedule">
              <div class="cinfo-divider" />
              <div class="cinfo-section cinfo-sched-hd">
                <span class="cinfo-eyebrow">ตารางการกินยา</span>
                <span class="cinfo-sched-sub">สัปดาห์ปัจจุบัน</span>
              </div>
              <div class="consult-day-grid">
                <div
                  v-for="(day, i) in DAY_KEYS_TH"
                  :key="day"
                  class="consult-day-cell"
                  :class="currentSchedule.days[DAY_KEYS_EN[i]].mg > 0 ? 'consult-day-cell--active' : 'consult-day-cell--zero'"
                >
                  <span class="consult-day-name">{{ day }}</span>
                  <div class="consult-pill-wrap">
                    <template v-if="currentSchedule.days[DAY_KEYS_EN[i]].mg > 0">
                      <span
                        v-for="fi in Math.floor(currentSchedule.days[DAY_KEYS_EN[i]].tablets)"
                        :key="`f${fi}`"
                        class="consult-pill-dot"
                        :class="`consult-pill-dot--${PILL_CONFIG[currentSchedule.days[DAY_KEYS_EN[i]].pillMg].color}`"
                      />
                      <span
                        v-if="currentSchedule.days[DAY_KEYS_EN[i]].tablets % 1 !== 0"
                        class="consult-pill-dot consult-pill-dot--half"
                        :class="`consult-pill-dot--${PILL_CONFIG[currentSchedule.days[DAY_KEYS_EN[i]].pillMg].color}`"
                      />
                    </template>
                    <span v-else class="consult-pill-empty" />
                  </div>
                  <span class="consult-day-tabs">{{ currentSchedule.days[DAY_KEYS_EN[i]].tablets || '—' }}</span>
                  <span class="consult-day-mg-val" v-if="currentSchedule.days[DAY_KEYS_EN[i]].mg > 0">
                    {{ currentSchedule.days[DAY_KEYS_EN[i]].mg.toFixed(0) }}mg
                  </span>
                </div>
              </div>
            </template>
          </template>

          <!-- NOAC clinical data -->
          <template v-else-if="derivedTherapy === 'noacs' && latestNoacLab">
            <div class="consult-stats-row cinfo-section">
              <div class="consult-stat">
                <span class="consult-stat-label">CrCl</span>
                <span class="consult-stat-val">{{ latestNoacLab.crClMlMin }}<span class="consult-stat-unit">mL/min</span></span>
              </div>
              <div class="consult-stat">
                <span class="consult-stat-label">น้ำหนัก</span>
                <span class="consult-stat-val">{{ latestNoacLab.weightKg }}<span class="consult-stat-unit">kg</span></span>
              </div>
              <div class="consult-stat">
                <span class="consult-stat-label">SCr</span>
                <span class="consult-stat-val">{{ latestNoacLab.scrMgDl.toFixed(1) }}<span class="consult-stat-unit">mg/dL</span></span>
              </div>
            </div>
            <template v-if="noacData?.profile">
              <div class="consult-noac-row">
                <span class="consult-noac-label">ยาปัจจุบัน</span>
                <span class="consult-noac-val">{{ noacData.profile.currentDrug }} {{ noacData.profile.currentDose }}</span>
              </div>
              <div class="consult-noac-row">
                <span class="consult-noac-label">ข้อบ่งใช้</span>
                <span class="consult-noac-val">{{ noacData.profile.indication }}</span>
              </div>
            </template>
          </template>

          <div v-else class="cinfo-section consult-no-data">ไม่พบข้อมูลการรักษา</div>

        </div>

      </div>

    </div>
    </template>

    <!-- Warfarin Dose Drawer — accessible from consultation room -->
    <WfDoseDrawer
      v-if="derivedTherapy === 'warfarin' && wfData"
      :data="wfData"
      :is-open="consultDrawerOpen"
      :patient-id="patientId"
      @close="consultDrawerOpen = false"
      @saved="onConsultSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'
import {
  PhArrowLeft, PhArrowSquareOut,
  PhDrop, PhHeartbeat,
  PhArrowRight,
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
import { DEFAULT_TARGET_RANGE, PILL_CONFIG } from '@/data/types/warfarin'
import type { DoseAdjustment, InrRecord, WeeklySchedule, PillStrengthMg } from '@/data/types/warfarin'
import { getInrStatus } from '@/utils/inrStatus'
import { buildWeeklySchedule } from '@/utils/warfarinDosing'
import { formatThaiDate } from '@/utils/date'
import type { NoacPatientData } from '@/data/types/noac-dispensing'
import { repo } from '@/data/repository'
import type { AtsPatientsData } from '@/data/types/ats-patients'
import type { Physician } from '@/data/types/physician'
import WarfarinDoseTool  from '@/pages/WarfarinDoseTool.vue'
import NoacAlgorithm     from '@/pages/NoacAlgorithm.vue'
import AtsPatientHeader  from '@/components/AtsPatientHeader.vue'
import ConsultComposer      from '@/components/consult/ConsultComposer.vue'
import WfDoseDrawer         from '@/components/WfDoseDrawer.vue'
import BmaTablePagination   from '@/components/BmaTablePagination.vue'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const router = useRouter()
const route  = useRoute()
const patientId = computed(() => route.params.id as string)

const loading     = ref(true)
// shallowRef: large read-only source maps — avoid deep-proxying the dataset
const allDetail   = shallowRef<Record<string, PatientDetail>>({})
const allWarfarin = shallowRef<Record<string, WarfarinPageData>>({})
const allNoac     = shallowRef<Record<string, NoacPatientData>>({})

// ats-patients.json is the canonical classification of which program each patient belongs to.
// Using this (not warfarin/noac data keys) avoids false positives when a patient's ID
// appears in both data files (e.g. w002 exists in both warfarin and noac mock data).
const patientsList = shallowRef<AtsPatientsData>({ lastSyncedAt: '', warfarin: [], noacs: [] })
const noacsIdSet   = computed(() => new Set(patientsList.value.noacs.map(p => p.id)))

const p        = computed<PatientDetail>(() => allDetail.value[patientId.value]  ?? allDetail.value['w002'])
const wfData   = computed(() => allWarfarin.value[patientId.value] ?? null)
const noacData = computed<NoacPatientData | null>(() => allNoac.value[patientId.value] ?? allNoac.value['w002'] ?? null)
const latestNoacLab = computed(() => {
  const history = noacData.value?.dispensingHistory
  if (!history?.length) return null
  return history[history.length - 1].labData
})
type TabValue = 'complications' | 'warfarin' | 'noac' | 'consult'

// Derive therapy from which clinical data source contains this patient.
// This is the canonical source of truth and works even when patient-detail.json
// doesn't have an entry for the patient yet.
const derivedTherapy = computed<'warfarin' | 'noacs'>(() =>
  noacsIdSet.value.has(patientId.value) ? 'noacs' : 'warfarin'
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
  // Therapy tool first — primary workflow for pharmacist
  ...(derivedTherapy.value === 'warfarin' ? [{ value: 'warfarin' as TabValue, label: 'Warfarin Dose Tool',      count: null }] : []),
  ...(derivedTherapy.value === 'noacs'   ? [{ value: 'noac'     as TabValue, label: 'คำแนะนำการจ่ายยา NOACs', count: null }] : []),
  { value: 'complications', label: 'ภาวะแทรกซ้อน', count: p.value.complications.length },
  { value: 'consult',       label: 'ห้องปรึกษา',   count: null },
])


// ── Consultation room ─────────────────────────────────────────────────────────
const physicians   = shallowRef<Record<string, Physician>>({})

type ConsultMsg = {
  id:       string
  role:     'doctor' | 'pharmacist' | 'nurse'
  sender:   string
  text:     string
  time:     string
  dateISO:  string
  msgType?: 'dose-adjustment'
  doseData?: { oldDose: number; newDose: number; pct: number; inr: number; schedule: WeeklySchedule }
}

const seedData = shallowRef<Record<string, ConsultMsg[]>>({})

const consultRoleLabel: Record<string, string> = {
  doctor:     'แพทย์',
  pharmacist: 'เภสัชกร',
  nurse:      'พยาบาล',
}

// Participants grouped by role — chip shows once per role, names comma-separated
const groupedParticipants = computed(() => {
  const groups: Record<string, { role: string; names: string[] }> = {}
  for (const part of consultParticipants.value.filter(p => p.role !== 'doctor')) {
    if (!groups[part.role]) groups[part.role] = { role: part.role, names: [] }
    groups[part.role].names.push(part.sender.split(' ').slice(0, 2).join(' '))
  }
  return Object.values(groups)
})

const attendingPhysician = computed<Physician | null>(() => {
  const drId = (p.value as any).attendingPhysicianId as string | undefined
  return drId ? (physicians.value[drId] ?? null) : null
})

// Reactive counter — incremented when wfData.latestInr is mutated externally
// (allWarfarin is a plain JS object, not reactive() — computed won't re-run on mutation)
const consultDataVersion = ref(0)

// Chat messages — seeded from JSON, appended locally on send
const consultMessages = ref<ConsultMsg[]>([])   // seeded after async load (see onMounted)
const composerRef     = ref<InstanceType<typeof ConsultComposer> | null>(null)
const chatScrollEl    = ref<HTMLElement | null>(null)

watch(patientId, (id) => {
  consultMessages.value = [...(seedData.value[id] ?? [])]
  composerRef.value?.clear()
  if (activeTab.value === 'consult') scrollChatBottom()
})

onMounted(async () => {
  try {
    const [detail, wf, noac, ats, phys, consults] = await Promise.all([
      repo.getPatientDetails(),
      repo.getWarfarinPatients(),
      repo.getNoacPatients(),
      repo.getAtsPatients(),
      repo.getPhysicians(),
      repo.getConsultations(),
    ])
    allDetail.value    = detail
    allWarfarin.value  = wf
    allNoac.value      = noac
    patientsList.value = ats
    physicians.value   = phys
    seedData.value     = consults as unknown as Record<string, ConsultMsg[]>
    // re-derive once data is in (defaults were computed against empty maps)
    activeTab.value       = defaultTab(derivedTherapy.value)
    consultMessages.value = [...(seedData.value[patientId.value] ?? [])]
  } catch (e) {
    console.error('[AtsPatientDetail] load failed', e)
  } finally {
    loading.value = false
  }
})

watch(activeTab, (tab) => {
  if (tab === 'consult') scrollChatBottom()
})

function scrollChatBottom() {
  nextTick(() => {
    if (chatScrollEl.value) chatScrollEl.value.scrollTop = chatScrollEl.value.scrollHeight
  })
}

const DAY_KEYS_TH  = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] as const
const DAY_KEYS_EN  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

// Item 8: compute schedule from profile (always reflects current dose)
const currentSchedule = computed(() => {
  if (!wfData.value?.profile) return null
  const { currentDoseMgWk, activePillsMg, pillStrengthMg } = wfData.value.profile
  const pills = activePillsMg?.length ? activePillsMg : pillStrengthMg
  return buildWeeklySchedule(currentDoseMgWk, pills)
})

// Item 3: INR status via utility (consistent with rest of system)
const consultInrStatus = computed(() => {
  void consultDataVersion.value   // dependency on version → re-runs when counter increments
  if (!wfData.value?.latestInr) return 'therapeutic' as const
  return getInrStatus(
    wfData.value.latestInr.inrValue,
    wfData.value.profile.targetRange ?? DEFAULT_TARGET_RANGE,
  )
})

// Item 7: participants derived from actual conversation + attending physician
const consultParticipants = computed(() => {
  const seen = new Map<string, { role: string; sender: string }>()
  if (attendingPhysician.value)
    seen.set('doctor', { role: 'doctor', sender: attendingPhysician.value.name })
  for (const msg of consultMessages.value)
    if (!seen.has(msg.role)) seen.set(msg.role, { role: msg.role, sender: msg.sender })
  return [...seen.values()]
})

// Item 4: interleave date-separator chips; MsgItem adds `isFirst` for same-sender grouping
type MsgItem  = ConsultMsg & { isFirst: boolean }
type DateSep  = { _sep: true; label: string; key: string }
type ChatItem = MsgItem | DateSep

const chatItems = computed<ChatItem[]>(() => {
  const result: ChatItem[] = []
  let lastDate = ''
  let lastSender = ''
  for (const msg of consultMessages.value) {
    if (msg.dateISO !== lastDate) {
      result.push({ _sep: true, label: formatThaiDate(msg.dateISO), key: `sep-${msg.dateISO}` })
      lastDate = msg.dateISO
      lastSender = ''
    }
    result.push({ ...msg, isFirst: msg.sender !== lastSender })
    lastSender = msg.sender
  }
  return result
})

function handleTabKey(e: KeyboardEvent, val: TabValue) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activeTab.value = val; return }
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
  const values = tabs.value.map(t => t.value)
  const idx = values.indexOf(val)
  const next = e.key === 'ArrowRight'
    ? values[(idx + 1) % values.length]
    : values[(idx - 1 + values.length) % values.length]
  activeTab.value = next
  nextTick(() => { (document.querySelector(`[data-tab="${next}"]`) as HTMLElement)?.focus() })
}

// ── Therapy duration ──────────────────────────────────────────────────────────
const therapyDuration = computed(() => {
  const start = wfData.value?.profile?.therapyStartDate
  if (!start) return null
  const startDate = new Date(start)
  const now = new Date()
  const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
  if (months < 1)  return 'น้อยกว่า 1 เดือน'
  if (months < 12) return `${months} เดือน`
  const years = Math.floor(months / 12)
  const rem   = months % 12
  return rem > 0 ? `${years} ปี ${rem} เดือน` : `${years} ปี`
})

// ── Protocol note — compact recommendation for right panel ────────────────────
const consultProtocolNote = computed(() => {
  if (derivedTherapy.value !== 'warfarin' || !wfData.value) return null
  const tr = wfData.value.profile.targetRange ?? DEFAULT_TARGET_RANGE
  const range = `${tr.min.toFixed(1)}–${tr.max.toFixed(1)}`
  const notes: Record<string, string> = {
    therapeutic: `INR อยู่ในเกณฑ์เป้าหมาย (${range}) — คงขนาดยาเดิม`,
    low:         `INR ต่ำกว่าเป้า (${range}) — แนะนำเพิ่มขนาดยา`,
    supra:       `INR สูงกว่าเป้า (${range}) — แนะนำลดขนาดยา`,
    'very-high': `INR สูงมาก — HOLD 1 dose และ Recheck`,
    critical:    `INR วิกฤต — หยุดยา พิจารณา Vitamin K oral`,
    emergency:   `INR อันตราย — ต้องการการดูแลด่วน`,
  }
  return notes[consultInrStatus.value] ?? null
})

// ── Protocol-based suggestions — passed to ConsultComposer as prop ────────────
const chatSuggestions = computed<string[]>(() => {
  const s: string[] = []
  if (derivedTherapy.value === 'warfarin' && wfData.value) {
    const status = consultInrStatus.value
    const inr    = wfData.value.latestInr?.inrValue
    const dose   = wfData.value.profile?.currentDoseMgWk
    const ttr    = wfData.value.ttr?.value
    if (status === 'low') {
      s.push(`INR ${inr?.toFixed(1)} ต่ำกว่าเป้า — เสนอเพิ่มขนาด Warfarin`)
      s.push(`ขอปรึกษาปรับขึ้น Warfarin จาก ${dose?.toFixed(1)} mg/wk`)
    // therapeutic → no suggestions: silence = "all is well" signal in clinical context
    } else if (status === 'supra') {
      s.push(`INR ${inr?.toFixed(1)} สูงกว่าเป้า — เสนอลดขนาด Warfarin`)
      s.push(`ขอปรึกษาปรับลด Warfarin จาก ${dose?.toFixed(1)} mg/wk`)
    } else if (status === 'very-high' || status === 'critical') {
      s.push(`INR ${inr?.toFixed(1)} สูงมาก — เสนอ HOLD Warfarin ทันที`)
      s.push('ขอปรึกษา HOLD + ติดตาม Bleeding signs อย่างใกล้ชิด')
    } else if (status === 'emergency') {
      s.push(`URGENT: INR ${inr?.toFixed(1)} ≥10 — ขอปรึกษาด่วน`)
      s.push('เสนอ HOLD + Vitamin K1 IV ตรวจ INR ซ้ำใน 6 ชม.')
    }
    if (ttr !== undefined && ttr < 65)
      s.push(`TTR ${ttr.toFixed(0)}% < 65% — ขอปรึกษาพิจารณาเปลี่ยน Therapy`)
  } else if (derivedTherapy.value === 'noacs' && latestNoacLab.value) {
    const crcl = latestNoacLab.value.crClMlMin
    const drug = noacData.value?.profile?.currentDrug ?? 'NOACs'
    const dose = noacData.value?.profile?.currentDose ?? ''
    if (crcl < 30)       s.push(`CrCl ${crcl} mL/min < 30 — เสนอหยุด ${drug} ทันที`)
    else if (crcl < 50) { s.push(`CrCl ${crcl} mL/min — เสนอลดขนาด ${drug}`)
                           s.push(`ขอปรึกษาปรับ ${drug} ${dose} (CrCl ${crcl})`) }
    // CrCl ≥ 50 = normal — no suggestions, same "silence = OK" principle
  }
  return s
})

// ── Dose Drawer (opened from consultation room) ───────────────────────────────
const consultDrawerOpen = ref(false)

function onConsultSaved(payload: { newDoseMgWk: number; newAdj: DoseAdjustment; newInr?: InrRecord }) {
  if (!wfData.value) return

  // Apply same mutations as WarfarinDoseTool.onDrawerSaved
  if (payload.newInr) {
    wfData.value.inrHistory.push(payload.newInr)
    wfData.value.latestInr = payload.newInr
    consultDataVersion.value++   // invalidate consultInrStatus + consultProtocolNote
  }
  wfData.value.doseAdjustments.push(payload.newAdj)
  wfData.value.profile.currentDoseMgWk = payload.newDoseMgWk
  wfData.value.profile.activePillsMg   = [...payload.newAdj.activePillsMg]
  wfData.value.profile.pillStrengthMg  = payload.newAdj.activePillsMg[0]

  // Auto-post dose adjustment notification card to chat
  const adj = payload.newAdj
  const dr  = attendingPhysician.value
  const now = new Date()
  consultMessages.value.push({
    id:      `msg-dose-${Date.now()}`,
    role:    'doctor',
    sender:  dr?.name ?? 'แพทย์',
    text:    '',
    time:    now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
    dateISO: now.toISOString().slice(0, 10),
    msgType: 'dose-adjustment',
    doseData: {
      oldDose:  adj.oldDoseMgWk,
      newDose:  adj.newDoseMgWk,
      pct:      adj.percentChange,
      inr:      adj.inrAtAdjustment,
      schedule: adj.weeklySchedule,
    },
  })
  scrollChatBottom()
}

// ── Handle send from ConsultComposer ─────────────────────────────────────────
function onComposerSend({ text, files }: { text: string; files: File[] }) {
  const fileNote = files.length
    ? `${text ? '\n' : ''}📎 ${files.map(f => f.name).join(', ')}`
    : ''
  const dr = attendingPhysician.value
  consultMessages.value.push({
    id:      `msg-local-${Date.now()}`,
    role:    'doctor',
    sender:  dr ? dr.name : 'แพทย์',
    text:    text + fileNote,
    time:    new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
    dateISO: new Date().toISOString().slice(0, 10),
  })
  scrollChatBottom()
}


const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// Canvas API cannot resolve CSS custom properties — read them at runtime via getComputedStyle.
// This keeps tokens.css as the single source of truth while satisfying Chart.js.
function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// ── Complications table pagination ────────────────────────────────────────────
const compPage     = ref(1)
const compPageSize = ref(10)
const compPageCount = computed(() =>
  Math.max(1, Math.ceil(p.value.complications.length / compPageSize.value))
)
const pagedComplications = computed(() =>
  p.value.complications.slice(
    (compPage.value - 1) * compPageSize.value,
    compPage.value * compPageSize.value,
  )
)
watch(patientId, () => { compPage.value = 1 })

const cfg: Record<ComplicationType, { label: string; color: string; iconBg: string; icon: Component }> = {
  'bleeding':        { label: 'Bleeding',        color: 'var(--bma-complication-bleeding-color)',   iconBg: 'var(--bma-complication-bleeding-bg)',   icon: PhDrop      },
  'thromboembolism': { label: 'Thromboembolism', color: 'var(--bma-complication-thrombosis-color)', iconBg: 'var(--bma-complication-thrombosis-bg)', icon: PhHeartbeat },
}

const typeLabel: Record<ComplicationType, string> = {
  'bleeding':        'Bleeding',
  'thromboembolism': 'Thromboembolism',
}

const chartData = computed(() => {
  const counts: Record<ComplicationType, number[]> = {
    'bleeding':        new Array(12).fill(0),
    'thromboembolism': new Array(12).fill(0),
  }
  for (const c of p.value.complications) counts[c.type][c.month - 1]++

  return {
    labels: thaiMonths,
    datasets: [
      { label: 'Bleeding',        data: counts['bleeding'],        backgroundColor: cssVar('--bma-complication-bleeding-color',   '#E57373') },
      { label: 'Thromboembolism', data: counts['thromboembolism'], backgroundColor: cssVar('--bma-complication-thrombosis-color', '#1565C0') },
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

    // Pill background — --bma-elective closest match in token system
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bma-elective').trim() || '#2B478B'
    ctx.fillRect(bx, by, boxW, boxH)

    // Label text — --bma-surface = #FFFFFF, read via cssVar for token consistency
    ctx.fillStyle  = cssVar('--bma-surface', '#FFFFFF')
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
      grid:   { color: cssVar('--bma-border-subtle', '#F0F0F0') },
      border: { display: false },
      ticks:  { stepSize: 1, precision: 0 },
    },
  },
}
</script>

<style scoped>
/* ── Two-zone layout ──────────────────────────────────── */
.content-wrap { display: flex; flex-direction: column; height: 100%; }
.apd-loading {
  padding: 48px 24px;
  text-align: center;
  font-family: var(--bma-font-thai);
  font-size: var(--bma-text-sm);
  color: var(--bma-text-tertiary);
}
.page { background: var(--bma-surface); padding: 16px 24px 0; }

/* ── Page header ─────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.page-title {
  font-family: var(--bma-font-thai);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-text-primary);
  margin: 0;
  line-height: 1.35;
}
.back-btn {
  width: 36px; height: 36px;
  border-radius: var(--bma-radius-md);
  border: 1.5px solid var(--bma-border);
  background: var(--bma-surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  color: var(--bma-text-tertiary);
  transition: background var(--bma-transition-fast), border-color var(--bma-transition-fast);
}
.back-btn:hover { background: var(--bma-surface-subtle); border-color: var(--bma-green-300); }

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
  font-size: var(--bma-text-kpi-card); font-weight: 700; color: var(--bma-text-primary); line-height: 1.1;
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
.btn-export:hover:not(:disabled) { background: var(--bma-surface-subtle); }
.btn-export:disabled { opacity: .45; cursor: not-allowed; }

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
  width: 32px; height: 32px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid transparent;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--bma-text-muted);
  transition: border-color var(--bma-transition-fast),
              background var(--bma-transition-fast),
              color var(--bma-transition-fast);
}
.action-btn:hover {
  border-color: var(--bma-green-300);
  background: var(--bma-green-50);
  color: var(--bma-green-600);
}

.comp-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-size: 12px; font-weight: 600; white-space: nowrap;
}
.comp-badge--bleeding        { background: var(--bma-complication-bleeding-bg);   color: var(--bma-complication-bleeding-color); }
.comp-badge--thromboembolism { background: var(--bma-complication-thrombosis-bg); color: var(--bma-complication-thrombosis-color); }

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

/* ── Table footer / Pagination — handled by BmaTablePagination component ─── */

/* ── Consultation room ────────────────────────────────── */

/* Consult tab: bypass the flex chain (v-main has flex-shrink:0 — can't be bounded via
   percentage heights). Directly bind to viewport using Vuetify's --v-layout-top variable
   so main-wrap has an exact, content-independent height. */
.content-wrap--consult {
  overflow: hidden;
}
.content-wrap--consult .main-wrap {
  overflow: hidden;
  padding: 24px;
  height: calc(100dvh - var(--v-layout-top, 64px));
  flex: none;
}

.consult-wrap {
  display: grid;
  grid-template-columns: var(--bma-cols-consult);
  gap: 16px;
  flex: 1;       /* fill remaining height as a flex item */
  min-height: 0; /* allow shrinking below content size  */
}

/* ── Chat panel ─────────────────────────────────────────── */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;          /* fill the grid cell height */
  min-height: 0;         /* allow flex item to shrink below content size */
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}

.chat-panel-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
  flex-shrink: 0;
}
.chat-panel-title {
  font-family: var(--bma-font-thai);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
/* legend removed — role context now lives in right panel participant chips */

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.chat-empty-main {
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 600;
  color: var(--bma-text-disabled);
}
.chat-empty-sub {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-disabled);
}

.chat-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.chat-row--self { align-items: flex-end; }
.chat-row--continuation { margin-top: -4px; }

.chat-bubble-wrap { display: flex; flex-direction: column; max-width: 78%; gap: 3px; }
.chat-row--self .chat-bubble-wrap { align-items: flex-end; }

.chat-sender-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 4px;
  margin-bottom: 2px;
}
.chat-role-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.chat-role-dot--pharmacist { background: var(--bma-role-pharma-ink); }
.chat-role-dot--nurse      { background: var(--bma-role-nurse-ink); }

.chat-sender-name {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}

.chat-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-family: var(--bma-font-thai);
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}
.chat-bubble--doctor     { background: var(--bma-green-500);         color: #fff;                        border-radius: 12px 4px 12px 12px; }
.chat-bubble--pharmacist { background: var(--bma-role-pharma-fill); color: var(--bma-role-pharma-ink); border-radius: 4px 12px 12px 12px; }
.chat-bubble--nurse      { background: var(--bma-role-nurse-fill);  color: var(--bma-role-nurse-ink);  border-radius: 4px 12px 12px 12px; }

.chat-time {
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-text-disabled);
  padding: 0 4px;
}

/* ── Right panel — unified zone label system ───────────────────────────
   Single cinfo-eyebrow class for ALL zone labels throughout the panel.
   Thai zone labels: Sarabun (Thai prose). All same visual weight, same color.
   WCAG: --bma-text-secondary (#454545) = 9.73:1 on white ✓               */
.cinfo-eyebrow {
  display: block;
  font-family: var(--bma-font-thai);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--bma-text-secondary);
  margin-bottom: 6px;
}
/* Inline variant — used when eyebrow shares a row with badges/chips */
.cinfo-eyebrow--inline {
  display: inline;
  margin-bottom: 0;
}

/* Therapy header row: eyebrow + badge + duration chip inline */
.cinfo-therapy-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bma-surface-light);
}
.cinfo-therapy-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
/* Duration chip — compact data indicator inline with therapy badge */
.cinfo-duration-chip {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 600;
  color: var(--bma-text-secondary);
  background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-subtle);
  border-radius: var(--bma-radius-full);
  padding: 2px 6px;
}

/* Schedule section eyebrow + period label */
.cinfo-sched-hd { display: flex; align-items: baseline; justify-content: space-between; }
.cinfo-sched-sub {
  font-family: var(--bma-font-thai);
  font-size: 10px;
  color: var(--bma-text-secondary);
}

/* Protocol callout — styled tint within clinical zone.
   Background matches INR state for immediate visual cue. */
.cinfo-protocol-callout {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--bma-radius-md);
  background: var(--bma-surface-subtle);   /* default: neutral */
}
.cinfo-callout--low       { background: var(--inr-low-bg); }
.cinfo-callout--supra     { background: var(--inr-supra-bg); }
.cinfo-callout--very-high { background: var(--inr-very-high-body); }
.cinfo-callout--critical  { background: var(--inr-critical-body); }
.cinfo-callout--emergency { background: var(--bma-emergency-bg-soft); }

.cinfo-protocol-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.cinfo-dot--therapeutic { background: var(--bma-green-500); }
.cinfo-dot--low         { background: var(--inr-low-text); }
.cinfo-dot--supra       { background: var(--inr-supra-text); }
.cinfo-dot--very-high   { background: var(--bma-emergency); }
.cinfo-dot--critical    { background: var(--inr-critical-text); }
.cinfo-dot--emergency   { background: var(--inr-emergency-fill); }
.cinfo-protocol-text {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-primary);
  line-height: 1.5;
}

/* cinfo-label and cinfo-meta-* removed — absorbed into unified eyebrow system */

/* ── People section — ทีมผู้รักษา ───────────────────────────────────────
   Controlled spacing: eyebrow sits close to attending (4px),
   attending separates from participants (10px).
   No gap on container — each child manages its own margin.             */
.cinfo-people { display: flex; flex-direction: column; gap: 0; }

/* Override eyebrow margin inside people — let proximity create relationship */
.cinfo-people .cinfo-eyebrow { margin-bottom: 4px; }

/* Attending featured row */
.cinfo-attending { display: flex; align-items: flex-start; gap: 8px; }
.cinfo-attending-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--bma-green-500);
  flex-shrink: 0;
  margin-top: 4px;
}
.cinfo-attending-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cinfo-attending-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* Role badge — compact, low visual weight */
.cinfo-role-badge {
  font-family: var(--bma-font-thai);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--bma-radius-full);
}
.cinfo-role-badge--attending {
  background: var(--bma-green-50);
  color: var(--bma-green-700);
  border: 1px solid var(--bma-green-200);
}
/* Bump badge size to match role chips */
.cinfo-role-badge { font-size: 11px; padding: 2px 8px; }

/* Participants grouped list — role chip once per group, names wrap */
.cinfo-participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 16px;
  margin-top: 10px;    /* clear separation between doctor and participants */
}
/* Each group: chip (left, shrink-0) + names (right, flex-wrap) */
.cinfo-participant-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;     /* group itself wraps if panel very narrow */
}
.cinfo-participant-names {
  font-family: var(--bma-font-thai);
  font-size: 13px;     /* bumped from 12 for readability */
  color: var(--bma-text-secondary);
  flex: 1;
  min-width: 0;        /* allow shrinking below content */
  line-height: 1.5;
  word-break: break-word;
}
.cinfo-name-sep { color: var(--bma-text-disabled); }

/* Role chips — group header. Larger than before for readability.
   WCAG: pharma #2B478B on #E9EDF6 = 7.94:1 ✓  nurse #3A5239 on #EBF0EA = 7.65:1 ✓ */
.cinfo-role-chip {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 0;
  width: 64px;         /* fixed width — longest chip is "เภสัชกร" ~60px */
  text-align: center;
  border-radius: var(--bma-radius-full);
  flex-shrink: 0;
  line-height: 1.5;
}
.cinfo-role-chip--pharmacist { background: var(--bma-role-pharma-fill); color: var(--bma-role-pharma-ink); }
.cinfo-role-chip--nurse      { background: var(--bma-role-nurse-fill);  color: var(--bma-role-nurse-ink); }

/* ConsultComposer — styles live in components/consult/ConsultComposer.vue */

/* Date separator */
.chat-date-sep {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}
.chat-date-chip {
  padding: 3px 12px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-subtle);
  font-family: var(--bma-font-thai);   /* Thai month names → Sarabun, not Inter */
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Right info panels ──────────────────────────────────── */
/* Unified right panel — single card, sections separated by dividers */
.consult-info {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

/* Section padding unit */
.cinfo-section {
  padding: 12px 16px;
  flex-shrink: 0;
}

/* Thin separator between sections */
.cinfo-divider {
  height: 1px;
  background: var(--bma-border-subtle);
  flex-shrink: 0;
}

/* Physician row inside a section */
.cinfo-physician {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* .cinfo-therapy-hd and .cinfo-label consolidated above into unified eyebrow system */
.consult-doctor-avatar { flex-shrink: 0; }
.consult-doctor-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.consult-doctor-name { font-family: var(--bma-font-thai); font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.consult-doctor-spec { font-family: var(--bma-font-thai); font-size: 12px; color: var(--bma-text-muted); }
.consult-doctor-phone { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }

.consult-part-list { display: flex; gap: 6px; flex-wrap: wrap; }
.consult-part-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-thai);
  font-size: 12px;
  font-weight: 600;
}
.consult-part-chip--doctor     { background: var(--bma-green-50);          color: var(--bma-green-700); }
.consult-part-chip--pharmacist { background: var(--bma-role-pharma-fill); color: var(--bma-role-pharma-ink); }
.consult-part-chip--nurse      { background: var(--bma-role-nurse-fill);  color: var(--bma-role-nurse-ink); }
.part-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: .7;
  flex-shrink: 0;
}

/* Stats row — padding comes from .cinfo-section wrapper */
/* border-bottom removed — zone rhythm comes from cinfo-divider, not row borders */
.consult-stats-row {
  display: flex;
  gap: 0;
}
.consult-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 12px;
}
.consult-stat + .consult-stat {
  padding-left: 12px;
  padding-right: 12px;
  border-left: 1px solid var(--bma-border-subtle);
}
.consult-stat:last-child { padding-right: 0; }
/* Inter for clinical abbreviations (INR, TTR, CrCl, SCr) per DESIGN.md: clinical labels = --bma-font-data.
   WCAG: --bma-text-secondary (#454545) = 9.73:1 on white ✓ (text-muted failed at 3.37:1) */
.consult-stat-label { font-family: var(--bma-font-data); font-size: 10px; font-weight: 600; color: var(--bma-text-secondary); letter-spacing: .03em; }
.consult-stat-val   { font-family: var(--bma-font-data); font-size: 20px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.consult-stat-unit  { font-family: var(--bma-font-data); font-size: 11px; font-weight: 400; color: var(--bma-text-muted); margin-left: 2px; }

/* WF INR value colors — all 6 clinical states from getInrStatus() */
.wf-num--therapeutic { color: var(--bma-success-text); }
.wf-num--low         { color: var(--bma-inr-low-text); }
.wf-num--supra       { color: var(--bma-inr-high-text); }
.wf-num--very-high   { color: var(--bma-emergency); }
.wf-num--critical    { color: var(--bma-emergency); }
.wf-num--emergency   { color: var(--bma-emergency); }

/* consult-sched-label removed — schedule zone now uses cinfo-eyebrow in cinfo-sched-hd */
.consult-day-grid {
  display: grid;
  grid-template-columns: var(--bma-cols-day-grid);
  gap: 4px;
  padding: 0 16px 14px;
}
.consult-day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 3px;
  border-radius: var(--bma-radius-md);
  border: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
}
.consult-day-cell--active { border-color: var(--bma-border); background: var(--bma-surface); }
.consult-day-cell--zero   { opacity: .45; }
.consult-day-name { font-family: var(--bma-font-data); font-size: 9px; font-weight: 700; color: var(--bma-text-tertiary); }

.consult-pill-wrap {
  display: flex;
  gap: 1px;
  align-items: center;
  justify-content: center;
  height: 12px;
}
.consult-pill-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  box-shadow: inset 0 -1px 2px rgba(0,0,0,.18), inset 0 1px 1px rgba(255,255,255,.30);
}
.consult-pill-dot--half   { width: 5px; border-radius: 5px 0 0 5px; }
.consult-pill-dot--orange { background: var(--wf-pill-orange); }
.consult-pill-dot--blue   { background: var(--wf-pill-blue); }
.consult-pill-dot--pink   { background: var(--wf-pill-pink); }
.consult-pill-empty {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  background: var(--bma-border-subtle);
}
.consult-day-tabs {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}
.consult-day-mg-val {
  font-family: var(--bma-font-data);
  font-size: 8px;
  color: var(--bma-text-disabled);
}

/* Dose adjustment CTA — sits inside .cinfo-section which provides padding */
.consult-dose-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background: var(--bma-green-50);
  border: 1.5px solid var(--bma-green-200);
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 13px;
  font-weight: 600;
  color: var(--bma-green-700);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--bma-transition-fast),
              border-color var(--bma-transition-fast);
}
.consult-dose-cta:hover:not(:disabled) {
  background: var(--bma-green-100);
  border-color: var(--bma-green-300);
}
.consult-dose-cta--reviewing {
  background: var(--bma-green-100);
  border-color: var(--bma-green-300);
  color: var(--bma-green-600);
  cursor: default;
  opacity: .8;
}
.consult-dose-cta:disabled { cursor: not-allowed; }

/* Dose adjustment notification card in chat */
.dose-adj-card {
  background: var(--bma-green-50);
  border: 1px solid var(--bma-green-200);
  border-radius: var(--bma-radius-md);
  padding: 10px 14px;
  min-width: 200px;
  max-width: min(420px, 90%);
}
.dose-adj-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.dose-adj-title {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 700;
  color: var(--bma-green-700);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.dose-adj-saved {
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-green-700);   /* WCAG: success-text (4.29:1) fails at 10px; green-700 = 7.40:1 ✓ */
  font-weight: 600;
}
.dose-adj-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;       /* 1×4pt */
  margin-bottom: 4px;
}
.dose-adj-old {
  font-family: var(--bma-font-data);
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-secondary);   /* WCAG: 8.61:1 on green-50 ✓ */
  text-decoration: line-through;
}
.dose-adj-arrow {
  font-family: var(--bma-font-data);
  font-size: 14px;
  color: var(--bma-text-secondary);   /* WCAG: 8.61:1 on green-50 ✓ */
}
.dose-adj-new {
  font-family: var(--bma-font-data);
  font-size: 20px;
  font-weight: 700;
  color: var(--bma-green-700);        /* 7.40:1 on green-50 ✓ */
  line-height: 1;
}
.dose-adj-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-secondary);   /* WCAG: 8.61:1 on green-50 ✓ */
}
/* Delta row — pct badge on its own line, no overflow */
.dose-adj-delta {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.dose-adj-pct {
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;    /* 2px/8px = on 4pt grid */
  border-radius: var(--bma-radius-full);
}
/* White badge bg ensures WCAG regardless of card background.
   Border adds semantic color cue without relying on fill opacity.
   up:   success-text on white = 4.77:1 ✓
   down: inr-low-text on white = 5.05:1 ✓ (urgency-text fails at 2.87:1)
   flat: text-secondary on white = 9.73:1 ✓ */
.dose-adj-pct--up   { background: var(--bma-surface); color: var(--bma-success-text); border: 1px solid var(--bma-green-200); }
.dose-adj-pct--down { background: var(--bma-surface); color: var(--inr-low-text);      border: 1px solid var(--inr-low-ring); }
.dose-adj-pct--flat { background: var(--bma-surface); color: var(--bma-text-secondary); border: 1px solid var(--bma-border-subtle); }
.dose-adj-meta {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-secondary);   /* WCAG: 8.61:1 on green-50 ✓ */
}
.dose-adj-divider {
  height: 1px;
  background: var(--bma-green-200);
  margin: 8px 0 6px;
}
.dose-adj-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.dose-adj-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: var(--bma-radius-xs);
}
.dose-adj-day--active { background: rgba(0, 116, 75, 0.06); }
.dose-adj-day--zero   { opacity: .4; }
.dose-adj-day-name {
  font-family: var(--bma-font-data);
  font-size: 8px;
  font-weight: 700;
  color: var(--bma-text-tertiary);
}
.dose-adj-day-tabs {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

/* NOAC rows */
.consult-noac-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 16px;
  border-top: 1px solid var(--bma-border-subtle);
}
.consult-noac-row:first-of-type { padding-top: 12px; }
.consult-noac-label { font-family: var(--bma-font-thai); font-size: 11px; color: var(--bma-text-muted); font-weight: 600; flex-shrink: 0; min-width: 80px; }
.consult-noac-val   { font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }

/* Physician status chip — .consult-status-row wrapper removed in cinfo refactor */
.consult-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
}
.consult-status-chip--open {
  background: var(--bma-success-bg);
  color: var(--bma-success-text);
}
.consult-status-chip--open::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bma-success);
}

/* Therapy badge */
.consult-therapy-badge {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
}
.therapy--wf   { background: var(--bma-green-50);     color: var(--bma-green-700); }
.therapy--noac { background: var(--bma-contra-bg);    color: var(--bma-elective); }

.consult-no-data {
  padding: 24px 16px;
  text-align: center;
  font-family: var(--bma-font-thai);
  font-size: 13px;
  color: var(--bma-text-disabled);
  font-style: italic;
}
</style>