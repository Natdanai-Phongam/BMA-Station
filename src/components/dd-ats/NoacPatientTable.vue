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
        <PhMagnifyingGlass :size="15" color="var(--bma-text-disabled)" class="fi-icon" />
        <input
          v-model="searchQuery"
          class="filter-input"
          placeholder="ค้นหาชื่อ - นามสกุล"
          @keydown.enter="applyFilter"
        />
      </div>
      <select v-model="hospitalFilter" class="filter-select">
        <option value="">ทุกโรงพยาบาล</option>
        <option v-for="h in hospitalOptions" :key="h" :value="h">{{ h }}</option>
      </select>
      <v-menu v-model="dateFromMenu" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: mp }">
          <div class="filter-date" v-bind="mp">
            <input
              :value="dateFrom ? formatDisplayDate(dateFrom) : ''"
              class="filter-input filter-input--picker"
              placeholder="วันที่เริ่มต้น"
              readonly
            />
            <button v-if="dateFrom" class="fi-clear-btn" @click.stop="dateFrom = null">
              <PhX :size="13" color="var(--bma-text-muted)" />
            </button>
            <PhCalendar v-else :size="15" color="var(--bma-text-disabled)" class="fi-icon-r" />
          </div>
        </template>
        <v-date-picker
          v-model="dateFrom"
          :max="dateTo ?? undefined"
          @update:model-value="dateFromMenu = false"
        />
      </v-menu>

      <v-menu v-model="dateToMenu" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: mp }">
          <div class="filter-date" v-bind="mp">
            <input
              :value="dateTo ? formatDisplayDate(dateTo) : ''"
              class="filter-input filter-input--picker"
              placeholder="วันที่สิ้นสุด"
              readonly
            />
            <button v-if="dateTo" class="fi-clear-btn" @click.stop="dateTo = null">
              <PhX :size="13" color="var(--bma-text-muted)" />
            </button>
            <PhCalendar v-else :size="15" color="var(--bma-text-disabled)" class="fi-icon-r" />
          </div>
        </template>
        <v-date-picker
          v-model="dateTo"
          :min="dateFrom ?? undefined"
          @update:model-value="dateToMenu = false"
        />
      </v-menu>
      <button class="btn-search" @click="applyFilter">ค้นหา</button>
      <button class="btn-clear" :disabled="!hasFilter" @click="clearFilter">ล้าง</button>
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
              :class="[`data-row--${p.status}`, { 'data-row--deceased': p.deceased }]"
            >
              <td class="col-action">
                <v-btn icon size="small" variant="text" color="primary" @click="emit('go-to-patient', p.id)" title="ดูรายละเอียด">
                  <PhArrowSquareOut :size="15" />
                </v-btn>
              </td>
              <td class="col-name">
                <div class="patient-name">
                  {{ p.name }}
                  <span v-if="p.deceased" class="deceased-chip">เสียชีวิต</span>
                </div>
                <div class="patient-hn-row">
                  <span class="patient-hn">{{ p.hn }}</span>
                  <span class="indication-chip">
                    {{ indicationChipLabel[p.indication] }}
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
                <template v-if="p.drug">
                  <div class="drug-inline">
                    <span class="drug-name">{{ drugDisplayLabel[p.drug] }}</span>
                    <span class="drug-sep">·</span>
                    <span class="drug-dose">{{ p.dose }}</span>
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
                <template v-if="p.concordanceClass !== 'concordance--none'">
                  <span class="concordance-badge" :class="p.concordanceClass">
                    {{ p.concordanceLabel }}
                  </span>
                </template>
                <span v-else class="col-dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination footer -->
      <BmaTablePagination
        :page="page" :pageCount="pageCount" :pageSize="pageSize"
        :filteredTotal="filteredTotal" :total="total" :isFiltered="isFiltered"
        @update:page="page = $event"
        @update:pageSize="pageSize = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PhMagnifyingGlass, PhCalendar, PhX, PhArrowSquareOut, PhWarningCircle,
} from '@phosphor-icons/vue'
import type { NoacListEntry } from '@/data/repository'
import { noacsStatusLabel, drugDisplayLabel, indicationChipLabel } from '@/utils/noac-helpers'
import BmaTablePagination from '@/components/BmaTablePagination.vue'

