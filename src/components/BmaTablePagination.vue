<template>
  <div class="table-footer">
    <span class="pg-info">
      ข้อมูลที่ {{ rangeStart }} ถึง {{ rangeEnd }} จากทั้งหมด {{ filteredTotal }} รายการ
      <span v-if="isFiltered" class="pg-filtered">(กรองจาก {{ total }} รายการ)</span>
    </span>
    <div class="pg-controls">
      <select class="pg-select" :value="pageSize" @change="onSizeChange">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
      <!-- density, color, rounded, totalVisible — set globally in vuetify.ts defaults -->
      <v-pagination
        :model-value="page"
        :length="pageCount"
        @update:model-value="$emit('update:page', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page:          number
  pageCount:     number
  pageSize:      number
  filteredTotal: number
  total:         number
  isFiltered:    boolean
}>()

const emit = defineEmits<{
  'update:page':     [n: number]
  'update:pageSize': [n: number]
}>()

const rangeStart = computed(() => Math.min((props.page - 1) * props.pageSize + 1, props.filteredTotal))
const rangeEnd   = computed(() => Math.min(props.page * props.pageSize, props.filteredTotal))

function onSizeChange(e: Event) {
  const n = Number((e.target as HTMLSelectElement).value)
  if (!isNaN(n)) emit('update:pageSize', n)
}
</script>

<style scoped>
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-top: 1px solid var(--bma-border-subtle);
}
.pg-info {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}
.pg-filtered {
  font-size: 10px;
  color: var(--bma-green-500);
  margin-left: 4px;
}
.pg-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pg-select {
  height: 30px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  padding: 0 24px 0 8px;
  font-family: var(--bma-font-data);
  font-size: 12px;
  background: var(--bma-surface) url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%238c8c8c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 6px center;
  appearance: none;
  cursor: pointer;
}
</style>
