<template>
  <!-- Overlay -->
  <Transition name="dwr-overlay">
    <div v-if="isOpen" class="dwr-overlay" :class="`dwr-overlay--${headerInrStatus}`" @click="emit('close')" />
  </Transition>

  <!-- Panel -->
  <Transition name="dwr-slide">
    <div v-if="isOpen" class="dwr-panel">

      <!-- Toast -->
      <Transition name="dwr-toast-anim">
        <div v-if="toast.show" class="dwr-toast" :class="`dwr-toast--${toast.type}`">
          <PhCheckCircle v-if="toast.type === 'success'" :size="14" />
          <PhWarning v-else :size="14" />
          {{ toast.message }}
        </div>
      </Transition>

      <!-- Header -->
      <div class="dwr-header">
        <div class="dwr-header-top">
          <button class="dwr-close-btn" @click="emit('close')">
            <PhX :size="16" color="var(--bma-text-tertiary)" />
          </button>
          <div class="dwr-title-wrap">
            <span class="dwr-title">{{ drawerTitle }}</span>
          </div>
        </div>
        <div class="dwr-ctx">
          <div class="dwr-ctx-group">
            <span class="dwr-ctx-label">HN</span>
            <span class="dwr-ctx-hn">{{ hn ?? patientId }}</span>
          </div>
          <div class="dwr-ctx-div" />
          <div class="dwr-ctx-group">
            <span class="dwr-ctx-label">INR</span>
            <span class="dwr-ctx-inr" :class="`dwr-ctx-inr--${headerInrStatus}`">
              {{ props.data.latestInr.inrValue.toFixed(1) }} {{ headerInrLabel }}
            </span>
          </div>
          <div class="dwr-ctx-div" />
          <div class="dwr-ctx-group">
            <span class="dwr-ctx-label">DOSE</span>
            <span class="dwr-ctx-dose">{{ props.data.profile.currentDoseMgWk.toFixed(1) }}<span class="dwr-ctx-unit"> mg/wk</span></span>
          </div>
          <div class="dwr-ctx-div" />
          <div class="dwr-ctx-group">
            <span class="dwr-ctx-label">TTR</span>
            <span class="dwr-ctx-ttr">{{ props.data.ttr.value.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="dwr-body">

        <!-- Concurrent Meds strip -->
        <div v-if="props.data.profile.concurrentMeds?.length" class="dwr-meds-strip">
          <div class="dwr-meds-header">
            <PhPill :size="12" color="var(--bma-text-tertiary)" />
            <span class="dwr-meds-title">ยาที่ใช้ร่วม</span>
          </div>
          <div class="dwr-meds-list">
            <div
              v-for="med in props.data.profile.concurrentMeds"
              :key="med.name"
              class="dwr-med-tag"
              :class="`dwr-med-tag--${med.severity ?? 'minor'}`"
            >
              <span class="dwr-med-name">{{ med.name }}</span>
              <span
                v-if="med.effect !== 'none'"
                class="dwr-med-effect"
                :class="`dwr-med-effect--${med.effect}`"
              >{{ med.effect === 'increase' ? '↑' : '↓' }}</span>
            </div>
          </div>
        </div>

        <!-- ① INR -->
        <div class="dwr-step">
          <div class="dwr-step-hd">
            <span class="dwr-step-num">1</span>
            <span class="dwr-step-title">ตรวจสอบค่า INR</span>
            <span class="dwr-inr-date">บันทึก {{ formatDate(props.data.latestInr.measuredAt.slice(0, 10)) }}</span>
          </div>
          <div class="dwr-inr-section">
            <!-- Input row: locked -->
            <div v-if="!inrEditMode" class="dwr-inr-input-row">
              <div class="dwr-inr-locked" :class="`dwr-inr-locked--${pendingStatus}`">
                {{ inrInput.toFixed(1) }}
              </div>
              <button class="dwr-btn-edit-inr" @click="enterEditMode">
                <PhPencilSimple :size="11" />
                <span>แก้ไข</span>
              </button>
            </div>

            <!-- Input row: edit -->
            <div v-else class="dwr-inr-input-row">
              <input
                ref="inrInputRef"
                v-model.number="inrInput"
                type="number"
                step="0.1"
                min="0.1"
                max="15"
                class="dwr-inr-input"
                :class="`dwr-inr-input--${pendingStatus}`"
                @keydown.enter.prevent="confirmInr"
                @keydown.escape="cancelEditMode"
              />
              <button class="dwr-btn-confirm-inr" @click="confirmInr">
                <PhCheck :size="11" />
                <span>ยืนยัน</span>
              </button>
              <button class="dwr-btn-cancel-inr" @click="cancelEditMode">
                <PhX :size="11" />
                <span>ยกเลิก</span>
              </button>
            </div>

            <!-- Status badge — below the row; live-updates in edit mode -->
            <span class="dwr-inr-badge" :class="`dwr-inr-badge--${pendingStatus}`">
              {{ inrStatusLabel(pendingStatus) }}
            </span>

            <!-- Override note — shows whenever a manual value is active (edit or confirmed) -->
            <div v-if="confirmedInr !== props.data.latestInr.inrValue" class="dwr-inr-override-note">
              <PhWarning :size="11" color="currentColor" />
              <span>ค่าจากระบบ: {{ props.data.latestInr.inrValue.toFixed(1) }} · กำลังใช้ค่า Manual</span>
            </div>
          </div>
        </div>

        <!-- ② Suggestion -->
        <div class="dwr-step">
          <div class="dwr-step-hd">
            <span class="dwr-step-num">2</span>
            <span class="dwr-step-title">คำแนะนำและเลือกการปรับยา</span>
          </div>

          <Transition name="dwr-fade">
            <div v-if="inrDirty" class="dwr-banner dwr-banner--stale">
              <PhWarning :size="13" color="currentColor" />
              <span>ค่า INR ยังไม่ยืนยัน · คำแนะนำอ้างอิง INR {{ confirmedInr.toFixed(1) }} (ค่าเดิม)</span>
            </div>
          </Transition>

          <Transition name="dwr-slide-content">

            <div v-if="suggestion.trigger === 'emergency'" key="emergency" class="dwr-hold-box dwr-hold--emergency">
              <div class="dwr-hold-hd">
                <PhWarning :size="14" color="#fff" />
                <span class="dwr-hold-title">EMERGENCY — INR {{ confirmedInr.toFixed(1) }}</span>
              </div>
              <div class="dwr-hold-body">
                <div class="dwr-vk-row">
                  <span class="dwr-vk-lbl">Vitamin K:</span>
                  <span class="dwr-vk-val">{{ suggestion.vitaminK }}</span>
                </div>
                <ul class="dwr-next-steps">
                  <li v-for="s in suggestion.nextSteps" :key="s">{{ s }}</li>
                </ul>
              </div>
            </div>

            <div v-else-if="suggestion.trigger === 'critical'" key="critical" class="dwr-hold-box dwr-hold--critical">
              <div class="dwr-hold-hd">
                <PhWarning :size="14" color="var(--bma-emergency)" />
                <span class="dwr-hold-title">CRITICAL HOLD — INR {{ confirmedInr.toFixed(1) }}</span>
              </div>
              <div class="dwr-hold-body">
                <div class="dwr-vk-row">
                  <span class="dwr-vk-lbl">Vitamin K:</span>
                  <span class="dwr-vk-val">{{ suggestion.vitaminK }}</span>
                </div>
                <ul class="dwr-next-steps">
                  <li v-for="s in suggestion.nextSteps" :key="s">{{ s }}</li>
                </ul>
              </div>
            </div>

            <div v-else-if="suggestion.trigger === 'very-high'" key="very-high" class="dwr-hold-box dwr-hold--very-high">
              <div class="dwr-hold-hd">
                <PhWarning :size="14" color="var(--inr-supra-text)" />
                <span class="dwr-hold-title">HOLD 1 DOSE — INR {{ confirmedInr.toFixed(1) }}</span>
              </div>
              <div class="dwr-hold-body">
                <ul class="dwr-next-steps">
                  <li v-for="s in suggestion.nextSteps" :key="s">{{ s }}</li>
                </ul>
              </div>
            </div>

            <div v-else-if="suggestion.trigger === 'therapeutic'" key="therapeutic" class="dwr-banner dwr-banner--ok">
              <PhCheckCircle :size="13" color="currentColor" />
              <span>INR อยู่ในช่วงเป้าหมาย ({{ (props.data.profile.targetRange ?? DEFAULT_TARGET_RANGE).min }}–{{ (props.data.profile.targetRange ?? DEFAULT_TARGET_RANGE).max }}) · คงขนาดยาเดิม</span>
            </div>

            <div v-else key="adjust" class="dwr-adjust">
              <div class="dwr-current-ref">
                <span class="dwr-current-ref-label">ปรับจาก</span>
                <span class="dwr-current-ref-val">
                  {{ props.data.profile.currentDoseMgWk.toFixed(1) }}<span class="dwr-current-ref-unit"> mg/wk</span>
                </span>
                <span class="dwr-current-ref-pill">{{ PILL_CONFIG[props.data.profile.pillStrengthMg].label }}</span>
              </div>
              <div class="dwr-banner" :class="`dwr-banner--advisory-${suggestion.trigger}`">
                <PhWarning :size="13" color="currentColor" />
                <span>{{ suggestion.message }}</span>
              </div>
              <div class="dwr-opt-cards">
                <!-- System option cards -->
                <div
                  v-for="opt in suggestion.options"
                  :key="`${opt.percentChange}-${opt.newDoseMgWk}`"
                  class="dwr-opt-card"
                  :class="[
                    opt.holdNote ? 'dwr-opt-card--hold' : '',
                    !isCustomSelection && selectedOption?.newDoseMgWk === opt.newDoseMgWk && selectedOption?.holdNote === opt.holdNote ? 'dwr-opt-card--selected' : ''
                  ]"
                  tabindex="0"
                  role="radio"
                  :aria-checked="!isCustomSelection && selectedOption?.newDoseMgWk === opt.newDoseMgWk && selectedOption?.holdNote === opt.holdNote"
                  @click="selectOption(opt)"
                  @keydown.enter="selectOption(opt)"
                  @keydown.space.prevent="selectOption(opt)"
                >
                  <span class="dwr-opt-check" aria-hidden="true">
                    <PhCheck :size="10" />
                  </span>
                  <template v-if="!opt.holdNote">
                    <div class="dwr-opt-dose">
                      {{ opt.newDoseMgWk.toFixed(1) }}<span class="dwr-opt-dose-unit"> mg/wk</span>
                    </div>
                    <div class="dwr-opt-pct" :class="opt.percentChange > 0 ? 'dwr-pct--up' : 'dwr-pct--down'">
                      {{ opt.percentChange >= 0 ? '+' : '' }}{{ opt.percentChange }}%
                    </div>
                    <div class="dwr-opt-tabs">{{ opt.tabletsPerWeek }} Tabs/wk</div>
                  </template>
                  <template v-else>
                    <div class="dwr-opt-hold-label">{{ opt.label }}</div>
                    <div class="dwr-opt-hold-sub">{{ opt.holdNote }}</div>
                  </template>
                </div>

                <!-- Custom card (always last) -->
                <div
                  class="dwr-opt-card dwr-opt-card--custom"
                  :class="[
                    customCardOpen || isCustomSelection ? 'dwr-opt-card--selected' : '',
                    customCardOpen || isCustomSelection ? 'dwr-opt-card--custom-open' : ''
                  ]"
                  @click="!customCardOpen && !isCustomSelection ? openCustomCard() : undefined"
                >
                  <span class="dwr-opt-check" aria-hidden="true">
                    <PhCheck :size="10" />
                  </span>
                  <template v-if="!customCardOpen && !isCustomSelection">
                    <div class="dwr-opt-custom-placeholder">
                      <PhPencilSimple :size="13" color="currentColor" weight="bold" />
                      <span>กำหนดเอง</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="dwr-opt-custom-title">กำหนดเอง</div>
                    <div class="dwr-opt-custom-input-row">
                      <div class="dwr-input-with-unit">
                        <input
                          ref="customInputRef"
                          v-model.number="customDoseInput"
                          type="number" step="0.5" min="0.5"
                          class="dwr-custom-input"
                          :class="isCustomSelection ? 'dwr-custom-input--selected' : ''"
                          placeholder="0.0"
                          @keydown.enter="selectCustomDose"
                          @click.stop
                        />
                        <span class="dwr-custom-unit-inside">mg/wk</span>
                      </div>
                      <button
                        class="dwr-btn-custom"
                        :disabled="!customDoseInput || customDoseInput <= 0"
                        @click.stop="selectCustomDose"
                      >ยืนยัน</button>
                    </div>
                    <div v-if="customDoseError" class="dwr-custom-error">
                      <PhWarning :size="10" color="currentColor" />
                      {{ customDoseError }}
                    </div>
                    <!-- Round-down / Round-up suggestions -->
                    <Transition name="dwr-fade">
                      <div v-if="hasSuggestions" class="dwr-custom-suggestions">
                        <span class="dwr-custom-sugg-lbl">ลงตัวกับเม็ดยา</span>
                        <div class="dwr-custom-sugg-chips">
                          <button
                            v-if="nearbySuggestions[0] !== null"
                            class="dwr-custom-sugg-chip dwr-custom-sugg-chip--down"
                            @click.stop="applySuggestion(nearbySuggestions[0]!)"
                          >
                            ↓ {{ nearbySuggestions[0]!.toFixed(1) }} mg
                          </button>
                          <button
                            v-if="nearbySuggestions[1] !== null"
                            class="dwr-custom-sugg-chip dwr-custom-sugg-chip--up"
                            @click.stop="applySuggestion(nearbySuggestions[1]!)"
                          >
                            ↑ {{ nearbySuggestions[1]!.toFixed(1) }} mg
                          </button>
                        </div>
                      </div>
                    </Transition>
                  </template>
                </div>
              </div>
            </div>

          </Transition>
        </div>

        <!-- Pill selector — between dose selection and schedule preview -->
        <div class="dwr-pill-selector" :class="activePillsLocal.length === 0 ? 'dwr-pill-selector--empty' : ''">
          <div class="dwr-pill-selector-hd">
            <PhPill :size="13" color="var(--bma-text-tertiary)" />
            <span class="dwr-pill-selector-title">ขนาดเม็ดยาที่ใช้ในสัปดาห์นี้</span>
            <span v-if="activePillsLocal.length === 0" class="dwr-pill-selector-required">
              กรุณาเลือก
            </span>
          </div>
          <div class="dwr-pill-chips">
            <button
              v-for="pill in (Object.keys(PILL_CONFIG).map(Number) as PillStrengthMg[])"
              :key="pill"
              class="dwr-pill-chip"
              :class="[
                `dwr-pill-chip--${PILL_CONFIG[pill].color}`,
                activePillsLocal.includes(pill) ? 'dwr-pill-chip--active' : ''
              ]"
              @click="togglePill(pill)"
            >
              <span class="dwr-pill-chip-dot" :class="`dwr-chip-dot--${PILL_CONFIG[pill].color}`" />
              <span class="dwr-pill-chip-label">{{ pill }} mg</span>
              <PhCheck v-if="activePillsLocal.includes(pill)" class="dwr-pill-chip-check" :size="10" />
            </button>
          </div>
        </div>

        <!-- ③ Confirm + Save -->
        <div ref="step3Ref" class="dwr-step">
          <div class="dwr-step-hd">
            <span class="dwr-step-num">3</span>
            <span class="dwr-step-title">ยืนยันและบันทึก</span>
          </div>

          <Transition name="dwr-fade">
            <div v-if="selectedOption" key="has-sel" class="dwr-confirm-summary">

              <!-- Hold note strip — คงขนาดยาเดิม -->
              <div v-if="selectedOption.holdNote" class="dwr-hold-note dwr-hold-note--chosen">
                <PhInfo :size="13" color="var(--bma-text-tertiary)" />
                <span>{{ selectedOption.label }} · {{ selectedOption.holdNote }}</span>
              </div>

              <!-- Dose change row — non-hold options only -->
              <div v-else class="dwr-confirm-dose-row">
                <span class="dwr-old-dose">{{ props.data.profile.currentDoseMgWk.toFixed(1) }} mg/wk</span>
                <span class="dwr-arrow">→</span>
                <span class="dwr-new-dose">{{ selectedOption.newDoseMgWk.toFixed(1) }} mg/wk</span>
                <span
                  class="dwr-pct-badge"
                  :class="selectedOption.percentChange > 0 ? 'dwr-pct-up' : 'dwr-pct-down'"
                >
                  {{ selectedOption.percentChange > 0 ? '+' : '' }}{{ selectedOption.percentChange.toFixed(1) }}%
                </span>
                <span v-if="activePillsLocal.length > 0" class="dwr-admin-method">{{ adminMethod }}</span>
              </div>

              <!-- Week table + daily bar: ALL option types, when pills are selected -->
              <template v-if="activePillsLocal.length > 0">
                <div class="dwr-week-row">
                  <div
                    v-for="day in DAY_KEYS"
                    :key="day"
                    class="dwr-day"
                    :class="selectedOption.schedule.days[day].tablets > previewMinTablets ? 'dwr-day--hi' : ''"
                  >
                    <span class="dwr-day-lbl">{{ DAY_SHORT[day] }}</span>
                    <div class="dwr-day-pills">
                      <div
                        v-for="n in Math.floor(selectedOption.schedule.days[day].tablets)"
                        :key="`f${n}`"
                        class="dwr-pill dwr-pill--full"
                        :class="`dwr-pill--${PILL_CONFIG[selectedOption.schedule.days[day].pillMg].color}`"
                      />
                      <div
                        v-if="selectedOption.schedule.days[day].tablets % 1 !== 0"
                        class="dwr-pill dwr-pill--half"
                        :class="`dwr-pill--${PILL_CONFIG[selectedOption.schedule.days[day].pillMg].color}`"
                      />
                    </div>
                    <span class="dwr-day-tab">{{ selectedOption.schedule.days[day].tablets }}</span>
                  </div>
                </div>

                <!-- Per-day customization affordance -->
                <div class="dwr-daily-bar">
                  <span v-if="isManualSchedule" class="dwr-manual-badge">
                    <PhCheck :size="9" />
                    ปรับรายวันแล้ว
                  </span>
                  <button class="dwr-btn-daily" @click="showDailyModal = true">
                    <PhCalendarBlank :size="12" />
                    {{ isManualSchedule ? 'แก้ไขตาราง' : 'ปรับรายวัน' }}
                  </button>
                </div>
              </template>

              <!-- Pill not yet chosen — applies to both hold and non-hold -->
              <div v-else class="dwr-step3-hint dwr-step3-hint--pill">
                <PhPill :size="13" color="currentColor" />
                <span>เลือกขนาดเม็ดยา (ด้านบน) เพื่อดูตารางการจ่ายยา</span>
              </div>

            </div>
            <div v-else-if="suggestion.direction === 'hold'" key="hold" class="dwr-hold-note">
              <PhInfo :size="12" color="var(--bma-text-tertiary)" />
              <span>
                {{ suggestion.trigger === 'therapeutic' ? 'คงขนาดยาเดิม' : 'HOLD — ไม่มีการเปลี่ยนแปลงขนาดยา' }}
                · {{ props.data.profile.currentDoseMgWk.toFixed(1) }} mg/wk
              </span>
            </div>
            <div v-else key="no-sel" class="dwr-step3-hint">
              <PhInfo :size="13" color="currentColor" />
              <span>ยังไม่ได้เลือกขนาดยา — เลือกจากขั้นที่ 2 ด้านบนก่อน</span>
            </div>
          </Transition>

          <div class="dwr-confirm-actions">
            <div class="dwr-confirm-fields">
              <Transition name="dwr-fade">
                <div v-if="isCustomSelection && suggestion.options.length > 0" class="dwr-override-wrap">
                  <label class="dwr-lbl dwr-lbl--warn">
                    <PhWarning :size="11" color="var(--inr-low-text)" />
                    เหตุผลที่เลือกขนาดยานอกเหนือคำแนะนำ
                  </label>
                  <input
                    v-model="form.overrideReason"
                    class="dwr-input dwr-input--warn"
                    placeholder="ระบุเหตุผล..."
                  />
                </div>
              </Transition>
              <div class="dwr-remarks-wrap">
                <label class="dwr-lbl">หมายเหตุ</label>
                <input
                  v-model="form.remarks"
                  class="dwr-input"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>
            </div>
            <div class="dwr-save-col">
              <Transition name="dwr-fade">
                <div v-if="saveError" class="dwr-save-error">
                  <PhWarning :size="11" color="var(--bma-emergency)" />{{ saveError }}
                </div>
              </Transition>
              <button class="dwr-btn-save" :disabled="saveDisabled" @click="saveAdjustment">
                <PhFloppyDisk :size="14" />
                {{ saveLabel }}
              </button>
            </div>
          </div>
        </div>

      </div><!-- /.dwr-body -->
    </div><!-- /.dwr-panel -->
  </Transition>

  <!-- Per-day dose customization modal (Teleports to body) -->
  <WfDailyScheduleModal
    v-if="selectedOption"
    :show="showDailyModal"
    :schedule="selectedOption.schedule"
    :active-pills="activePillsLocal"
    :target-mg-wk="selectedOption.newDoseMgWk"
    @close="showDailyModal = false"
    @confirm="onDailyConfirm"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  PhX, PhWarning, PhCheckCircle, PhCheck,
  PhFloppyDisk, PhInfo, PhPill, PhPencilSimple, PhCalendarBlank,
} from '@phosphor-icons/vue'
import type {
  WarfarinPageData, DoseSuggestion, WeeklySchedule,
  DayKey, DoseAdjustment, InrRecord, PillStrengthMg,
} from '@/data/types/warfarin'
import { PILL_CONFIG, DAY_KEYS, DEFAULT_TARGET_RANGE, DEFAULT_PROTOCOL } from '@/data/types/warfarin'
import { buildWeeklySchedule, computeDosingSuggestion, suggestNearbyDoses } from '@/utils/warfarinDosing'
import { type InrStatus, getInrStatus, inrStatusLabel } from '@/utils/inrStatus'
import WfDailyScheduleModal from './WfDailyScheduleModal.vue'

