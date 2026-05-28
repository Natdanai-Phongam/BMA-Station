<template>
  <Teleport to="body">

    <!-- Backdrop -->
    <Transition name="dsm-bg">
      <div v-if="show" class="dsm-backdrop" @click.self="$emit('close')" />
    </Transition>

    <!-- Modal -->
    <Transition name="dsm-rise">
      <div v-if="show" class="dsm-wrap">
        <div
          class="dsm-modal"
          role="dialog"
          aria-modal="true"
          aria-label="ปรับขนาดยารายวัน"
        >

          <!-- ── Header ──────────────────────────────────────── -->
          <div class="dsm-header">
            <div class="dsm-header-left">
              <span class="dsm-title">ปรับขนาดยารายวัน</span>
              <div class="dsm-target-chip">
                <span class="dsm-target-num">{{ targetMgWk.toFixed(1) }}</span>
                <span class="dsm-target-unit"> mg/wk</span>
              </div>
            </div>
            <button class="dsm-close-btn" @click="$emit('close')">
              <PhX :size="15" />
            </button>
          </div>

          <!-- ── Day grid ────────────────────────────────────── -->
          <div class="dsm-grid-wrap">
            <button
              v-for="day in DAY_KEYS"
              :key="day"
              class="dsm-cell"
              :class="[
                focusedDay === day        ? 'dsm-cell--focused' : '',
                isEdited(day)             ? 'dsm-cell--edited'  : '',
                editDays[day].tablets === 0 ? 'dsm-cell--zero'   : '',
              ]"
              @click="focusedDay = day"
            >
              <span class="dsm-cell-day">{{ DAY_SHORT[day] }}</span>

              <!-- Normal day: pill dots + count + mg -->
              <template v-if="editDays[day].tablets > 0">
                <div class="dsm-cell-pills">
                  <div
                    v-for="n in Math.floor(editDays[day].tablets)"
                    :key="`f${n}`"
                    class="dsm-cpill dsm-cpill--full"
                    :class="`dsm-dot--${PILL_CONFIG[editDays[day].pillMg].color}`"
                  />
                  <div
                    v-if="editDays[day].tablets % 1 !== 0"
                    class="dsm-cpill dsm-cpill--half"
                    :class="`dsm-dot--${PILL_CONFIG[editDays[day].pillMg].color}`"
                  />
                </div>
                <span class="dsm-cell-tabs">{{ editDays[day].tablets }}</span>
                <span class="dsm-cell-mg">{{ editDays[day].mg.toFixed(1) }} mg</span>
              </template>

              <!-- Zero day: skip label -->
              <template v-else>
                <span class="dsm-cell-skip">งด</span>
              </template>
            </button>
          </div>

          <!-- ── Edit panel ──────────────────────────────────── -->
          <div class="dsm-edit-zone">
            <Transition name="dsm-panel">
              <div v-if="focusedDay" class="dsm-edit-panel">

                <span class="dsm-edit-day-lbl">วัน{{ DAY_LABELS[focusedDay] }}</span>

                <!-- Pill type — locked out when day is skipped -->
                <div
                  class="dsm-edit-row"
                  :class="editDays[focusedDay].tablets === 0 ? 'dsm-row--skip' : ''"
                >
                  <span class="dsm-field-lbl">เม็ดยา</span>
                  <div class="dsm-pill-group">
                    <button
                      v-for="pill in activePillsSorted"
                      :key="pill"
                      class="dsm-pill-btn"
                      :class="[
                        `dsm-pill-btn--${PILL_CONFIG[pill].color}`,
                        editDays[focusedDay].pillMg === pill ? 'dsm-pill-btn--active' : '',
                      ]"
                      :disabled="editDays[focusedDay].tablets === 0"
                      @click="setPillType(focusedDay, pill)"
                    >
                      <span class="dsm-pill-dot" :class="`dsm-dot--${PILL_CONFIG[pill].color}`" />
                      {{ pill }} mg
                    </button>
                  </div>
                </div>

                <!-- Tablet stepper — min is 0 (allow skip) -->
                <div class="dsm-edit-row">
                  <span class="dsm-field-lbl">จำนวน</span>
                  <div class="dsm-stepper">
                    <button
                      class="dsm-step-btn"
                      :disabled="editDays[focusedDay].tablets <= 0"
                      @click="step(focusedDay, -0.5)"
                    >
                      <PhMinus :size="12" />
                    </button>
                    <span class="dsm-step-display">
                      <span
                        class="dsm-step-num"
                        :class="editDays[focusedDay].tablets === 0 ? 'dsm-step-num--zero' : ''"
                      >
                        {{ editDays[focusedDay].tablets }}
                      </span>
                      <span v-if="editDays[focusedDay].tablets > 0" class="dsm-step-unit"> เม็ด</span>
                    </span>
                    <button
                      class="dsm-step-btn"
                      :disabled="editDays[focusedDay].tablets >= 4"
                      @click="step(focusedDay, +0.5)"
                    >
                      <PhPlus :size="12" />
                    </button>
                  </div>
                  <!-- Result: show "งดยาวันนี้" when 0, mg otherwise -->
                  <span
                    class="dsm-step-result"
                    :class="editDays[focusedDay].tablets === 0 ? 'dsm-step-result--skip' : ''"
                  >
                    {{
                      editDays[focusedDay].tablets === 0
                        ? 'งดยาวันนี้'
                        : `= ${editDays[focusedDay].mg.toFixed(1)} mg`
                    }}
                  </span>
                </div>

              </div>
            </Transition>
          </div>

          <!-- ── Footer ─────────────────────────────────────── -->
          <div class="dsm-footer">
            <div class="dsm-total" :class="isMatched ? 'dsm-total--ok' : 'dsm-total--off'">
              <span class="dsm-total-lbl">รวม</span>
              <span class="dsm-total-now">{{ currentTotal.toFixed(1) }}</span>
              <span class="dsm-total-sep">/</span>
              <span class="dsm-total-goal">
                {{ targetMgWk.toFixed(1) }}<span class="dsm-total-unit"> mg/wk</span>
              </span>
              <Transition name="dsm-fadein">
                <span v-if="!isMatched" class="dsm-total-diff">
                  {{ currentTotal > targetMgWk ? '+' : '' }}{{ (currentTotal - targetMgWk).toFixed(1) }}
                </span>
              </Transition>
            </div>
            <div class="dsm-footer-actions">
              <button class="dsm-btn-reset" @click="init">รีเซ็ต</button>
              <button
                class="dsm-btn-confirm"
                :disabled="!isMatched"
                @click="doConfirm"
              >
                ยืนยันตาราง
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>

  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhX, PhMinus, PhPlus } from '@phosphor-icons/vue'
