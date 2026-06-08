import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    nav: string
    sub?: string
  }
}

// Lazy route components → each page is code-split into its own chunk, loaded on
// navigation rather than bundled into the entry. (WarfarinDoseTool / NoacAlgorithm
// are embedded in AtsPatientDetail, so they ride along in its chunk graph.)
const routes = [
  {
    path: '/',
    component: () => import('@/pages/ConsultList.vue'),
    meta: { nav: 'consult', sub: 'send' },
  },
  {
    path: '/dd-ats',
    component: () => import('@/pages/DdAtsDashboard.vue'),
    meta: { nav: 'dd-ats' },
  },
  {
    path: '/dd-ats/patient/:id',
    component: () => import('@/pages/AtsPatientDetail.vue'),
    meta: { nav: 'dd-ats' },
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
