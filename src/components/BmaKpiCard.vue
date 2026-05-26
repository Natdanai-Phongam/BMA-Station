<template>
  <v-card class="bma-kpi-card" :class="[`bma-kpi-card--${variant}`]">
    <div class="bma-kpi-card__inner">
      <div class="bma-kpi-card__label">{{ label }}</div>

      <div class="bma-kpi-card__value" :style="valueColor ? `color: ${valueColor}` : ''">
        {{ value }}
      </div>

      <div v-if="unit" class="bma-kpi-card__unit">{{ unit }}</div>

      <!-- Delta chip: ▲ +21.4% or ▼ −12.5% -->
      <div v-if="delta" class="bma-delta" :class="`bma-delta--${deltaType}`">
        <span aria-hidden="true">{{ deltaType === 'up' ? '▲' : deltaType === 'down' ? '▼' : '' }}</span>
        {{ delta }}
      </div>

      <!-- Extra sub-badges slot (e.g., EMG 4 / URG 8) -->
      <div v-if="$slots.sub" class="bma-kpi-card__sub">
        <slot name="sub" />
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
export type BmaKpiVariant = 'default' | 'ttr' | 'danger'
export type BmaDeltaType  = 'up' | 'down' | 'neutral'

const props = withDefaults(
  defineProps<{
    /** KPI label — Thai preferred */
    label: string
    /** Primary numeric value as a string (allows "72%" or "1.4") */
    value: string
    /** Unit string below the value */
    unit?: string
    /** Delta text, e.g. "+21.4%" or "−12.5%" */
    delta?: string
    /** Arrow direction for the delta chip */
    deltaType?: BmaDeltaType
    /**
     * default → white card, neutral value
     * ttr     → BMA-green card (Anticoagulant Stewardship display)
     * danger  → value rendered in emergency red
     */
    variant?: BmaKpiVariant
  }>(),
  {
    deltaType: 'neutral',
    variant:   'default',
  },
)

const valueColor = computed(() => {
  if (props.variant === 'danger') return '#B72C2C'
  return undefined
})
</script>

<style scoped>
.bma-kpi-card {
  min-width: 150px;
}

.bma-kpi-card__inner {
  padding: 16px;
}

/* ── Label ─────────────────────────────────────────────────── */
.bma-kpi-card__label {
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--bma-text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

/* ── Value (big number) ────────────────────────────────────── */
.bma-kpi-card__value {
  font-family: var(--bma-font-data);
  font-size: 28px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

/* ── Unit ──────────────────────────────────────────────────── */
.bma-kpi-card__unit {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
  margin-top: 4px;
}

/* ── Sub slot (mini badges) ────────────────────────────────── */
.bma-kpi-card__sub {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ── TTR variant ────────────────────────────────────────────── */
/* Dark green card for Anticoagulant Stewardship TTR display */
.bma-kpi-card--ttr {
  background: var(--bma-green-500) !important;
  border: none !important;
}

.bma-kpi-card--ttr .bma-kpi-card__label {
  color: rgba(255, 255, 255, 0.70);
  font-family: var(--bma-font-data);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
}

.bma-kpi-card--ttr .bma-kpi-card__value {
  color: var(--bma-surface);
  font-size: 36px;
  font-weight: 900;
}

.bma-kpi-card--ttr .bma-kpi-card__unit {
  color: rgba(255, 255, 255, 0.70);
  font-size: 11px;
}

/* "GOAL MET" pill on TTR card */
.bma-kpi-card--ttr :deep(.bma-ttr-goal) {
  display: inline-block;
  margin-top: 10px;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  background: rgba(255, 255, 255, 0.15);
  color: var(--bma-surface);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
}
</style>