import type { WeeklySchedule, DayKey, DailyDose, PillStrengthMg } from '@/data/types/warfarin'
import { DAY_KEYS, DAY_LABELS, PILL_CONFIG } from '@/data/types/warfarin'

const DAY_SHORT: Record<DayKey, string> = {
  mon: 'จ', tue: 'อ', wed: 'พ', thu: 'พฤ', fri: 'ศ', sat: 'ส', sun: 'อา',
}

const props = defineProps<{
  show:        boolean
  schedule:    WeeklySchedule
  activePills: PillStrengthMg[]
  targetMgWk:  number
}>()

const emit = defineEmits<{
  close:   []
  confirm: [schedule: WeeklySchedule]
}>()

// Sorted descending — largest pill first (consistent with system convention)
const activePillsSorted = computed<PillStrengthMg[]>(() =>
  [...props.activePills].sort((a, b) => b - a) as PillStrengthMg[]
)

const editDays   = ref<Record<DayKey, DailyDose>>({} as Record<DayKey, DailyDose>)
const focusedDay = ref<DayKey | null>(null)

// Populate editable copy from the incoming schedule whenever the modal opens
function init() {
  const copy = {} as Record<DayKey, DailyDose>
  for (const day of DAY_KEYS) {
    copy[day] = { ...props.schedule.days[day] }
  }
  editDays.value   = copy
  focusedDay.value = 'mon'
}

watch(() => props.show, (v) => { if (v) init() })