const DAY_SHORT: Record<DayKey, string> = {
  mon: 'จ', tue: 'อ', wed: 'พ', thu: 'พฤ', fri: 'ศ', sat: 'ส', sun: 'อา',
}

const props = defineProps<{
  data: WarfarinPageData
  isOpen: boolean
  patientId: string
  hn?: string
}>()

const emit = defineEmits<{
  close: []
  saved: [payload: { newDoseMgWk: number; newAdj: DoseAdjustment; newInr?: InrRecord }]
}>()

// Reset state when drawer opens
watch(() => props.isOpen, (open) => {
  if (open) resetForm()
})

function resetForm() {
  inrInput.value          = props.data.latestInr.inrValue
  confirmedInr.value      = props.data.latestInr.inrValue
  inrEditMode.value       = false
  selectedOption.value    = null
  isCustomSelection.value = false
  customCardOpen.value    = false
  customDoseInput.value   = null
  customDoseError.value   = ''
  saveError.value         = ''
  showDailyModal.value    = false
  isManualSchedule.value  = false
  activePillsLocal.value  = []   // doctor selects fresh each visit
  form.value = {
    newDoseMgWk:    props.data.profile.currentDoseMgWk,
    percentChange:  0,
    remarks:        '',
    overrideReason: '',
  }
}

