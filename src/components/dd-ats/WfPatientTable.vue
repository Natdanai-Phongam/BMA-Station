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
        <PhMagnifyingGlass :size="15" color="var(--bma-text-disabled)" class="fi-icon" />
        <input
          v-model="searchQuery"
          class="filter-input"
          placeholder="ค้นหาชื่อ - นามสกุล"
          @keydown.enter="applyFilter"
        />
      </div>
      <!-- Date from picker -->
      <v-menu v-model="dateFromMenu" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: mp }">
          <div class="filter-date" v-bind="mp">
            <input
              :value="dateFrom ? formatDisplayDate(dateFrom) : ''"
              class="filter-input filter-input--picker"
              placeholder="วันที่เริ่มต้น"
              readonly
            />
            <button v-if="dateFrom" class="fi-clear-btn" @click.stop="dateFrom = null; applyFilter()">
              <PhX :size="13" color="var(--bma-text-muted)" />
            </button>
            <PhCalendar v-else :size="15" color="var(--bma-text-disabled)" class="fi-icon-r" />
          </div>
        </template>
        <v-date-picker
          v-model="dateFrom"
          :max="dateTo ?? undefined"
          @update:model-value="dateFromMenu = false; applyFilter()"
        />
      </v-menu>

      <!-- Date to picker -->
      <v-menu v-model="dateToMenu" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: mp }">
          <div class="filter-date" v-bind="mp">
            <input
              :value="dateTo ? formatDisplayDate(dateTo) : ''"
              class="filter-input filter-input--picker"
              placeholder="วันที่สิ้นสุด"
              readonly
            />
            <button v-if="dateTo" class="fi-clear-btn" @click.stop="dateTo = null; applyFilter()">
              <PhX :size="13" color="var(--bma-text-muted)" />
            </button>
            <PhCalendar v-else :size="15" color="var(--bma-text-disabled)" class="fi-icon-r" />
          </div>
        </template>
        <v-date-picker
          v-model="dateTo"
          :min="dateFrom ?? undefined"
          @update:model-value="dateToMenu = false; applyFilter()"
        />
      </v-menu>
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
                <v-btn icon size="small" variant="text" color="primary" @click="emit('go-to-patient', p.id)" title="ดูรายละเอียด">
                  <PhArrowSquareOut :size="15" />
                </v-btn>
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
                <div class="ttr-display">
                  <span class="ttr-val" :class="`ttr--${p.ttrStatus}`">{{ p.ttrValue }}%</span>
                  <span class="ttr-status-badge" :class="`ttr-badge--${p.ttrStatus}`">{{ ttrStatusLabel[p.ttrStatus] }}</span>
                </div>
              </td>
              <td class="col-dose">
                <div class="dose-display">
                  <span class="dose-val">{{ p.currentDoseMgWk }}</span>
                  <span class="dose-unit">mg/สป.</span>
                </div>
              </td>
              <td class="col-ixn">
                <v-tooltip
                  v-if="p.majorInteractions.length > 0"
                  location="top"
                  :max-width="340"
                  content-class="ixn-tt-overlay"
                >
                  <template #activator="{ props: ttProps }">
                    <span v-bind="ttProps" class="ixn-badge ixn-badge--hoverable">
                      <PhWarning :size="11" />
                      {{ p.majorInteractions.length }}
                    </span>
                  </template>
                  <div class="ixn-tt-header">Drug Interactions · Major</div>
                  <div class="tt-scroll-body">
                    <div
                      v-for="med in p.majorInteractions"
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
  PhMagnifyingGlass, PhCalendar, PhX, PhArrowSquareOut, PhWarning,
} from '@phosphor-icons/vue'
import type { WfListEntry } from '@/data/repository'
import { warfarinStatusLabel, effectLabel, ttrStatusLabel } from '@/utils/warfarin-helpers'
import BmaTablePagination from '@/components/BmaTablePagination.vue'

const props = defineProps<{ rows: WfListEntry[] }>()
const emit  = defineEmits<{ 'go-to-patient': [id: string] }>()

// ── Filter state ──────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const dateFrom     = ref<Date | null>(null)   // v-date-picker model (Date object)
const dateTo       = ref<Date | null>(null)
const dateFromMenu = ref(false)
const dateToMenu   = ref(false)
const activeSearch   = ref('')
const activeDateFrom = ref<string | null>(null)  // ISO string for filter comparison
const activeDateTo   = ref<string | null>(null)

/** Convert Date → ISO YYYY-MM-DD for string comparison in filter */
function toISO(d: Date | null): string | null {
  if (!d) return null
  const y   = d.getFullYear()
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mon}-${day}`
}

/** Display as DD/MM/YY (Buddhist era) per DESIGN.md */
function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const yr  = String(d.getFullYear() + 543).slice(-2)
  return `${day}/${mon}/${yr}`
}

function applyFilter() {
  activeSearch.value   = searchQuery.value.trim().toLowerCase()
  activeDateFrom.value = toISO(dateFrom.value)
  activeDateTo.value   = toISO(dateTo.value)
  page.value = 1
}

function clearFilter() {
  searchQuery.value = ''
  dateFrom.value    = null
  dateTo.value      = null
  applyFilter()
}

const isFiltered = computed(() =>
  activeSearch.value !== '' || dateFrom.value != null || dateTo.value != null
)

const filteredRows = computed(() => {
  let list = props.rows
  if (activeSearch.value) {
    list = list.filter(p => p.name.toLowerCase().includes(activeSearch.value))
  }
  if (activeDateFrom.value || activeDateTo.value) {
    list = list.filter(p => {
      const d = p.inrDate
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

/* Readonly picker activator — same visual as filter-input */
.filter-input--picker { cursor: pointer; }

/* Clear button inside filter-date */
.fi-clear-btn {
  position:   absolute;
  right:      10px;
  top:        50%;
  transform:  translateY(-50%);
  background: none;
  border:     none;
  padding:    0;
  cursor:     pointer;
  display:    flex;
  align-items: center;
  color:      var(--bma-text-muted);
  transition: color var(--bma-transition-fast);
}
.fi-clear-btn:hover { color: var(--bma-text-secondary); }

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