// ── Day operations ────────────────────────────────────────────────
// Min is 0 — doctors can skip a day entirely (e.g. warfarin holiday)
function step(day: DayKey, delta: number) {
  const d    = editDays.value[day]
  const tabs = parseFloat((Math.max(0, Math.min(4, d.tablets + delta))).toFixed(1))
  editDays.value[day] = {
    tablets: tabs,
    mg:      parseFloat((tabs * d.pillMg).toFixed(1)),
    pillMg:  d.pillMg,   // preserve pill type even on zero — may return to non-zero
  }
}

function setPillType(day: DayKey, pillMg: PillStrengthMg) {
  const tabs = editDays.value[day].tablets
  editDays.value[day] = {
    tablets: tabs,
    mg:      parseFloat((tabs * pillMg).toFixed(1)),
    pillMg,
  }
}

function isEdited(day: DayKey): boolean {
  if (!editDays.value[day] || !props.schedule.days[day]) return false
  const o = props.schedule.days[day]
  const c = editDays.value[day]
  return o.tablets !== c.tablets || o.pillMg !== c.pillMg
}

// ── Totals ────────────────────────────────────────────────────────
const currentTotal = computed<number>(() => {
  if (!DAY_KEYS.every(d => editDays.value[d])) return 0
  return parseFloat(
    DAY_KEYS.reduce((s, d) => s + editDays.value[d].mg, 0).toFixed(1)
  )
})

const isMatched = computed(() => Math.abs(currentTotal.value - props.targetMgWk) < 0.005)

// ── Confirm ───────────────────────────────────────────────────────
function doConfirm() {
  if (!isMatched.value) return
  // Only count pill sizes assigned to days that actually have a dose
  const usedPills = [...new Set(
    DAY_KEYS.filter(d => editDays.value[d].tablets > 0)
             .map(d => editDays.value[d].pillMg),
  )].sort((a, b) => b - a) as PillStrengthMg[]

  if (usedPills.length === 0) return  // guard: can't happen when isMatched + targetMgWk > 0

  emit('confirm', {
    totalMgWk:      currentTotal.value,
    pillStrengthMg: usedPills[0],   // largest used — primary for display
    activePillsMg:  usedPills,
    days:           { ...editDays.value },
    isManual:       true,
  })
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────── */
.dsm-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0, 0, 0, .42);
}

/* ── Centering wrapper ────────────────────────────────────── */
.dsm-wrap {
  position: fixed; inset: 0; z-index: 1201;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  pointer-events: none;
}

/* ── Modal box ────────────────────────────────────────────── */
.dsm-modal {
  pointer-events: auto;
  width: 100%; max-width: 640px;
  background: var(--bma-surface);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .22);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────── */
.dsm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--bma-border-subtle);
  flex-shrink: 0;
}
.dsm-header-left { display: flex; align-items: center; gap: 10px; }
.dsm-title {
  font-family: var(--bma-font-thai); font-size: 14px; font-weight: 800;
  color: var(--bma-text-primary);
}
.dsm-target-chip {
  display: inline-flex; align-items: baseline;
  padding: 2px 9px; border-radius: 99px;
  background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card);
}
.dsm-target-num {
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 800;
  color: var(--bma-text-primary);
}
.dsm-target-unit {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 500;
  color: var(--bma-text-muted);
}
.dsm-close-btn {
  width: 28px; height: 28px; border-radius: 7px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s; color: var(--bma-text-muted);
  flex-shrink: 0;
}
.dsm-close-btn:hover { background: var(--bma-surface-subtle); }

/* ── Day grid ─────────────────────────────────────────────── */
.dsm-grid-wrap {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 6px; padding: 16px 20px;
  flex-shrink: 0;
}
.dsm-cell {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 10px 4px;
  border-radius: 9px; cursor: pointer;
  border: 1.5px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
  transition: border-color .15s, background .15s;
}
.dsm-cell:hover:not(.dsm-cell--focused) {
  border-color: var(--bma-green-500); background: var(--bma-green-50);
}
.dsm-cell--focused {
  border: 2px solid var(--bma-green-500); background: var(--bma-green-50);
}

