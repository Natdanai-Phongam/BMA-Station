<template>
  <div class="content-wrap">

    <!-- ── White header zone ────────────────────────────────── -->
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            โครงการบูรณาการดิจิทัลแดชบอร์ดเพื่อสนับสนุนการใช้ยาต้านการแข็งตัวของเลือดอย่างสมเหตุผล
          </h1>
          <div class="page-subtitle">
            (Digital Dashboard Integrated Anticoagulant Stewardship Program; DD-ATS)
          </div>
        </div>
      </div>

      <div class="tabs-wrap">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="bma-tab"
          :class="activeTab === tab.value ? 'bma-tab--active' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span v-if="tab.count !== null" class="bma-tab-count">{{ tab.count }}</span>
        </div>
      </div>
    </div>

    <!-- ── Gray content zone ─────────────────────────────────── -->
    <div class="main-wrap">

      <!-- ── KPI Strip — reactive to active tab ──────────────── -->
      <div class="kpi-strip">
        <div v-for="(metric, idx) in activeKpi" :key="idx" class="kpi-cell">
          <div class="kpi-eyebrow">{{ metric.eyebrow }}</div>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ metric.value }}</span>
            <span v-if="metric.unit" class="kpi-unit">{{ metric.unit }}</span>
            <span
              v-if="metric.badge"
              class="kpi-badge"
              :class="metric.badge.good ? 'kpi-badge--good' : 'kpi-badge--alert'"
     
              >{{ metric.badge.label }}</span>
          </div>
          <div class="kpi-context">{{ metric.context }}</div>
        </div>
      </div>

      <!-- Dashboard Tab -->
      <div v-show="activeTab === 'dashboard'">

        <!-- Monitoring cards -->
        <div class="monitoring-grid">
          <div
            v-for="card in cards"
            :key="card.id"
            class="monitoring-card"
          >
            <!-- Card header: icon + title + subtitle -->
            <div class="mc-card-header">
              <div class="mc-icon-wrap" :style="`background:${card.iconBg}`">
                <component
                  :is="iconMap[card.iconName]"
                  :size="18"
                  :color="card.iconColor"
                />
              </div>
              <div>
                <div class="mc-title">{{ card.title }}</div>
                <div class="mc-subtitle">{{ card.subtitle }}</div>
              </div>
            </div>

            <!-- Card body: donut + right panel -->
            <div class="mc-body">
              <div class="donut-wrap">
                <Doughnut
                  :data="chartPropsMap[card.id].data"
                  :options="donutOptions"
                  :plugins="chartPropsMap[card.id].plugins"
                />
              </div>

              <div class="mc-right">
                <!-- In-range box (green) -->
                <div class="mc-in-range-box">
                  <div class="mc-in-range-left">
                    <span class="mc-in-count">{{ card.inRangeCount }} ราย</span>
                    <span class="mc-in-label">
                      {{ card.inRangeLabel }}
                      <template v-if="card.inRangeRange">
                        &nbsp;·&nbsp;( {{ card.inRangeRange }} )
                      </template>
                    </span>
                  </div>
                  <span class="mc-in-pct">{{ card.inRangePct }}</span>
                </div>

                <!-- Out-of-range alert box (red) -->
                <div class="mc-alert-box">
                  <div class="mc-alert-left">
                    <PhWarning :size="13" color="#B72C2C" />
                    ต้องติดตาม {{ card.outOfRangeCount }} ราย
                  </div>
                  <span class="mc-alert-pct">{{ card.outOfRangePct }}</span>
                </div>

                <!-- Stat rows -->
                <div class="mc-stat-list">
                  <div
                    v-for="stat in card.stats"
                    :key="stat.label"
                    class="mc-stat-row"
                  >
                    <span class="mc-stat-dot" :style="`background:${stat.color}`" />
                    <div class="mc-stat-labels">
                      <span class="mc-stat-name">{{ stat.label }}</span>
                      <span v-if="stat.sublabel" class="mc-stat-sub">( {{ stat.sublabel }} )</span>
                      <!-- spacer keeps min-width consistent when no sublabel -->
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
        </div>

        <!-- Summary section -->
        <div class="summary-container">
          <div class="section-header">
            <div class="section-icon-wrap">
              <PhBell :size="15" color="#FB8C00" />
            </div>
            สรุปการแจ้งเตือนและปรับขนาดยา
            <span class="section-badge">Consultation &amp; Adjustment Summary</span>
          </div>

          <div class="summary-grid">
            <div
              v-for="card in cards"
              :key="card.id"
              class="summary-panel"
            >
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

            <!-- Out-of-range row — hoverable when patients exist -->
            <template v-if="getSummaryPatients(card.id, 'outOfRange').length > 0">
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
                  <div
                    v-for="pt in getSummaryPatients(card.id, 'outOfRange')"
                    :key="pt.id"
                    class="summ-tt-row"
                  >
                    <div class="summ-tt-info">
                      <span class="summ-tt-name">{{ pt.name }}</span>
                      <div class="summ-tt-sub">
                        <span class="summ-tt-hn">HN {{ pt.hn }}</span>
                        <span class="summ-tt-badge" :class="`summ-st--${pt.status}`">{{ pt.statusLabel }}</span>
                      </div>
                    </div>
                    <button class="summ-tt-nav" @click="goToPatient(pt.id)" title="ดูรายละเอียด">
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

            <!-- Referrals row — hoverable when patients exist -->
            <template v-if="getSummaryPatients(card.id, 'referrals').length > 0">
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
                  <div
                    v-for="pt in getSummaryPatients(card.id, 'referrals')"
                    :key="pt.id"
                    class="summ-tt-row"
                  >
                    <div class="summ-tt-info">
                      <span class="summ-tt-name">{{ pt.name }}</span>
                      <div class="summ-tt-sub">
                        <span class="summ-tt-hn">HN {{ pt.hn }}</span>
                        <span class="summ-tt-badge" :class="`summ-st--${pt.status}`">{{ pt.statusLabel }}</span>
                      </div>
                    </div>
                    <button class="summ-tt-nav" @click="goToPatient(pt.id)" title="ดูรายละเอียด">
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
          </div>
        </div>
      </div>

      <!-- ── Warfarin patient list ─────────────────────────── -->
      <div v-show="activeTab === 'warfarin'">

        <!-- Section header: identity + record count (Pattern 14) -->
        <div class="tab-section-header">
          <span class="tab-section-title">การจ่าย Warfarin</span>
          <span class="tab-section-count">ผู้ป่วยทั้งหมด {{ warfarinTotal }} ราย</span>
        </div>

        <!-- Main filter bar -->
        <div class="filter-bar">
          <div class="filter-search">
            <PhMagnifyingGlass :size="15" color="#BFBFBF" class="fi-icon" />
            <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่เริ่มต้น" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่สิ้นสุด" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <button class="btn-search">ค้นหา</button>
        </div>

        <!-- Table card -->
        <div class="table-card">
          <div class="table-scroll-wrap">
            <table class="data-table data-table--warfarin">
              <thead>
                <tr>
                  <th class="col-action">คำสั่ง</th>
                  <th class="col-name">ชื่อ - นามสกุล</th>
                  <th class="col-hospital">โรงพยาบาล</th>
                  <th class="col-status">สถานะ</th>
                  <th class="col-inr">INR</th>
                  <th class="col-ttr">TTR (%)</th>
                  <th class="col-dose">ขนาดยา / สัปดาห์</th>
                  <th class="col-ixn">Drug Interaction</th>
                  <th class="col-concordance">แนวทางการจ่ายยา</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in wfPaged"
                  :key="p.id"
                  class="data-row"
                  :class="`data-row--${p.status}`"
                >
                  <td class="col-action">
                    <button class="action-btn" @click="goToPatient(p.id)" title="ดูรายละเอียด">
                      <PhArrowSquareOut :size="16" color="#595959" />
                    </button>
                  </td>
                  <td class="col-name">
                    <div class="patient-name">{{ p.name }}</div>
                    <div class="patient-hn-row">
                      <span class="patient-hn">{{ p.hn }}</span>
                    </div>
                  </td>
                  <td>{{ p.hospital }}</td>
                  <td class="col-status">
                    <span class="status-badge" :class="`status-badge--${p.status}`">
                      {{ warfarinStatusLabel[p.status] }}
                    </span>
                  </td>
                  <td class="col-inr">
                    <span class="inr-val" :class="p.inr.alert ? 'inr-val--alert' : ''">
                      {{ p.inr.value }}
                    </span>
                  </td>
                  <td class="col-ttr">
                    <template v-if="p.wf">
                      <div class="ttr-display">
                        <span class="ttr-val" :class="`ttr--${p.wf.ttr.status}`">{{ p.wf.ttr.value }}%</span>
                        <span class="ttr-status-badge" :class="`ttr-badge--${p.wf.ttr.status}`">{{ ttrStatusLabel[p.wf.ttr.status] }}</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-dose">
                    <template v-if="p.wf">
                      <div class="dose-display">
                        <span class="dose-val">{{ p.wf.profile.currentDoseMgWk }}</span>
                        <span class="dose-unit">mg/สป.</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-ixn">
                    <v-tooltip
                      v-if="majorIxnCount(p.wf) > 0"
                      location="top"
                      :max-width="340"
                      content-class="ixn-tt-overlay"
                    >
                      <template #activator="{ props: ttProps }">
                        <span v-bind="ttProps" class="ixn-badge ixn-badge--hoverable">
                          <PhWarning :size="11" />
                          {{ majorIxnCount(p.wf) }}
                        </span>
                      </template>
                      <div class="ixn-tt-header">Drug Interactions · Major</div>
                      <div class="tt-scroll-body">
                        <div
                          v-for="med in getMajorIxns(p.wf)"
                          :key="med.name"
                          class="ixn-tt-row"
                        >
                          <div class="ixn-tt-name-row">
                            <span class="ixn-tt-name">{{ med.name }}</span>
                            <span class="ixn-tt-effect" :class="`ixn-effect--${med.effect}`">
                              {{ effectLabel[med.effect] }}
                            </span>
                          </div>
                          <div class="ixn-tt-note">{{ med.note }}</div>
                        </div>
                      </div>
                    </v-tooltip>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-concordance">
                    <template v-if="p.wf?.doseAdjustments?.length">
                      <span
                        class="concordance-badge"
                        :class="wfConcordanceBadgeClass(lastDoseAdjustment(p.wf))"
                      >
                        {{ wfConcordanceLabel(lastDoseAdjustment(p.wf)) }}
                      </span>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Warfarin pagination -->
          <div class="table-footer">
            <span class="pg-info">
              ข้อมูลที่ {{ Math.min((wfPage - 1) * wfPageSize + 1, warfarinTotal) }}
              ถึง {{ Math.min(wfPage * wfPageSize, warfarinTotal) }}
              จากทั้งหมด {{ warfarinTotal }} รายการ
            </span>
            <div class="pg-controls">
              <select class="pg-select" v-model.number="wfPageSize">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <div class="pagination">
                <button class="pg-btn" :class="{ 'pg-btn--disabled': wfPage === 1 }" :disabled="wfPage === 1" @click="wfPage = 1">
                  <PhCaretDoubleLeft :size="13" />
                </button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': wfPage === 1 }" :disabled="wfPage === 1" @click="wfPage--">
                  <PhCaretLeft :size="13" />
                </button>
                <button v-for="p in visiblePages(wfPage, wfPageCount)" :key="p"
                        class="pg-btn" :class="{ 'pg-btn--active': p === wfPage }"
                        @click="wfPage = p">{{ p }}</button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': wfPage === wfPageCount }" :disabled="wfPage === wfPageCount" @click="wfPage++">
                  <PhCaretRight :size="13" />
                </button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': wfPage === wfPageCount }" :disabled="wfPage === wfPageCount" @click="wfPage = wfPageCount">
                  <PhCaretDoubleRight :size="13" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── NOACs patient list ──────────────────────────────── -->
      <div v-show="activeTab === 'noacs'">

        <!-- Section header: identity + record count (Pattern 14) -->
        <div class="tab-section-header">
          <span class="tab-section-title">การจ่าย NOACs</span>
          <span class="tab-section-count">ผู้ป่วยทั้งหมด {{ noacsTotal }} ราย</span>
        </div>

        <div class="filter-bar">
          <div class="filter-search">
            <PhMagnifyingGlass :size="15" color="#BFBFBF" class="fi-icon" />
            <input class="filter-input" placeholder="ค้นหาชื่อ - นามสกุล" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่เริ่มต้น" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <div class="filter-date">
            <input class="filter-input" placeholder="วันที่สิ้นสุด" />
            <PhCalendar :size="15" color="#BFBFBF" class="fi-icon-r" />
          </div>
          <button class="btn-search">ค้นหา</button>
        </div>

        <div class="table-card">
          <div class="table-scroll-wrap">
            <table class="data-table data-table--noacs">
              <thead>
                <tr>
                  <th class="col-action">คำสั่ง</th>
                  <th class="col-name">ชื่อ - นามสกุล</th>
                  <th class="col-hospital">โรงพยาบาล</th>
                  <th class="col-status">สถานะ</th>
                  <th class="col-drug">ยาที่ใช้ / ขนาด</th>
                  <th class="col-crcl">CrCl</th>
                  <th class="col-weight">น้ำหนัก</th>
                  <th class="col-concordance">แนวทางการจ่ายยา</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in noPaged"
                  :key="p.id"
                  class="data-row"
                  :class="`data-row--${p.status}`"
                >
                  <td class="col-action">
                    <button class="action-btn" @click="goToPatient(p.id)" title="ดูรายละเอียด">
                      <PhArrowSquareOut :size="16" color="#595959" />
                    </button>
                  </td>
                  <td class="col-name">
                    <div class="patient-name">{{ p.name }}</div>
                    <div class="patient-hn-row">
                      <span class="patient-hn">{{ p.hn }}</span>
                      <span v-if="p.noac" class="indication-chip">
                        {{ indicationChipLabel[p.noac.profile.indication] }}
                      </span>
                    </div>
                  </td>
                  <td>{{ p.hospital }}</td>
                  <td class="col-status">
                    <span class="status-badge" :class="`status-badge--${p.status}`">
                      {{ noacsStatusLabel[p.status] }}
                    </span>
                  </td>
                  <td class="col-drug">
                    <template v-if="p.noac">
                      <div class="drug-inline">
                        <span class="drug-name">{{ drugDisplayLabel[p.noac.profile.currentDrug] }}</span>
                        <span class="drug-sep">·</span>
                        <span class="drug-dose">{{ p.noac.profile.currentDose }}</span>
                      </div>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                  <td class="col-crcl">
                    <span class="lab-badge" :class="p.crcl.alert ? 'lab-badge--alert' : ''">
                      {{ p.crcl.value }}
                      <PhWarningCircle v-if="p.crcl.alert" :size="11" />
                    </span>
                  </td>
                  <td class="col-weight">
                    <div class="weight-display">
                      <span class="weight-val" :class="p.weight <= 60 ? 'weight-val--low' : ''">
                        {{ p.weight.toFixed(1) }}
                      </span>
                      <span class="weight-unit">กก.</span>
                    </div>
                  </td>
                  <td class="col-concordance">
                    <template v-if="p.noac?.dispensingHistory?.length">
                      <span
                        class="concordance-badge"
                        :class="concordanceBadgeClass(lastDispensing(p.noac))"
                      >
                        {{ concordanceLabel(lastDispensing(p.noac)) }}
                      </span>
                    </template>
                    <span v-else class="col-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- NOACs pagination -->
          <div class="table-footer">
            <span class="pg-info">
              ข้อมูลที่ {{ Math.min((noPage - 1) * noPageSize + 1, noacsTotal) }}
              ถึง {{ Math.min(noPage * noPageSize, noacsTotal) }}
              จากทั้งหมด {{ noacsTotal }} รายการ
            </span>
            <div class="pg-controls">
              <select class="pg-select" v-model.number="noPageSize">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <div class="pagination">
                <button class="pg-btn" :class="{ 'pg-btn--disabled': noPage === 1 }" :disabled="noPage === 1" @click="noPage = 1">
                  <PhCaretDoubleLeft :size="13" />
                </button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': noPage === 1 }" :disabled="noPage === 1" @click="noPage--">
                  <PhCaretLeft :size="13" />
                </button>
                <button v-for="p in visiblePages(noPage, noPageCount)" :key="p"
                        class="pg-btn" :class="{ 'pg-btn--active': p === noPage }"
                        @click="noPage = p">{{ p }}</button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': noPage === noPageCount }" :disabled="noPage === noPageCount" @click="noPage++">
                  <PhCaretRight :size="13" />
                </button>
                <button class="pg-btn" :class="{ 'pg-btn--disabled': noPage === noPageCount }" :disabled="noPage === noPageCount" @click="noPage = noPageCount">
                  <PhCaretDoubleRight :size="13" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── KPI Tab ──────────────────────────────────────────── -->
      <div v-show="activeTab === 'kpi'">

        <!-- ── Primary KPIs container ──────────────────────────── -->
        <div class="kpi-container">
          <!-- Container header: title + period toggle -->
          <div class="kpi-container-header">
            <div class="kpi-header-left">
              <span class="kpi-st-text">ตัวชี้วัดหลัก</span>
              <span class="kpi-st-eng">Primary KPIs</span>
            </div>
            <div class="kpi-period-group">
              <span class="kpi-period-current">{{ kpiPeriodLabel }}</span>
              <div class="kpi-period-seg">
                <button
                  v-for="p in KPI_PERIODS" :key="p.value"
                  class="kpi-seg-btn"
                  :class="{ 'kpi-seg-btn--on': kpiPeriod === p.value }"
                  @click="kpiPeriod = p.value"
                >{{ p.label }}</button>
              </div>
            </div>
          </div>

          <!-- Custom date range row (animates in when กำหนดเอง is active) -->
          <Transition name="kpi-custom-slide">
            <div v-if="kpiPeriod === 'custom'" class="kpi-custom-row">
              <PhCalendar :size="13" color="#8C8C8C" />
              <span class="kpi-custom-label">ช่วงเวลา</span>
              <div class="kpi-custom-inputs">
                <input
                  type="month"
                  v-model="kpiCustomFrom"
                  class="kpi-month-input"
                  max="2026-05"
                />
                <span class="kpi-custom-sep">ถึง</span>
                <input
                  type="month"
                  v-model="kpiCustomTo"
                  class="kpi-month-input"
                  :min="kpiCustomFrom"
                  max="2026-05"
                />
              </div>
              <span class="kpi-custom-range-display">{{ customRangeLabel }}</span>
            </div>
          </Transition>

          <!-- Primary grid: Safety (3fr) + Quality (2fr) -->
          <div class="kpi-container-grid kpi-container-grid--primary">

            <!-- Safety sub-section -->
            <div class="kpi-sub-section">
              <div class="kpi-panel-head">
                <PhShieldCheck :size="14" :color="safetyFailCount > 0 ? '#B72C2C' : '#8C8C8C'" />
                <span class="kpi-ph-name">ความปลอดภัยของผู้ป่วย</span>
                <span class="kpi-ph-sub">Patient Safety</span>
                <div class="kpi-ph-tally">
                  <span v-if="safetyPassCount" class="kpi-tally kpi-tally--ok">{{ safetyPassCount }} ผ่าน</span>
                  <span v-if="safetyWarnCount" class="kpi-tally kpi-tally--warn">{{ safetyWarnCount }} ใกล้</span>
                  <span v-if="safetyFailCount" class="kpi-tally kpi-tally--ng">{{ safetyFailCount }} เกิน</span>
                </div>
              </div>

              <div class="ksafe-grid">
                <template v-for="(row, ri) in safetyRows" :key="row.key">
                  <span :class="['ksafe-cell', 'ksafe-name', { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    {{ row.name }}
                  </span>
                  <span :class="['ksafe-cell', 'ksafe-events', { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    <span class="ksafe-en" :class="{ 'ksafe-en--nz': row.events > 0 }">{{ row.events }}</span>
                    <span class="ksafe-eu">ราย</span>
                  </span>
                  <span :class="['ksafe-cell', 'ksafe-pct', `ksafe-pct--${row.status}`, { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    {{ row.pct.toFixed(1) }}%
                  </span>
                  <span :class="['ksafe-cell', 'ksafe-trend', `ksafe-trend--${row.trendDir}`, { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    {{ row.trendLabel }}
                  </span>
                  <span :class="['ksafe-cell', 'ksafe-target', { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    {{ row.target > 0 ? `&lt; ${row.target}%` : '= 0%' }}
                  </span>
                  <span :class="['ksafe-cell', { 'ksafe-cell--last': ri === safetyRows.length - 1 }]">
                    <span class="ksafe-badge" :class="`ksafe-badge--${row.status}`">{{ row.statusLabel }}</span>
                  </span>
                </template>
              </div>
            </div>

            <!-- Quality sub-section -->
            <div class="kpi-sub-section kpi-sub-section--sep">
              <div class="kpi-panel-head">
                <PhChartBar :size="14" color="#8C8C8C" />
                <span class="kpi-ph-name">คุณภาพการดูแล</span>
                <span class="kpi-ph-sub">Quality of Care</span>
              </div>

              <div class="kqual-rows">
                <div v-for="row in qualityBarRows" :key="row.key" class="kqual-row">
                  <div class="kqual-row-top">
                    <span class="kqual-metric-name">{{ row.name }}</span>
                    <div class="kqual-row-right">
                      <span class="kqual-frac">{{ row.n }}/{{ row.d }} ราย</span>
                      <span class="kqual-badge" :class="`kqual-badge--${row.status}`">{{ row.statusLabel }}</span>
                    </div>
                  </div>
                  <div class="kqual-bar-wrap">
                    <div class="kqual-track">
                      <div
                        class="kqual-fill"
                        :class="`kqual-fill--${row.status}`"
                        :style="`width: ${Math.min(row.value, 100)}%`"
                      />
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
                    <span class="kqual-los-val">{{ liveKpi.quality.avgLOS.value.toFixed(1) }}</span>
                    <span class="kqual-los-unit">วัน</span>
                    <span class="kqual-badge" :class="`kqual-badge--${losStatus}`">
                      {{ losStatus === 'pass' ? 'ผ่าน' : 'เกินเกณฑ์' }}
                    </span>
                    <span class="kqual-los-bench">เป้า ≤ {{ liveKpi.quality.avgLOS.target }} วัน</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Secondary KPIs container ─────────────────────────── -->
        <div class="kpi-container">
          <div class="kpi-container-header kpi-container-header--sm">
            <div class="kpi-header-left">
              <span class="kpi-st-text">ตัวชี้วัดรอง</span>
              <span class="kpi-st-eng">Secondary KPIs</span>
            </div>
          </div>

          <div class="kpi-container-grid kpi-container-grid--half">

            <!-- ATS Response sub-section -->
            <div class="kpi-sub-section">
              <div class="kpi-panel-head">
                <PhPulse :size="14" color="#8C8C8C" />
                <span class="kpi-ph-name">การตอบสนอง ATS</span>
                <span class="kpi-ph-sub">ATS Response</span>
              </div>
              <div class="kats-grid">
                <template v-for="row in atsRows" :key="row.key">
                  <span class="kats-name">{{ row.name }}</span>
                  <span class="kats-val" :class="`kats-val--${row.status}`">{{ row.displayValue }}</span>
                  <span class="kats-target">{{ row.targetLabel }}</span>
                  <span class="kats-badge" :class="`kats-badge--${row.status}`">{{ row.statusLabel }}</span>
                </template>
              </div>
            </div>

            <!-- System Efficiency sub-section -->
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
                  <span class="keff-wl-val">{{ liveKpi.patientCount }} ราย</span>
                </div>
                <div class="keff-wl-row">
                  <span class="keff-wl-name">ผู้ป่วยต่อวัน (เฉลี่ย)</span>
                  <span class="keff-wl-val">{{ liveKpi.efficiency.patientsPerDay.toFixed(1) }} ราย/วัน</span>
                </div>
                <div class="keff-wl-row">
                  <span class="keff-wl-name">ผู้ป่วยต่อเภสัชกร</span>
                  <span class="keff-wl-val">{{ liveKpi.efficiency.workloadRatio.toFixed(1) }} ราย/คน</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, DoughnutController, Tooltip } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import {
  PhBell, PhArrowCircleRight, PhWarning, PhInfo,
  PhChartBar, PhFirstAid,
  PhMagnifyingGlass, PhCalendar,
  PhArrowSquareOut, PhWarningCircle,
  PhCaretDoubleLeft, PhCaretLeft, PhCaretRight, PhCaretDoubleRight,
  PhShieldCheck, PhUsers, PhPulse,
} from '@phosphor-icons/vue'
import type { AtsDashboardConfigData, AtsMonitoringCard } from '@/data/types/ats'
import type { AtsPatientsData, WarfarinStatus, NoacsStatus } from '@/data/types/ats-patients'
import type { WarfarinPageData, DoseAdjustment } from '@/data/types/warfarin'
import type { NoacPatientData, NoacDispensingRecord } from '@/data/types/noac-dispensing'
import type { NoacDrug, NoacIndication } from '@/data/types/noac'
import type { KpiPeriod, KpiPeriodData } from '@/data/types/ats-kpi'
import type { PatientDetail, ComplicationEvent } from '@/data/types/patient-detail'
import type { KpiOperationalData, KpiOperationalPeriod } from '@/data/types/kpi-operational'
import { KPI_SAFETY_TARGETS, KPI_QUALITY_TARGETS, KPI_ATS_TARGETS } from '@/data/config/kpi-targets'
import rawConfig      from '@/data/mock/ats-dashboard.json'
import rawPatients    from '@/data/mock/ats-patients.json'
import allWarfarinRaw from '@/data/mock/warfarin-patients.json'
import allNoacRaw     from '@/data/mock/noac-patients.json'
import allDetailRaw   from '@/data/mock/patient-detail.json'
import rawKpiOps      from '@/data/mock/kpi-operational.json'

