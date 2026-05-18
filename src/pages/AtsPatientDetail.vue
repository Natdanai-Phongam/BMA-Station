<template>
  <div class="content-wrap">

    <!-- ── White header zone ────────────────────────────────── -->
    <div class="page">
      <div class="page-header">
        <button class="back-btn" @click="router.back()">
          <PhArrowLeft :size="18" color="#595959" />
        </button>
        <h1 class="page-title">รายละเอียดผู้ป่วย</h1>
      </div>
    </div>

    <!-- ── Gray content zone ─────────────────────────────────── -->
    <div class="main-wrap">

    <!-- ── Patient info card ──────────────────────────────── -->
    <div class="patient-card">
      <div class="patient-left">
        <div class="avatar" />
        <div class="patient-meta">
          <div class="name-row">
            <span class="patient-name">{{ p.name }}</span>
            <span class="hn-badge">HN: {{ p.hn }}</span>
            <span class="age-text">อายุ {{ p.age }} ปี</span>
            <span class="insurance-label">สิทธิการรักษาหลัก</span>
            <span class="insurance-value">{{ p.insuranceType }}</span>
          </div>
          <div class="badge-row">
            <span class="complication-summary-badge">
              สรุปภาวะแทรกซ้อน
              <span class="complication-count">{{ p.totalComplications }} ครั้ง</span>
            </span>
            <span class="risk-badge">ความเสี่ยงสูง (High Risk)</span>
          </div>
        </div>
      </div>
      <button class="btn-add">
        <PhPlus :size="14" />
        ภาวะแทรกข้อน
      </button>
    </div>

    <!-- ── Complication stat cards ────────────────────────── -->
    <div class="stat-grid">
      <div
        v-for="s in p.complicationSummary"
        :key="s.type"
        class="stat-card"
      >
        <div class="stat-top">
          <span class="stat-type-label">{{ typeLabel[s.type] }}</span>
          <div class="stat-icon-wrap" :style="`background:${cfg[s.type].iconBg}`">
            <component :is="cfg[s.type].icon" :size="20" :color="cfg[s.type].color" />
          </div>
        </div>
        <div class="stat-count">
          {{ s.count }} <span class="stat-unit">ครั้ง</span>
        </div>
        <div class="stat-last">(ครั้งล่าสุด : {{ s.lastDate }})</div>
      </div>
    </div>

    <!-- ── Chart ──────────────────────────────────────────── -->
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">ภาพรวมของการเกิดภาวะแทรกซ้อนใน 1 ปีที่ผ่านมา</span>
        <div class="chart-legend">
          <span v-for="(c, t) in cfg" :key="t" class="legend-item">
            <span class="legend-dot" :style="`background:${c.color}`" />
            {{ typeLabel[t as ComplicationType] }}
          </span>
        </div>
      </div>
      <div class="chart-wrap">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- ── Complication history table ────────────────────── -->
    <div class="history-card">
      <div class="history-header">
        <span class="history-title">ประวัติภาวะแทรกซ้อน</span>
        <button class="btn-export">
          <PhArrowSquareOut :size="13" />
          Export to CSV
        </button>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>คำสั่ง</th>
            <th>วันที่เกิดเหตุ</th>
            <th>ประเภทของภาวะแทรกซ้อน</th>
            <th>รายละเอียด</th>
            <th>ความรุนแรง</th>
            <th>การจัดการที่ได้รับ</th>
            <th>สถานะปัจจุบัน</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in p.complications" :key="c.id" class="data-row">
            <td>
              <button class="action-btn">
                <PhArrowSquareOut :size="15" color="#595959" />
              </button>
            </td>
            <td class="date-cell">{{ c.date }}</td>
            <td>
              <span class="comp-badge" :class="`comp-badge--${c.type}`">
                {{ typeLabel[c.type] }}
              </span>
            </td>
            <td>{{ c.detail }}</td>
            <td>
              <span class="severity-badge" :class="`severity-badge--${c.severity}`">
                {{ c.severity.toUpperCase() }}
              </span>
            </td>
            <td>{{ c.treatment }}</td>
            <td>
              <span class="status-text">
                <span class="status-dot" />
                {{ c.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="table-footer">
        <span class="pg-info">
          ข้อมูลที่ 1 ถึง {{ p.complications.length }} จากทั้งหมด {{ p.complications.length }} รายการ
        </span>
        <div class="pg-controls">
          <select class="pg-select"><option>10</option></select>
          <div class="pagination">
            <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleLeft :size="12" /></button>
            <button class="pg-btn pg-btn--disabled" disabled><PhCaretLeft :size="12" /></button>
            <button class="pg-btn pg-btn--active">1</button>
            <button class="pg-btn pg-btn--disabled" disabled><PhCaretRight :size="12" /></button>
            <button class="pg-btn pg-btn--disabled" disabled><PhCaretDoubleRight :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    </div><!-- /.main-wrap -->
  </div><!-- /.content-wrap -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import {
  PhArrowLeft, PhPlus, PhArrowSquareOut,
  PhDrop, PhHeartbeat, PhPill,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
} from '@phosphor-icons/vue'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { PatientDetail, ComplicationType } from '@/data/types/patient-detail'
import rawDetail from '@/data/mock/patient-detail.json'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const router = useRouter()
const p = rawDetail as PatientDetail

// ── Complication type config ──────────────────────────────
const cfg: Record<ComplicationType, { label: string; color: string; iconBg: string; icon: Component }> = {
  'bleeding':        { label: 'Bleeding',        color: '#E57373', iconBg: '#FEECEC', icon: PhDrop      },
  'thromboembolism': { label: 'Thromboembolism', color: '#64B5F6', iconBg: '#E3F2FD', icon: PhHeartbeat },
  'side-effects':    { label: 'Side Effects',    color: '#FFB74D', iconBg: '#FFF3E0', icon: PhPill      },
}

const typeLabel: Record<ComplicationType, string> = {
  'bleeding':        'Bleeding',
  'thromboembolism': 'Thromboembolism',
  'side-effects':    'Side Effects',
}

const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// ── Chart data ────────────────────────────────────────────
// Stacked bar: x = month category, y = count per type
const chartData = computed(() => {
  const counts: Record<ComplicationType, number[]> = {
    'bleeding':        new Array(12).fill(0),
    'thromboembolism': new Array(12).fill(0),
    'side-effects':    new Array(12).fill(0),
  }
  for (const c of p.complications) counts[c.type][c.month - 1]++

  return {
    labels: thaiMonths,
    datasets: [
      { label: 'Bleeding',        data: counts['bleeding'],        backgroundColor: '#E57373' },
      { label: 'Thromboembolism', data: counts['thromboembolism'], backgroundColor: '#64B5F6' },
      { label: 'Side Effects',    data: counts['side-effects'],    backgroundColor: '#FFB74D' },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      filter: (item: TooltipItem<'bar'>) => (item.parsed.y as number) > 0,
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) => items[0]?.label ?? '',
        label: (ctx: TooltipItem<'bar'>) =>
          `  ${ctx.dataset.label ?? ''}: ${ctx.parsed.y} ครั้ง`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid:   { display: false },
      border: { display: false },
      ticks:  { font: { size: 11 } },
    },
    y: {
      stacked:     true,
      beginAtZero: true,
      grid:   { color: '#F0F0F0' },
      border: { display: false },
      ticks:  { stepSize: 1, precision: 0 },
    },
  },
}
</script>

<style scoped>
/* ── Two-zone layout ───────────────────────────────────── */
.content-wrap { display: flex; flex-direction: column; height: 100%; }

.page { background: #fff; padding: 24px 24px 24px; border-bottom: 1px solid #E8E8E8; }

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-title { font-size: 22px; font-weight: 700; color: #343330; margin: 0; }

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid #D9D9D9;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s;
}
.back-btn:hover { background: #F5F5F5; }

.main-wrap {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Patient card ──────────────────────────────────────── */
.patient-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.patient-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #D9D9D9;
  flex-shrink: 0;
}

.patient-meta { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.patient-name    { font-size: 16px; font-weight: 700; color: #343330; }
.age-text        { font-size: 13px; color: #595959; }
.insurance-label { font-size: 13px; color: #8C8C8C; }
.insurance-value { font-size: 13px; color: #343330; font-weight: 600; }

.hn-badge {
  display: inline-block;
  padding: 2px 10px;
  border: 1.5px solid #00744B;
  border-radius: 99px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #00744B;
}

.badge-row { display: flex; align-items: center; gap: 8px; }

.complication-summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #00744B;
  color: #fff;
  padding: 3px 4px 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
}

.complication-count {
  background: #fff;
  color: #00744B;
  border-radius: 99px;
  padding: 1px 8px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.risk-badge {
  display: inline-block;
  padding: 3px 12px;
  background: #FFF3E0;
  color: #E65100;
  border: 1.5px solid #FFB74D;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  background: #00744B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Sarabun', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s;
}
.btn-add:hover { background: #006A33; }

/* ── Stat cards ────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 16px 20px;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stat-type-label { font-size: 14px; font-weight: 700; color: #343330; }

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-count {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #343330;
  line-height: 1.1;
}
.stat-unit { font-size: 18px; font-family: 'Sarabun', sans-serif; }

.stat-last {
  font-size: 12px;
  color: #8C8C8C;
  margin-top: 4px;
}

/* ── Chart ─────────────────────────────────────────────── */
.chart-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 18px 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title { font-size: 14px; font-weight: 700; color: #343330; }

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #595959;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-wrap { height: 200px; }

/* ── History card ──────────────────────────────────────── */
.history-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
}

.history-title { font-size: 15px; font-weight: 700; color: #343330; }

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1.5px solid #D9D9D9;
  border-radius: 7px;
  background: #fff;
  font-family: 'Sarabun', sans-serif;
  font-size: 13px;
  color: #595959;
  cursor: pointer;
}
.btn-export:hover { background: #F5F5F5; }

/* ── Data table ─────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table thead tr { background: #FAFAFA; border-bottom: 1.5px solid #F0F0F0; }
.data-table th {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #8C8C8C;
  text-align: left;
  white-space: nowrap;
}
.data-row { border-bottom: 1px solid #F5F5F5; transition: background .1s; }
.data-row:last-child { border-bottom: none; }
.data-row:hover { background: #FAFAFA; }
.data-table td { padding: 10px 14px; color: #343330; vertical-align: middle; }

.date-cell { white-space: nowrap; font-family: 'Inter', sans-serif; font-size: 12px; }

.action-btn {
  width: 30px; height: 30px;
  border-radius: 6px;
  border: 1.5px solid #E8E8E8;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color .15s, background .15s;
}
.action-btn:hover { border-color: #00744B; background: #E6F5EE; }

/* Complication type badges */
.comp-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.comp-badge--bleeding        { background: #FEECEC; color: #B72C2C; }
.comp-badge--thromboembolism { background: #E3F2FD; color: #1565C0; }
.comp-badge--side-effects    { background: #FFF3E0; color: #E65100; }

/* Severity badges */
.severity-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: #fff;
}
.severity-badge--severe   { background: #B72C2C; }
.severity-badge--moderate { background: #FB8C00; }
.severity-badge--mild     { background: #4CAF50; }

/* Status */
.status-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #00744B;
}
.status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #4CAF50;
  flex-shrink: 0;
}

/* ── Table footer / Pagination ─────────────────────────── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #F0F0F0;
}
.pg-info { font-family: 'Inter', sans-serif; font-size: 12px; color: #8C8C8C; }
.pg-controls { display: flex; align-items: center; gap: 10px; }
.pg-select {
  height: 28px; border: 1.5px solid #D9D9D9; border-radius: 6px;
  padding: 0 22px 0 8px; font-size: 12px; font-family: 'Inter', sans-serif;
  background: #fff; appearance: none; cursor: pointer;
}
.pagination { display: flex; gap: 3px; }
.pg-btn {
  width: 28px; height: 28px;
  border-radius: 6px; border: 1.5px solid #D9D9D9;
  background: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; color: #454545;
  transition: all .15s;
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover { border-color: #00744B; color: #00744B; background: #E6F5EE; }
.pg-btn--active   { background: #00744B; border-color: #00744B; color: #fff; font-weight: 700; }
.pg-btn--disabled { color: #D9D9D9; cursor: not-allowed; }
</style>
