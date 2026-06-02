<template>
  <div class="mp-panel">
    <!-- Year navigation -->
    <div class="mp-year-nav">
          <button class="mp-year-btn" @click="year--" :disabled="year <= minYear">
        <PhCaretLeft :size="13" />
      </button>
      <span class="mp-year-label">{{ year + 543 }}</span>
      <button class="mp-year-btn" @click="year++" :disabled="year >= maxYear">
        <PhCaretRight :size="13" />
      </button>
    </div>

    <!-- Month grid -->
    <div class="mp-grid">
      <button
        v-for="(label, idx) in MONTHS"
        :key="idx"
        class="mp-cell"
        :class="{
          'mp-cell--selected': isSelected(idx + 1),
          'mp-cell--disabled': isDisabled(idx + 1),
        }"
        :disabled="isDisabled(idx + 1)"
        @click="select(idx + 1)"
      >{{ label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import { getAppDate } from '@/utils/app-date'

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const props = defineProps<{
  modelValue: Date | null
  min?: Date
  max?: Date
}>()

const emit = defineEmits<{
  'update:modelValue': [Date]
}>()

const appNow  = getAppDate()
const minYear = computed(() => props.min ? props.min.getFullYear() : appNow.getFullYear())
const maxYear = computed(() => props.max ? props.max.getFullYear() : appNow.getFullYear())

const year = ref(props.modelValue ? props.modelValue.getFullYear() : (props.max ?? appNow).getFullYear())

watch(() => props.modelValue, (d) => {
  if (d) year.value = d.getFullYear()
})

function isSelected(month: number) {
  return props.modelValue != null
    && props.modelValue.getFullYear() === year.value
    && props.modelValue.getMonth() + 1 === month
}

function isDisabled(month: number) {
  const d = new Date(year.value, month - 1, 1)
  if (props.min && d < new Date(props.min.getFullYear(), props.min.getMonth(), 1)) return true
  if (props.max && d > new Date(props.max.getFullYear(), props.max.getMonth(), 1)) return true
  return false
}

function select(month: number) {
  if (isDisabled(month)) return
  emit('update:modelValue', new Date(year.value, month - 1, 1))
}
</script>

<style scoped>
.mp-panel {
  background:    var(--bma-surface);
  border:        1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow:    0 4px 16px rgba(0,0,0,.12);
  padding:       12px;
  width:         220px;
}

.mp-year-nav {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  margin-bottom:   10px;
}

.mp-year-label {
  font-family: var(--bma-font-data);
  font-size:   13px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}

.mp-year-btn {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           28px;
  height:          28px;
  border:          none;
  border-radius:   var(--bma-radius-sm);
  background:      transparent;
  color:           var(--bma-text-secondary);
  cursor:          pointer;
  transition:      background 120ms ease, color 120ms ease;
}
.mp-year-btn:hover:not(:disabled) {
  background: var(--bma-surface-subtle);
  color:      var(--bma-text-primary);
}
.mp-year-btn:disabled {
  color:  var(--bma-text-disabled);
  cursor: not-allowed;
}

.mp-grid {
  display:               grid;
  grid-template-columns: repeat(4, 1fr);
  gap:                   4px;
}

.mp-cell {
  height:        40px;
  border:        none;
  border-radius: var(--bma-radius-sm);
  background:    transparent;
  font-family:   var(--bma-font-data);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-secondary);
  cursor:        pointer;
  transition:    background 120ms ease, color 120ms ease;
}
.mp-cell:hover:not(:disabled):not(.mp-cell--selected) {
  background: var(--bma-surface-subtle);
  color:      var(--bma-text-primary);
}
.mp-cell--selected {
  background: var(--bma-green-500);
  color:      #fff;
}
.mp-cell--disabled {
  color:  var(--bma-text-disabled);
  cursor: not-allowed;
}
</style>