// ── INR entry ─────────────────────────────────────────────────
const inrInput     = ref<number>(props.data.latestInr.inrValue)
const confirmedInr = ref<number>(props.data.latestInr.inrValue)
const inrEditMode  = ref(false)
const inrInputRef  = ref<HTMLInputElement | null>(null)

function confirmInr() {
  if (inrInput.value > 0) {
    confirmedInr.value      = inrInput.value
    inrEditMode.value       = false
    selectedOption.value    = null
    isCustomSelection.value = false
    customDoseInput.value   = null
    saveError.value         = ''
    form.value.newDoseMgWk   = props.data.profile.currentDoseMgWk
    form.value.percentChange = 0
  }
}

function enterEditMode() {
  inrEditMode.value = true
  nextTick(() => {
    inrInputRef.value?.focus()
    inrInputRef.value?.select()
  })
}

function cancelEditMode() {
  inrEditMode.value   = false
  inrInput.value      = props.data.latestInr.inrValue
  confirmedInr.value  = props.data.latestInr.inrValue
  selectedOption.value    = null
  isCustomSelection.value = false
  saveError.value         = ''
  form.value.newDoseMgWk   = props.data.profile.currentDoseMgWk
  form.value.percentChange = 0
}

// ── INR status ────────────────────────────────────────────────
const pendingStatus = computed<InrStatus>(() =>
  getInrStatus(inrInput.value, props.data.profile.targetRange ?? DEFAULT_TARGET_RANGE)
)
const inrDirty = computed(() => inrInput.value !== confirmedInr.value)

