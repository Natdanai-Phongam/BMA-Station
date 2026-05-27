<template>
  <div class="pc-info">
    <div class="pc-cols">

      <!-- ── Left: identity + demographics + insurance + allergy ── -->
      <div class="pc-left-col">

        <div class="pc-name-section">
          <span class="pc-eyebrow">ชื่อ-นามสกุล</span>
          <div class="pc-name-row">
            <span class="patient-name">{{ patient.name }}</span>
            <span class="hn-badge">HN {{ patient.hn }}</span>
          </div>
        </div>

        <div class="pc-demo-grid">
          <div class="demo-col">
            <span class="demo-label">อายุ</span>
            <span class="demo-val">{{ patient.age }} ปี</span>
            <span class="demo-sub">({{ formatThaiDate(patient.dob) }})</span>
          </div>
          <div class="demo-col">
            <span class="demo-label">เพศ</span>
            <span class="demo-val">{{ patient.sex }}</span>
          </div>
          <div class="demo-col">
            <span class="demo-label">กรุ๊ปเลือด</span>
            <span class="demo-val">{{ patient.bloodGroup }}</span>
          </div>
          <div class="demo-col">
            <span class="demo-label">โทรศัพท์</span>
            <span class="demo-val demo-val--data">{{ patient.phone }}</span>
          </div>
        </div>

        <div class="pc-field">
          <span class="pc-field-label">สิทธิการรักษา</span>
          <span class="pc-field-val">{{ patient.insuranceType }}</span>
        </div>

        <div class="pc-allergy-section">
          <span class="pc-section-label">ประวัติแพ้ยา</span>
          <div v-if="patient.allergies.length" class="allergy-inline">
            <span
              v-for="a in patient.allergies"
              :key="a.substance"
              class="allergy-chip"
            >
              <span class="allergy-chip-dot" />
              {{ a.substance }}
            </span>
          </div>
          <span v-else class="no-allergy">ไม่มีประวัติแพ้ยา</span>
        </div>

      </div>

      <!-- ── Right: clinical modules (Warfarin + NOACs) ──────── -->
      <div class="pc-modules">

        <!-- WARFARIN module -->
        <div v-if="wfData" class="pc-module">
          <div class="pc-module-hd">
            <span class="pc-module-dot" :class="`module-dot--${wfInrStatus}`" />
            <span class="pc-module-label">WARFARIN</span>
          </div>
          <div class="pc-mod-row">
            <div class="pc-mod-stat">
              <span class="wf-row-label">INR ล่าสุด</span>
              <div class="wf-row-top">
                <span class="wf-row-num" :class="`wf-num--${wfInrStatus}`">
                  {{ wfData.latestInr.inrValue.toFixed(1) }}
                </span>
                <span class="wf-row-badge" :class="`wf-badge-inr--${wfInrStatus}`">
                  {{ wfInrStatus?.toUpperCase().replace(/-/g, ' ') }}
                </span>
              </div>
            </div>
            <div class="pc-mod-stat">
              <span class="wf-row-label">ขนาดยา / สัปดาห์</span>
              <div class="wf-row-top">
                <span class="wf-row-num">{{ wfData.profile.currentDoseMgWk.toFixed(0) }}</span>
                <span class="wf-row-unit">mg/wk</span>
              </div>
            </div>
            <div class="pc-mod-stat">
              <span class="wf-row-label">TTR ({{ wfData.ttr.daysCalculable }} วัน)</span>
              <div class="wf-row-top">
                <span class="wf-row-num" :class="`wf-num-ttr--${wfData.ttr.status}`">
                  {{ wfData.ttr.value.toFixed(0) }}
                </span>
                <span class="wf-row-unit">%</span>
                <span class="wf-row-badge" :class="`wf-badge-ttr--${wfData.ttr.status}`">
                  {{ wfTtrBadgeLabel }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- NOACs module -->
        <div v-if="latestNoacLab" class="pc-module">
          <div class="pc-module-hd">
            <span class="pc-module-dot" :class="dotClass" />
            <span class="pc-module-label">NOACs</span>
          </div>
          <div class="pc-mod-row">
            <div class="pc-mod-stat">
              <span class="wf-row-label">น้ำหนักตัว</span>
              <div class="wf-row-top">
                <span class="wf-row-num">{{ latestNoacLab.weightKg }}</span>
                <span class="wf-row-unit">kg</span>
              </div>
            </div>
            <div class="pc-mod-stat">
              <span class="wf-row-label wf-label--en">SCr</span>
              <div class="wf-row-top">
                <span class="wf-row-num">{{ latestNoacLab.scrMgDl.toFixed(1) }}</span>
                <span class="wf-row-unit">mg/dL</span>
              </div>
            </div>
            <div class="pc-mod-stat">
              <span class="wf-row-label wf-label--en">CrCl</span>
              <div class="wf-row-top">
                <span class="wf-row-num" :class="valueClass">{{ latestNoacLab.crClMlMin }}</span>
                <span class="wf-row-unit">mL/min</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { WarfarinPageData } from '@/data/types/warfarin'
import { DEFAULT_TARGET_RANGE } from '@/data/types/warfarin'
import type { NoacLabData } from '@/data/types/noac-dispensing'
import { getInrStatus } from '@/utils/inrStatus'
import { formatThaiDate } from '@/utils/date'
import { useCrCl } from '@/composables/useCrCl'

const props = defineProps<{
  patient:        PatientDetail
  wfData?:        WarfarinPageData | null
  latestNoacLab?: NoacLabData | null
}>()

// ── Warfarin derived values ────────────────────────────────────────────────────
const wfInrStatus = computed(() =>
  props.wfData
    ? getInrStatus(props.wfData.latestInr.inrValue, props.wfData.profile.targetRange ?? DEFAULT_TARGET_RANGE)
    : null,
)

const wfTtrBadgeLabel = computed(() => ({
  'goal-met':          'GOAL MET',
  'below-goal':        'BELOW GOAL',
  'insufficient-data': 'N/A',
}[props.wfData?.ttr.status ?? 'insufficient-data']))

// ── CrCl classification ────────────────────────────────────────────────────────
const { dotClass, valueClass } = useCrCl(
  computed(() => props.latestNoacLab?.crClMlMin),
)
</script>

<style scoped>
/* ── Patient info panel ─────────────────────────────────── */
.pc-info { padding-bottom: 0; }

.pc-cols {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  padding-bottom: 12px;
}

.pc-left-col {
  flex: 1;
  min-width: 0;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Clinical modules panel (right col) ─────────────────── */
.pc-modules {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding-left: 36px;
  border-left: 1px solid var(--bma-border-subtle);
}

.pc-module {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 20px;
}
.pc-module + .pc-module {
  padding-top: 20px;
  border-top: 1px solid var(--bma-border-subtle);
}

.pc-module-hd { display: flex; align-items: center; gap: 8px; }

.pc-module-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pc-module-label {
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: var(--bma-text-muted);
}

/* Horizontal stat row inside each module */
.pc-mod-row { display: flex; align-items: flex-start; }

.pc-mod-stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 14px;
}
.pc-mod-stat + .pc-mod-stat {
  padding-left: 14px;
  border-left: 1px solid var(--bma-border-subtle);
}
.pc-mod-stat:last-child { padding-right: 0; }

.pc-mod-stat .wf-row-label { margin-bottom: 2px; }
.pc-mod-stat .wf-row-num   { font-size: 18px; }
.pc-mod-stat .wf-row-top   { flex-wrap: wrap; gap: 4px 6px; align-items: baseline; }

.wf-label--en { font-family: var(--bma-font-data); }

/* Module dot — Warfarin INR status */
.module-dot--therapeutic { background: var(--bma-green-500); }
.module-dot--low         { background: var(--inr-low-text); }
.module-dot--supra       { background: var(--inr-supra-text); }
.module-dot--very-high   { background: var(--bma-emergency); }
.module-dot--critical    { background: var(--inr-critical-text); }
.module-dot--emergency   { background: var(--inr-emergency-fill); }

/* Module dot — NOACs CrCl status */
.module-dot--normal  { background: var(--bma-green-500); }
.module-dot--caution { background: var(--inr-low-text); }
.module-dot--severe  { background: var(--bma-emergency); }

/* CrCl value color */
.crcl--normal  { color: var(--bma-success-text); }
.crcl--caution { color: var(--inr-low-text); }
.crcl--severe  { color: var(--bma-emergency); }

/* ── Name section ───────────────────────────────────────── */
.pc-name-section { display: flex; flex-direction: column; gap: 4px; }

.pc-eyebrow {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}

.pc-section-label {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}

.pc-name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.patient-name {
  font-family: var(--bma-font-thai);
  font-size: 22px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1.2;
}

.hn-badge {
  display: inline-block;
  padding: 2px 10px;
  border: 1.5px solid var(--bma-green-500);
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 700;
  color: var(--bma-green-500);
}

/* ── Demographics grid ──────────────────────────────────── */
.pc-demo-grid { display: flex; padding: 4px 0; }

.demo-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 14px;
}
.demo-col + .demo-col { padding-left: 14px; padding-right: 14px; }
.demo-col:last-child  { padding-right: 0; }

