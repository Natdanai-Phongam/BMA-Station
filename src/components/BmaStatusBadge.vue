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
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
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
  background: #B72C2C;
  color: #fff;
}
.bma-status-badge--emergency.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--emergency.bma-status-badge--light {
  background: rgba(183, 44, 44, 0.10);
  color: #B72C2C;
  border: 1px solid rgba(183, 44, 44, 0.25);
}

/* ── URGENCY ────────────────────────────────────────────── */
.bma-status-badge--urgency.bma-status-badge--filled {
  background: #FB8C00;
  color: #fff;
}
.bma-status-badge--urgency.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--urgency.bma-status-badge--light {
  background: rgba(251, 140, 0, 0.10);
  color: #E07A00;
  border: 1px solid rgba(251, 140, 0, 0.25);
}

/* ── ELECTIVE ───────────────────────────────────────────── */
.bma-status-badge--elective.bma-status-badge--filled {
  background: #2B478B;
  color: #fff;
}
.bma-status-badge--elective.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--elective.bma-status-badge--light {
  background: rgba(43, 71, 139, 0.10);
  color: #2B478B;
  border: 1px solid rgba(43, 71, 139, 0.25);
}

/* ── SUCCESS ────────────────────────────────────────────── */
.bma-status-badge--success.bma-status-badge--filled {
  background: #4CAF50;
  color: #fff;
}
.bma-status-badge--success.bma-status-badge--filled .bma-status-badge__dot {
  background: rgba(255, 255, 255, 0.5);
}
.bma-status-badge--success.bma-status-badge--light {
  background: rgba(76, 175, 80, 0.10);
  color: #2E7D32;
  border: 1px solid rgba(76, 175, 80, 0.25);
}
</style>
