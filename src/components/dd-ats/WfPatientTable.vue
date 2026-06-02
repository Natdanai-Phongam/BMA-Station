<template>
  <div>
    <!-- Section header -->
    <div class="tab-section-header">
      <span class="tab-section-title">การจ่าย Warfarin</span>
      <span class="tab-section-count">ผู้ป่วยทั้งหมด {{ total }} ราย</span>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-search">
        <PhMagnifyingGlass :size="15" color="#BFBFBF" class="fi-icon" />
        <input
          v-model="searchQuery"
          class="filter-input"
          placeholder="ค้นหาชื่อ - นามสกุล"
          @keydown.enter="applyFilter"
        />
      </div>
      <div class="filter-date">
        <input
          v-model="dateFrom"
          type="date"
          class="filter-input"
          title="วันที่เริ่มต้น"
        />
        <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
      </div>
      <div class="filter-date">
        <input
          v-model="dateTo"
          type="date"
          class="filter-input"
          :min="dateFrom"
          title="วันที่สิ้นสุด"
        />
        <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
      </div>
      <button class="btn-search" @click="applyFilter">ค้นหา</button>
      <button v-if="isFiltered" class="btn-clear" @click="clearFilter">ล้าง</button>
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
              v-for="p in pagedRows"
              :key="p.id"
              class="data-row"
              :class="`data-row--${p.status}`"
            >
              <td class="col-action">
                <button class="action-btn" @click="emit('go-to-patient', p.id)" title="ดูรายละเอียด">
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
                  <div class="tt-scroll-body">
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

      <!-- Pagination footer -->
      <div class="table-footer">
        <span class="pg-info">
          ข้อมูลที่ {{ Math.min((page - 1) * pageSize + 1, filteredTotal) }}
          ถึง {{ Math.min(page * pageSize, filteredTotal) }}
          จากทั้งหมด {{ filteredTotal }} รายการ
          <span v-if="isFiltered" class="pg-filtered">(กรองจาก {{ total }} รายการ)</span>
        </span>
        <div class="pg-controls">
          <select class="pg-select" v-model.number="pageSize">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <div class="pagination">
            <button class="pg-btn" :class="{ 'pg-btn--disabled': page === 1 }" :disabled="page === 1" @click="page = 1">
              <PhCaretDoubleLeft :size="13" />
            </button>
            <button class="pg-btn" :class="{ 'pg-btn--disabled': page === 1 }" :disabled="page === 1" @click="page--">
              <PhCaretLeft :size="13" />
            </button>
            <button
              v-for="n in visiblePages(page, pageCount)" :key="n"
              class="pg-btn" :class="{ 'pg-btn--active': n === page }"
              @click="page = n"
            >{{ n }}</button>
            <button class="pg-btn" :class="{ 'pg-btn--disabled': page === pageCount }" :disabled="page === pageCount" @click="page++">
              <PhCaretRight :size="13" />
            </button>
            <button class="pg-btn" :class="{ 'pg-btn--disabled': page === pageCount }" :disabled="page === pageCount" @click="page = pageCount">
              <PhCaretDoubleRight :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PhMagnifyingGlass, PhCalendar, PhArrowSquareOut, PhWarning,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'
import type { EnrichedWfPatient } from '@/data/types/ats-patients'
import { majorIxnCount, getMajorIxns, lastDoseAdjustment, wfConcordanceBadgeClass, wfConcordanceLabel, warfarinStatusLabel, effectLabel, ttrStatusLabel } from '@/utils/warfarin-helpers'
import { visiblePages } from '@/utils/number-helpers'

const props = defineProps<{ rows: EnrichedWfPatient[] }>()
const emit  = defineEmits<{ 'go-to-patient': [id: string] }>()

// ── Filter state ──────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const dateFrom     = ref('')
const dateTo       = ref('')
const activeSearch = ref('')
const activeDateFrom = ref('')
const activeDateTo   = ref('')

function applyFilter() {
  activeSearch.value   = searchQuery.value.trim().toLowerCase()
  activeDateFrom.value = dateFrom.value
  activeDateTo.value   = dateTo.value
  page.value = 1
}

function clearFilter() {
  searchQuery.value  = ''
  dateFrom.value     = ''
  dateTo.value       = ''
  applyFilter()
}

const isFiltered = computed(() =>
  activeSearch.value !== '' || activeDateFrom.value !== '' || activeDateTo.value !== ''
)

const filteredRows = computed(() => {
  let list = props.rows
  if (activeSearch.value) {
    list = list.filter(p => p.name.toLowerCase().includes(activeSearch.value))
  }
  if (activeDateFrom.value || activeDateTo.value) {
    list = list.filter(p => {
      const d = p.wf?.latestInr?.measuredAt?.substring(0, 10)
      if (!d) return false
      if (activeDateFrom.value && d < activeDateFrom.value) return false
      if (activeDateTo.value   && d > activeDateTo.value)   return false
      return true
    })
  }
  return list
})

const total         = computed(() => props.rows.length)
const filteredTotal = computed(() => filteredRows.value.length)

// ── Pagination ────────────────────────────────────────────────────────────────
const page     = ref(1)
const pageSize = ref(10)

watch(pageSize,             () => { page.value = 1 })
watch(() => props.rows,     () => { page.value = 1; clearFilter() }, { flush: 'sync' })

const pageCount = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize.value)))
const pagedRows = computed(() =>
  filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)
</script>

<style scoped>
.data-table--warfarin { min-width: 960px; }

.col-inr  { width: 68px; }
.col-ttr  { width: 152px; }
.col-dose { width: 90px; }
.col-ixn  { width: 110px; }

.inr-val { font-family: var(--bma-font-data); font-size: 15px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.inr-val--alert { color: var(--bma-emergency); }

.ttr-display { display: flex; flex-direction: row; align-items: center; flex-wrap: nowrap; gap: 5px; }
.ttr-val { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; line-height: 1; flex-shrink: 0; }
.ttr--goal-met          { color: var(--bma-success-text); }
.ttr--below-goal        { color: var(--bma-emergency); }
.ttr--insufficient-data { color: var(--bma-text-muted); }
.ttr-status-badge { display: inline-block; font-family: var(--bma-font-thai); font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--bma-radius-full); white-space: nowrap; flex-shrink: 0; }
.ttr-badge--goal-met          { background: var(--bma-success-bg);     color: var(--bma-success-text); }
.ttr-badge--below-goal        { background: var(--bma-emergency-bg);   color: var(--bma-emergency); }
.ttr-badge--insufficient-data { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

.dose-display { display: flex; align-items: baseline; gap: 2px; flex-wrap: nowrap; }
.dose-val  { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }
.dose-unit { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }

.ixn-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--bma-radius-full); background: var(--bma-urgency-bg); color: var(--bma-urgency-text); font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; }
.ixn-badge--hoverable { cursor: pointer; }

.pg-filtered { font-size: 10px; color: var(--bma-green-500); margin-left: 4px; }

.btn-clear {
  height:        40px;
  padding:       0 14px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-thai);
  font-size:     13px;
  color:         var(--bma-text-muted);
  cursor:        pointer;
  transition:    background 120ms, border-color 120ms;
  white-space:   nowrap;
  flex-shrink:   0;
}
.btn-clear:hover { background: var(--bma-neutral-100, #F5F5F5); border-color: var(--bma-border-card); }
</style>
