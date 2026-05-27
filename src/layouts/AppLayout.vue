<template>
  <v-app theme="bmaLight">

    <!-- ── Top Bar ──────────────────────────────────────────── -->
    <v-app-bar flat color="white" height="64" style="border-bottom:1px solid #F0F0F0;z-index:200">
      <div class="topbar-logo" style="max-width: 256px; justify-content: center;">
        <img src="/src/assets/BMA_Logo.svg" style="max-width: 100%;"/>
      </div>
      <v-spacer />
      <div class="topbar-right">
        <div class="lang-toggle">
          <span class="lang-btn">EN</span>
          <span class="lang-btn lang-active">TH</span>
        </div>
        <div class="notif-wrap">
          <PhBell :size="20" color="#595959" />
          <span class="notif-dot" />
        </div>
        <div class="user-chip">
          <PhUserCircle :size="28" color="#8C8C8C" />
          <span>นายทดสอบ ลองระบบ</span>
          <PhCaretDown :size="14" color="#8C8C8C" />
        </div>
      </div>
    </v-app-bar>

    <!-- ── Sidebar ──────────────────────────────────────────── -->
    <v-navigation-drawer permanent width="256" color="white" style="border-right:1px solid #F0F0F0">
      <div class="nav-scroll">
        <template v-for="item in navItems" :key="item.key">

          <!-- Nav item row -->
          <div
            class="nav-item"
            :class="item.key === activeNav ? 'nav-item--active' : ''"
            @click="handleNavClick(item)"
          >
            <component
              :is="item.icon"
              :size="17"
              :color="item.key === activeNav ? '#00744B' : '#8C8C8C'"
              class="nav-icon"
            />
            <span>{{ item.label }}</span>
            <component
              v-if="item.children"
              :is="openNav === item.key ? PhCaretUp : PhCaretDown"
              :size="14"
              :color="item.key === activeNav ? '#00744B' : '#BFBFBF'"
              class="nav-arrow"
            />
          </div>

          <!-- Sub-items — rendered immediately after their parent -->
          <template v-if="item.children && openNav === item.key && subItems[item.key]">
            <div
              v-for="sub in subItems[item.key]"
              :key="sub.key"
              class="nav-sub"
              :class="sub.key === activeSub ? 'nav-sub--active' : ''"
              @click="handleSubClick(sub)"
            >
              <span class="nav-sub-bullet" />
              {{ sub.label }}
            </div>
          </template>

        </template>
      </div>
    </v-navigation-drawer>

    <!-- ── Content slot ──────────────────────────────────────── -->
    <v-main style="background:#F5F5F5">
      <slot/>
    </v-main>

  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Component } from 'vue'
import {
  PhBell, PhUserCircle, PhCaretDown, PhCaretUp,
  PhHouse, PhIdentificationCard, PhNewspaper,
  PhFirstAid, PhPhone, PhPresentationChart,
  PhNotepad, PhArrowsClockwise, PhChatsCircle,
  PhAddressBook, PhBuilding, PhBed, PhUserGear,
} from '@phosphor-icons/vue'

const route  = useRoute()
const router = useRouter()

const activeNav = computed(() => route.meta.nav as string ?? '')
const activeSub = computed(() => route.meta.sub as string ?? '')

// Keeps the active section expanded; allows toggling other sections
const openNav = ref(activeNav.value)
watch(activeNav, (val) => { openNav.value = val })

interface NavItem {
  key: string
  label: string
  icon: Component
  children: boolean
  route?: string
}

const navItems: NavItem[] = [
  { key: 'home',         label: 'Home',                          icon: PhHouse,              children: false },
  { key: 'meeting',      label: 'BMA Meeting',                   icon: PhIdentificationCard, children: false },
  { key: 'pr',           label: 'ประชาสัมพันธ์',                  icon: PhNewspaper,          children: true  },
  { key: 'ncd',          label: 'NCD Clinic',                    icon: PhFirstAid,           children: true  },
  { key: 'telemed',      label: 'สถิติการใช้งาน Telemed',         icon: PhPhone,              children: false },
  { key: 'health-dash',  label: 'Dashboard ประเมินสุขภาพ',        icon: PhPresentationChart,  children: false },
  { key: 'consult',      label: 'ระบบ Consult',                  icon: PhNotepad,            children: true  },
  { key: 'dd-ats',       label: 'โครงการ DD-ATS',                icon: PhArrowsClockwise,    children: false, route: '/dd-ats' },
  { key: 'chat',         label: 'Easy Chat',                     icon: PhChatsCircle,        children: false },
  { key: 'registry',     label: 'ทะเบียนผู้รับบริการ',            icon: PhAddressBook,        children: true  },
  { key: 'store',        label: 'บันทึกทะเบียนสถานที่ตรวจ',       icon: PhBuilding,           children: false },
  { key: 'bed',          label: 'ระบบเตียง',                     icon: PhBed,                children: false },
  { key: 'user',         label: 'User Manager',                  icon: PhUserGear,           children: false },
]