/* Zero day: dashed border, subdued look */
.dsm-cell--zero {
  border-style: dashed;
  background: var(--bma-surface);
}
.dsm-cell--zero:hover:not(.dsm-cell--focused) {
  border-color: var(--bma-text-muted); background: var(--bma-surface-subtle);
}
.dsm-cell--zero.dsm-cell--focused {
  border-style: solid;
}

/* Amber edited-indicator dot (top-right) */
.dsm-cell--edited::after {
  content: ''; position: absolute; top: 4px; right: 4px;
  width: 5px; height: 5px; border-radius: 50%;
  background: oklch(72% 0.15 45);
}

.dsm-cell-day {
  font-family: var(--bma-font-thai); font-size: 11px; font-weight: 700;
  color: var(--bma-text-muted); line-height: 1;
}
.dsm-cell--focused .dsm-cell-day { color: var(--bma-green-500); }
.dsm-cell--zero .dsm-cell-day    { color: var(--bma-text-disabled); }

/* Pill dots grid — mirrors dwr-day-pills logic in the drawer */
.dsm-cell-pills {
  display: flex; gap: 1px; align-items: center; justify-content: center;
  flex-wrap: wrap; min-height: 9px;
}
.dsm-cpill {
  flex-shrink: 0;
  box-shadow: inset 0 -1px 3px rgba(0, 0, 0, .20), inset 0 1px 2px rgba(255, 255, 255, .35);
}
.dsm-cpill--full { width: 9px;  height: 9px; border-radius: 50%; }
.dsm-cpill--half { width: 5px;  height: 9px; border-radius: 5px 0 0 5px; }
.dsm-cell-tabs {
  font-family: var(--bma-font-data); font-size: 17px; font-weight: 900;
  color: var(--bma-text-primary); line-height: 1;
}
.dsm-cell--focused .dsm-cell-tabs { color: var(--bma-green-500); }
.dsm-cell-mg {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 600;
  color: var(--bma-text-muted); line-height: 1;
}

/* "งด" label for zero-dose days */
.dsm-cell-skip {
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 700;
  color: var(--bma-text-disabled);
  /* visually centers in the space dot+number+mg would normally occupy */
  margin: 4px 0 6px;
}
.dsm-cell--focused .dsm-cell-skip { color: var(--bma-text-muted); }

/* Pill dot colors — mirrors wf-pill tokens */
.dsm-dot--orange { background: var(--wf-pill-orange); }
.dsm-dot--blue   { background: var(--wf-pill-blue); }
.dsm-dot--pink   { background: var(--wf-pill-pink); }

/* ── Edit zone (reserved height prevents footer jump) ─────── */
.dsm-edit-zone {
  min-height: 120px;
  padding: 0 20px 10px;
  flex-shrink: 0;
}
.dsm-edit-panel {
  padding: 12px 14px; border-radius: 9px;
  background: var(--bma-surface-light); border: 1px solid var(--bma-border-card);
  display: flex; flex-direction: column; gap: 10px;
}
.dsm-edit-day-lbl {
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 800;
  color: var(--bma-text-primary);
}
.dsm-edit-row { display: flex; align-items: center; gap: 12px; }
.dsm-field-lbl {
  font-family: var(--bma-font-thai); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .05em;
  white-space: nowrap; flex-shrink: 0; width: 38px;
}

/* Skip state: pill row dims when 0 tablets, pointer-events off */
.dsm-row--skip {
  opacity: 0.35;
  pointer-events: none;
}

