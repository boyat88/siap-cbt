import type { CbtAttempt, CbtExam } from '../types'
import { apiUrl } from './serverUrl'

const PENDING_KEY = 'siap-cbt-pending-v1'

interface CbtResponse {
  exams?: CbtExam[]
  attempts?: CbtAttempt[]
  deletedExams?: Record<string, string>
  deletedAttempts?: Record<string, string>
  updatedAt?: string
}

export interface CbtSnapshot {
  exams: CbtExam[]
  attempts: CbtAttempt[]
  deletedExams: Record<string, string>
  deletedAttempts: Record<string, string>
}

interface PendingStore {
  exams: CbtExam[]
  attempts: CbtAttempt[]
}

export type DeletedMap = Record<string, string>

function readPending(): PendingStore {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return { exams: [], attempts: [] }
    const parsed = JSON.parse(raw) as Partial<PendingStore>
    return {
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    }
  } catch {
    return { exams: [], attempts: [] }
  }
}

function writePending(store: PendingStore) {
  try {
    if (store.exams.length === 0 && store.attempts.length === 0) localStorage.removeItem(PENDING_KEY)
    else localStorage.setItem(PENDING_KEY, JSON.stringify(store))
  } catch {
    // Abaikan jika penyimpanan lokal tidak tersedia.
  }
}

function queuePending(exams: CbtExam[], attempts: CbtAttempt[]) {
  if (exams.length === 0 && attempts.length === 0) return
  const pending = readPending()
  const examMap = new Map(pending.exams.map((exam) => [exam.id, exam]))
  for (const exam of exams) examMap.set(exam.id, exam)
  const attemptMap = new Map(pending.attempts.map((attempt) => [attempt.id, attempt]))
  for (const attempt of attempts) attemptMap.set(attempt.id, attempt)
  writePending({ exams: Array.from(examMap.values()), attempts: Array.from(attemptMap.values()) })
}

function clearPending(examIds: string[], attemptIds: string[]) {
  const pending = readPending()
  const nextExams = pending.exams.filter((exam) => !examIds.includes(exam.id))
  const nextAttempts = pending.attempts.filter((attempt) => !attemptIds.includes(attempt.id))
  if (nextExams.length === pending.exams.length && nextAttempts.length === pending.attempts.length) return
  writePending({ exams: nextExams, attempts: nextAttempts })
}

/** Menggabungkan ujian dari server dengan lokal; updatedAt terbaru menang. */
export function mergeCbtExams(local: CbtExam[], incoming: CbtExam[], deleted: DeletedMap = {}): CbtExam[] {
  const map = new Map(
    local
      .filter((exam) => {
        const deletedAt = deleted[exam.id]
        return !deletedAt || (exam.updatedAt ?? '') > deletedAt
      })
      .map((exam) => [exam.id, exam]),
  )
  for (const exam of incoming) {
    const deletedAt = deleted[exam.id]
    if (deletedAt && (exam.updatedAt ?? '') <= deletedAt) continue
    const existing = map.get(exam.id)
    if (!existing || (exam.updatedAt ?? '') >= (existing.updatedAt ?? '')) map.set(exam.id, exam)
  }
  return Array.from(map.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/** Menggabungkan attempt dari server dengan lokal; updatedAt terbaru menang. */
export function mergeCbtAttempts(
  local: CbtAttempt[],
  incoming: CbtAttempt[],
  deleted: DeletedMap = {},
): CbtAttempt[] {
  const map = new Map(
    local
      .filter((attempt) => {
        const deletedAt = deleted[attempt.id]
        return !deletedAt || (attempt.updatedAt ?? '') > deletedAt
      })
      .map((attempt) => [attempt.id, attempt]),
  )
  for (const attempt of incoming) {
    const deletedAt = deleted[attempt.id]
    if (deletedAt && (attempt.updatedAt ?? '') <= deletedAt) continue
    const existing = map.get(attempt.id)
    if (!existing || (attempt.updatedAt ?? '') >= (existing.updatedAt ?? '')) map.set(attempt.id, attempt)
  }
  return Array.from(map.values()).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export async function fetchCbtSnapshot(): Promise<CbtSnapshot | null> {
  try {
    const response = await fetch(apiUrl('/api/cbt'), { cache: 'no-store' })
    if (!response.ok) return null
    const payload = (await response.json()) as CbtResponse
    return {
      exams: Array.isArray(payload.exams) ? payload.exams : [],
      attempts: Array.isArray(payload.attempts) ? payload.attempts : [],
      deletedExams:
        payload.deletedExams && typeof payload.deletedExams === 'object' ? payload.deletedExams : {},
      deletedAttempts:
        payload.deletedAttempts && typeof payload.deletedAttempts === 'object'
          ? payload.deletedAttempts
          : {},
    }
  } catch {
    return null
  }
}

/** Mengirim ujian dan attempt ke server. Gagal mengirim akan masuk antrian offline. */
export async function pushCbtUpdates(exams: CbtExam[], attempts: CbtAttempt[]): Promise<boolean> {
  if (exams.length === 0 && attempts.length === 0) return true
  try {
    const response = await fetch(apiUrl('/api/cbt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exams, attempts }),
    })
    if (!response.ok) throw new Error('Server menolak data CBT.')
    clearPending(exams.map((exam) => exam.id), attempts.map((attempt) => attempt.id))
    return true
  } catch {
    queuePending(exams, attempts)
    return false
  }
}

/** Kirim ulang data CBT yang sempat gagal karena server/offline. */
export async function flushPendingCbt(): Promise<boolean> {
  const pending = readPending()
  if (pending.exams.length === 0 && pending.attempts.length === 0) return true
  return pushCbtUpdates(pending.exams, pending.attempts)
}

export async function deleteCbtItem(kind: 'exam' | 'attempt', id: string): Promise<boolean> {
  try {
    const response = await fetch(
      apiUrl(`/api/cbt?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`),
      { method: 'DELETE' },
    )
    return response.ok
  } catch {
    return false
  }
}