// Header always shows the original system INR — never the in-progress edit value
const headerInrStatus = computed<InrStatus>(() =>
  getInrStatus(props.data.latestInr.inrValue, props.data.profile.targetRange ?? DEFAULT_TARGET_RANGE)
)
const headerInrLabel = computed(() => inrStatusLabel(headerInrStatus.value))

// ── Drawer header title ───────────────────────────────────────
const drawerTitle = computed(() => 'บันทึกการจ่ายยา Warfarin')

// ── Active pill sizes (local, doctor selects fresh each visit) ────
const activePillsLocal = ref<PillStrengthMg[]>([])

// Fallback to primary pill for schedule computation while no pills are selected yet,
// so Step 2 suggestion cards always render even before the doctor makes a selection.
const pillsForCalc = computed<PillStrengthMg[]>(() =>
  activePillsLocal.value.length > 0
    ? activePillsLocal.value
    : [props.data.profile.pillStrengthMg]
)

function togglePill(pill: PillStrengthMg) {
  if (activePillsLocal.value.includes(pill)) {
    if (activePillsLocal.value.length === 1) return  // must keep at least one
    activePillsLocal.value = activePillsLocal.value.filter(p => p !== pill)
  } else {
    activePillsLocal.value = [...activePillsLocal.value, pill].sort((a, b) => b - a) as PillStrengthMg[]
  }
  saveError.value = ''

  if (selectedOption.value) {
    // Pill selector is after dose selection — keep the chosen dose but rebuild
    // its weekly schedule with the updated pill combination.
    if (isCustomSelection.value) {
      // Custom dose: rebuild the whole option (dose might now be achievable exactly)
      const rebuilt = buildCustomOpt(selectedOption.value.newDoseMgWk)
      selectedOption.value   = rebuilt
      customDoseInput.value  = rebuilt.newDoseMgWk
      form.value.newDoseMgWk   = rebuilt.newDoseMgWk
      form.value.percentChange = rebuilt.percentChange
    } else {
      // System option: keep percentChange / dose, just rebuild the schedule
      const newSched = buildWeeklySchedule(selectedOption.value.newDoseMgWk, pillsForCalc.value)
      selectedOption.value = { ...selectedOption.value, schedule: newSched }
    }
    // Pill change invalidates any manual per-day layout — rebuild from scratch above
    isManualSchedule.value = false
  }
  // If nothing selected yet, activeProfile recomputes → Step 2 cards re-render automatically
}

// Profile with locally selected pill sizes injected (uses fallback while empty)
const activeProfile = computed(() => ({
  ...props.data.profile,
  activePillsMg: pillsForCalc.value,
}))

// ── Protocol suggestion ───────────────────────────────────────
const suggestion = computed(() =>
  computeDosingSuggestion(confirmedInr.value, activeProfile.value)
)

// ── Selection ─────────────────────────────────────────────────
const selectedOption    = ref<DoseSuggestion | null>(null)
const isCustomSelection = ref(false)
const customCardOpen    = ref(false)
const customDoseInput   = ref<number | null>(null)
const customInputRef    = ref<HTMLInputElement | null>(null)
const step3Ref          = ref<HTMLElement | null>(null)
const saveError         = ref('')
const customDoseError   = ref('')
const showDailyModal    = ref(false)
const isManualSchedule  = ref(false)

const form = ref({
  newDoseMgWk:    props.data.profile.currentDoseMgWk,
  percentChange:  0,
  remarks:        '',
  overrideReason: '',
})

const systemSuggested = computed(() =>
  suggestion.value.direction === 'hold' ||
  (selectedOption.value !== null && !isCustomSelection.value)
)

// Save is blocked until: pill is selected + option chosen (hold states skip option check)
const saveDisabled = computed(() =>
  activePillsLocal.value.length === 0 ||
  (suggestion.value.direction !== 'hold' && !selectedOption.value)
)

function selectOption(opt: DoseSuggestion) {
  selectedOption.value     = opt
  isCustomSelection.value  = false
  customCardOpen.value     = false
  customDoseInput.value    = null
  customDoseError.value    = ''
  saveError.value          = ''
  form.value.newDoseMgWk   = opt.newDoseMgWk
  form.value.percentChange = opt.percentChange
  nextTick(() => step3Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function openCustomCard() {
  customCardOpen.value     = true
  selectedOption.value     = null
  isCustomSelection.value  = false
  customDoseError.value    = ''
  saveError.value          = ''
  form.value.newDoseMgWk   = props.data.profile.currentDoseMgWk
  form.value.percentChange = 0
  nextTick(() => customInputRef.value?.focus())
}

function buildCustomOpt(mgWk: number): DoseSuggestion {
  const strength         = props.data.profile.pillStrengthMg
  const { roundingUnit } = props.data.profile.protocol ?? DEFAULT_PROTOCOL

  // Prefer the exact dose when it's already achievable with the active pill combo.
  // Only fall back to primary-pill rounding when no exact schedule exists.
  const schedRaw = buildWeeklySchedule(mgWk, pillsForCalc.value)
  const isClean  = Math.abs(schedRaw.totalMgWk - mgWk) < 0.005

  const finalDose = isClean
    ? mgWk
    : Math.round(mgWk / strength / roundingUnit) * roundingUnit * strength
  const sched     = isClean ? schedRaw : buildWeeklySchedule(finalDose, pillsForCalc.value)

  // Total tablets = sum across all 7 days (accurate for multi-pill schedules)
  const totalTabs = parseFloat(
    Object.values(sched.days).reduce((s, d) => s + d.tablets, 0).toFixed(1)
  )
  const pct = parseFloat(((finalDose - props.data.profile.currentDoseMgWk) / props.data.profile.currentDoseMgWk * 100).toFixed(1))
  return {
    percentChange: pct, newDoseMgWk: finalDose, tabletsPerWeek: totalTabs,
    schedule: sched, label: `Custom: ${finalDose.toFixed(1)} mg/wk`,
  }
}

function selectCustomDose() {
  if (!customDoseInput.value || customDoseInput.value <= 0) return
  customDoseError.value = ''
  if (customDoseInput.value < 0.5) {
    customDoseError.value = 'ขนาดยาต่ำเกินไป — ขั้นต่ำ 0.5 mg/wk'
    return
  }
  if (customDoseInput.value > 70) {
    customDoseError.value = 'ขนาดยาเกิน 70 mg/wk — ตรวจสอบอีกครั้ง'
    return
  }
  const pct = Math.abs(
    (customDoseInput.value - props.data.profile.currentDoseMgWk)
    / props.data.profile.currentDoseMgWk * 100
  )
  if (pct > 50) {
    customDoseError.value = `เปลี่ยนแปลง ${pct.toFixed(0)}% จากขนาดเดิม — เกินกว่า 50%`
  }
  const opt = buildCustomOpt(customDoseInput.value)
  // Sync input to the actual confirmed dose so the field always reflects what was committed.
  // This also makes nearbySuggestions re-compute against a clean dose → they hide automatically.
  customDoseInput.value    = opt.newDoseMgWk
  selectedOption.value     = opt
  isCustomSelection.value  = true
  saveError.value          = ''
  form.value.newDoseMgWk   = opt.newDoseMgWk
  form.value.percentChange = opt.percentChange
  nextTick(() => step3Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ── Nearby clean-dose suggestions (for custom card) ───────────
// Returns [roundDown, roundUp] — both null when input is already clean.
const nearbySuggestions = computed<[number | null, number | null]>(() => {
  const open = customCardOpen.value || isCustomSelection.value
  if (!open || !customDoseInput.value || customDoseInput.value <= 0) return [null, null]
  // If the input is itself a clean dose, suppress suggestions
  const sched = buildWeeklySchedule(customDoseInput.value, pillsForCalc.value)
  if (Math.abs(sched.totalMgWk - customDoseInput.value) < 0.005) return [null, null]
  return suggestNearbyDoses(customDoseInput.value, pillsForCalc.value)
})

const hasSuggestions = computed(() =>
  nearbySuggestions.value[0] !== null || nearbySuggestions.value[1] !== null
)

function applySuggestion(dose: number) {
  customDoseInput.value = dose
  customDoseError.value = ''
  selectCustomDose()
}

function onDailyConfirm(schedule: WeeklySchedule) {
  if (!selectedOption.value) return
  selectedOption.value   = { ...selectedOption.value, schedule }
  isManualSchedule.value = true
  showDailyModal.value   = false
}

const activeSchedule = computed<WeeklySchedule>(() =>
  selectedOption.value?.schedule
    ?? buildWeeklySchedule(props.data.profile.currentDoseMgWk, pillsForCalc.value)
)

const previewMinTablets = computed(() =>
  selectedOption.value
    ? Math.min(...DAY_KEYS.map(d => selectedOption.value!.schedule.days[d].tablets))
    : 0
)

const adminMethod = computed(() => {
  const unique = [...new Set(Object.values(activeSchedule.value.days).map(d => d.tablets))].sort((a, b) => a - b)
  return unique.length === 1 ? `${unique[0]} เม็ด ทุกวัน` : unique.map(t => `${t} เม็ด`).join(' สลับ ')
})

const saveLabel = computed(() => {
  if (selectedOption.value?.holdNote) return 'บันทึก — คงขนาดยาเดิม 1 สัปดาห์'
  if (suggestion.value.direction === 'hold') {
    return suggestion.value.trigger === 'therapeutic'
      ? 'บันทึกการเยี่ยมชม — คงขนาดยาเดิม'
      : 'บันทึก HOLD — ไม่ปรับยา'
  }
  return 'บันทึกและอัปเดตตาราง'
})

// ── Toast ─────────────────────────────────────────────────────
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 3000)
}

// ── Save ──────────────────────────────────────────────────────
let closeTimer: ReturnType<typeof setTimeout> | null = null

function saveAdjustment() {
  if (inrInput.value !== confirmedInr.value) {
    showToast('กรุณายืนยัน INR ก่อนบันทึก', 'error')
    return
  }
  if (activePillsLocal.value.length === 0) {
    saveError.value = 'กรุณาเลือกขนาดเม็ดยาก่อนบันทึก'
    return
  }
  if (suggestion.value.direction !== 'hold' && !selectedOption.value) {
    saveError.value = 'กรุณาเลือกตัวเลือก หรือกำหนดขนาดยาใหม่ก่อนบันทึก'
    return
  }
  saveError.value = ''

  const now     = new Date().toISOString()
  const oldDose = props.data.profile.currentDoseMgWk
  const newDose = form.value.newDoseMgWk

  let newInr: InrRecord | undefined
  if (confirmedInr.value !== props.data.latestInr.inrValue) {
    newInr = {
      id: `inr${Date.now()}`, patientId: props.patientId,
      inrValue: confirmedInr.value, measuredAt: now, source: 'manual',
    }
  }

  const newAdj: DoseAdjustment = {
    id:              `adj${Date.now()}`,
    patientId:       props.patientId,
    adjustedAt:      now,
    adjustedBy:      'ภก. (ผู้ใช้ปัจจุบัน)',
    inrAtAdjustment: confirmedInr.value,
    inrSource:       'manual',
    oldDoseMgWk:     oldDose,
    newDoseMgWk:     newDose,
    percentChange:   parseFloat(form.value.percentChange.toFixed(1)),
    pillStrengthMg:  props.data.profile.pillStrengthMg,
    activePillsMg:   [...activePillsLocal.value],
    weeklySchedule:  activeSchedule.value,
    remarks:         form.value.remarks        || undefined,
    systemSuggested: systemSuggested.value,
    overrideReason:  form.value.overrideReason || undefined,
  }

  showToast(`บันทึกเรียบร้อย — ขนาดยาใหม่ ${newDose.toFixed(1)} mg/wk`)
  emit('saved', { newDoseMgWk: newDose, newAdj, newInr })

  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => emit('close'), 1400)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────── */
.dwr-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0, 0, 0, .38); /* fallback if modifier class missing */
}