/* ── Pill type group ──────────────────────────────────────── */
.dsm-pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
.dsm-pill-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 7px;
  border: 1.5px solid var(--bma-border-card); background: var(--bma-surface);
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 700;
  color: var(--bma-text-secondary); cursor: pointer; transition: all .12s;
}
.dsm-pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dsm-pill-btn:not(.dsm-pill-btn--active):not(:disabled):hover {
  border-color: var(--bma-text-muted); background: var(--bma-surface-subtle);
}
.dsm-pill-btn--orange.dsm-pill-btn--active { border-color: var(--wf-pill-orange); background: #FFF3E0; color: #E65100; }
.dsm-pill-btn--blue.dsm-pill-btn--active   { border-color: var(--wf-pill-blue);   background: #E3F2FD; color: #1565C0; }
.dsm-pill-btn--pink.dsm-pill-btn--active   { border-color: var(--wf-pill-pink);   background: #FCE4EC; color: #AD1457; }

/* ── Stepper ──────────────────────────────────────────────── */
.dsm-stepper { display: flex; align-items: center; gap: 8px; }
.dsm-step-btn {
  width: 30px; height: 30px; border-radius: 7px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .12s; color: var(--bma-text-primary);
  flex-shrink: 0;
}
.dsm-step-btn:hover:not(:disabled) { border-color: var(--bma-green-500); color: var(--bma-green-500); }
.dsm-step-btn:disabled {
  border-color: var(--bma-border-subtle); color: var(--bma-text-disabled); cursor: not-allowed;
}
.dsm-step-display { min-width: 72px; text-align: center; }
.dsm-step-num {
  font-family: var(--bma-font-data); font-size: 19px; font-weight: 900;
  color: var(--bma-text-primary);
}
.dsm-step-num--zero { color: var(--bma-text-disabled); }
.dsm-step-unit {
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-muted);
}
.dsm-step-result {
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 700;
  color: var(--bma-green-500); white-space: nowrap; margin-left: 2px;
}
/* Skip result: Thai text, muted color */
.dsm-step-result--skip {
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-muted);
}

/* ── Footer ───────────────────────────────────────────────── */
.dsm-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--bma-border-subtle);
  gap: 12px; flex-shrink: 0; flex-wrap: wrap;
}
.dsm-total { display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; }
.dsm-total-lbl {
  font-family: var(--bma-font-thai); font-size: 11px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .04em;
  margin-right: 3px;
}
.dsm-total-now {
  font-family: var(--bma-font-data); font-size: 18px; font-weight: 900; line-height: 1;
}
.dsm-total-sep { font-family: var(--bma-font-data); font-size: 13px; color: var(--bma-text-disabled); }
.dsm-total-goal {
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 700;
  color: var(--bma-text-muted);
}
.dsm-total-unit { font-size: 10px; font-weight: 500; }
.dsm-total-diff {
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  padding: 1px 6px; border-radius: 99px;
}

/* Total states */
.dsm-total--ok  .dsm-total-now  { color: var(--bma-success-text); }
.dsm-total--off .dsm-total-now  { color: oklch(46% 0.13 45); }
.dsm-total--off .dsm-total-diff { color: oklch(46% 0.13 45); background: oklch(96% 0.04 50); }

.dsm-footer-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.dsm-btn-reset {
  height: 38px; padding: 0 16px; border-radius: 8px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-secondary); cursor: pointer; transition: all .15s;
}
.dsm-btn-reset:hover { border-color: var(--bma-text-muted); color: var(--bma-text-primary); }

.dsm-btn-confirm {
  height: 38px; padding: 0 20px; border-radius: 8px;
  border: none; background: #1A1A1A;
  font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700;
  color: #fff; cursor: pointer; transition: background .15s;
}
.dsm-btn-confirm:hover:not(:disabled) { background: #333; }
.dsm-btn-confirm:disabled {
  background: var(--bma-border-card); color: var(--bma-text-disabled); cursor: not-allowed;
}

/* ── Transitions ──────────────────────────────────────────── */
.dsm-bg-enter-active, .dsm-bg-leave-active   { transition: opacity .2s ease; }
.dsm-bg-enter-from,   .dsm-bg-leave-to       { opacity: 0; }

.dsm-rise-enter-active, .dsm-rise-leave-active { transition: opacity .2s ease; }
.dsm-rise-enter-from,   .dsm-rise-leave-to     { opacity: 0; }

.dsm-panel-enter-active { transition: all .18s ease-out; }
.dsm-panel-leave-active { transition: all .12s ease; }
.dsm-panel-enter-from,  .dsm-panel-leave-to { opacity: 0; transform: translateY(-3px); }

.dsm-fadein-enter-active, .dsm-fadein-leave-active { transition: opacity .15s ease; }
.dsm-fadein-enter-from,   .dsm-fadein-leave-to     { opacity: 0; }
</style>
