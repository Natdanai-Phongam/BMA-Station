<template>
  <span
    class="bma-status-badge"
    :class="[
      `bma-status-badge--${status.toLowerCase()}`,
      `bma-status-badge--${variant}`,
    ]"
  >
    <span v-if="dot" class="bma-status-badge__dot" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type BmaStatus = 'EMERGENCY' | 'URGENCY' | 'ELECTIVE' | 'SUCCESS'
export type BmaBadgeVariant = 'filled' | 'light'

const props = withDefaults(
  defineProps<{
    /** Medical priority level */
    status: BmaStatus
    /** filled = solid color bg · light = tinted bg with border (default) */
    variant?: BmaBadgeVariant
    /** Show the leading colored dot */
    dot?: boolean
  }>(),
  {
    variant: 'light',
    dot: true,
  },
)

const LABELS: Record<BmaStatus, string> = {
  EMERGENCY: 'EMERGENCY',
  URGENCY:   'URGENCY',
  ELECTIVE:  'ELECTIVE',
  SUCCESS:   'SUCCESS',
}

const label = computed(() => LABELS[props.status])
</script>

<style scoped>
.bma-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  line-height: 1;
}

.bma-status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
}

/* ── EMERGENCY ──────────────────────────────────────────── */
.bma-status-badge--emergency.bma-status-badge--filled {
  background: var(--bma-emergency);
  color: var(--bma-surface);
}
.bma-status-badge--emergency.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--emergency.bma-status-badge--light {
  background: var(--bma-emergency-bg);
  color: var(--bma-emergency);
  border: 1px solid var(--bma-emergency-ring);
}

/* ── URGENCY ────────────────────────────────────────────── */
.bma-status-badge--urgency.bma-status-badge--filled {
  background: var(--bma-urgency);
  color: var(--bma-surface);
}
.bma-status-badge--urgency.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--urgency.bma-status-badge--light {
  background: var(--bma-urgency-bg);
  color: var(--bma-urgency-text);
  border: 1px solid var(--bma-urgency-ring);
}

/* ── ELECTIVE ───────────────────────────────────────────── */
.bma-status-badge--elective.bma-status-badge--filled {
  background: var(--bma-elective);
  color: var(--bma-surface);
}
.bma-status-badge--elective.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--elective.bma-status-badge--light {
  background: var(--bma-elective-bg);
  color: var(--bma-elective);
  border: 1px solid var(--bma-elective-ring);
}

/* ── SUCCESS ────────────────────────────────────────────── */
.bma-status-badge--success.bma-status-badge--filled {
  background: var(--bma-success);
  color: var(--bma-surface);
}
.bma-status-badge--success.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--success.bma-status-badge--light {
  background: var(--bma-success-bg);
  color: var(--bma-success-text);
  border: 1px solid var(--bma-success-ring);
}
</style>