.demo-label {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}
.demo-val {
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.demo-val--data { font-family: var(--bma-font-data); white-space: nowrap; }
.demo-sub {
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-text-muted);
  margin-top: 1px;
}

/* ── Insurance field ────────────────────────────────────── */
.pc-field { display: flex; flex-direction: column; gap: 3px; }

.pc-field-label {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}
.pc-field-val {
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}

/* ── Allergy chips ──────────────────────────────────────── */
.pc-allergy-section { display: flex; flex-direction: column; gap: 10px; }
.allergy-inline     { display: flex; flex-wrap: wrap; gap: 6px; }

.allergy-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: oklch(94% 0.07 55);
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 600;
  color: oklch(38% 0.17 50);
}
.allergy-chip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: oklch(52% 0.18 50);
}
.no-allergy { font-size: 12px; color: var(--bma-text-muted); font-style: italic; }

/* ── Warfarin / NOACs stat typography ───────────────────── */
.wf-row-label { font-family: var(--bma-font-thai); font-size: 11px; font-weight: 600; color: var(--bma-text-muted); }
.wf-row-top   { display: flex; align-items: baseline; gap: 8px; }
.wf-row-num   { font-family: var(--bma-font-data); font-size: 20px; font-weight: 900; color: var(--bma-text-primary); line-height: 1; }
.wf-row-unit  { font-family: var(--bma-font-data); font-size: 12px; font-weight: 500; color: var(--bma-text-muted); }
.wf-row-badge { font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--bma-radius-full); }

