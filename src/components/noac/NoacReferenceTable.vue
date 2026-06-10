<template>
  <section class="nrt-card">
    <!-- Collapsible header — reference data, kept folded until pulled up -->
    <button
      class="nrt-header"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div class="nrt-title-wrap">
        <span class="nrt-title">ตารางอ้างอิงขนาดยา NOAC</span>
        <span class="nrt-subtitle">NOAC DOSING REFERENCE</span>
      </div>
      <PhCaretDown :size="16" class="nrt-caret" :class="{ 'nrt-caret--open': open }" />
    </button>

    <div v-show="open" class="nrt-body">
      <div class="nrt-scroll">
        <table class="nrt-table">
          <colgroup>
            <col class="nrt-c-drug" />
            <col class="nrt-c-dose" />
            <col class="nrt-c-crit" />
            <col class="nrt-c-vte" />
            <col class="nrt-c-renal" />
            <col class="nrt-c-ix" />
          </colgroup>
          <thead>
            <tr>
              <th>ยา</th>
              <th>ขนาดยา NVAF</th>
              <th>เกณฑ์ลดขนาด (NVAF)</th>
              <th>DVT / PE / CAT</th>
              <th>CrCl ห้ามใช้</th>
              <th>ห้ามใช้ร่วม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in drugs" :key="d.drug">
              <!-- Identity -->
              <td class="nrt-drug">
                <span class="nrt-drug-en">{{ d.nameEn }}</span>
                <span class="nrt-drug-th">{{ d.nameThai }}</span>
                <span class="nrt-drug-brand">{{ d.brand }}</span>
              </td>

              <!-- NVAF dose: standard → reduced -->
              <td>
                <div class="nrt-dose-line">
                  <span class="nrt-dose-tag">มาตรฐาน</span>
                  <span class="nrt-dose">{{ fmt(d.nvaf.standard) }}</span>
                </div>
                <div v-if="d.nvaf.reduced" class="nrt-dose-line nrt-dose-line--reduced">
                  <span class="nrt-dose-tag">ลดขนาด</span>
                  <span class="nrt-dose nrt-dose--reduced">{{ fmt(d.nvaf.reduced) }}</span>
                </div>
                <span v-if="d.nvaf.note" class="nrt-note">{{ d.nvaf.note }}</span>
              </td>

              <!-- Reduction criteria — label | threshold mini-grid -->
              <td>
                <template v-if="d.nvaf.reduction">
                  <span class="nrt-rule">{{ ruleLabel(d.nvaf.reduction.mode) }}</span>
                  <dl class="nrt-crit-grid">
                    <template v-for="c in d.nvaf.reduction.criteria" :key="c.key">
                      <dt class="nrt-crit-label">{{ c.label }}</dt>
                      <dd class="nrt-crit-thr">{{ c.threshold }}</dd>
                    </template>
                  </dl>
                </template>
                <span v-else class="nrt-na">ไม่มีเกณฑ์ลดขนาด</span>
              </td>

              <!-- VTE regimen -->
              <td>
                <template v-if="d.vte.loading && d.vte.maintenance">
                  <div class="nrt-vte-line">
                    <span class="nrt-dose-tag">นำ</span>
                    <span class="nrt-vte-val">{{ fmt(d.vte.loading.dose) }} ×{{ d.vte.loading.durationText }}</span>
                  </div>
                  <div class="nrt-vte-line">
                    <span class="nrt-dose-tag">คงระดับ</span>
                    <span class="nrt-vte-val">{{ fmt(d.vte.maintenance) }}</span>
                  </div>
                </template>
                <template v-else-if="d.vte.parenteralLeadInDays">
                  <div class="nrt-vte-line">
                    <span class="nrt-dose-tag">ฉีดนำ</span>
                    <span class="nrt-vte-val">≥ {{ d.vte.parenteralLeadInDays }} วัน</span>
                  </div>
                  <div class="nrt-vte-line">
                    <span class="nrt-dose-tag">ขนาด</span>
                    <span class="nrt-vte-val">เท่า NVAF</span>
                  </div>
                </template>
                <span v-if="d.vte.note" class="nrt-note">{{ d.vte.note }}</span>
              </td>

              <!-- Renal contraindication -->
              <td class="nrt-renal">
                <span class="nrt-renal-val">&lt; {{ d.renalContraCrClBelow }}</span>
                <span class="nrt-renal-unit">mL/min</span>
              </td>

              <!-- Interactions -->
              <td class="nrt-ix">
                <div class="nrt-ix-block">
                  <span class="nrt-ix-tag nrt-ix-tag--contra">ห้าม</span>
                  <span class="nrt-ix-text">{{ d.interactions.contraindicated }}</span>
                </div>
                <div v-if="d.interactions.caution" class="nrt-ix-block">
                  <span class="nrt-ix-tag nrt-ix-tag--caution">ระวัง</span>
                  <span class="nrt-ix-text nrt-ix-text--muted">{{ d.interactions.caution }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="nrt-footnote">
        อ้างอิง: 2023 ESC AF Guidelines · Thai FDA inserts · ใช้ประกอบการตัดสินใจ ยืนยันกับแพทย์ก่อนสั่งยา
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PhCaretDown } from '@phosphor-icons/vue'
import { NOAC_REFERENCE_LIST, formatDose, type Dose, type ReductionMode } from '@/data/noacReference'

const props = withDefaults(defineProps<{ defaultOpen?: boolean }>(), { defaultOpen: false })

const open = ref(props.defaultOpen)
const drugs = NOAC_REFERENCE_LIST
const fmt = (d: Dose) => formatDose(d)
const ruleLabel = (mode: ReductionMode) =>
  mode === 'min2' ? 'ลดเมื่อเข้าเกณฑ์ ≥ 2 ข้อ' : 'ลดเมื่อเข้าเกณฑ์ ≥ 1 ข้อ'