/* Adaptive intensity: lighter when INR is fine, heavier when it's dangerous.
   The intent is that emergency/critical visually cut the user off from
   the routine page content behind — forcing attention into the drawer. */
.dwr-overlay--therapeutic { background: rgba(0, 0, 0, .22); }
.dwr-overlay--low         { background: rgba(0, 0, 0, .35); }
.dwr-overlay--supra       { background: rgba(0, 0, 0, .38); }
.dwr-overlay--very-high   { background: rgba(0, 0, 0, .55); }
.dwr-overlay--critical    { background: rgba(0, 0, 0, .70); }
.dwr-overlay--emergency   { background: rgba(0, 0, 0, .80); }

.dwr-overlay-enter-active, .dwr-overlay-leave-active { transition: opacity .25s ease; }
.dwr-overlay-enter-from, .dwr-overlay-leave-to { opacity: 0; }

/* ── Panel ───────────────────────────────────────────────────── */
.dwr-panel {
  position: fixed; top: 0; right: 0; height: 100vh;
  width: var(--bma-drawer-width); min-width: var(--bma-drawer-min-width); z-index: 1101;
  background: var(--bma-surface);
  box-shadow: -6px 0 32px rgba(0, 0, 0, .14);
  display: flex; flex-direction: column; overflow: hidden;
}
.dwr-slide-enter-active, .dwr-slide-leave-active {
  transition: transform .32s cubic-bezier(0.16, 1, 0.3, 1);
}
.dwr-slide-enter-from, .dwr-slide-leave-to { transform: translateX(100%); }

/* ── Toast ───────────────────────────────────────────────────── */
.dwr-toast {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 10; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,.14);
}
.dwr-toast--success { background: var(--bma-green-toast); color: var(--bma-surface); }
.dwr-toast--error   { background: var(--inr-emergency-fill); color: var(--bma-surface); }
.dwr-toast-anim-enter-active, .dwr-toast-anim-leave-active { transition: all .22s ease; }
.dwr-toast-anim-enter-from, .dwr-toast-anim-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px); }

/* ── Header ──────────────────────────────────────────────────── */
.dwr-header {
  display: flex; flex-direction: column;
  border-bottom: 1px solid var(--bma-border-subtle);
  flex-shrink: 0; background: var(--bma-surface);
}
.dwr-header-top {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
}
.dwr-close-btn {
  width: 30px; height: 30px; border-radius: 7px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background .15s;
}
.dwr-close-btn:hover { background: var(--bma-surface-subtle); }
.dwr-title-wrap { display: flex; align-items: center; gap: 6px; }
.dwr-title { font-family: var(--bma-font-thai); font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }

/* Context info strip */
.dwr-ctx {
  display: flex; align-items: stretch;
  border-top: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
}
.dwr-ctx-group {
  display: flex; flex-direction: column; gap: 3px;
  padding: 8px 14px; flex: 1;
}
.dwr-ctx-div {
  width: 1px; background: var(--bma-border-subtle); flex-shrink: 0;
}
.dwr-ctx-label {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-disabled); text-transform: uppercase; letter-spacing: .07em;
}
.dwr-ctx-hn {
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 700;
  color: var(--bma-text-primary);
}
.dwr-ctx-inr {
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 99px; align-self: flex-start;
}
.dwr-ctx-inr--low          { background: var(--inr-very-high-bg);   color: var(--bma-emergency); }
.dwr-ctx-inr--therapeutic  { background: var(--bma-green-50);       color: var(--bma-success-text); }
.dwr-ctx-inr--supra        { background: var(--inr-supra-bg);       color: var(--inr-supra-text); }
.dwr-ctx-inr--very-high    { background: var(--inr-very-high-bg);   color: var(--bma-emergency); }
.dwr-ctx-inr--critical     { background: var(--bma-emergency);      color: var(--bma-surface); }
.dwr-ctx-inr--emergency    { background: var(--inr-emergency-deep); color: var(--bma-surface); }
.dwr-ctx-dose {
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 700;
  color: var(--bma-text-primary);
}
.dwr-ctx-unit {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 500;
  color: var(--bma-text-muted);
}
.dwr-ctx-ttr {
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 700;
  color: var(--bma-text-primary);
}

/* ── Body ────────────────────────────────────────────────────── */
.dwr-body {
  flex: 1; overflow-y: auto; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 14px;
  background: var(--bma-surface);
}

/* ── Step ────────────────────────────────────────────────────── */
.dwr-step { display: flex; flex-direction: column; gap: 10px; }
.dwr-step + .dwr-step { padding-top: 14px; border-top: 1px solid var(--bma-border-subtle); }

.dwr-step-hd { display: flex; align-items: center; gap: 8px; }
.dwr-step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bma-green-500); color: var(--bma-surface);
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.dwr-step-title {
  font-size: 11px; font-weight: 700; color: var(--bma-text-muted);
  text-transform: uppercase; letter-spacing: .05em;
}

/* ── Zone ① INR ──────────────────────────────────────────────── */
.dwr-inr-section { display: flex; flex-direction: column; gap: 6px; }

.dwr-inr-date {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 600; color: var(--bma-text-muted);
  background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card); border-radius: 4px; padding: 2px 7px;
  margin-left: auto; flex-shrink: 0;
}

