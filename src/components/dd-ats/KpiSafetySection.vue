<template>
  <div class="kpi-sub-section">
    <div class="kpi-panel-head">
      <PhShieldCheck :size="14" color="var(--bma-text-muted)" />
      <span class="kpi-ph-name">ความปลอดภัยของผู้ป่วย</span>
    </div>

    <div class="ksafe-grid">
      <template v-for="(row, ri) in rows" :key="row.key">
        <span :class="['ksafe-cell', 'ksafe-name', { 'ksafe-cell--last': ri === rows.length - 1 }]">
          {{ row.name }}
        </span>
        <span :class="['ksafe-cell', 'ksafe-events', { 'ksafe-cell--last': ri === rows.length - 1 }]">
          <span class="ksafe-en" :class="{ 'ksafe-en--nz': row.events > 0 }">{{ row.events }}</span>
          <span class="ksafe-eu">ราย</span>
        </span>
        <span :class="['ksafe-cell', 'ksafe-pct', { 'ksafe-cell--last': ri === rows.length - 1 }]">
          {{ row.pct.toFixed(1) }}%
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhShieldCheck } from '@phosphor-icons/vue'
import type { SafetyRow } from '@/data/types/kpi-operational'

defineProps<{ rows: SafetyRow[] }>()
</script>
