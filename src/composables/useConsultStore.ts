// ─── Consult thread store — shared across the dose tool + the consult room ───
// One source of truth for each patient's consultation thread so a dose
// adjustment recorded in the Warfarin Dose Tool tab can surface in the
// "ห้องปรึกษา" tab (and vice-versa). Pinia-free: module-level reactive state.
//   • seed     = threads loaded from the mock repo (read-only)
//   • appends  = messages added at runtime, persisted to localStorage
// Thread = seed + appends. Only appends are persisted (the mock stays the mock).
// ─────────────────────────────────────────────────────────────────────────────

import { reactive } from 'vue'
import { repo } from '@/data/repository'
import type { WeeklySchedule } from '@/data/types/warfarin'

export type ConsultRole = 'doctor' | 'pharmacist' | 'nurse'

export interface ConsultMsg {
  id:        string
  role:      ConsultRole
  sender:    string
  text:      string
  time:      string
  dateISO:   string
  // 'dose-adjustment'   — a committed adjustment, posted as an FYI card
  // 'approval-request'  — a proposed plan awaiting the counterpart's response
  // 'approval-response' — an accept of a request (replyTo points at it); a
  //                       counter-proposal is instead a new request with replyTo set
  // 'approval-withdrawn'— the proposer cancelled their own pending request
  msgType?:  'dose-adjustment' | 'approval-request' | 'approval-response' | 'approval-withdrawn'
  doseData?: { oldDose: number; newDose: number; pct: number; inr: number; schedule: WeeklySchedule }
  replyTo?:  string   // request id this message responds to / supersedes
  reason?:   string   // optional rationale on a request
  userId?:   string   // identity of the actor (drives the self-approval guard)
}

export interface DoseAdjPayload {
  oldDose: number; newDose: number; pct: number; inr: number; schedule: WeeklySchedule
}

/** Simulated identities. No auth in this prototype — the chat-header "ทำในนาม"
 *  picker flips CURRENT_USER between these so an approval can be demoed end to end.
 *  Identity (not role) defines "self": the self-approval guard blocks accepting your
 *  OWN request, but a *different* person — even of the same role — may accept it. */
export interface ConsultUser { id: string; role: ConsultRole; name: string }
export const CONSULT_USERS: ConsultUser[] = [
  { id: 'u-pharm-1', role: 'pharmacist', name: 'ภญ. สมหญิง' },
  { id: 'u-pharm-2', role: 'pharmacist', name: 'ภก. ก้อง' },
  { id: 'u-doc-1',   role: 'doctor',     name: 'นพ. วิชัย' },
  { id: 'u-nurse-1', role: 'nurse',      name: 'พว. มาลี' },
]
export const CURRENT_USER = reactive<ConsultUser>({ ...CONSULT_USERS[0] })
export function setCurrentUser(id: string) {
  const u = CONSULT_USERS.find(x => x.id === id)
  if (u) Object.assign(CURRENT_USER, u)
}

const LS_KEY = 'bma-consult-appends-v1'
const seed    = reactive<Record<string, ConsultMsg[]>>({})
const appends = reactive<Record<string, ConsultMsg[]>>(loadAppends())
let seeding: Promise<void> | null = null

function loadAppends(): Record<string, ConsultMsg[]> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(appends)) } catch { /* storage unavailable — keep in-memory */ }
}
function ensureSeeded(): Promise<void> {
  if (!seeding) seeding = repo.getConsultations().then(c => { Object.assign(seed, c as unknown as Record<string, ConsultMsg[]>) })
  return seeding
}
function nowParts() {
  const d = new Date()
  return {
    time:    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
    dateISO: d.toISOString().slice(0, 10),
  }
}

export function useConsultStore() {
  void ensureSeeded()
  const post = (id: string, msg: ConsultMsg) => {
    (appends[id] ??= []).push(msg)
    persist()
  }
  return {
    /** Reactive merged thread (seed + local appends). Read inside a computed. */
    messages(id: string): ConsultMsg[] {
      return [...(seed[id] ?? []), ...(appends[id] ?? [])]
    },
    post,
    postMessage(id: string, role: ConsultRole, sender: string, text: string) {
      const { time, dateISO } = nowParts()
      post(id, { id: `msg-${id}-${Date.now()}`, role, sender, text, time, dateISO })
    },
    /** Dose-adjustment card, attributed to the actor who made it. */
    postDoseAdjustment(id: string, d: DoseAdjPayload, actor = CURRENT_USER) {
      const { time, dateISO } = nowParts()
      post(id, {
        id: `msg-dose-${id}-${Date.now()}`,
        role: actor.role, sender: actor.name, text: '',
        time, dateISO, msgType: 'dose-adjustment', doseData: d,
      })
    },

    // ── Approval flow ─────────────────────────────────────────────────────────
    /** Propose a plan that needs the counterpart's response. `replyTo` set when
     *  this is a counter-proposal that supersedes an earlier request. Returns id. */
    postApprovalRequest(id: string, d: DoseAdjPayload, actor = CURRENT_USER, opts: { reason?: string; replyTo?: string } = {}) {
      const { time, dateISO } = nowParts()
      const reqId = `msg-req-${id}-${Date.now()}`
      post(id, {
        id: reqId, role: actor.role, sender: actor.name, userId: actor.id, text: '',
        time, dateISO, msgType: 'approval-request', doseData: d,
        reason: opts.reason, replyTo: opts.replyTo,
      })
      return reqId
    },
    /** Accept a pending request → records the approval (commit is done by caller). */
    postApprovalResponse(id: string, replyTo: string, actor = CURRENT_USER) {
      const { time, dateISO } = nowParts()
      post(id, {
        id: `msg-resp-${id}-${Date.now()}`, role: actor.role, sender: actor.name, userId: actor.id, text: '',
        time, dateISO, msgType: 'approval-response', replyTo,
      })
    },
    /** Proposer cancels their own pending request. */
    withdrawRequest(id: string, replyTo: string, actor = CURRENT_USER) {
      const { time, dateISO } = nowParts()
      post(id, {
        id: `msg-wd-${id}-${Date.now()}`, role: actor.role, sender: actor.name, userId: actor.id, text: '',
        time, dateISO, msgType: 'approval-withdrawn', replyTo,
      })
    },
    /** The single open request for a patient (the 1-pending rule), or null. A
     *  request is open unless a later message responds to / supersedes / withdraws it. */
    pendingRequest(id: string): ConsultMsg | null {
      const msgs = [...(seed[id] ?? []), ...(appends[id] ?? [])]
      const resolved = new Set(
        msgs.filter(m => m.replyTo).map(m => m.replyTo as string),
      )
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i]
        if (m.msgType === 'approval-request' && !resolved.has(m.id)) return m
      }
      return null
    },
    /** Terminal status of a request id (for card rendering). */
    requestStatus(id: string, reqId: string): 'pending' | 'approved' | 'superseded' | 'withdrawn' {
      const msgs = [...(seed[id] ?? []), ...(appends[id] ?? [])]
      const reply = msgs.find(m => m.replyTo === reqId)
      if (!reply) return 'pending'
      if (reply.msgType === 'approval-response')  return 'approved'
      if (reply.msgType === 'approval-withdrawn') return 'withdrawn'
      return 'superseded'   // a counter-request points here
    },
  }
}
