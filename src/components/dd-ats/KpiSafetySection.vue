<template>
  <div class="kpi-sub-section">
    <div class="kpi-panel-head">
      <PhShieldCheck :size="14" :color="failCount > 0 ? 'var(--bma-emergency)' : 'var(--bma-text-muted)'" />
      <span class="kpi-ph-name">ความปลอดภัยของผู้ป่วย</span>
      <div class="kpi-ph-tally">
        <span v-if="passCount" class="kpi-tally kpi-tally--ok">{{ passCount }} ผ่าน</span>
        <span v-if="warnCount" class="kpi-tally kpi-tally--warn">{{ warnCount }} ใกล้</span>
        <span v-if="failCount" class="kpi-tally kpi-tally--ng">{{ failCount }} เกิน</span>
      </div>
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
        <span :class="['ksafe-cell', 'ksafe-pct', row.informational ? '' : `ksafe-pct--${row.status}`, { 'ksafe-cell--last': ri === rows.length - 1 }]">
          {{ row.pct.toFixed(1) }}%
        </span>
        <span :class="['ksafe-cell', 'ksafe-trend', `ksafe-trend--${row.trendDir}`, { 'ksafe-cell--last': ri === rows.length - 1 }]">
          {{ row.informational ? '' : row.trendLabel }}
        </span>
        <span :class="['ksafe-cell', 'ksafe-target', { 'ksafe-cell--last': ri === rows.length - 1 }]">
          {{ row.informational ? '—' : (row.target > 0 ? `< ${row.target}%` : '= 0%') }}
        </span>
        <span :class="['ksafe-cell', { 'ksafe-cell--last': ri === rows.length - 1 }]">
          <span v-if="!row.informational" class="kpi-badge" :class="`kpi-badge--${row.status}`">{{ row.statusLabel }}</span>
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhShieldCheck } from '@phosphor-icons/vue'
import type { SafetyRow } from '@/data/types/kpi-operational'

defineProps<{
  rows:      SafetyRow[]
  passCount: number
  warnCount: number
  failCount: number
}>()
</script>
