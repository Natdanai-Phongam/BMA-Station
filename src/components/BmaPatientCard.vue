<template>
  <v-card class="bma-patient-card" :class="`bma-patient-card--${priority.toLowerCase()}`">
    <!-- Body -->
    <div class="bma-patient-card__body">
      <!-- Diagnosis -->
      <div class="bma-patient-card__diag">{{ diagnosis }}</div>

      <!-- Priority badge + status pill -->
      <div class="bma-patient-card__badges">
        <BmaStatusBadge :status="priority" :variant="priorityVariant" />
        <span v-if="statusLabel" class="bma-status-pill">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="white" stroke-width="1.5" />
            <path d="M4 7l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ statusLabel }}
        </span>
      </div>

      <!-- Clinical detail box -->
      <div v-if="details.length" class="bma-detail-box">
        <template v-for="(item, i) in details" :key="i">
          <strong>{{ item.label }} :</strong>
          <span v-if="item.highlight" class="bma-detail-highlight">{{ item.value }}</span>
          <span v-else>{{ item.value }}</span>
          <br />
        </template>
      </div>

      <!-- Patient info lines -->
      <div class="bma-patient-card__info">
        <div v-if="patientName">ชื่อ - นามสกุล : <strong>{{ patientName }}</strong></div>
        <div v-if="department">แผนก : แผนก {{ department }}</div>
        <div v-if="consultDoctor">ร.พ. ส่งการรักษา : {{ consultDoctor || '–' }}</div>
        <slot name="info" />
      </div>
    </div>

    <!-- Waiting status bar -->
    <div v-if="waitingLabel" class="bma-waiting-bar bma-patient-card__waiting">
      {{ waitingLabel }}
    </div>

    <!-- Attachment counts -->
    <div v-if="counts.length" class="bma-patient-card__counts">
      <span v-for="(c, i) in counts" :key="i" class="bma-count-tag">
        {{ c }}
      </span>
    </div>

    <!-- Footer actions -->
    <div class="bma-patient-card__footer v-card-actions">
      <v-btn
        variant="flat"
        color="primary"
        class="bma-patient-card__btn-detail"
        @click="emit('detail')"
      >
        {{ detailLabel }}
      </v-btn>
      <v-btn
        variant="outlined"
        color="error"
        class="bma-patient-card__btn-cancel"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BmaStatusBadge, { type BmaStatus, type BmaBadgeVariant } from './BmaStatusBadge.vue'

export interface BmaDetailItem {
  label: string
  value: string
  /** Render value with emergency-red highlight (e.g., NIH score) */
  highlight?: boolean
}

const props = withDefaults(
  defineProps<{
    /** Clinical diagnosis text */
    diagnosis: string
    /** Medical priority for badge colour and card accent */
    priority: BmaStatus
    /** Badge style — defaults to 'filled' for EMERGENCY, 'light' for others */
    priorityVariant?: BmaBadgeVariant
    /** Acceptance/workflow status label shown in green pill */
    statusLabel?: string
    /** Patient's full name */
    patientName?: string
    /** Department name (without "แผนก" prefix) */
    department?: string
    /** Referring doctor / hospital */
    consultDoctor?: string
    /** Structured clinical detail items shown in dashed box */
    details?: BmaDetailItem[]
    /** Attachment / media count strings, e.g. ["ไฟล์แนบ 3", "คอมเมนต์ 0"] */
    counts?: string[]
    /** Waiting status label — shown in amber bar; omit to hide */
    waitingLabel?: string
    /** Detail button label */
    detailLabel?: string
    /** Cancel button label */
    cancelLabel?: string
  }>(),
  {
    priorityVariant: undefined,
    statusLabel:     'สอบถามประวัติเบื้องต้น',
    details:         () => [],
    counts:          () => [],
    detailLabel:     'รายละเอียดเพิ่มเติม',
    cancelLabel:     'ยกเลิกการรักษา',
  },
)

const emit = defineEmits<{
  /** Emitted when "รายละเอียด" button is clicked */
  detail: []
  /** Emitted when "ยกเลิก" button is clicked */
  cancel: []
}>()

// EMERGENCY defaults to filled badge; others default to light
const priorityVariant = computed<BmaBadgeVariant>(() =>
  props.priorityVariant ?? (props.priority === 'EMERGENCY' ? 'filled' : 'light'),
)
</script>

<style scoped>
.bma-patient-card {
  display: flex;
  flex-direction: column;
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

/* ── Body ─────────────────────────────────────────────────── */
.bma-patient-card__body {
  padding: 14px 16px 10px;
  flex: 1;
}

.bma-patient-card__diag {
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.bma-patient-card__badges {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.bma-detail-highlight {
  display: inline-block;
  background: var(--bma-emergency);
  color: var(--bma-neutral-0);
  padding: 1px 7px;
  border-radius: var(--bma-radius-xs);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 700;
  margin-left: 3px;
}

.bma-patient-card__info {
  font-size: 13px;
  color: var(--bma-text-secondary);
  line-height: 1.75;
  padding: 2px 0 8px;
}

/* ── Waiting bar ──────────────────────────────────────────── */
.bma-patient-card__waiting {
  margin: 0 16px 10px;
  padding: 7px 12px;
  border-radius: 8px;
}

/* ── Attachment counts ────────────────────────────────────── */
.bma-patient-card__counts {
  padding: 0 16px 8px;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

/* ── Footer ───────────────────────────────────────────────── */
.bma-patient-card__footer {
  padding: 10px 16px 14px !important;
}

.bma-patient-card__btn-detail,
.bma-patient-card__btn-cancel {
  height: 36px !important;
  font-size: 13px !important;
}

/* ── Left-border accent by priority ──────────────────────── */
/* Subtle top border on card header area to reinforce severity */
.bma-patient-card--emergency { border-top: 3px solid var(--bma-emergency) !important; }
.bma-patient-card--urgency   { border-top: 3px solid var(--bma-urgency)   !important; }
.bma-patient-card--elective  { border-top: 3px solid var(--bma-elective)  !important; }
.bma-patient-card--success   { border-top: 3px solid var(--bma-success)   !important; }
</style>