ChartJS.register(ArcElement, DoughnutController, Tooltip)

const router = useRouter()
const route  = useRoute()

// Cast JSON to typed shapes — swap imports for fetch() calls when backend is ready
const dashConfig  = rawConfig      as AtsDashboardConfigData
const patients    = rawPatients    as AtsPatientsData
const allWarfarin = allWarfarinRaw as Record<string, WarfarinPageData>
const allNoac     = allNoacRaw     as Record<string, NoacPatientData>

// Enriched patient lists — join ats-patients summary with therapy-specific clinical data
const enrichedWarfarin = computed(() =>
  patients.warfarin.map(p => ({ ...p, wf: allWarfarin[p.id] ?? null }))
)
const enrichedNoacs = computed(() =>
  patients.noacs.map(p => ({ ...p, noac: allNoac[p.id] ?? null }))
)

// Map icon name strings from JSON to Phosphor icon components
const iconMap: Record<string, Component> = { PhChartBar, PhFirstAid }

// ── Derive monitoring card stats from the actual patient list ─────────────────
// Produces a fully-typed AtsMonitoringCard from display config + patient counts.
// Replace the patient list source (fetch → reactive ref) to get live updates.
const cards = computed<AtsMonitoringCard[]>(() => {
  const wList = patients.warfarin
  const nList = patients.noacs

  // Warfarin
  const wTotal   = wList.length
  const wIn      = wList.filter(p => p.status === dashConfig.warfarin.inRangeStatusKey).length
  const wOut     = wTotal - wIn
  const wAlerts  = wList.filter(p => p.crcl.alert || p.inr.alert).length
  const wRefer   = wList.filter(p => p.referred).length
  const wCard: AtsMonitoringCard = {
    ...dashConfig.warfarin,
    totalPatients:   wTotal,
    inRangeCount:    wIn,
    inRangePct:      wTotal > 0 ? `${Math.round(wIn / wTotal * 100)}%`  : '0%',
    outOfRangeCount: wOut,
    outOfRangePct:   wTotal > 0 ? `${Math.round(wOut / wTotal * 100)}%` : '0%',
    alertCount:      wAlerts,
    referralCount:   wRefer,
    stats: dashConfig.warfarin.stats.map(s => {
      const count = wList.filter(p => p.status === s.statusKey).length
      const pct   = wTotal > 0 ? ((count / wTotal) * 100).toFixed(1) : '0'
      return { ...s, count, pctDisplay: `(${pct}%)` }
    }),
  }

  // NOACs
  const nTotal   = nList.length
  const nIn      = nList.filter(p => p.status === dashConfig.noacs.inRangeStatusKey).length
  const nOut     = nTotal - nIn
  const nAlerts  = nList.filter(p => p.crcl.alert || p.egfr.alert).length
  const nRefer   = nList.filter(p => p.referred).length
  const nCard: AtsMonitoringCard = {
    ...dashConfig.noacs,
    totalPatients:   nTotal,
    inRangeCount:    nIn,
    inRangePct:      nTotal > 0 ? `${Math.round(nIn / nTotal * 100)}%`  : '0%',
    outOfRangeCount: nOut,
    outOfRangePct:   nTotal > 0 ? `${Math.round(nOut / nTotal * 100)}%` : '0%',
    alertCount:      nAlerts,
    referralCount:   nRefer,
    stats: dashConfig.noacs.stats.map(s => {
      const count = nList.filter(p => p.status === s.statusKey).length
      const pct   = nTotal > 0 ? ((count / nTotal) * 100).toFixed(1) : '0'
      return { ...s, count, pctDisplay: `(${pct}%)` }
    }),
  }

  return [wCard, nCard]
})