.dwr-inr-input-row { display: flex; align-items: center; gap: 8px; }
.dwr-inr-input {
  width: 120px; height: 50px; border-radius: 8px; border: 2px solid var(--bma-border);
  text-align: center; font-family: var(--bma-font-data); font-size: 22px; font-weight: 700;
  color: var(--bma-text-primary); background: var(--bma-surface); outline: none; transition: border-color .15s;
  -moz-appearance: textfield; flex-shrink: 0;
}
.dwr-inr-input::-webkit-inner-spin-button,
.dwr-inr-input::-webkit-outer-spin-button { appearance: none; }
.dwr-inr-input:focus                        { border-color: var(--bma-green-500); }
.dwr-inr-input--low:not(:focus)             { border-color: var(--inr-very-high-ring); color: var(--bma-emergency); }
.dwr-inr-input--supra:not(:focus)           { border-color: var(--inr-supra-ring);     color: var(--inr-supra-text); }
.dwr-inr-input--very-high:not(:focus)       { border-color: var(--inr-very-high-ring);                   color: var(--bma-emergency); }
.dwr-inr-input--critical:not(:focus)        { border-color: var(--inr-critical-ring);                   color: var(--inr-critical-text); }
.dwr-inr-input--emergency:not(:focus)       { border-color: var(--inr-emergency-ring); color: var(--inr-emergency-text); }
.dwr-inr-input--therapeutic:not(:focus)     { border-color: var(--inr-therapeutic-ring); color: var(--bma-success-text); }

.dwr-inr-badge {
  padding: 3px 9px; border-radius: 99px;
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  align-self: flex-start;
}
.dwr-inr-badge--low          { background: var(--inr-very-high-bg);   color: var(--bma-emergency); }
.dwr-inr-badge--therapeutic  { background: var(--bma-green-50);       color: var(--bma-success-text); }
.dwr-inr-badge--supra        { background: var(--inr-supra-bg);       color: var(--inr-supra-text); }
.dwr-inr-badge--very-high    { background: var(--inr-very-high-bg);   color: var(--bma-emergency); }
.dwr-inr-badge--critical     { background: var(--bma-emergency);      color: var(--bma-surface); }
.dwr-inr-badge--emergency    { background: var(--inr-emergency-deep); color: var(--bma-surface); }

/* ── INR locked display (read-only default state) ───────────── */
.dwr-inr-locked {
  width: 120px; height: 50px; border-radius: 8px; flex-shrink: 0;
  border: none;
  background: var(--bma-border-card);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--bma-font-data); font-size: 22px; font-weight: 700;
  color: var(--bma-text-primary); user-select: none;
}
.dwr-inr-locked--low          { color: var(--inr-low-text); }
.dwr-inr-locked--therapeutic  { color: var(--bma-success-text); }
.dwr-inr-locked--supra        { color: var(--inr-supra-text); }
.dwr-inr-locked--very-high    { color: var(--bma-emergency); }
.dwr-inr-locked--critical     { color: var(--inr-critical-text); }
.dwr-inr-locked--emergency    { color: var(--inr-emergency-text); }

/* ── Edit / cancel buttons ──────────────────────────────────── */
.dwr-btn-edit-inr {
  height: 28px; padding: 0 10px; border-radius: 6px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-muted); cursor: pointer; transition: all .15s;
}
.dwr-btn-edit-inr:hover { border-color: var(--bma-green-500); color: var(--bma-green-500); }

.dwr-btn-confirm-inr {
  height: 28px; padding: 0 10px; border-radius: 6px;
  border: 1.5px solid var(--bma-green-500); background: var(--bma-green-500);
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: #fff; cursor: pointer; transition: background .15s;
}
.dwr-btn-confirm-inr:hover { background: var(--bma-green-600); border-color: var(--bma-green-600); }

.dwr-btn-cancel-inr {
  height: 28px; padding: 0 10px; border-radius: 6px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-muted); cursor: pointer; transition: all .15s;
}
.dwr-btn-cancel-inr:hover { border-color: var(--bma-emergency); color: var(--bma-emergency); background: var(--inr-very-high-bg); }

/* ── Manual override note (shown when edit value ≠ system value) */
.dwr-inr-override-note {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--bma-font-thai); font-size: 10px; font-weight: 600;
  color: var(--bma-urgency-text); margin-top: 2px;
}

/* ── Zone ② Suggestion ───────────────────────────────────────── */
/* ── Unified info banner ─────────────────────────────────────── */
/* One base class, semantic modifiers via design tokens.
   All banners: same padding, font, alignment, border-radius.     */
.dwr-banner {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 11px; border-radius: 8px;
  font-size: 12px; font-weight: 600; line-height: 1.5;
  border: 1px solid transparent;
}
.dwr-banner svg { flex-shrink: 0; }

/* System alert: stale INR — amber icon, neutral body text (same pattern as advisory) */
.dwr-banner--stale {
  background: var(--bma-urgency-bg);
  border-color: var(--bma-urgency-ring);
  color: var(--bma-text-tertiary);
}
.dwr-banner--stale svg { color: var(--bma-urgency-text); }

/* Clinical advisory: low INR — amber icon, neutral body text */
.dwr-banner--advisory-low {
  background: var(--bma-urgency-bg);
  border-color: var(--bma-urgency-ring);
  color: var(--bma-text-tertiary);
}
.dwr-banner--advisory-low svg { color: var(--bma-urgency-text); }

/* Clinical advisory: supra INR — red icon, neutral body text */
.dwr-banner--advisory-supra {
  background: var(--bma-emergency-bg);
  border-color: var(--bma-emergency-ring);
  color: var(--bma-text-tertiary);
}
.dwr-banner--advisory-supra svg { color: var(--bma-emergency); }

/* Status: INR in therapeutic range */
.dwr-banner--ok {
  background: var(--bma-green-50);
  border-color: var(--bma-green-200);   /* #8DCBAA — muted, desaturated, from token */
  color: var(--bma-success-text);
}

.dwr-hold-box { border-radius: 10px; overflow: hidden; border: 1.5px solid; }
.dwr-hold-hd  { display: flex; align-items: center; gap: 8px; padding: 9px 12px; flex-wrap: wrap; }
.dwr-hold-title { font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; letter-spacing: .03em; }
.dwr-hold-body  { padding: 9px 12px 12px; }

.dwr-hold--emergency { border-color: var(--inr-emergency-ring); animation: pulse-emergency 2s ease-in-out infinite; }
.dwr-hold--emergency .dwr-hold-hd    { background: var(--inr-emergency-fill); }
.dwr-hold--emergency .dwr-hold-title { color: var(--bma-surface); }
.dwr-hold--emergency .dwr-hold-body  { background: var(--inr-emergency-body); }
.dwr-hold--emergency .dwr-next-steps li { color: var(--bma-emergency); }

.dwr-hold--critical { border-color: var(--inr-critical-ring); }
.dwr-hold--critical .dwr-hold-hd    { background: var(--inr-critical-bg); }
.dwr-hold--critical .dwr-hold-title { color: var(--bma-emergency); }
.dwr-hold--critical .dwr-hold-body  { background: var(--inr-critical-body); }

.dwr-hold--very-high { border-color: var(--inr-supra-ring); }
.dwr-hold--very-high .dwr-hold-hd    { background: var(--inr-supra-bg); }
.dwr-hold--very-high .dwr-hold-title { color: var(--inr-supra-text); }
.dwr-hold--very-high .dwr-hold-body  { background: var(--inr-supra-body); }

@keyframes pulse-emergency {
  0%, 100% { box-shadow: 0 0 0 0 rgba(183, 28, 28, 0); }
  50%       { box-shadow: 0 0 0 5px rgba(183, 28, 28, .18); }
}

.dwr-vk-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 7px; }
.dwr-vk-lbl { font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; color: var(--bma-text-tertiary); white-space: nowrap; }
.dwr-vk-val { font-size: 12px; color: var(--bma-text-primary); font-weight: 600; line-height: 1.5; }

.dwr-next-steps    { margin: 0; padding-left: 14px; display: flex; flex-direction: column; gap: 3px; }
.dwr-next-steps li { font-size: 12px; color: var(--bma-text-tertiary); line-height: 1.5; }

.dwr-adjust { display: flex; flex-direction: column; gap: 10px; }