const props = defineProps<{ rows: NoacListEntry[] }>()
const emit  = defineEmits<{ 'go-to-patient': [id: string] }>()

// ── Filter state ──────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const dateFrom     = ref<Date | null>(null)
const dateTo       = ref<Date | null>(null)
const dateFromMenu = ref(false)
const dateToMenu   = ref(false)
const hospitalFilter = ref('')
const activeSearch   = ref('')
const activeHospital = ref('')
const activeDateFrom = ref<string | null>(null)
const activeDateTo   = ref<string | null>(null)

const hospitalOptions = computed(() =>
  [...new Set(props.rows.map(p => p.hospital))].sort((a, b) => a.localeCompare(b, 'th'))
)

function toISO(d: Date | null): string | null {
  if (!d) return null
  const y   = d.getFullYear()
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mon}-${day}`
}

function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const yr  = String(d.getFullYear() + 543).slice(-2)
  return `${day}/${mon}/${yr}`
}

function applyFilter() {
  activeSearch.value   = searchQuery.value.trim().toLowerCase()
  activeHospital.value = hospitalFilter.value
  activeDateFrom.value = toISO(dateFrom.value)
  activeDateTo.value   = toISO(dateTo.value)
  page.value = 1
}

function clearFilter() {
  searchQuery.value    = ''
  hospitalFilter.value = ''
  dateFrom.value       = null
  dateTo.value         = null
  applyFilter()
}

// Any control set → drives the always-rendered Clear button's enabled state
const hasFilter = computed(() =>
  searchQuery.value !== '' || hospitalFilter.value !== '' || dateFrom.value != null || dateTo.value != null
)
// A filter is actually APPLIED → drives the footer "(filtered from N)"
const isFiltered = computed(() =>
  activeSearch.value !== '' || activeHospital.value !== '' || activeDateFrom.value != null || activeDateTo.value != null
)

const filteredRows = computed(() => {
  let list = props.rows
  if (activeSearch.value) {
    list = list.filter(p => p.name.toLowerCase().includes(activeSearch.value))
  }
  if (activeHospital.value) {
    list = list.filter(p => p.hospital === activeHospital.value)
  }
  if (activeDateFrom.value || activeDateTo.value) {
    list = list.filter(p => {
      const d = p.lastDispensedAt?.substring(0, 10)
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
.filter-input--picker { cursor: pointer; }
.fi-clear-btn {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; padding: 0; cursor: pointer;
  display: flex; align-items: center; color: var(--bma-text-muted);
  transition: color var(--bma-transition-fast);
}
.fi-clear-btn:hover { color: var(--bma-text-secondary); }

.col-drug   { width: 160px; }
.col-crcl   { width: 72px; }
.col-weight { width: 88px; }

.indication-chip { display: inline-block; padding: 2px 8px; border-radius: var(--bma-radius-full); background: var(--bma-green-50); border: 1px solid var(--bma-green-200); color: var(--bma-green-700); font-family: var(--bma-font-data); font-size: 10px; font-weight: 700; white-space: nowrap; }

.lab-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--bma-radius-sm); border: 1px solid var(--bma-border-muted); background: var(--bma-surface-light); font-family: var(--bma-font-data); font-size: 12px; font-weight: 600; color: var(--bma-text-primary); }
.lab-badge--alert { border-color: var(--bma-emergency); background: var(--bma-emergency-bg-soft); color: var(--bma-emergency); }

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
.btn-clear:hover:not(:disabled) { background: var(--bma-neutral-100, #F5F5F5); border-color: var(--bma-border-card); }
.btn-clear:disabled { opacity: 0.4; cursor: default; }
</style>
