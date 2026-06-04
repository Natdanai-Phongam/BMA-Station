<template>
  <div class="monitoring-card">
    <!-- Card header: icon + title + subtitle -->
    <div class="mc-card-header">
      <div class="mc-icon-wrap" :style="`background:${card.iconBg}`">
        <component :is="iconMap[card.iconName]" :size="18" :color="card.iconColor" />
      </div>
      <div>
        <div class="mc-title">{{ card.title }}</div>
        <div class="mc-subtitle">{{ card.subtitle }}</div>
      </div>
    </div>

    <!-- Card body: donut chart + right metrics panel -->
    <div class="mc-body">
      <div class="donut-wrap">
        <Doughnut :data="chartData" :options="donutOptions" :plugins="chartPlugins" />
      </div>

      <div class="mc-right">
        <!-- In-range box (green) -->
        <div class="mc-in-range-box">
          <div class="mc-in-range-left">
            <span class="mc-in-count">{{ card.inRangeCount }} ราย</span>
            <span class="mc-in-label">
              {{ card.inRangeLabel }}
              <template v-if="card.inRangeRange">&nbsp;·&nbsp;( {{ card.inRangeRange }} )</template>
            </span>
          </div>
          <span class="mc-in-pct">{{ card.inRangePct }}</span>
        </div>

        <!-- Alert box (red) -->
        <div class="mc-alert-box">
          <div class="mc-alert-left">
            <PhWarning :size="13" color="var(--bma-emergency)" />
            ต้องติดตาม {{ card.outOfRangeCount }} ราย
          </div>
          <span class="mc-alert-pct">{{ card.outOfRangePct }}</span>
        </div>

        <!-- Stat rows (CSS Grid display:contents pattern) -->
        <div class="mc-stat-list">
          <div v-for="stat in card.stats" :key="stat.label" class="mc-stat-row">
            <span class="mc-stat-dot" :style="`background:${stat.color}`" />
            <div class="mc-stat-labels">
              <span class="mc-stat-name">{{ stat.label }}</span>
              <span v-if="stat.sublabel" class="mc-stat-sub">( {{ stat.sublabel }} )</span>
            </div>
            <div class="mc-progress-track">
              <div
                class="mc-progress-fill"
                :style="`width:${(stat.count / card.outOfRangeCount * 100).toFixed(1)}%;background:${stat.color}`"
              />
            </div>
            <span class="mc-stat-count">{{ stat.count }}</span>
            <span class="mc-stat-pct">{{ stat.pctDisplay }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, DoughnutController, Tooltip } from 'chart.js'
import type { ChartData, Plugin } from 'chart.js'
import { PhWarning, PhChartBar, PhFirstAid } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { AtsMonitoringCard } from '@/data/types/ats'
import { donutOptions } from '@/composables/useChartPlugins'

ChartJS.register(ArcElement, DoughnutController, Tooltip)

defineProps<{
  card:         AtsMonitoringCard
  chartData:    ChartData<'doughnut'>
  chartPlugins: Plugin<'doughnut'>[]
}>()

const iconMap: Record<string, Component> = { PhChartBar, PhFirstAid }
</script>

<style scoped>
.monitoring-card {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  padding:       16px 20px;
}

.mc-card-header {
  display:       flex;
  align-items:   center;
  gap:           8px;
  margin-bottom: 16px;
}

.mc-icon-wrap {
  width:         36px;
  height:        36px;
  border-radius: var(--bma-radius-md);
  display:       flex;
  align-items:   center;
  justify-content: center;
  flex-shrink:   0;
}

.mc-title    { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); font-family: var(--bma-font-data); letter-spacing: .02em; }
.mc-subtitle { font-size: 11px; color: var(--bma-text-muted); margin-top: 1px; }

.mc-body  { display: flex; align-items: flex-start; gap: 16px; }
.mc-right { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.donut-wrap {
  position:   relative;
  width:       164px;
  height:      164px;
  flex-shrink: 0;
}

/* In-range box */
.mc-in-range-box {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             8px;
  border:          1.5px solid var(--bma-success);
  border-radius:   var(--bma-radius-md);
  padding:         8px 12px;
  background:      var(--bma-success-bg-soft);
}
.mc-in-range-left { display: flex; flex-direction: column; gap: 4px; }
.mc-in-count { font-family: var(--bma-font-data); font-size: 18px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.mc-in-label { font-size: 11px; color: var(--bma-success); font-weight: 600; white-space: nowrap; }
.mc-in-pct   { font-family: var(--bma-font-data); font-size: 22px; font-weight: 700; color: var(--bma-text-primary); flex-shrink: 0; }

/* Alert box */
.mc-alert-box {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             8px;
  border:          1.5px solid var(--bma-emergency-border-light);
  border-radius:   var(--bma-radius-md);
  padding:         8px 12px;
  background:      var(--bma-emergency-bg-soft);
}
.mc-alert-left { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--bma-emergency); }
.mc-alert-pct  { font-family: var(--bma-font-data); font-size: 18px; font-weight: 700; color: var(--bma-emergency); flex-shrink: 0; }

/* Stat rows — CSS Grid display:contents pattern */
.mc-stat-list {
  display:               grid;
  grid-template-columns: 12px 138px 1fr 24px 52px;
  row-gap:               8px;
  column-gap:            8px;
  align-items:           center;
  margin-top:            4px;
}
.mc-stat-row { display: contents; }
.mc-stat-dot {
  width:         12px;
  height:        8px;
  border-radius: var(--bma-radius-xs);
}
.mc-stat-labels { display: flex; align-items: baseline; gap: 4px; }
.mc-stat-name   { font-size: 12px; color: var(--bma-text-primary); font-weight: 500; white-space: nowrap; }
.mc-stat-sub    { font-size: 10px; color: var(--bma-text-muted); white-space: nowrap; }
.mc-progress-track {
  height:        8px;
  background:    var(--bma-neutral-200);
  border-radius: var(--bma-radius-full);
  overflow:      hidden;
}
.mc-progress-fill { height: 100%; border-radius: var(--bma-radius-full); transition: width .4s ease; }
.mc-stat-count { font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; color: var(--bma-text-primary); text-align: right; }
.mc-stat-pct   { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-muted); }
</style>
