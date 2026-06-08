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

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Lazy route chunks can go stale (a new deploy replaces hashed files, or an HMR
// rebuild invalidates them) — the dynamic import() then 404s and navigation
// silently aborts. Recover by reloading once to the intended URL, which fetches
// fresh chunks. Guard with a sessionStorage flag so a genuinely broken build
// can't loop.
router.onError((error, to) => {
  const stale = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error?.message ?? '')
  if (!stale) return
  const KEY = 'ats:chunk-reload'
  if (sessionStorage.getItem(KEY)) return
  sessionStorage.setItem(KEY, '1')
  window.location.assign(`${window.location.origin}${window.location.pathname}#${to.fullPath}`)
})

// Clear the reload guard once a navigation succeeds.
router.afterEach(() => sessionStorage.removeItem('ats:chunk-reload'))

export default router
