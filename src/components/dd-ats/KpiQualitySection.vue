<template>
  <div class="kpi-sub-section kpi-sub-section--sep">
    <div class="kpi-panel-head">
      <PhChartBar :size="14" color="#8C8C8C" />
      <span class="kpi-ph-name">คุณภาพการดูแล</span>
    </div>

    <div class="kqual-rows">
      <div v-for="row in rows" :key="row.key" class="kqual-row">
        <div class="kqual-row-top">
          <span class="kqual-metric-name">{{ row.name }}</span>
          <div class="kqual-row-right">
            <span class="kqual-frac">{{ row.n }}/{{ row.d }} ราย</span>
            <span class="kpi-badge" :class="`kpi-badge--${row.status}`">{{ row.statusLabel }}</span>
          </div>
        </div>
        <div class="kqual-bar-wrap">
          <div class="kqual-track">
            <div class="kqual-fill" :class="`kqual-fill--${row.status}`" :style="`width: ${Math.min(row.value, 100)}%`" />
            <div class="kqual-target-line" :style="`left: ${Math.min(row.target, 99)}%`" />
          </div>
          <div class="kqual-bar-labels">
            <span class="kqual-bar-val" :class="`kqual-bval--${row.status}`">{{ row.value.toFixed(1) }}%</span>
            <span class="kqual-bar-target">เป้า ≥ {{ row.target }}%</span>
          </div>
        </div>
      </div>

      <div class="kqual-los">
        <span class="kqual-metric-name">ระยะเวลานอน รพ. (เฉลี่ย)</span>
        <div class="kqual-los-body">
          <span class="kqual-los-val">{{ avgLOS.value.toFixed(1) }}</span>
          <span class="kqual-los-unit">วัน</span>
          <span class="kpi-badge" :class="`kpi-badge--${losStatus}`">
            {{ losStatus === 'pass' ? 'ผ่าน' : 'เกินเกณฑ์' }}
          </span>
          <span class="kqual-los-bench">เป้า ≤ {{ avgLOS.target }} วัน</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhChartBar } from '@phosphor-icons/vue'
import type { QualityBarRow, StatusLevel } from '@/data/types/kpi-operational'

defineProps<{
  rows:      QualityBarRow[]
  avgLOS:    { value: number; target: number }
  losStatus: StatusLevel
}>()
</script>
