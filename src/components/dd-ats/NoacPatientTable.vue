<template>
  <div>
    <!-- Section header -->
    <div class="tab-section-header">
      <span class="tab-section-title">การจ่าย NOACs</span>
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
          placeholder="วันที่เริ่มต้น"
        />
        <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
      </div>
      <div class="filter-date">
        <input
          v-model="dateTo"
          type="date"
          class="filter-input"
          :min="dateFrom"
          placeholder="วันที่สิ้นสุด"
        />
        <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
      </div>
      <button class="btn-search" @click="applyFilter">ค้นหา</button>
      <button v-if="isFiltered" class="btn-clear" @click="clearFilter">ล้าง</button>
    </div>

    <!-- Table card -->
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
  PhMagnifyingGlass, PhCalendar, PhArrowSquareOut, PhWarningCircle,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'
import type { EnrichedNoacPatient } from '@/data/types/ats-patients'
import { lastDispensing, concordanceBadgeClass, concordanceLabel, noacsStatusLabel, drugDisplayLabel, indicationChipLabel } from '@/utils/noac-helpers'
import { visiblePages } from '@/utils/number-helpers'

const props = defineProps<{ rows: EnrichedNoacPatient[] }>()
const emit  = defineEmits<{ 'go-to-patient': [id: string] }>()

// ── Filter state ──────────────────────────────────────────────────────────────
const searchQuery    = ref('')
const dateFrom       = ref('')
const dateTo         = ref('')
const activeSearch   = ref('')
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
      const d = lastDispensing(p.noac)?.dispensedAt?.substring(0, 10)
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

watch(pageSize,         () => { page.value = 1 })
watch(() => props.rows, () => { page.value = 1; clearFilter() }, { flush: 'sync' })

const pageCount = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize.value)))
const pagedRows = computed(() =>
  filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)
</script>

<style scoped>
.data-table--noacs { min-width: 880px; }

.col-drug   { width: 160px; }
.col-crcl   { width: 72px; }
.col-weight { width: 88px; }

.indication-chip { display: inline-block; padding: 2px 8px; border-radius: var(--bma-radius-full); background: var(--bma-green-50); border: 1px solid var(--bma-green-200); color: var(--bma-green-700); font-family: var(--bma-font-data); font-size: 10px; font-weight: 700; white-space: nowrap; }

.lab-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--bma-radius-sm); border: 1px solid var(--bma-border-muted); background: var(--bma-surface-light); font-family: var(--bma-font-data); font-size: 12px; font-weight: 600; color: var(--bma-text-primary); }
.lab-badge--alert { border-color: var(--bma-emergency); background: #FFF5F5; color: var(--bma-emergency); }

.drug-inline { display: flex; align-items: baseline; flex-wrap: nowrap; gap: 4px; }
.drug-name   { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); flex-shrink: 0; }
.drug-sep    { font-size: 10px; color: var(--bma-text-muted); flex-shrink: 0; }
.drug-dose   { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }

.weight-display { display: flex; align-items: baseline; gap: 2px; }
.weight-val     { font-family: var(--bma-font-data); font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.weight-val--low { color: var(--bma-urgency-text); }
.weight-unit    { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }

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
