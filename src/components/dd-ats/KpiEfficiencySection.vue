<template>
  <div class="kpi-sub-section kpi-sub-section--sep">
    <div class="kpi-panel-head">
      <PhUsers :size="14" color="#8C8C8C" />
      <span class="kpi-ph-name">ประสิทธิภาพระบบ</span>
      <span class="kpi-ph-sub">System Efficiency</span>
    </div>

    <div class="keff-staff-label">บุคลากรในโปรแกรม DD-ATS</div>
    <div class="keff-staff-row">
      <div
        v-for="s in staffItems" :key="s.key"
        class="keff-staff-chip"
        :class="{ 'keff-staff-chip--total': s.key === 'total' }"
      >
        <span class="keff-staff-n">{{ s.count }}</span>
        <span class="keff-staff-role">{{ s.label }}</span>
      </div>
    </div>

    <div class="keff-divider" />

    <div class="keff-workload">
      <div class="keff-wl-row">
        <span class="keff-wl-name">ผู้ป่วย active ในโปรแกรม</span>
        <span class="keff-wl-val">{{ patientCount }} ราย</span>
      </div>
      <div class="keff-wl-row">
        <span class="keff-wl-name">ผู้ป่วยต่อวัน (เฉลี่ย)</span>
        <span class="keff-wl-val">{{ efficiency.patientsPerDay.toFixed(1) }} ราย/วัน</span>
      </div>
      <div class="keff-wl-row">
        <span class="keff-wl-name">ผู้ป่วยต่อเภสัชกร</span>
        <span class="keff-wl-val">{{ efficiency.workloadRatio.toFixed(1) }} ราย/คน</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhUsers } from '@phosphor-icons/vue'

defineProps<{
  staffItems:   { key: string; count: number; label: string }[]
  efficiency:   { patientsPerDay: number; workloadRatio: number }
  patientCount: number
}>()
</script>
