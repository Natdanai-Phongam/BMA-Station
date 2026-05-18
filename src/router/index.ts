import { createRouter, createWebHashHistory } from 'vue-router'
import ConsultList      from '@/pages/ConsultList.vue'
import DdAtsDashboard  from '@/pages/DdAtsDashboard.vue'
import AtsPatientDetail from '@/pages/AtsPatientDetail.vue'

declare module 'vue-router' {
  interface RouteMeta {
    nav: string
    sub?: string
  }
}

const routes = [
  {
    path: '/',
    component: ConsultList,
    meta: { nav: 'consult', sub: 'send' },
  },
  {
    path: '/dd-ats',
    component: DdAtsDashboard,
    meta: { nav: 'dd-ats' },
  },
  {
    path: '/dd-ats/patient/:id',
    component: AtsPatientDetail,
    meta: { nav: 'dd-ats' },
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