/* INR status — value color */
.wf-num--therapeutic { color: var(--bma-success-text); }
.wf-num--low         { color: var(--inr-low-text); }
.wf-num--supra       { color: var(--inr-supra-text); }
.wf-num--very-high   { color: var(--bma-emergency); }
.wf-num--critical    { color: var(--inr-critical-text); }
.wf-num--emergency   { color: var(--inr-emergency-text); }

/* INR status — badge */
.wf-badge-inr--therapeutic { background: var(--bma-green-50);      color: var(--bma-success-text);   }
.wf-badge-inr--low         { background: var(--inr-low-bg);         color: var(--inr-low-text);       }
.wf-badge-inr--supra       { background: var(--inr-supra-bg);       color: var(--inr-supra-text);     }
.wf-badge-inr--very-high   { background: var(--inr-very-high-bg);   color: var(--bma-emergency);      }
.wf-badge-inr--critical    { background: var(--inr-critical-bg);    color: var(--inr-critical-text);  }
.wf-badge-inr--emergency   { background: var(--inr-emergency-body); color: var(--inr-emergency-fill); }

/* TTR status — value color */
.wf-num-ttr--goal-met          { color: var(--bma-success-text); }
.wf-num-ttr--below-goal        { color: var(--bma-emergency); }
.wf-num-ttr--insufficient-data { color: var(--bma-text-muted); }

/* TTR status — badge */
.wf-badge-ttr--goal-met          { background: var(--bma-green-50);      color: var(--bma-success-text); }
.wf-badge-ttr--below-goal        { background: var(--inr-very-high-bg);   color: var(--bma-emergency);    }
.wf-badge-ttr--insufficient-data { background: var(--bma-surface-subtle); color: var(--bma-text-muted);   }
</style>
