<template>
  <div class="summary-panel">
    <!-- Panel header -->
    <div class="sc-header">
      <div class="sc-title-wrap">
        <div class="sc-icon" :style="`background:${card.iconBg}`">
          <component :is="iconMap[card.iconName]" :size="14" :color="card.iconColor" />
        </div>
        <div>
          <div class="sc-title">{{ card.title }} Monitoring</div>
          <div class="sc-subtitle">{{ card.subtitle }}</div>
        </div>
      </div>
      <div class="alert-badge">{{ card.alertCount }} Alerts</div>
    </div>
    <div class="sc-divider" />

    <!-- Out-of-range row -->
    <template v-if="outOfRangePatients.length > 0">
      <v-menu
        open-on-hover
        :close-on-content-click="false"
        location="bottom start"
        content-class="summ-tt-overlay"
        :open-delay="120"
        :close-delay="200"
      >
        <template #activator="{ props: menuProps }">
          <div class="sc-stat-row sc-stat-row--hoverable sc-stat-row--primary" v-bind="menuProps">
            <div class="sc-stat-label">
              <PhWarning :size="14" color="#8C8C8C" />
              {{ card.outOfRangeLabel }}
            </div>
            <div class="sc-stat-right">
              <div class="sc-stat-value sc-stat-value--lg">{{ card.outOfRangeCount }} ราย</div>
              <PhInfo class="sc-hint-icon" :size="13" />
            </div>
          </div>
        </template>
        <div class="summ-tt-header">{{ card.outOfRangeLabel }}</div>
        <div class="tt-scroll-body">
          <div v-for="pt in outOfRangePatients" :key="pt.id" class="summ-tt-row">
            <div class="summ-tt-info">
              <span class="summ-tt-name">{{ pt.name }}</span>
              <div class="summ-tt-sub">
                <span class="summ-tt-hn">HN {{ pt.hn }}</span>
                <span class="summ-tt-badge" :class="`summ-st--${pt.status}`">{{ pt.statusLabel }}</span>
              </div>
            </div>
            <button class="summ-tt-nav" @click="emit('go-to-patient', pt.id)" title="ดูรายละเอียด">
              <PhArrowSquareOut :size="14" />
            </button>
          </div>
        </div>
      </v-menu>
    </template>
    <template v-else>
      <div class="sc-stat-row sc-stat-row--primary">
        <div class="sc-stat-label">
          <PhWarning :size="14" color="#8C8C8C" />
          {{ card.outOfRangeLabel }}
        </div>
        <div class="sc-stat-value sc-stat-value--lg">{{ card.outOfRangeCount }} ราย</div>
      </div>
    </template>

    <!-- Referrals row -->
    <template v-if="referralPatients.length > 0">
      <v-menu
        open-on-hover
        :close-on-content-click="false"
        location="bottom start"
        content-class="summ-tt-overlay"
        :open-delay="120"
        :close-delay="200"
      >
        <template #activator="{ props: menuProps }">
          <div class="sc-stat-row sc-stat-row--hoverable sc-stat-row--secondary" v-bind="menuProps">
            <div class="sc-stat-label">
              <PhArrowCircleRight :size="14" color="#8C8C8C" />
              ส่งต่อแพทย์ปรึกษา
            </div>
            <div class="sc-stat-right">
              <div class="sc-stat-value">{{ card.referralCount }} ราย</div>
              <PhInfo class="sc-hint-icon" :size="13" />
            </div>
          </div>
        </template>
        <div class="summ-tt-header">ส่งต่อแพทย์ปรึกษา</div>
        <div class="tt-scroll-body">
          <div v-for="pt in referralPatients" :key="pt.id" class="summ-tt-row">
            <div class="summ-tt-info">
              <span class="summ-tt-name">{{ pt.name }}</span>
              <div class="summ-tt-sub">
                <span class="summ-tt-hn">HN {{ pt.hn }}</span>
                <span class="summ-tt-badge" :class="`summ-st--${pt.status}`">{{ pt.statusLabel }}</span>
              </div>
            </div>
            <button class="summ-tt-nav" @click="emit('go-to-patient', pt.id)" title="ดูรายละเอียด">
              <PhArrowSquareOut :size="14" />
            </button>
          </div>
        </div>
      </v-menu>
    </template>
    <template v-else>
      <div class="sc-stat-row sc-stat-row--secondary">
        <div class="sc-stat-label">
          <PhArrowCircleRight :size="14" color="#8C8C8C" />
          ส่งต่อแพทย์ปรึกษา
        </div>
        <div class="sc-stat-value">{{ card.referralCount }} ราย</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { PhWarning, PhArrowCircleRight, PhInfo, PhArrowSquareOut, PhChartBar, PhFirstAid } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { AtsMonitoringCard } from '@/data/types/ats'
import type { SummaryPatientEntry } from '@/data/types/ats-patients'

defineProps<{
  card:               AtsMonitoringCard
  outOfRangePatients: SummaryPatientEntry[]
  referralPatients:   SummaryPatientEntry[]
}>()

const emit = defineEmits<{ 'go-to-patient': [id: string] }>()

const iconMap: Record<string, Component> = { PhChartBar, PhFirstAid }
</script>

<style scoped>
.summary-panel {
  padding: 16px 20px;
}
.summary-panel:first-child {
  border-right: 1px solid var(--bma-border-subtle);
}

.sc-header     { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.sc-title-wrap { display: flex; align-items: flex-start; gap: 8px; }
.sc-icon       { width: 32px; height: 32px; border-radius: var(--bma-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-title      { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.sc-subtitle   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; }

.alert-badge {
  background:    var(--bma-emergency);
  color:         var(--bma-surface);
  border-radius: var(--bma-radius-full);
  padding:       2px 10px;
  font-family:   var(--bma-font-data);
  font-size:     11px;
  font-weight:   700;
  white-space:   nowrap;
  flex-shrink:   0;
}

.sc-divider { height: 1px; background: var(--bma-border-subtle); margin-bottom: 8px; }

.sc-stat-row   { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; }
.sc-stat-row--primary   { padding-bottom: 8px; }
.sc-stat-row--secondary { padding-top: 8px; border-top: 1px solid var(--bma-border-subtle); }

.sc-stat-label     { display: flex; align-items: center; gap: 4px; color: var(--bma-text-secondary); font-size: 13px; }
.sc-stat-value     { font-family: var(--bma-font-data); font-weight: 700; color: var(--bma-text-primary); font-size: 14px; }
.sc-stat-value--lg { font-size: 16px; }

.sc-stat-right {
  display:     flex;
  align-items: center;
  gap:         8px;
}
.sc-hint-icon {
  color:      var(--bma-text-disabled);
  flex-shrink: 0;
  transition: color var(--bma-transition-fast);
}

.sc-stat-row--hoverable {
  cursor:        pointer;
  border-radius: var(--bma-radius-sm);
  transition:    background var(--bma-transition-fast);
  padding:       8px;
  margin:        0 -8px;
}
.sc-stat-row--hoverable:hover { background: var(--bma-surface-subtle); }
.sc-stat-row--hoverable .sc-stat-label { transition: color var(--bma-transition-fast); }
.sc-stat-row--hoverable:hover .sc-stat-label { color: var(--bma-text-secondary); }
.sc-stat-row--hoverable:hover .sc-hint-icon  { color: var(--bma-text-muted); }
</style>