</script>

<style scoped>
/* Card register — mirrors .na-hist-card on the page exactly */
.nrt-card {
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}

/* ── Collapsible header — mirrors .na-hist-header (white, not tinted) ── */
.nrt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px 18px;
  background: var(--bma-surface);
  border: none;
  cursor: pointer;
  text-align: left;
}
.nrt-header:hover { background: var(--bma-surface-light); }
.nrt-title-wrap { display: flex; align-items: center; gap: 8px; }
.nrt-title { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.nrt-subtitle {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-tertiary); background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-card);
  padding: 2px 8px; border-radius: var(--bma-radius-full); letter-spacing: .04em;
}
.nrt-caret {
  color: var(--bma-text-tertiary);
  transition: transform .2s ease;
  flex-shrink: 0;
}
.nrt-caret--open { transform: rotate(180deg); }

/* ── Body ── */
.nrt-body { border-top: 1px solid var(--bma-border-subtle); }
.nrt-scroll { overflow-x: auto; }

/* ── Table — fixed layout so every column aligns across rows ── */
.nrt-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}
.nrt-c-drug  { width: 152px; }
.nrt-c-dose  { width: 168px; }
.nrt-c-crit  { width: 248px; }
.nrt-c-vte   { width: 196px; }
.nrt-c-renal { width: 92px; }
.nrt-c-ix    { width: 324px; }

.nrt-table thead tr {
  background: var(--bma-surface-light);
  border-bottom: 2px solid var(--bma-border-subtle);
}
.nrt-table th {
  font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary);
  text-align: left;
  padding: 10px 14px;
  white-space: nowrap;
}
.nrt-table td {
  height: 156px;            /* equal-height rows — short cells pad out, hover band stays uniform */
  padding: 16px 14px;
  border-bottom: 1px solid var(--bma-border-subtle);
  vertical-align: top;
  color: var(--bma-text-primary);
}
.nrt-table tbody tr:last-child td { border-bottom: none; }
.nrt-table tbody tr:hover td { background: var(--bma-surface-light); }

/* Shared small uppercase tag (มาตรฐาน / ลดขนาด / นำ / คงระดับ) */
.nrt-dose-tag {
  flex-shrink: 0;
  width: 52px;
  font-size: 10px; font-weight: 700;
  letter-spacing: .03em;
  color: var(--bma-text-tertiary);
  padding-top: 2px;
}

/* ── Drug identity ── */
.nrt-drug { display: flex; flex-direction: column; gap: 2px; }
.nrt-drug-en {
  font-family: var(--bma-font-data);
  font-size: 14px; font-weight: 700;
  color: var(--bma-text-primary);
}
.nrt-drug-th { font-size: 12px; color: var(--bma-text-secondary); }
.nrt-drug-brand {
  font-family: var(--bma-font-data);
  font-size: 11px; color: var(--bma-text-tertiary);
}

/* ── Dose column ── */
.nrt-dose-line { display: flex; align-items: baseline; gap: 8px; }
.nrt-dose-line + .nrt-dose-line { margin-top: 6px; }
.nrt-dose {
  font-family: var(--bma-font-data);
  font-size: 14px; font-weight: 700;
  color: var(--bma-text-primary);
}
.nrt-dose--reduced { color: var(--inr-supra-text); }
.nrt-note {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--bma-text-tertiary);
  line-height: 1.5;
}

/* ── Reduction criteria mini-grid ── */
.nrt-rule {
  display: block;
  margin-bottom: 8px;
  font-size: 12px; font-weight: 600;
  color: var(--inr-supra-text);
}
.nrt-crit-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
}
.nrt-crit-label { font-size: 12px; color: var(--bma-text-secondary); }
.nrt-crit-thr {
  margin: 0;
  font-family: var(--bma-font-data);
  font-size: 12px; font-weight: 600;
  color: var(--bma-text-primary);
}
.nrt-na { font-size: 12px; color: var(--bma-text-tertiary); }

/* ── VTE column ── */
.nrt-vte-line { display: flex; align-items: baseline; gap: 8px; }
.nrt-vte-line + .nrt-vte-line { margin-top: 6px; }
.nrt-vte-val {
  font-family: var(--bma-font-data);
  font-size: 13px; font-weight: 600;
  color: var(--bma-text-primary);
}

/* ── Renal contraindication ── */
.nrt-renal { white-space: nowrap; }
.nrt-renal-val {
  display: block;
  font-family: var(--bma-font-data);
  font-size: 17px; font-weight: 800;
  color: var(--bma-emergency);
}
.nrt-renal-unit { font-size: 11px; color: var(--bma-text-tertiary); }

/* ── Interactions ── */
.nrt-ix-block { display: flex; gap: 8px; }
.nrt-ix-block + .nrt-ix-block { margin-top: 8px; }
.nrt-ix-tag {
  flex-shrink: 0;
  font-size: 10px; font-weight: 700;
  padding: 1px 8px; border-radius: var(--bma-radius-full);
  height: fit-content;
}
.nrt-ix-tag--contra  { color: var(--bma-emergency); background: var(--bma-emergency-bg-soft); }
.nrt-ix-tag--caution { color: var(--bma-urgency-text); background: var(--bma-urgency-bg-soft); }
.nrt-ix-text { font-size: 12px; color: var(--bma-text-primary); line-height: 1.5; }
.nrt-ix-text--muted { color: var(--bma-text-secondary); }

/* ── Footnote ── */
.nrt-footnote {
  margin: 0;
  padding: 12px 16px;
  font-size: 11px;
  color: var(--bma-text-tertiary);
  border-top: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
}
</style>