// ── Chart helpers ─────────────────────────────────────────────────────────────
// chartPropsMap is keyed by card.id so the template can look up stable props.
// Stable references prevent vue-chartjs from triggering full chart re-initialization
// on every render cycle.
const chartPropsMap = computed(() => {
  const map: Record<string, { data: ReturnType<typeof donutChartData>; plugins: ReturnType<typeof makeCenterPlugin>[] }> = {}
  for (const card of cards.value) {
    map[card.id] = {
      data:    donutChartData(card),
      plugins: [makeCenterPlugin(card.totalPatients)],
    }
  }
  return map
})

// Chart.js plugin that draws center text on the canvas itself.
// Runs in afterDraw so the tooltip (drawn after all plugins) always sits on top.
function makeCenterPlugin(total: number) {
  return {
    id: `center-${total}`,
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea } = chart
      const cx = (chartArea.left + chartArea.right) / 2
      const cy = (chartArea.top + chartArea.bottom) / 2
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

function donutChartData(card: AtsMonitoringCard) {
  return {
    labels: [card.inRangeLabel, ...card.stats.map(s => s.label)],
    datasets: [{
      data:            [card.inRangeCount,    ...card.stats.map(s => s.count)],
      backgroundColor: ['#4CAF50',            ...card.stats.map(s => s.color)],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  animation: { duration: 600 },
  layout: { padding: 8 },
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

// ── Navigation ────────────────────────────────────────────────────────────────
function goToPatient(id: string) {
  router.push(`/dd-ats/patient/${id}`)
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

interface KpiMetric {
  eyebrow: string
  value: string | number
  unit?: string
  badge?: { label: string; good: boolean }
  context: string
}

function parsePct(pctStr: string): number {
  return parseInt(pctStr) || 0
}

const activeKpi = computed<KpiMetric[]>(() => {
  const wCard = cards.value[0]
  const nCard = cards.value[1]
  if (!wCard || !nCard) return []

  if (activeTab.value === 'dashboard') {
    const total     = wCard.totalPatients   + nCard.totalPatients
    const inRange   = wCard.inRangeCount    + nCard.inRangeCount
    const outRange  = wCard.outOfRangeCount + nCard.outOfRangeCount
    const alerts    = wCard.alertCount      + nCard.alertCount
    const referrals = wCard.referralCount   + nCard.referralCount
    const pct = total > 0 ? Math.round(inRange / total * 100) : 0
    return [
      {
        eyebrow: 'TOTAL PATIENTS · ALL PROGRAMS',
        value: total,
        unit: 'ราย',
        context: `Warfarin ${wCard.totalPatients} · NOACs ${nCard.totalPatients} ราย`,
      },
      {
        eyebrow: 'IN THERAPEUTIC RANGE',
        value: pct,
        unit: '%',
        badge: { label: pct >= 65 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 65 },
        context: `${inRange} ราย จากทั้งหมด ${total} ราย`,
      },
      {
        eyebrow: 'REQUIRES FOLLOW-UP',
        value: outRange,
        unit: 'ราย',
        badge: alerts > 0 ? { label: `${alerts} แจ้งเตือน`, good: false } : undefined,
        context: 'ต้องติดตามและปรับแผนการรักษา',
      },
      {
        eyebrow: 'REFERRALS · THIS PERIOD',
        value: referrals,
        unit: 'ราย',
        context: 'ส่งต่อแพทย์ปรึกษาทั้งสองโปรแกรม',
      },
    ]
  }

  if (activeTab.value === 'warfarin') {
    const card = wCard
    const pct  = parsePct(card.inRangePct)
    return [
      {
        eyebrow: 'PATIENTS · WARFARIN',
        value: card.totalPatients,
        unit: 'ราย',
        context: 'ผู้ป่วยในโปรแกรม Warfarin ทั้งหมด',
      },
      {
        eyebrow: 'IN RANGE · INR 2.0–3.0',
        value: pct,
        unit: '%',
        badge: { label: pct >= 65 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 65 },
        context: `${card.inRangeCount} ราย อยู่ใน TTR เป้าหมาย`,
      },
      {
        eyebrow: 'REQUIRES FOLLOW-UP',
        value: card.outOfRangeCount,
        unit: 'ราย',
        badge: card.alertCount > 0 ? { label: `${card.alertCount} Alert`, good: false } : undefined,
        context: `คิดเป็น ${card.outOfRangePct} ของผู้ป่วยทั้งหมด`,
      },
      {
        eyebrow: 'REFERRALS · WARFARIN',
        value: card.referralCount,
        unit: 'ราย',
        context: 'ส่งต่อแพทย์ปรึกษา',
      },
    ]
  }

  // NOACs
  const card = nCard
  const pct  = parsePct(card.inRangePct)
  if (activeTab.value === 'noacs') return [
    {
      eyebrow: 'PATIENTS · NOACs',
      value: card.totalPatients,
      unit: 'ราย',
      context: 'ผู้ป่วยในโปรแกรม NOACs ทั้งหมด',
    },
    {
      eyebrow: 'APPROPRIATE DOSE',
      value: pct,
      unit: '%',
      badge: { label: pct >= 80 ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์', good: pct >= 80 },
      context: `${card.inRangeCount} ราย ขนาดยาเหมาะสม`,
    },
    {
      eyebrow: 'LAB FLAGS · CrCl / WEIGHT',
      value: card.alertCount,
      unit: 'ราย',
      badge: card.alertCount > 0 ? { label: 'ต้องตรวจสอบ', good: false } : undefined,
      context: 'ค่า CrCl หรือน้ำหนักผิดปกติ',
    },
    {
      eyebrow: 'REFERRALS · NOACs',
      value: card.referralCount,
      unit: 'ราย',
      context: 'ส่งต่อแพทย์ปรึกษา',
    },
  ]

  // ── KPI tab strip ─────────────────────────────────────────────────────────
  const d    = liveKpi.value
  const s    = d.safety
  const totalAE = s.bleeding.events + s.thrombosis.events + s.aeHospitalization.events
                + s.death.events + s.medError.events
  const ttr  = d.quality.wfTtrGoal
  const acc  = d.atsResponse.acceptanceRate
  return [
    {
      eyebrow:  'ADVERSE EVENTS · ' + kpiPeriodLabel.value.toUpperCase(),
      value:    totalAE,
      unit:     'เหตุการณ์',
      badge:    totalAE > 0
        ? { label: 'ต้องติดตาม', good: false }
        : { label: 'ไม่มีรายงาน', good: true },
      context: `เลือดออก ${s.bleeding.events} · ลิ่มเลือด ${s.thrombosis.events} · นอน รพ. ${s.aeHospitalization.events}`,
    },
    {
      eyebrow:  'WARFARIN TTR ≥ 65%',
      value:    ttr.value,
      unit:     '%',
      badge:    { label: ttr.value >= ttr.target ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเป้า', good: ttr.value >= ttr.target },
      context:  `${ttr.n} จาก ${ttr.d} ราย · เป้า ≥ ${ttr.target}%`,
    },
    {
      eyebrow:  'ATS ACCEPTANCE RATE',
      value:    acc.value,
      unit:     '%',
      badge:    { label: acc.value >= acc.target ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเป้า', good: acc.value >= acc.target },
      context:  acc.n != null ? `${acc.n} จาก ${acc.d} ครั้ง · เป้า ≥ ${acc.target}%` : `เป้า ≥ ${acc.target}%`,
    },
    {
      eyebrow:  'PATIENTS MONITORED',
      value:    d.patientCount,
      unit:     'ราย',
      context:  `Warfarin ${warfarinTotal.value} · NOACs ${noacsTotal.value} ราย`,
    },
  ]
})

// ── Status labels ─────────────────────────────────────────────────────────────
const warfarinStatusLabel: Record<WarfarinStatus, string> = {
  'in-range':    'In Range',
  'under-range': 'Under Range',
  'over-range':  'Over Range',
}

const noacsStatusLabel: Record<NoacsStatus, string> = {
  'appropriate': 'Appropriate',
  'underdose':   'Underdose',
  'overdose':    'Overdose',
  'contra':      'Contra',
  'interaction': 'Interaction',
}

// ── Warfarin enrichment helpers ───────────────────────────────────────────────
function majorIxnCount(wf: WarfarinPageData | null): number {
  if (!wf?.profile.concurrentMeds) return 0
  return wf.profile.concurrentMeds.filter(m => m.severity === 'major').length
}

function getMajorIxns(wf: WarfarinPageData | null) {
  return wf?.profile.concurrentMeds?.filter(m => m.severity === 'major') ?? []
}

const effectLabel: Record<string, string> = {
  increase: '↑ เพิ่ม INR',
  decrease: '↓ ลด INR',
  none:     'ไม่มีผล',
}

const ttrStatusLabel: Record<string, string> = {
  'goal-met':          'ผ่านเกณฑ์',
  'below-goal':        'ต่ำกว่าเกณฑ์',
  'insufficient-data': 'ข้อมูลไม่พอ',
}

function lastDoseAdjustment(wf: WarfarinPageData | null): DoseAdjustment | undefined {
  const adj = wf?.doseAdjustments
  return adj?.length ? adj[adj.length - 1] : undefined
}

function wfConcordanceBadgeClass(adj: DoseAdjustment | undefined): string {
  if (!adj) return 'concordance--none'
  if (adj.systemSuggested) return 'concordance--yes'
  return adj.overrideReason ? 'concordance--adjusted' : 'concordance--no'
}

function wfConcordanceLabel(adj: DoseAdjustment | undefined): string {
  if (!adj) return '—'
  if (adj.systemSuggested) return '✓ ตามแนวทาง'
  return adj.overrideReason ? '✗ ปรับโดยมีเหตุผล' : '✗ ไม่ระบุเหตุผล'
}

// ── NOACs enrichment helpers ──────────────────────────────────────────────────
function lastDispensing(noacData: NoacPatientData | null): NoacDispensingRecord | undefined {
  const h = noacData?.dispensingHistory
  return h?.length ? h[h.length - 1] : undefined
}

function concordanceBadgeClass(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return 'concordance--none'
  if (disp.wasTopRecommendation) return 'concordance--yes'
  return disp.overrideReason ? 'concordance--adjusted' : 'concordance--no'
}

function concordanceLabel(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return '—'
  if (disp.wasTopRecommendation) return '✓ ตามแนวทาง'
  return disp.overrideReason ? '✗ ปรับโดยมีเหตุผล' : '✗ ไม่ระบุเหตุผล'
}

// ── Summary section — hoverable patient lists ─────────────────────────────────

interface SummaryPatientEntry {
  id:          string
  name:        string
  hn:          string
  status:      string
  statusLabel: string
}

const summaryPatientLists = computed(() => {
  const wList = patients.warfarin
  const nList = patients.noacs

  const toWEntry = (p: typeof wList[number]): SummaryPatientEntry => ({
    id:          p.id,
    name:        p.name,
    hn:          p.hn,
    status:      p.status,
    statusLabel: warfarinStatusLabel[p.status as WarfarinStatus] ?? p.status,
  })

  const toNEntry = (p: typeof nList[number]): SummaryPatientEntry => ({
    id:          p.id,
    name:        p.name,
    hn:          p.hn,
    status:      p.status,
    statusLabel: noacsStatusLabel[p.status as NoacsStatus] ?? p.status,
  })

  return {
    warfarin: {
      outOfRange: wList.filter(p => p.status !== dashConfig.warfarin.inRangeStatusKey).map(toWEntry),
      referrals:  wList.filter(p => p.referred).map(toWEntry),
    },
    noacs: {
      outOfRange: nList.filter(p => p.status !== dashConfig.noacs.inRangeStatusKey).map(toNEntry),
      referrals:  nList.filter(p => p.referred).map(toNEntry),
    },
  }
})

function getSummaryPatients(cardId: string, type: 'outOfRange' | 'referrals'): SummaryPatientEntry[] {
  const lists = summaryPatientLists.value
  if (cardId === 'warfarin') return lists.warfarin[type]
  if (cardId === 'noacs')    return lists.noacs[type]
  return []
}

const drugDisplayLabel: Record<NoacDrug, string> = {
  apixaban:    'Apixaban',
  rivaroxaban: 'Rivaroxaban',
  dabigatran:  'Dabigatran',
  edoxaban:    'Edoxaban',
}

const indicationChipLabel: Record<NoacIndication, string> = {
  NVAF: 'NVAF', DVT: 'DVT', PE: 'PE', CAT: 'CAT',
}

// ── Patient list counts ────────────────────────────────────────────────────────
const warfarinTotal = computed(() => patients.warfarin.length)
const noacsTotal    = computed(() => patients.noacs.length)

// ── Pagination state ──────────────────────────────────────────────────────────
const wfPage     = ref(1)
const wfPageSize = ref(10)
const noPage     = ref(1)
const noPageSize = ref(10)

// Reset to page 1 when page size changes
watch(wfPageSize, () => { wfPage.value = 1 })
watch(noPageSize, () => { noPage.value = 1 })

// Total page counts (minimum 1)
const wfPageCount = computed(() => Math.max(1, Math.ceil(warfarinTotal.value / wfPageSize.value)))
const noPageCount = computed(() => Math.max(1, Math.ceil(noacsTotal.value   / noPageSize.value)))

// Sliced rows for each table
const wfPaged = computed(() =>
  enrichedWarfarin.value.slice(
    (wfPage.value - 1) * wfPageSize.value,
     wfPage.value      * wfPageSize.value
  )
)
const noPaged = computed(() =>
  enrichedNoacs.value.slice(
    (noPage.value - 1) * noPageSize.value,
     noPage.value      * noPageSize.value
  )
)

/** Visible page numbers: up to ±2 around current, clamped to [1, total]. */
function visiblePages(current: number, total: number): number[] {
  const lo = Math.max(1, current - 2)
  const hi = Math.min(total, current + 2)
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

// ── KPI tab ───────────────────────────────────────────────────────────────────
// ── KPI data sources ──────────────────────────────────────────────────────────
// kpiOps: non-derivable mock data (staff, LOS, ATS response, prev/target values)
// allDetail: patient-detail.json for complication-based safety KPIs
const kpiOps    = rawKpiOps   as KpiOperationalData
const allDetail = allDetailRaw as Record<string, PatientDetail>

type KpiDisplayPeriod = KpiPeriod | 'custom'

const KPI_PERIODS: Array<{ value: KpiDisplayPeriod; label: string }> = [
  { value: 'month',   label: 'เดือน'    },
  { value: 'quarter', label: 'ไตรมาส'   },
  { value: 'year',    label: 'ปีนี้'    },
  { value: 'custom',  label: 'กำหนดเอง' },
]

const kpiPeriod     = ref<KpiDisplayPeriod>('month')
const kpiCustomFrom = ref<string>('2026-01')
const kpiCustomTo   = ref<string>('2026-05')

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                     'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thaiMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return yearMonth
  return `${THAI_MONTHS[m - 1]} ${y + 543}`
}

const customRangeLabel = computed(() => {
  if (!kpiCustomFrom.value || !kpiCustomTo.value) return 'กำหนดเอง'
  return `${thaiMonth(kpiCustomFrom.value)} – ${thaiMonth(kpiCustomTo.value)}`
})

// Operational mock for the selected period (label, prev values, LOS, efficiency)
const currentKpiOps = computed<KpiOperationalPeriod>(() => {
  const p = kpiPeriod.value
  if (p === 'custom' || p === 'year') return kpiOps.year
  if (p === 'quarter')                return kpiOps.quarter
  return kpiOps.month
})

// ISO date range for filtering patient records by period
// Data exists from 2026-01-01 to 2026-05-31 (ปี 2569 ม.ค.–พ.ค.)
const periodDateRange = computed<[string, string]>(() => {
  const p = kpiPeriod.value
  if (p === 'month')   return ['2026-05-01', '2026-05-31']
  if (p === 'quarter') return ['2026-03-01', '2026-05-31']
  if (p === 'year')    return ['2026-01-01', '2026-05-31']
  // custom: build ISO range from YYYY-MM pickers
  const from  = kpiCustomFrom.value ? `${kpiCustomFrom.value}-01` : '2026-01-01'
  const toYM  = kpiCustomTo.value || '2026-05'
  const [ty, tm] = toYM.split('-').map(Number)
  const lastDay  = new Date(ty, tm, 0).getDate()
  return [from, `${toYM}-${String(lastDay).padStart(2, '0')}`]
})

// Month range (1–12) for fallback complication filtering (no dateISO)
const periodRange = computed<[number, number]>(() => {
  const p = kpiPeriod.value
  if (p === 'month')   return [5, 5]
  if (p === 'quarter') return [3, 5]
  if (p === 'year')    return [1, 5]
  const from = parseInt(kpiCustomFrom.value.split('-')[1]) || 1
  const to   = parseInt(kpiCustomTo.value.split('-')[1])   || 12
  return [from, to]
})

// Complications filtered by period — uses dateISO when available, falls back to month
const periodComplications = computed<ComplicationEvent[]>(() => {
  const [from, to]   = periodDateRange.value
  const [mFrom, mTo] = periodRange.value
  return Object.values(allDetail)
    .flatMap(p => (p.complications as ComplicationEvent[]) ?? [])
    .filter(c => c.dateISO ? (c.dateISO >= from && c.dateISO <= to) : (c.month >= mFrom && c.month <= mTo))
})

// Period-aware WF appropriateness: patients who had an INR reading in the period,
// last INR in period in therapeutic range (2.0–3.0)
const periodWfAppropriateness = computed(() => {
  const [from, to] = periodDateRange.value
  let inRange = 0, total = 0
  for (const p of patients.warfarin) {
    const pd = allWarfarin[p.id]
    if (!pd) continue
    const periodInrs = (pd.inrHistory ?? []).filter(r => {
      const d = r.measuredAt.substring(0, 10)
      return d >= from && d <= to
    })
    if (periodInrs.length === 0) continue
    total++
    const lastInr = [...periodInrs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).at(-1)!
    if (lastInr.inrValue >= 2.0 && lastInr.inrValue <= 3.0) inRange++
  }
  return { inRange, total }
})

// Period-aware TTR: among WF patients active in period, how many have TTR ≥ 65%
const periodWfTtr = computed(() => {
  const [from, to] = periodDateRange.value
  let ttrGoal = 0, ttrDen = 0
  for (const p of patients.warfarin) {
    const pd = allWarfarin[p.id]
    if (!pd) continue
    const active = (pd.inrHistory ?? []).some(r => {
      const d = r.measuredAt.substring(0, 10)
      return d >= from && d <= to
    })
    if (!active) continue
    if (pd.ttr != null) {
      ttrDen++
      if (pd.ttr.status === 'goal-met') ttrGoal++
    }
  }
  return { ttrGoal, ttrDen }
})

// Period-aware NOAC metrics — patient-level appropriateness + dispensing-level acceptance
const periodNoacMetrics = computed(() => {
  const [from, to] = periodDateRange.value
  let appropriate = 0, noacTotal = 0, dispAccepted = 0, dispTotal = 0
  for (const p of patients.noacs) {
    const pd = allNoac[p.id]
    if (!pd) continue
    const periodDisps = (pd.dispensingHistory as NoacDispensingRecord[]).filter(r => {
      const d = r.dispensedAt.substring(0, 10)
      return d >= from && d <= to
    })
    if (periodDisps.length === 0) continue
    noacTotal++
    if (periodDisps.some(d => (d as NoacDispensingRecord & { clinicallyAppropriate?: boolean }).clinicallyAppropriate)) appropriate++
    dispTotal    += periodDisps.length
    dispAccepted += periodDisps.filter(d => d.wasTopRecommendation).length
  }
  return { appropriate, noacTotal, dispAccepted, dispTotal }
})

// Period-aware patient counts (patients with activity in the period)
const periodPatientCounts = computed(() => {
  const [from, to] = periodDateRange.value
  let wfN = 0, noN = 0
  for (const p of patients.warfarin) {
    const pd = allWarfarin[p.id]
    if (!pd) continue
    if ((pd.inrHistory ?? []).some(r => { const d = r.measuredAt.substring(0, 10); return d >= from && d <= to })) wfN++
  }
  for (const p of patients.noacs) {
    const pd = allNoac[p.id]
    if (!pd) continue
    if ((pd.dispensingHistory ?? []).some(r => { const d = (r as NoacDispensingRecord).dispensedAt.substring(0, 10); return d >= from && d <= to })) noN++
  }
  return { wfN, noN, total: wfN + noN }
})

// ── Live KPI — real patient data + operational mock ────────────────────────────
// Derivable (from patient records): patientCount, safety events, wfAppropriateness,
//   noacAppropriateness, wfTtrGoal, atsAcceptanceRate — all period-aware via date filtering
// Non-derivable (from kpi-operational.json): avgLOS, atsResolutionRate, atsResponseTime,
//   system efficiency, all prev comparison values
const liveKpi = computed<KpiPeriodData>(() => {
  const ops   = currentKpiOps.value
  const { total } = periodPatientCounts.value
  const comps  = periodComplications.value

  const bleedE = comps.filter(c => c.type === 'bleeding').length
  const throE  = comps.filter(c => c.type === 'thromboembolism').length
  const sevE   = comps.filter(c => c.severity === 'severe').length
  const pct    = (n: number) => total > 0 ? parseFloat((n / total * 100).toFixed(1)) : 0

  const { inRange: wfInRange, total: wfDen }             = periodWfAppropriateness.value
  const { ttrGoal: wfTtrGoal, ttrDen: wfTtrDen }         = periodWfTtr.value
  const { appropriate: noacApp, noacTotal: noacDen,
          dispAccepted, dispTotal }                        = periodNoacMetrics.value

  return {
    label:        ops.label,
    patientCount: total,

    safety: {
      bleeding:          { events: bleedE, pct: pct(bleedE), prev: ops.safetyPrev.bleeding,          target: KPI_SAFETY_TARGETS.bleeding          },
      thrombosis:        { events: throE,  pct: pct(throE),  prev: ops.safetyPrev.thrombosis,        target: KPI_SAFETY_TARGETS.thrombosis        },
      aeHospitalization: { events: sevE,   pct: pct(sevE),   prev: ops.safetyPrev.aeHospitalization, target: KPI_SAFETY_TARGETS.aeHospitalization },
      death:             { events: 0,      pct: 0,           prev: ops.safetyPrev.death,             target: KPI_SAFETY_TARGETS.death             },
      medError:          { events: 0,      pct: 0,           prev: ops.safetyPrev.medError,          target: KPI_SAFETY_TARGETS.medError          },
    },

    quality: {
      wfAppropriateness: {
        value: wfDen > 0 ? parseFloat((wfInRange / wfDen * 100).toFixed(1)) : 0,
        n: wfInRange, d: wfDen,
        prev: ops.qualityPrev.wfAppropriateness, target: KPI_QUALITY_TARGETS.wfAppropriateness,
      },
      noacAppropriateness: {
        value: noacDen > 0 ? parseFloat((noacApp / noacDen * 100).toFixed(1)) : 0,
        n: noacApp, d: noacDen,
        prev: ops.qualityPrev.noacAppropriateness, target: KPI_QUALITY_TARGETS.noacAppropriateness,
      },
      wfTtrGoal: {
        value: wfTtrDen > 0 ? parseFloat((wfTtrGoal / wfTtrDen * 100).toFixed(1)) : 0,
        n: wfTtrGoal, d: wfTtrDen,
        prev: ops.qualityPrev.wfTtrGoal, target: KPI_QUALITY_TARGETS.wfTtrGoal,
      },
      avgLOS: { ...ops.avgLOS, target: KPI_QUALITY_TARGETS.avgLOS },
    },

    atsResponse: {
      resolutionRate: { ...ops.atsResolution, target: KPI_ATS_TARGETS.resolutionRate },
      acceptanceRate: {
        value: dispTotal > 0 ? parseFloat((dispAccepted / dispTotal * 100).toFixed(1)) : 0,
        n: dispAccepted, d: dispTotal,
        prev: ops.atsAcceptancePrev, target: KPI_ATS_TARGETS.acceptanceRate,
      },
      responseTimeHr: { ...ops.atsResponseTime, target: KPI_ATS_TARGETS.responseTimeHr },
    },

    efficiency: {
      staff:          ops.efficiency.staff,
      patientsPerDay: ops.efficiency.patientsPerDay,
      workloadRatio:  ops.efficiency.workloadRatio,
    },
  }
})

const kpiPeriodLabel = computed(() =>
  kpiPeriod.value === 'custom' ? customRangeLabel.value : liveKpi.value.label
)

// ── Safety rows ───────────────────────────────────────────────────────────────
type StatusLevel = 'pass' | 'warn' | 'fail'

interface SafetyRow {
  key:         string
  name:        string
  events:      number
  pct:         number
  target:      number
  status:      StatusLevel
  trendLabel:  string
  trendDir:    'up' | 'down' | 'flat'
  statusLabel: string
}

function safetyStatus(pct: number, target: number): StatusLevel {
  if (pct >= target)               return 'fail'
  if (pct >= target * 0.7)         return 'warn'
  return 'pass'
}

const safetyRows = computed<SafetyRow[]>(() => {
  const s = liveKpi.value.safety
  const defs: Array<{ key: string; name: string; m: typeof s.bleeding }> = [
    { key: 'bleeding',          name: 'เลือดออกรุนแรง',          m: s.bleeding          },
    { key: 'thrombosis',        name: 'ลิ่มเลือดอุดตัน',          m: s.thrombosis        },
    { key: 'aeHospitalization', name: 'นอน รพ. จากผลข้างเคียง',   m: s.aeHospitalization },
    { key: 'death',             name: 'เสียชีวิต',                m: s.death             },
    { key: 'medError',          name: 'ความคลาดเคลื่อนทางยา',     m: s.medError          },
  ]
  return defs.map(({ key, name, m }) => {
    const status = safetyStatus(m.pct, m.target)
    const delta  = parseFloat((m.pct - m.prev).toFixed(1))
    // Safety: ▲ worsened (bad), ▼ improved (good)
    const trendDir   = delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
    const trendLabel = delta === 0 ? '—'
      : delta > 0 ? `▲ ${delta.toFixed(1)}%` : `▼ ${Math.abs(delta).toFixed(1)}%`
    const statusLabel = status === 'fail' ? 'เกินเกณฑ์' : status === 'warn' ? 'ใกล้เกณฑ์' : 'ผ่าน'
    return { key, name, events: m.events, pct: m.pct, target: m.target, status, trendLabel, trendDir, statusLabel }
  })
})

const safetyPassCount = computed(() => safetyRows.value.filter(r => r.status === 'pass').length)
const safetyWarnCount = computed(() => safetyRows.value.filter(r => r.status === 'warn').length)
const safetyFailCount = computed(() => safetyRows.value.filter(r => r.status === 'fail').length)

// ── Quality bar rows ──────────────────────────────────────────────────────────
interface QualityBarRow {
  key:         string
  name:        string
  value:       number
  n:           number
  d:           number
  target:      number
  status:      StatusLevel
  statusLabel: string
}

function qualityStatus(value: number, target: number): StatusLevel {
  if (value >= target)              return 'pass'
  if (value >= target * 0.85)       return 'warn'
  return 'fail'
}

const qualityBarRows = computed<QualityBarRow[]>(() => {
  const q = liveKpi.value.quality
  const defs = [
    { key: 'wfAppropriateness',  name: 'Warfarin ขนาดยาเหมาะสม', m: q.wfAppropriateness  },
    { key: 'noacAppropriateness',name: 'NOAC ขนาดยาเหมาะสม',     m: q.noacAppropriateness },
    { key: 'wfTtrGoal',          name: 'Warfarin TTR ≥ 65%',      m: q.wfTtrGoal           },
  ]
  return defs.map(({ key, name, m }) => {
    const status      = qualityStatus(m.value, m.target)
    const statusLabel = status === 'fail' ? 'ต่ำกว่าเป้า' : status === 'warn' ? 'ใกล้เป้า' : 'ผ่าน'
    return { key, name, value: m.value, n: m.n, d: m.d, target: m.target, status, statusLabel }
  })
})

const losStatus = computed<StatusLevel>(() =>
  liveKpi.value.quality.avgLOS.value <= liveKpi.value.quality.avgLOS.target ? 'pass' : 'fail'
)

// ── ATS response rows ─────────────────────────────────────────────────────────
interface AtsRow {
  key:          string
  name:         string
  displayValue: string
  targetLabel:  string
  status:       StatusLevel
  statusLabel:  string
}

const atsRows = computed<AtsRow[]>(() => {
  const r = liveKpi.value.atsResponse
  const rows: AtsRow[] = [
    {
      key:          'resolution',
      name:         'แก้ปัญหาสำเร็จ',
      displayValue: `${r.resolutionRate.value.toFixed(1)}%`,
      targetLabel:  `เป้า ≥ ${r.resolutionRate.target}%`,
      status:       qualityStatus(r.resolutionRate.value, r.resolutionRate.target),
      statusLabel:  qualityStatus(r.resolutionRate.value, r.resolutionRate.target) === 'fail' ? 'ต่ำกว่าเป้า'
                  : qualityStatus(r.resolutionRate.value, r.resolutionRate.target) === 'warn' ? 'ใกล้เป้า' : 'ผ่าน',
    },
    {
      key:          'acceptance',
      name:         'ยอมรับคำแนะนำยา',
      displayValue: `${r.acceptanceRate.value.toFixed(1)}%`,
      targetLabel:  `เป้า ≥ ${r.acceptanceRate.target}%`,
      status:       qualityStatus(r.acceptanceRate.value, r.acceptanceRate.target),
      statusLabel:  qualityStatus(r.acceptanceRate.value, r.acceptanceRate.target) === 'fail' ? 'ต่ำกว่าเป้า'
                  : qualityStatus(r.acceptanceRate.value, r.acceptanceRate.target) === 'warn' ? 'ใกล้เป้า' : 'ผ่าน',
    },
    {
      key:          'responseTime',
      name:         'เวลาตอบสนองการส่งต่อ',
      displayValue: `${r.responseTimeHr.value.toFixed(1)} ชม.`,
      targetLabel:  `เป้า ≤ ${r.responseTimeHr.target} ชม.`,
      status:       safetyStatus(r.responseTimeHr.value, r.responseTimeHr.target),
      statusLabel:  safetyStatus(r.responseTimeHr.value, r.responseTimeHr.target) === 'pass' ? 'ผ่าน' : 'เกินเกณฑ์',
    },
  ]
  return rows
})

// ── Staff chip items ──────────────────────────────────────────────────────────
const staffItems = computed(() => {
  const s = liveKpi.value.efficiency.staff
  return [
    { key: 'pharmacist', count: s.pharmacist, label: 'เภสัชกร' },
    { key: 'physician',  count: s.physician,  label: 'แพทย์'   },
    { key: 'nurse',      count: s.nurse,      label: 'พยาบาล'  },
    { key: 'total',      count: s.total,      label: 'รวม'      },
  ]
})

// ── Tabs + scroll reset ───────────────────────────────────────────────────────
type TabValue = 'dashboard' | 'warfarin' | 'noacs' | 'kpi'
const activeTab = ref<TabValue>('dashboard')

// Sync active tab from ?tab= query param (e.g. navigating back via breadcrumb)
onMounted(() => {
  const q = route.query.tab
  if (q === 'warfarin' || q === 'noacs' || q === 'kpi') activeTab.value = q as TabValue
})

watch(activeTab, (tab) => {
  // Keep URL in sync — replace (not push) so tab-switching doesn't stack history entries
  router.replace({ path: '/dd-ats', query: tab !== 'dashboard' ? { tab } : {} })

  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  ;(document.querySelector('.v-main__wrap') as HTMLElement | null)?.scrollTo(0, 0)
})

const tabs = computed(() => [
  { value: 'dashboard' as TabValue, label: 'Dashboard',        count: null as number | null },
  { value: 'warfarin'  as TabValue, label: 'การจ่าย Warfarin', count: warfarinTotal.value   },
  { value: 'noacs'     as TabValue, label: 'การจ่าย NOACs',    count: noacsTotal.value      },
  { value: 'kpi'       as TabValue, label: 'KPIs ระบบ',        count: null                  },
])
</script>

<style scoped>
.content-wrap { min-height: 100%; }

/* ── White header zone ────────────────────────────────────── */
.page { background: var(--bma-surface); padding: 24px 24px 0; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  min-height: 40px;
}

.page-title    { font-size: 18px; font-weight: 700; color: var(--bma-text-primary); line-height: 1.35; margin: 0; }
.page-subtitle { font-size: 12px; color: var(--bma-text-muted); margin-top: 3px; }

/* ── Gray content zone ────────────────────────────────────── */
.main-wrap { padding: 24px; }

/* ── Monitoring grid ──────────────────────────────────────── */
.monitoring-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
  /* Shared label-column width — governs progress bar start/end across all cards */
  --stat-label-col: 138px;
}

.monitoring-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: var(--bma-shadow-card);
  padding: 16px 20px 20px;
}

/* Card header row */
.mc-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.mc-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--bma-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mc-title    { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); font-family: var(--bma-font-data); letter-spacing: .02em; }
.mc-subtitle { font-size: 11px; color: var(--bma-text-muted); margin-top: 1px; }

/* Body: donut + right panel */
.mc-body  { display: flex; align-items: flex-start; gap: 18px; }
.mc-right { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.donut-wrap {
  position: relative;
  /* 148px plot area + 8px layout.padding on each side = 164px canvas */
  width: 164px;
  height: 164px;
  flex-shrink: 0;
}

/* In-range green box */
.mc-in-range-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1.5px solid var(--bma-success);
  border-radius: var(--bma-radius-md);
  padding: 8px 12px;
  background: #F6FFF9;
}

.mc-in-range-left { display: flex; flex-direction: column; gap: 1px; }

.mc-in-count {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

.mc-in-label {
  font-size: 11px;
  color: var(--bma-success);
  font-weight: 600;
  white-space: nowrap;
}

.mc-in-pct {
  font-family: var(--bma-font-data);
  font-size: 22px;
  font-weight: 700;
  color: var(--bma-text-primary);
  flex-shrink: 0;
}

/* Alert red box */
.mc-alert-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1.5px solid #F5C0C0;
  border-radius: var(--bma-radius-md);
  padding: 7px 12px;
  background: #FFF5F5;
}

.mc-alert-left {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--bma-emergency);
}

.mc-alert-pct {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-emergency);
  flex-shrink: 0;
}

/* ── Stat rows — CSS Grid pattern ────────────────────────────
   Columns: [dot] [label — sized by widest row] [bar — equal 1fr] [count] [pct]
   display:contents on .mc-stat-row lifts children into parent grid,
   so the label column is shared across ALL rows in the same card.
   No hardcoded width needed — grid measures the widest label automatically. */
.mc-stat-list {
  display: grid;
  grid-template-columns: 12px var(--stat-label-col) 1fr 24px 52px;
  row-gap: 8px;
  column-gap: 8px;
  align-items: center;
  margin-top: 4px;
}

/* Row element removed from visual tree — children go directly into grid */
.mc-stat-row { display: contents; }

/* Rounded rectangle indicator */
.mc-stat-dot {
  width: 12px;
  height: 8px;
  border-radius: 3px;
}

/* Label + sublabel inline — width auto-determined by grid column */
.mc-stat-labels {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.mc-stat-name { font-size: 12px; color: var(--bma-text-primary); font-weight: 500; white-space: nowrap; }
.mc-stat-sub  { font-size: 10px; color: var(--bma-text-muted); white-space: nowrap; }

.mc-progress-track {
  height: 8px;
  background: #EBEBEB;
  border-radius: var(--bma-radius-full);
  overflow: hidden;
}

.mc-progress-fill {
  height: 100%;
  border-radius: var(--bma-radius-full);
  transition: width .4s ease;
}

.mc-stat-count {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
  text-align: right;
}

.mc-stat-pct {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Summary section ──────────────────────────────────────── */
.summary-container {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  overflow:      hidden;
}

.section-header {
  display:       flex;
  align-items:   center;
  gap:           8px;
  font-size:     15px;
  font-weight:   700;
  color:         var(--bma-text-primary);
  padding:       16px 20px 14px;
  border-bottom: 1px solid var(--bma-border-subtle);
}

.section-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #FFF3E0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-badge {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
  background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-card);
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-data);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.summary-panel {
  padding: 16px 20px;
}
.summary-panel:first-child {
  border-right: 1px solid var(--bma-border-subtle);
}

.sc-header     { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.sc-title-wrap { display: flex; align-items: flex-start; gap: 10px; }
.sc-icon       { width: 32px; height: 32px; border-radius: var(--bma-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-title      { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.sc-subtitle   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; }
.alert-badge   { background: var(--bma-emergency); color: var(--bma-surface); border-radius: var(--bma-radius-full); padding: 2px 10px; font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.sc-divider    { height: 1px; background: var(--bma-border-subtle); margin-bottom: 8px; }
.sc-stat-row   { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; font-size: 13px; }
.sc-stat-row--primary   { padding-bottom: 9px; }
.sc-stat-row--secondary { padding-top: 9px; border-top: 1px solid var(--bma-border-subtle); }
.sc-stat-label { display: flex; align-items: center; gap: 5px; color: var(--bma-text-secondary); font-size: 13px; }
.sc-stat-value { font-family: var(--bma-font-data); font-weight: 700; color: var(--bma-text-primary); font-size: 14px; }
.sc-stat-value--lg { font-size: 16px; }

/* Right-side container: value + hint icon inline */
.sc-stat-right {
  display:     flex;
  align-items: center;
  gap:         5px;
}

/* ⓘ hint icon — muted at rest, sharpens on row hover */
.sc-hint-icon {
  color:      var(--bma-text-disabled);
  flex-shrink: 0;
  transition: color var(--bma-transition-fast);
}
.sc-stat-row--hoverable:hover .sc-hint-icon {
  color: var(--bma-text-muted);
}


/* ── Filter bar (main) ────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  margin-bottom: 16px;
}

.filter-search {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.filter-date {
  position: relative;
  width: 170px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.fi-icon   { position: absolute; left: 10px; pointer-events: none; }
.fi-icon-r { position: absolute; right: 10px; pointer-events: none; }

.filter-input {
  width: 100%;
  height: 38px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-primary);
  background: var(--bma-surface);
  outline: none;
  transition: border-color var(--bma-transition-fast);
}
.filter-search .filter-input { padding: 0 12px 0 34px; }
.filter-date   .filter-input { padding: 0 34px 0 12px; }
.filter-input::placeholder   { color: var(--bma-text-disabled); }
.filter-input:focus { border-color: var(--bma-green-500); }

.btn-search {
  height: 38px;
  padding: 0 20px;
  background: var(--bma-green-500);
  color: var(--bma-surface);
  border: none;
  border-radius: var(--bma-radius-md);
  font-family: var(--bma-font-thai);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-search:hover { background: var(--bma-green-600); }

/* ── Table card ───────────────────────────────────────────── */
.table-card {
  background: var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  overflow: hidden;
}

/* ── Data table ───────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead tr {
  background: var(--bma-surface-light);
  border-bottom: 1.5px solid var(--bma-border-subtle);
}

.data-table th {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--bma-text-muted);
  text-align: left;
  white-space: nowrap;
}

.data-row {
  border-bottom: 1px solid var(--bma-surface-subtle);
  transition: background .12s;
}
.data-row:hover { background: var(--bma-surface-light); }
.data-row:last-child { border-bottom: none; }

/* Row tint by status — background encodes severity without side-stripe */
.data-row--under-range,
.data-row--underdose   { background: #FFFBF5; }
.data-row--under-range:hover,
.data-row--underdose:hover { background: #FFF3E0; }

.data-row--over-range,
.data-row--overdose,
.data-row--contra,
.data-row--interaction { background: #FFF8F8; }
.data-row--over-range:hover,
.data-row--overdose:hover,
.data-row--contra:hover,
.data-row--interaction:hover { background: #FEECEC; }

.data-table td { padding: 10px 14px; color: var(--bma-text-primary); vertical-align: middle; }

.col-action   { width: 52px; }
.col-name     { min-width: 180px; }
.col-hospital { min-width: 140px; }
.col-status   { width: 130px; }
.col-lab      { width: 200px; }
.col-weight   { width: 120px; }

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1.5px solid var(--bma-border-card);
  background: var(--bma-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color var(--bma-transition-fast), background var(--bma-transition-fast);
}
.action-btn:hover { border-color: var(--bma-green-500); background: var(--bma-green-50); }

.patient-name { font-size: 13px; font-weight: 600; color: var(--bma-text-primary); }
.patient-hn   { font-size: 11px; color: var(--bma-text-muted); margin-top: 2px; font-family: var(--bma-font-data); }

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-full);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge--in-range,
.status-badge--appropriate { background: #E8F5E9; color: #2E7D32; }
.status-badge--under-range,
.status-badge--underdose   { background: #FFF3E0; color: #E65100; }
.status-badge--over-range,
.status-badge--overdose    { background: #FCE4EC; color: var(--bma-emergency); }
.status-badge--contra      { background: #E8EAF6; color: var(--bma-elective); }
.status-badge--interaction { background: #F3EEFF; color: #7B52AB; }

/* Lab value badges */
.col-lab { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

.lab-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border-muted);
  background: var(--bma-surface);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 600;
  color: var(--bma-text-primary);
  white-space: nowrap;
}
.lab-badge--alert {
  border-color: #E57373;
  background: #FFF5F5;
  color: var(--bma-emergency);
}

/* Weight badge */
.weight-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border-muted);
  background: var(--bma-surface-light);
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 600;
  color: var(--bma-text-primary);
}

/* ── Table footer / Pagination ────────────────────────────── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--bma-border-subtle);
}

.pg-info {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}

.pg-controls { display: flex; align-items: center; gap: 10px; }

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

.pagination { display: flex; gap: 3px; }

.pg-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--bma-radius-sm);
  border: 1.5px solid var(--bma-border);
  background: var(--bma-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 500;
  color: var(--bma-text-secondary);
  transition: all var(--bma-transition-fast);
}
.pg-btn:not(.pg-btn--active):not(.pg-btn--disabled):hover { border-color: var(--bma-green-500); color: var(--bma-green-500); background: var(--bma-green-50); }
.pg-btn--active   { background: var(--bma-green-500); border-color: var(--bma-green-500); color: var(--bma-surface); font-weight: 700; }
.pg-btn--disabled { color: var(--bma-border); cursor: not-allowed; }

/* ── Table horizontal scroll ──────────────────────────────── */
.table-scroll-wrap {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bma-border) transparent;
}
.table-scroll-wrap::-webkit-scrollbar        { height: 5px; }
.table-scroll-wrap::-webkit-scrollbar-track  { background: transparent; }
.table-scroll-wrap::-webkit-scrollbar-thumb  { background: var(--bma-border); border-radius: 3px; }

.data-table--warfarin { min-width: 960px; }
.data-table--noacs    { min-width: 880px; }

/* ── Column widths ────────────────────────────────────────── */
/* TTR: wider — "88% [ผ่านเกณฑ์]" inline chip needs ~148px  */
/* Dose: narrower — single line "35 mg/สป."                  */
/* Drug: wider — "Rivaroxaban · 20mg qd" needs ~155px        */
.col-action      { width: 48px; }
.col-status      { width: 110px; }
.col-inr         { width: 68px; }
.col-ttr         { width: 152px; }
.col-dose        { width: 90px; }
.col-crcl        { width: 72px; }
.col-ixn         { width: 110px; }
.col-drug        { width: 160px; }
.col-weight      { width: 88px; }
.col-concordance { width: 148px; }

/* ── Patient HN row (chips inline) ───────────────────────── */
.patient-hn-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}

/* Indication chip (NOACs) */
.indication-chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-green-50);
  border: 1px solid var(--bma-green-200);
  color: var(--bma-green-700);
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── INR display ──────────────────────────────────────────── */
.inr-display { display: flex; flex-direction: column; gap: 3px; }

.inr-val {
  font-family: var(--bma-font-data);
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}
.inr-val--alert { color: var(--bma-emergency); }

.inr-target-badge {
  display: inline-block;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 600;
  color: var(--bma-text-muted);
  background: var(--bma-surface-light);
  border: 1px solid var(--bma-border-subtle);
  border-radius: 3px;
  padding: 1px 5px;
  width: fit-content;
}

/* ── TTR display ──────────────────────────────────────────── */
.ttr-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 5px;
}

.ttr-val {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}
.ttr--goal-met          { color: var(--bma-success-text); }
.ttr--below-goal        { color: var(--bma-emergency); }
.ttr--insufficient-data { color: var(--bma-text-muted); }

.ttr-status-badge {
  display: inline-block;
  font-family: var(--bma-font-thai);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}
.ttr-badge--goal-met          { background: var(--bma-success-bg);     color: var(--bma-success-text); }
.ttr-badge--below-goal        { background: var(--bma-emergency-bg);   color: var(--bma-emergency); }
.ttr-badge--insufficient-data { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

/* ── Dose display ─────────────────────────────────────────── */
.dose-display { display: flex; align-items: baseline; gap: 2px; flex-wrap: nowrap; }

.dose-val {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.dose-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Interaction badge ────────────────────────────────────── */
.ixn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-urgency-bg);
  color: var(--bma-urgency-text);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
}

/* ── Drug display (NOACs) ─────────────────────────────────── */
.drug-inline {
  display: flex;
  align-items: baseline;
  flex-wrap: nowrap;
  gap: 3px;
}
.drug-name {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
  flex-shrink: 0;
}
.drug-sep {
  font-size: 10px;
  color: var(--bma-text-muted);
  flex-shrink: 0;
}
.drug-dose {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* ── Weight display (NOACs) ───────────────────────────────── */
.weight-display { display: flex; align-items: baseline; gap: 2px; }

.weight-val {
  font-family: var(--bma-font-data);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.weight-val--low { color: var(--bma-urgency-text); }
.weight-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}
/* Weight criterion chip */
.weight-flag-chip {
  display: inline-block;
  margin-top: 3px;
  padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  color: #E65100;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}


/* ── Concordance badge ────────────────────────────────────── */
.concordance-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.concordance--yes      { background: var(--bma-success-bg);    color: var(--bma-success-text); }
.concordance--adjusted { background: var(--bma-urgency-bg);    color: var(--bma-urgency-text); }
.concordance--no       { background: var(--bma-emergency-bg);  color: var(--bma-emergency); }

/* ── Generic dash placeholder ─────────────────────────────── */
.col-dash { color: var(--bma-text-disabled); font-size: 14px; }

/* ── Tab section header (Pattern 14) ─────────────────────── */
.tab-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tab-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-primary);
  font-family: var(--bma-font-thai);
}
.tab-section-count {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}

/* ── KPI Strip ────────────────────────────────────────────── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: var(--bma-shadow-card);
  margin-bottom: 20px;
  overflow: hidden;
}

.kpi-cell {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-right: 1px solid var(--bma-border-subtle);
}
.kpi-cell:last-child { border-right: none; }

.kpi-eyebrow {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bma-text-muted);
  line-height: 1;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.kpi-value {
  font-family: var(--bma-font-data);
  font-size: 30px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}

.kpi-unit {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 400;
  color: var(--bma-text-muted);
  line-height: 1;
}

.kpi-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}
.kpi-badge--good  { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kpi-badge--alert { background: var(--bma-emergency-bg); color: var(--bma-emergency); }

.kpi-context {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-muted);
  line-height: 1.4;
}

/* Hoverable badge hint */
.ixn-badge--hoverable { cursor: pointer; }

/* ── Summary stat row — hoverable variant ─────────────────── */
.sc-stat-row--hoverable {
  cursor: pointer;
  border-radius: var(--bma-radius-sm);
  transition: background var(--bma-transition-fast);
  padding: 6px 8px;
  margin: 0 -8px;
}
.sc-stat-row--hoverable:hover {
  background: var(--bma-surface-subtle);
}
.sc-stat-row--hoverable .sc-stat-label {
  transition: color var(--bma-transition-fast);
}
.sc-stat-row--hoverable:hover .sc-stat-label {
  color: var(--bma-text-secondary);
}

</style>

<!-- Tooltip content styles — NOT scoped: Vuetify teleports tooltip to <body>,
     so scoped selectors can't reach it. Use specific class names to avoid leaking. -->
<style>
.ixn-tt-overlay.v-overlay__content {
  background: var(--bma-surface) !important;
  border: 1px solid var(--bma-border-card) !important;
  border-radius: 10px !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16) !important;
  padding: 12px 14px !important;
  color: var(--bma-text-primary) !important;
}

.ixn-tt-overlay .ixn-tt-header {
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bma-text-muted);
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--bma-border-subtle);
}

.ixn-tt-overlay .ixn-tt-row {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ixn-tt-overlay .ixn-tt-row + .ixn-tt-row {
  border-top: 1px solid var(--bma-border-subtle);
}

.ixn-tt-overlay .ixn-tt-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ixn-tt-overlay .ixn-tt-name {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}

.ixn-tt-overlay .ixn-tt-effect {
  display: inline-block;
  font-family: var(--bma-font-data);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ixn-tt-overlay .ixn-effect--increase { background: #FEECEC; color: #B72C2C; }
.ixn-tt-overlay .ixn-effect--decrease { background: #FFF3E0; color: #E65100; }
.ixn-tt-overlay .ixn-effect--none     { background: #F5F5F5; color: #8C8C8C; }

.ixn-tt-overlay .ixn-tt-note {
  font-family: var(--bma-font-thai);
  font-size: 11.5px;
  color: var(--bma-text-secondary);
  line-height: 1.55;
}

/* ── Scrollable body — shared across all tooltip overlays ──── */
/* Header stays pinned; this wrapper holds the scrollable rows  */
.tt-scroll-body {
  max-height:      200px;
  overflow-y:      auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bma-border-default, #D9D9D9) transparent;
}
.tt-scroll-body::-webkit-scrollbar       { width: 4px; }
.tt-scroll-body::-webkit-scrollbar-track { background: transparent; }
.tt-scroll-body::-webkit-scrollbar-thumb {
  background:    var(--bma-border-default, #D9D9D9);
  border-radius: 2px;
}

/* ── Summary hover overlay ────────────────────────────────── */
.summ-tt-overlay.v-overlay__content {
  background:    var(--bma-surface) !important;
  border:        1px solid var(--bma-border-card) !important;
  border-radius: 10px !important;
  box-shadow:    0 8px 28px rgba(0, 0, 0, 0.16) !important;
  padding:       12px 14px !important;
  color:         var(--bma-text-primary) !important;
  min-width:     280px !important;
  max-width:     340px !important;
}

.summ-tt-overlay .summ-tt-header {
  font-family:    var(--bma-font-data);
  font-size:      10px;
  font-weight:    700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color:          var(--bma-text-muted);
  padding-bottom: 8px;
  margin-bottom:  4px;
  border-bottom:  1px solid var(--bma-border-subtle);
}

.summ-tt-overlay .summ-tt-row {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             10px;
  padding:         8px 0;
}
.summ-tt-overlay .summ-tt-row + .summ-tt-row {
  border-top: 1px solid var(--bma-border-subtle);
}

.summ-tt-overlay .summ-tt-info {
  display:        flex;
  flex-direction: column;
  gap:            3px;
  min-width:      0;
}

.summ-tt-overlay .summ-tt-name {
  font-family:   var(--bma-font-thai);
  font-size:     13px;
  font-weight:   600;
  color:         var(--bma-text-primary);
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
}

.summ-tt-overlay .summ-tt-sub {
  display:     flex;
  align-items: center;
  gap:         6px;
}

.summ-tt-overlay .summ-tt-hn {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
}

.summ-tt-overlay .summ-tt-badge {
  display:       inline-block;
  padding:       1px 7px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
  white-space:   nowrap;
}

/* Status colors — Warfarin */
.summ-tt-overlay .summ-st--in-range    { background: #E8F5E9; color: #2E7D32; }
.summ-tt-overlay .summ-st--under-range { background: #FFF3E0; color: #E65100; }
.summ-tt-overlay .summ-st--over-range  { background: #FCE4EC; color: #B72C2C; }
/* Status colors — NOACs */
.summ-tt-overlay .summ-st--appropriate { background: #E8F5E9; color: #2E7D32; }
.summ-tt-overlay .summ-st--underdose   { background: #FFF3E0; color: #E65100; }
.summ-tt-overlay .summ-st--overdose    { background: #FCE4EC; color: #B72C2C; }
.summ-tt-overlay .summ-st--contra      { background: #E8EAF6; color: #3949AB; }
.summ-tt-overlay .summ-st--interaction { background: #F3EEFF; color: #7B52AB; }

.summ-tt-overlay .summ-tt-nav {
  width:       28px;
  height:      28px;
  border-radius: 7px;
  border:      1.5px solid var(--bma-border-card);
  background:  var(--bma-surface);
  display:     flex;
  align-items: center;
  justify-content: center;
  cursor:      pointer;
  color:       var(--bma-text-secondary);
  flex-shrink: 0;
  transition:  border-color 0.12s, background 0.12s, color 0.12s;
}
.summ-tt-overlay .summ-tt-nav:hover {
  border-color: var(--bma-green-500);
  background:   var(--bma-green-50);
  color:        var(--bma-green-700);
}

/* ══════════════════════════════════════════════════════════════
   KPI Tab — ตัวชี้วัดระบบ
   ══════════════════════════════════════════════════════════════ */

/* ── Section bar (title + period toggle) ────────────────────── */
.kpi-section-bar {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  margin-bottom:   12px;
}
.kpi-section-bar--mt { margin-top: 28px; }

.kpi-section-title {
  display:     flex;
  align-items: baseline;
  gap:         8px;
}
.kpi-st-text {
  font-family: var(--bma-font-thai);
  font-size:   14px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}
.kpi-st-eng {
  font-family:    var(--bma-font-data);
  font-size:      10px;
  font-weight:    600;
  color:          var(--bma-text-disabled);
  letter-spacing: .05em;
  text-transform: uppercase;
}

.kpi-period-group {
  display:     flex;
  align-items: center;
  gap:         10px;
}
.kpi-period-current {
  font-family: var(--bma-font-data);
  font-size:   11px;
  font-weight: 600;
  color:       var(--bma-text-muted);
  letter-spacing: .02em;
}

/* Segmented period toggle */
.kpi-period-seg {
  display:       flex;
  background:    var(--bma-surface-subtle);
  border:        1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-sm);
  padding:       2px;
  gap:           2px;
}
.kpi-seg-btn {
  height:        26px;
  padding:       0 12px;
  border:        none;
  background:    transparent;
  border-radius: 4px;
  font-family:   var(--bma-font-thai);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-muted);
  cursor:        pointer;
  transition:    background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.kpi-seg-btn--on {
  background:  var(--bma-surface);
  color:       var(--bma-text-primary);
  box-shadow:  var(--bma-shadow-xs);
}

/* ── Container (wraps 2 sub-sections — like summary-container) ── */
.kpi-container {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  overflow:      hidden;
  margin-bottom: 14px;
}
.kpi-container-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             12px;
  padding:         14px 20px 12px;
  border-bottom:   1px solid var(--bma-border-subtle);
}
.kpi-container-header--sm {
  padding-top:    11px;
  padding-bottom: 10px;
}
.kpi-header-left {
  display:     flex;
  align-items: baseline;
  gap:         8px;
}

/* Grid inside the container */
.kpi-container-grid {
  display: grid;
}
.kpi-container-grid--primary { grid-template-columns: 3fr 2fr; }
.kpi-container-grid--half    { grid-template-columns: 1fr 1fr;  }

/* Sub-section: plain content zone, no individual card chrome */
.kpi-sub-section {
  padding: 16px 20px 18px;
}
.kpi-sub-section--sep {
  border-left: 1px solid var(--bma-border-subtle);
}

/* ── Custom date range row ───────────────────────────────────── */
.kpi-custom-row {
  display:       flex;
  align-items:   center;
  gap:           10px;
  padding:       10px 20px;
  background:    var(--bma-surface-light);
  border-bottom: 1px solid var(--bma-border-subtle);
}
.kpi-custom-label {
  font-family:  var(--bma-font-thai);
  font-size:    12px;
  font-weight:  600;
  color:        var(--bma-text-muted);
  white-space:  nowrap;
}
.kpi-custom-inputs {
  display:     flex;
  align-items: center;
  gap:         8px;
}
.kpi-month-input {
  height:        30px;
  padding:       0 9px;
  border:        1px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  background:    var(--bma-surface);
  font-family:   var(--bma-font-data);
  font-size:     12px;
  font-weight:   600;
  color:         var(--bma-text-primary);
  outline:       none;
  cursor:        pointer;
  transition:    border-color 150ms ease;
  /* Remove the native spin-button chrome on Chrome */
  -webkit-appearance: none;
}
.kpi-month-input:focus { border-color: var(--bma-green-500); }
.kpi-custom-sep {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  color:       var(--bma-text-muted);
}
.kpi-custom-range-display {
  font-family:  var(--bma-font-data);
  font-size:    11px;
  font-weight:  600;
  color:        var(--bma-green-700);
  background:   var(--bma-green-50);
  border:       1px solid var(--bma-green-200);
  border-radius: var(--bma-radius-full);
  padding:      2px 9px;
  white-space:  nowrap;
  margin-left:  2px;
}

/* Slide transition for the custom row */
.kpi-custom-slide-enter-active,
.kpi-custom-slide-leave-active {
  transition: max-height 200ms cubic-bezier(.4,0,.2,1), opacity 180ms ease, padding 200ms ease;
  overflow: hidden;
  max-height: 52px;
}
.kpi-custom-slide-enter-from,
.kpi-custom-slide-leave-to {
  max-height: 0;
  opacity:    0;
  padding-top:    0;
  padding-bottom: 0;
}

/* ── Shared panel (legacy — kept for any standalone uses) ──── */
.kpi-panel {
  background:    var(--bma-surface);
  border-radius: var(--bma-radius-lg);
  border:        1px solid var(--bma-border-card);
  box-shadow:    var(--bma-shadow-card);
  padding:       16px 20px 18px;
}
.kpi-panel-head {
  display:         flex;
  align-items:     center;
  gap:             7px;
  margin-bottom:   14px;
  padding-bottom:  12px;
  border-bottom:   1px solid var(--bma-border-subtle);
}
.kpi-ph-name {
  font-family: var(--bma-font-thai);
  font-size:   13px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}
.kpi-ph-sub {
  font-family:    var(--bma-font-data);
  font-size:      10px;
  font-weight:    600;
  color:          var(--bma-text-disabled);
  letter-spacing: .04em;
  text-transform: uppercase;
  flex:           1;  /* push tally to right */
}
.kpi-ph-tally {
  display:    flex;
  align-items: center;
  gap:         4px;
  margin-left: auto;
}
.kpi-tally {
  display:       inline-flex;
  align-items:   center;
  height:        18px;
  padding:       0 7px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
  letter-spacing: .02em;
}
.kpi-tally--ok   { background: var(--bma-success-bg);      color: var(--bma-success-text); }
.kpi-tally--warn { background: var(--bma-urgency-bg);       color: var(--bma-urgency-text); }
.kpi-tally--ng   { background: var(--bma-emergency-bg);     color: var(--bma-emergency);    }

/* ── Grids ───────────────────────────────────────────────────── */
.kpi-primary-grid {
  display:               grid;
  grid-template-columns: 3fr 2fr;
  gap:                   14px;
  margin-bottom:         0;
}
.kpi-secondary-grid {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   14px;
}

/* ── Safety metric grid ──────────────────────────────────────── */
/* Columns: name | events | pct | trend | target | badge */
.ksafe-grid {
  display:               grid;
  grid-template-columns: 1fr 56px 54px 70px 58px 60px;
  column-gap:            8px;
  align-items:           center;
}
.ksafe-cell {
  padding:       8px 0 7px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.ksafe-cell--last { border-bottom: none; padding-bottom: 0; }

.ksafe-name {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  font-weight: 600;
  color:       var(--bma-text-secondary);
}
.ksafe-events {
  display:     flex;
  align-items: baseline;
  gap:         3px;
  justify-content: flex-end;
}
.ksafe-en {
  font-family: var(--bma-font-data);
  font-size:   15px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}
.ksafe-en--nz { color: var(--bma-emergency); }
.ksafe-eu {
  font-family: var(--bma-font-thai);
  font-size:   10px;
  color:       var(--bma-text-muted);
}
.ksafe-pct {
  font-family: var(--bma-font-data);
  font-size:   12px;
  font-weight: 700;
  text-align:  right;
  color:       var(--bma-text-muted);
}
.ksafe-pct--fail { color: var(--bma-emergency); }
.ksafe-pct--warn { color: var(--bma-urgency-text); }
.ksafe-pct--pass { color: var(--bma-text-muted); }

.ksafe-trend {
  font-family:  var(--bma-font-data);
  font-size:    11px;
  font-weight:  600;
  text-align:   right;
  white-space:  nowrap;
  color:        var(--bma-text-muted);
}
/* Safety: ▲ is bad (red), ▼ is good (green) */
.ksafe-trend--up   { color: var(--bma-emergency);   }
.ksafe-trend--down { color: var(--bma-success-text); }
.ksafe-trend--flat { color: var(--bma-text-disabled); }

.ksafe-target {
  font-family:  var(--bma-font-data);
  font-size:    11px;
  font-weight:  500;
  color:        var(--bma-text-muted);
  text-align:   right;
  white-space:  nowrap;
}

/* Safety status badge */
.ksafe-badge {
  display:       inline-flex;
  align-items:   center;
  justify-content: center;
  height:        18px;
  padding:       0 7px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
  white-space:   nowrap;
}
.ksafe-badge--pass { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.ksafe-badge--warn { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.ksafe-badge--fail { background: var(--bma-emergency-bg); color: var(--bma-emergency);    }

/* ── Quality rows ────────────────────────────────────────────── */
.kqual-rows {
  display:        flex;
  flex-direction: column;
  gap:            0;
}
.kqual-row {
  padding:       10px 0 9px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.kqual-row:first-child { padding-top: 0; }
.kqual-row-top {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             8px;
  margin-bottom:   7px;
}
.kqual-row-right {
  display:     flex;
  align-items: center;
  gap:         6px;
  flex-shrink: 0;
}
.kqual-metric-name {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  font-weight: 600;
  color:       var(--bma-text-secondary);
}
.kqual-frac {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
}

/* Quality badge */
.kqual-badge {
  display:       inline-flex;
  align-items:   center;
  height:        18px;
  padding:       0 7px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
  white-space:   nowrap;
}
.kqual-badge--pass { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kqual-badge--warn { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.kqual-badge--fail { background: var(--bma-emergency-bg); color: var(--bma-emergency);    }

/* Progress bar */
.kqual-bar-wrap { display: flex; flex-direction: column; gap: 5px; }
.kqual-track {
  position:     relative;
  height:       6px;
  background:   var(--bma-neutral-100);
  border-radius: 3px;
  overflow:     visible;
}
.kqual-fill {
  height:        100%;
  border-radius: 3px;
  transition:    width 400ms cubic-bezier(.22,.68,0,1.2);
}
.kqual-fill--pass { background: var(--bma-green-200);   }
.kqual-fill--warn { background: #FFD8A0; }
.kqual-fill--fail { background: #F5C2C2; }

/* Target marker — vertical line at the target% position */
.kqual-target-line {
  position:     absolute;
  top:          -4px;
  bottom:       -4px;
  width:        2px;
  transform:    translateX(-1px);
  background:   var(--bma-neutral-500);
  border-radius: 1px;
  opacity:      0.35;
}

.kqual-bar-labels {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
}
.kqual-bar-val {
  font-family: var(--bma-font-data);
  font-size:   12px;
  font-weight: 700;
}
.kqual-bval--pass { color: var(--bma-success-text); }
.kqual-bval--warn { color: var(--bma-urgency-text); }
.kqual-bval--fail { color: var(--bma-emergency);    }
.kqual-bar-target {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
}

/* LOS stat row (no progress bar) */
.kqual-los {
  padding-top: 10px;
  display:     flex;
  flex-direction: column;
  gap:         6px;
}
.kqual-los-body {
  display:     flex;
  align-items: baseline;
  gap:         6px;
}
.kqual-los-val {
  font-family: var(--bma-font-data);
  font-size:   22px;
  font-weight: 700;
  color:       var(--bma-text-primary);
  line-height: 1;
}
.kqual-los-unit {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  color:       var(--bma-text-muted);
}
.kqual-los-bench {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
  margin-left: 4px;
}

/* ── ATS response grid ───────────────────────────────────────── */
/* Columns: name | value | target | badge */
.kats-grid {
  display:               grid;
  grid-template-columns: 1fr 68px 84px 68px;
  column-gap:            8px;
  align-items:           center;
}
/* ATS rows share same border pattern as safety */
.kats-grid > * {
  padding:       9px 0 8px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.kats-grid > *:nth-last-child(-n+4) { border-bottom: none; padding-bottom: 0; }

.kats-name {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  font-weight: 600;
  color:       var(--bma-text-secondary);
}
.kats-val {
  font-family: var(--bma-font-data);
  font-size:   15px;
  font-weight: 700;
  text-align:  right;
}
.kats-val--pass { color: var(--bma-success-text); }
.kats-val--warn { color: var(--bma-urgency-text); }
.kats-val--fail { color: var(--bma-emergency);    }
.kats-target {
  font-family: var(--bma-font-data);
  font-size:   11px;
  color:       var(--bma-text-muted);
  text-align:  right;
}
.kats-badge {
  display:       inline-flex;
  align-items:   center;
  justify-content: center;
  height:        18px;
  padding:       0 7px;
  border-radius: var(--bma-radius-full);
  font-family:   var(--bma-font-data);
  font-size:     10px;
  font-weight:   700;
}
.kats-badge--pass { background: var(--bma-success-bg);   color: var(--bma-success-text); }
.kats-badge--warn { background: var(--bma-urgency-bg);   color: var(--bma-urgency-text); }
.kats-badge--fail { background: var(--bma-emergency-bg); color: var(--bma-emergency);    }

/* ── System Efficiency panel ─────────────────────────────────── */
.keff-staff-label {
  font-family:   var(--bma-font-thai);
  font-size:     11px;
  font-weight:   600;
  color:         var(--bma-text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.keff-staff-row {
  display:    flex;
  gap:        8px;
  flex-wrap:  wrap;
}
.keff-staff-chip {
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            2px;
  padding:        7px 12px;
  background:     var(--bma-surface-subtle);
  border:         1px solid var(--bma-border-card);
  border-radius:  var(--bma-radius-md);
  min-width:      52px;
}
.keff-staff-chip--total {
  background:  var(--bma-green-50);
  border-color: var(--bma-green-200);
}
.keff-staff-n {
  font-family: var(--bma-font-data);
  font-size:   20px;
  font-weight: 700;
  color:       var(--bma-text-primary);
  line-height: 1;
}
.keff-staff-chip--total .keff-staff-n { color: var(--bma-green-700); }
.keff-staff-role {
  font-family: var(--bma-font-thai);
  font-size:   10px;
  font-weight: 600;
  color:       var(--bma-text-muted);
  white-space: nowrap;
}
.keff-staff-chip--total .keff-staff-role { color: var(--bma-green-700); }

.keff-divider {
  margin: 14px 0 10px;
  height: 1px;
  background: var(--bma-border-subtle);
}

.keff-workload { display: flex; flex-direction: column; gap: 0; }
.keff-wl-row {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         7px 0 6px;
  border-bottom:   1px solid var(--bma-border-subtle);
}
.keff-wl-row:last-child { border-bottom: none; padding-bottom: 0; }
.keff-wl-name {
  font-family: var(--bma-font-thai);
  font-size:   12px;
  font-weight: 600;
  color:       var(--bma-text-secondary);
}
.keff-wl-val {
  font-family: var(--bma-font-data);
  font-size:   13px;
  font-weight: 700;
  color:       var(--bma-text-primary);
}
</style>
