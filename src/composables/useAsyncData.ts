// ─── useAsyncData ────────────────────────────────────────────────────────────
// Minimal helper for loading data from the repository inside <script setup>.
// Returns reactive { data, loading, error } and kicks off the load immediately.
// `initial` keeps computed() chains safe (never undefined) before data arrives.
//
//   const { data: patients, loading } = useAsyncData(() => repo.getWarfarinPatients(), {})
//
// For loads that depend on a reactive key (e.g. route param) prefer a manual
// watch + repo call; this helper is for the fire-once page-level fetch.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, shallowRef, type Ref } from 'vue'

export interface AsyncDataState<T> {
  data: Ref<T>
  loading: Ref<boolean>
  error: Ref<unknown>
}

export function useAsyncData<T>(loader: () => Promise<T>, initial: T): AsyncDataState<T> {
  const data = shallowRef(initial) as Ref<T>
  const loading = ref(true)
  const error = ref<unknown>(null)

  loader()
    .then((result) => { data.value = result })
    .catch((err) => { error.value = err; console.error('[useAsyncData] load failed', err) })
    .finally(() => { loading.value = false })

  return { data, loading, error }
}