/* ── Current dose reference (Step 2 context) ─────────────────── */
.dwr-current-ref {
  display: flex; align-items: baseline; gap: 8px;
  padding: 7px 11px; border-radius: 8px;
  background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card);
}
.dwr-current-ref-label {
  font-size: 10px; font-weight: 700; color: var(--bma-text-disabled);
  text-transform: uppercase; letter-spacing: .06em; flex-shrink: 0;
}
.dwr-current-ref-val {
  font-family: var(--bma-font-data); font-size: 15px; font-weight: 700; color: var(--bma-text-primary);
}
.dwr-current-ref-unit { font-size: 11px; font-weight: 500; color: var(--bma-text-muted); }
.dwr-current-ref-pill {
  font-size: 11px; color: var(--bma-text-muted); margin-left: auto;
}


.dwr-opt-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.dwr-opt-card {
  position: relative;
  padding: 11px 13px; border-radius: 10px;
  border: 1.5px solid var(--bma-border-card); background: var(--bma-surface);
  cursor: pointer; transition: border-color .15s, background .15s, border-width .15s;
  display: flex; flex-direction: column; gap: 3px;
}
.dwr-opt-card:hover                { border-color: var(--bma-green-500); background: var(--bma-green-50); }
.dwr-opt-card:focus-visible        { outline: 2px solid var(--bma-green-500); outline-offset: 2px; }
.dwr-opt-card--selected            { border: 2px solid var(--bma-green-500); background: var(--bma-green-50); }

/* ── Checkmark badge ─────────────────────────────────────────── */
.dwr-opt-check {
  position: absolute; top: 8px; right: 8px; z-index: 1;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--bma-green-500); color: #fff;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(0.5);
  transition: opacity .15s ease-out, transform .2s cubic-bezier(0.34, 1.4, 0.64, 1);
  pointer-events: none;
}
.dwr-opt-card--selected .dwr-opt-check { opacity: 1; transform: scale(1); }
/* Hold card uses neutral checkmark */
.dwr-opt-card--hold .dwr-opt-check { background: var(--bma-text-tertiary); }
/* Dose is the prescription — primary headline */
.dwr-opt-dose      { font-family: var(--bma-font-data); font-size: 20px; font-weight: 900; line-height: 1; color: var(--bma-text-primary); }
.dwr-opt-dose-unit { font-family: var(--bma-font-data); font-size: 11px; font-weight: 400; color: var(--bma-text-muted); }
/* Percentage change — directional badge (secondary) */
.dwr-opt-pct {
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; line-height: 1;
  display: inline-flex; align-items: center; padding: 2px 6px; border-radius: 4px; width: fit-content;
}
.dwr-pct--up   { color: var(--bma-success-text); background: oklch(96% 0.04 145); }
/* Amber — decrease is a clinical adjustment, not an emergency */
.dwr-pct--down { color: oklch(46% 0.13 45); background: oklch(96% 0.04 50); }
.dwr-opt-tabs  { font-size: 11px; color: var(--bma-text-muted); }

/* Hold option card (คงขนาดยาเดิม) */
.dwr-opt-card--hold { border-style: dashed; }
.dwr-opt-card--hold:hover     { border-color: var(--bma-text-tertiary); background: var(--bma-surface-light); }
.dwr-opt-card--hold.dwr-opt-card--selected { border: 2px solid var(--bma-text-tertiary); background: var(--bma-surface-subtle); }
.dwr-opt-hold-label { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }
.dwr-opt-hold-sub   { font-size: 11px; color: var(--bma-text-muted); }

/* Custom card */
.dwr-opt-card--custom {
  grid-column: 1 / -1; border-style: dashed;
  align-items: center; justify-content: center; min-height: 46px;
}
.dwr-opt-card--custom:hover                          { border-color: var(--bma-text-tertiary); background: var(--bma-surface-light); }
.dwr-opt-card--custom.dwr-opt-card--selected         { border-style: solid; }
.dwr-opt-card--custom-open  {
  cursor: default;
  align-items: flex-start;
  padding: 13px 14px 13px;
  gap: 8px;  /* override the 3px base gap — open state needs breathing room */
  border-color: var(--bma-green-500);  /* always green when open — matches focused input */
}
.dwr-opt-card--custom-open:hover { background: var(--bma-surface); }
.dwr-opt-custom-placeholder {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--bma-text-secondary); letter-spacing: .02em;
  transition: color .15s;
}
.dwr-opt-card--custom:hover .dwr-opt-custom-placeholder { color: var(--bma-text-primary); }
.dwr-opt-custom-title {
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 700;
  color: var(--bma-text-primary); line-height: 1;
}
.dwr-opt-custom-input-row { display: flex; align-items: center; gap: 7px; width: 100%; }
.dwr-input-with-unit { position: relative; flex: 1; }
.dwr-custom-unit-inside {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 11px; color: var(--bma-text-disabled); pointer-events: none; user-select: none;
}
.dwr-custom-input {
  width: 100%; height: 32px; border: 1.5px solid var(--bma-border); border-radius: 7px;
  padding: 0 44px 0 10px; text-align: left;
  font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary);
  outline: none; transition: border-color .15s, background .15s;
  -moz-appearance: textfield;
}
.dwr-custom-input::-webkit-inner-spin-button,
.dwr-custom-input::-webkit-outer-spin-button { appearance: none; }
.dwr-custom-input:focus           { border-color: var(--bma-green-500); }
.dwr-custom-input:focus::placeholder { color: var(--bma-border); }
.dwr-custom-input--selected       { border-color: var(--bma-green-500); background: var(--bma-green-50); color: var(--bma-green-500); }
.dwr-btn-custom {
  height: 32px; padding: 0 12px; min-width: 80px; border: none; border-radius: 7px;
  background: var(--bma-text-primary); color: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: background .15s; flex-shrink: 0;
}
.dwr-btn-custom:hover:not(:disabled) { background: #555; }
.dwr-btn-custom:disabled { background: var(--bma-border); color: var(--bma-text-muted); cursor: not-allowed; }

.dwr-custom-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 600; color: var(--inr-low-text);
  align-self: flex-start; margin-top: 2px;
}

/* ── Round-down / Round-up suggestions ───────────────────────── */
.dwr-custom-suggestions {
  display: flex; align-items: center; gap: 7px;
  padding-top: 9px;
  border-top: 1px solid var(--bma-border-card);
  flex-wrap: wrap; width: 100%;
}
.dwr-custom-sugg-lbl {
  font-size: 10px; font-weight: 700; color: var(--bma-text-muted);
  letter-spacing: .03em; white-space: nowrap; flex-shrink: 0;
}
.dwr-custom-sugg-chips { display: flex; gap: 5px; }
.dwr-custom-sugg-chip {
  height: 24px; padding: 0 9px; border-radius: 6px;
  border: 1.5px solid var(--bma-border-card); background: var(--bma-surface);
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary);
  cursor: pointer; transition: border-color .12s, background .12s, color .12s;
}
/* Round down — amber, consistent with dwr-pct--down */
.dwr-custom-sugg-chip--down:hover {
  border-color: oklch(62% 0.13 45);
  background: oklch(96% 0.04 50);
  color: oklch(46% 0.13 45);
}
/* Round up — hints toward green (higher dose = more aggressive increase) */
.dwr-custom-sugg-chip--up:hover {
  border-color: var(--bma-green-500);
  background: var(--bma-green-50);
  color: var(--bma-green-500);
}

/* ── Zone ③ Confirm ──────────────────────────────────────────── */
.dwr-confirm-summary {
  border: 1px solid var(--bma-border-card); border-radius: 8px;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
}
.dwr-confirm-dose-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.dwr-old-dose    { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-disabled); text-decoration: line-through; }
.dwr-arrow       { font-size: 13px; color: var(--bma-text-muted); }
.dwr-new-dose    { font-family: var(--bma-font-data); font-size: 15px; font-weight: 700; color: var(--bma-green-500); }
.dwr-pct-badge   {
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 700;
  padding: 2px 8px; border-radius: 99px;
}
.dwr-pct-up   { background: var(--bma-green-50); color: var(--bma-success-text); }
.dwr-pct-down { background: var(--inr-very-high-bg); color: var(--bma-emergency); }
.dwr-admin-method { font-size: 11px; color: var(--bma-text-muted); }

