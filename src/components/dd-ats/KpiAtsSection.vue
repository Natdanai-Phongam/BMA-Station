<template>
  <div class="kpi-sub-section">
    <div class="kpi-panel-head">
      <PhPulse :size="14" color="var(--bma-text-muted)" />
      <span class="kpi-ph-name">การตอบสนอง ATS</span>
    </div>
    <div class="kats-grid">
      <template v-for="row in rows" :key="row.key">
        <span class="kats-name">{{ row.name }}</span>
        <span class="kats-val" :class="`kats-val--${row.status}`">{{ row.displayValue }}</span>
        <span class="kats-target">{{ row.targetLabel }}</span>
        <span class="kpi-badge" :class="`kpi-badge--${row.status}`">{{ row.statusLabel }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhPulse } from '@phosphor-icons/vue'
import type { AtsRow } from '@/data/types/kpi-operational'

defineProps<{ rows: AtsRow[] }>()
</script>