const subItems: Record<string, { key: string; label: string; route?: string }[]> = {
  'pr': [
    { key: 'news',    label: 'ข่าวสาร' },
    { key: 'announce', label: 'ประกาศ' },
  ],
  'ncd': [
    { key: 'ncd-dashboard', label: 'Dashboard' },
    { key: 'ncd-patient',   label: 'ผู้ป่วย NCD' },
  ],
  'consult': [
    { key: 'send',    label: 'ส่งปรึกษา',                        route: '/' },
    { key: 'answer',  label: 'ตอบปรึกษา' },
    { key: 'collect', label: 'ส่งเรียกเก็บการตรวจสุขภาพ' },
    { key: 'stat',    label: 'สถิติการใช้งาน Telemed' },
  ],
  'registry': [
    { key: 'registry-list',   label: 'ทะเบียนผู้รับบริการ' },
    { key: 'registry-search', label: 'ค้นหาผู้รับบริการ' },
  ],
}

function handleNavClick(item: NavItem) {
  if (item.children) {
    openNav.value = openNav.value === item.key ? '' : item.key
  } else if (item.route) {
    router.push(item.route)
  }
}

function handleSubClick(sub: { key: string; route?: string }) {
  if (sub.route) router.push(sub.route)
}
</script>

<style scoped>
/* ── Topbar ─────────────────────────────────────────────── */
.topbar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  width: 100%;
  height: 64px;
  border-right: 1px solid var(--bma-border-subtle);
  flex-shrink: 0;
}

.logo-th { font-size: 15px; font-weight: 700; color: var(--bma-green-500); line-height: 1.15; }
.logo-en { font-size: 10px; color: var(--bma-text-muted); letter-spacing: .06em; font-family: var(--bma-font-data); text-transform: uppercase; }

.topbar-right { display: flex; align-items: center; gap: 12px; }

.lang-toggle {
  display: flex;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-sm);
  overflow: hidden;
  font-family: var(--bma-font-data);
  font-size: 12px;
  font-weight: 600;
}
.lang-btn    { padding: 4px 10px; cursor: pointer; color: var(--bma-text-muted); }
.lang-active { background: var(--bma-green-500); color: var(--bma-surface); }

.notif-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.notif-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bma-emergency);
  border: 1.5px solid var(--bma-surface);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-full);
  font-size: 13px;
  color: var(--bma-text-secondary);
  cursor: pointer;
}

/* ── Sidebar ────────────────────────────────────────────── */
.nav-scroll {
  padding: 8px 8px 16px;
  height: 100%;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: var(--bma-radius-sm);
  font-size: 13px;
  color: var(--bma-text-tertiary);
  cursor: pointer;
  transition: background var(--bma-transition-fast), color var(--bma-transition-fast);
  position: relative;
  user-select: none;
  margin-bottom: 1px;
}
.nav-item:hover { background: var(--bma-green-50); }
.nav-item--active { background: var(--bma-green-50); color: var(--bma-green-500); font-weight: 700; }
.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 3px;
  background: var(--bma-green-500);
  border-radius: 0 3px 3px 0;
}
.nav-icon  { flex-shrink: 0; display: block; }
.nav-arrow { margin-left: auto; flex-shrink: 0; display: block; }

.nav-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 36px;
  font-size: 12.5px;
  color: var(--bma-text-muted);
  cursor: pointer;
  transition: color var(--bma-transition-fast);
  margin-bottom: 1px;
}
.nav-sub:hover { color: var(--bma-green-500); }
.nav-sub--active { color: var(--bma-green-500); font-weight: 700; }
.nav-sub-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: .5;
}
.nav-sub--active .nav-sub-bullet { opacity: 1; }
</style>