.dwr-week-row {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
}
.dwr-day {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 5px 2px; border-radius: 6px;
  border: 1px solid var(--bma-border-subtle); background: var(--bma-surface-light);
}
.dwr-day--hi { border-color: var(--bma-green-200); background: var(--bma-green-50); }
.dwr-day-lbl { font-size: 10px; font-weight: 700; color: var(--bma-text-muted); }
.dwr-day--hi .dwr-day-lbl { color: var(--bma-green-500); }
.dwr-day-pills {
  display: flex; gap: 1px; align-items: center; justify-content: center;
  flex-wrap: wrap; min-height: 9px;
}
.dwr-day-tab { font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; color: var(--bma-text-primary); }
.dwr-day--hi .dwr-day-tab { color: var(--bma-green-500); }

.dwr-pill {
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 3px rgba(0,0,0,.20), inset 0 1px 2px rgba(255,255,255,.35);
}
.dwr-pill--full { width: 11px; height: 11px; }
.dwr-pill--half { width: 5px;  height: 11px; border-radius: 6px 0 0 6px; }
.dwr-pill--orange { background: var(--wf-pill-orange); }
.dwr-pill--blue   { background: var(--wf-pill-blue); }
.dwr-pill--pink   { background: var(--wf-pill-pink); }

.dwr-hold-note {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 12px; border-radius: 8px;
  background: var(--bma-surface); border: 1px solid var(--bma-border-card);
  font-size: 12px; color: var(--bma-text-tertiary);
}
.dwr-hold-note--chosen {
  background: var(--bma-surface-subtle); border-color: var(--bma-text-tertiary); font-weight: 600;
}
/* Step 3 — contextual hint cards */
.dwr-step3-hint {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 12px; border-radius: 8px;
  border: 1px dashed var(--bma-border-card);
  background: var(--bma-surface-light);
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-muted);
}
.dwr-step3-hint svg { flex-shrink: 0; color: var(--bma-text-disabled); }
/* Pill-needed variant: amber tint matches pill-selector--empty signal */
.dwr-step3-hint--pill {
  border-color: var(--bma-urgency-ring);
  background: var(--bma-urgency-bg);
  color: var(--bma-text-tertiary);
}
.dwr-step3-hint--pill svg { color: var(--bma-urgency-text); }

/* Confirm actions */
.dwr-confirm-actions {
  display: flex; flex-direction: column; gap: 12px;
}
.dwr-confirm-fields { display: flex; flex-direction: column; gap: 8px; }
.dwr-lbl { font-size: 11px; color: var(--bma-text-muted); font-weight: 600; display: flex; align-items: center; gap: 4px; }
.dwr-lbl--warn { color: var(--inr-low-text) !important; }

.dwr-input {
  height: 34px; border: 1.5px solid var(--bma-border); border-radius: 8px;
  padding: 0 10px; font-family: var(--bma-font-thai); font-size: 13px;
  color: var(--bma-text-primary); background: var(--bma-surface); outline: none; transition: border-color .15s; width: 100%;
}
.dwr-input:focus       { border-color: var(--bma-green-500); }
.dwr-input--warn       { border-color: var(--inr-low-ring) !important; }
.dwr-input--warn:focus { border-color: var(--inr-low-text) !important; }

.dwr-override-wrap, .dwr-remarks-wrap { display: flex; flex-direction: column; gap: 4px; }

.dwr-save-col  { display: flex; flex-direction: column; align-items: stretch; gap: 6px; }
.dwr-save-error {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--bma-emergency); font-weight: 600; white-space: nowrap;
}

.dwr-btn-save {
  height: 44px; padding: 0 20px; border: none; border-radius: 9px;
  background: var(--bma-neutral-900); color: var(--bma-surface); width: 100%;
  font-family: var(--bma-font-thai); font-size: 14px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: background .15s;
}
.dwr-btn-save:hover:not(:disabled) { background: #333; }
.dwr-btn-save:disabled {
  background: var(--bma-border-card); color: var(--bma-text-disabled); cursor: not-allowed;
}

/* ── Transitions ─────────────────────────────────────────────── */
.dwr-fade-enter-active, .dwr-fade-leave-active { transition: opacity .18s ease; }
.dwr-fade-enter-from, .dwr-fade-leave-to { opacity: 0; }

.dwr-slide-content-enter-active, .dwr-slide-content-leave-active { transition: all .18s ease; }
.dwr-slide-content-enter-from, .dwr-slide-content-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Concurrent Meds strip ───────────────────────────────────── */
.dwr-meds-strip {
  padding: 10px 12px; border-radius: 9px;
  background: var(--bma-surface-light); border: 1px solid var(--bma-border-subtle);
  display: flex; flex-direction: column; gap: 8px;
}
.dwr-meds-header { display: flex; align-items: center; gap: 6px; }
.dwr-meds-title  { font-size: 11px; font-weight: 700; color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .04em; }

.dwr-meds-list { display: flex; flex-wrap: wrap; gap: 6px; }

.dwr-med-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 99px;
  border: 1px solid var(--bma-border-card); background: var(--bma-surface);
  font-size: 11px;
}
.dwr-med-tag--major    { border-color: var(--inr-very-high-ring); background: var(--inr-emergency-body); }
.dwr-med-tag--moderate { border-color: var(--inr-supra-ring);    background: var(--inr-supra-body); }
.dwr-med-tag--minor    { border-color: var(--bma-border-card); background: var(--bma-surface); }

.dwr-med-name { font-weight: 600; color: var(--bma-text-primary); }

.dwr-med-effect {
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  padding: 0 4px; border-radius: 4px;
}
.dwr-med-effect--increase { background: var(--inr-very-high-bg);         color: var(--bma-emergency); }
.dwr-med-effect--decrease { background: var(--wf-interact-decrease-bg);  color: var(--wf-interact-decrease-text); }

/* ── Pill selector ────────────────────────────────────────────── */
.dwr-pill-selector {
  padding: 10px 12px; border-radius: 9px;
  background: var(--bma-surface-light); border: 1px solid var(--bma-border-subtle);
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color .15s;
}
.dwr-pill-selector--empty {
  border-color: var(--bma-urgency-ring);
  background: var(--bma-urgency-bg);
}
.dwr-pill-selector-hd {
  display: flex; align-items: center; gap: 6px;
}
.dwr-pill-selector-title {
  font-size: 11px; font-weight: 700; color: var(--bma-text-muted);
  text-transform: uppercase; letter-spacing: .04em;
}
.dwr-pill-selector-required {
  margin-left: auto;
  font-size: 10px; font-weight: 700; color: var(--bma-urgency-text);
  letter-spacing: .03em;
}
.dwr-pill-chips { display: flex; gap: 7px; flex-wrap: wrap; }

.dwr-pill-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  border: 1.5px solid var(--bma-border-card); background: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 12px; font-weight: 600;
  color: var(--bma-text-secondary);
  cursor: pointer; transition: all .15s; user-select: none;
}
.dwr-pill-chip:not(.dwr-pill-chip--active):hover {
  border-color: var(--bma-text-muted); background: var(--bma-surface-subtle);
}
/* Active states per pill color */
.dwr-pill-chip--orange.dwr-pill-chip--active {
  border-color: var(--wf-pill-orange); background: var(--inr-supra-bg); color: var(--inr-supra-text);
}
.dwr-pill-chip--blue.dwr-pill-chip--active {
  border-color: var(--wf-pill-blue); background: var(--bma-complication-thrombosis-bg); color: var(--bma-complication-thrombosis-color);
}
.dwr-pill-chip--pink.dwr-pill-chip--active {
  border-color: var(--wf-pill-pink); background: var(--wf-pill-pink-bg); color: var(--wf-pill-pink-text);
}

.dwr-pill-chip-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.dwr-chip-dot--orange { background: var(--wf-pill-orange); }
.dwr-chip-dot--blue   { background: var(--wf-pill-blue); }
.dwr-chip-dot--pink   { background: var(--wf-pill-pink); }

.dwr-pill-chip-check  { flex-shrink: 0; }
.dwr-pill-chip-label  { /* inherits from .dwr-pill-chip */ }

/* ── Per-day customization bar (Step 3) ──────────────────────── */
.dwr-daily-bar {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding-top: 5px;
}
.dwr-manual-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 99px;
  background: var(--bma-green-50); border: 1px solid var(--bma-green-200);
  font-family: var(--bma-font-thai); font-size: 10px; font-weight: 700;
  color: var(--bma-success-text);
}
.dwr-btn-daily {
  height: 26px; padding: 0 10px; border-radius: 6px;
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--bma-font-thai); font-size: 11px; font-weight: 600;
  color: var(--bma-text-muted); cursor: pointer; transition: all .15s;
}
.dwr-btn-daily:hover {
  border-color: var(--bma-green-500); color: var(--bma-green-500);
  background: var(--bma-green-50);
}
</style>
