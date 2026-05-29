import type { Chart as ChartJS } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import type { AtsMonitoringCard } from '@/data/types/ats'

/** Chart.js plugin that draws total count + label in the doughnut centre. */
export function makeCenterPlugin(total: number) {
  return {
    id: `center-${total}`,
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea } = chart
      const cx = (chartArea.left + chartArea.right) / 2
      const cy = (chartArea.top  + chartArea.bottom) / 2
      ctx.save()
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.font         = '900 26px Inter, sans-serif'
      ctx.fillStyle    = '#343330'
      ctx.fillText(String(total), cx, cy - 9)
      ctx.font         = '400 10px Sarabun, sans-serif'
      ctx.fillStyle    = '#8C8C8C'
      ctx.fillText('ผู้ป่วยทั้งหมด', cx, cy + 10)
      ctx.restore()
    },
  }
}

export function donutChartData(card: AtsMonitoringCard) {
  return {
    labels:   [card.inRangeLabel,  ...card.stats.map(s => s.label)],
    datasets: [{
      data:            [card.inRangeCount, ...card.stats.map(s => s.count)],
      backgroundColor: ['#4CAF50',         ...card.stats.map(s => s.color)],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

export const donutOptions = {
  responsive:          true,
  maintainAspectRatio: false,
  cutout:              '72%',
  animation:           { duration: 600 },
  layout:              { padding: 8 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: () => '',
        label: (ctx: TooltipItem<'doughnut'>) => {
          const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
          const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
          return `  ${ctx.label}: ${ctx.parsed} ราย (${pct}%)`
        },
      },
    },
  },
} as const
