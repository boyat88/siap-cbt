import type { AttendanceSession, User } from '../types'
import { apiUrl } from './serverUrl'

const PENDING_KEY = 'siap-absensi-pending-attendance-v1'

interface AttendanceResponse {
  sessions?: AttendanceSession[]
  deleted?: Record<string, string>
  updatedAt?: string
}

export interface AttendanceSnapshot {
  sessions: AttendanceSession[]
  /** Sesi yang sudah dihapus administrator, berisi waktu penghapusan. */
  deleted: Record<string, string>
}

export type DeletedMap = Record<string, string>

function readPending(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AttendanceSession[]) : []
  } catch {
    return []
  }
}

function writePending(sessions: AttendanceSession[]) {
  try {
    if (sessions.length === 0) localStorage.removeItem(PENDING_KEY)
    else localStorage.setItem(PENDING_KEY, JSON.stringify(sessions))
  } catch {
    // Abaikan jika penyimpanan lokal tidak tersedia.
  }
}

function queuePending(sessions: AttendanceSession[]) {
  if (sessions.length === 0) return
  const map = new Map(readPending().map((session) => [session.id, session]))
  for (const session of sessions) map.set(session.id, session)
  writePending(Array.from(map.values()))
}

function clearPending(ids: string[]) {
  if (ids.length === 0) return
  const remaining = readPending().filter((session) => !ids.includes(session.id))
  writePending(remaining)
}

function submitter(user: User | null) {
  if (!user) return undefined
  return {
    id: user.id,
    name: user.name,
    role: user.role,
  }
}

/** Menggabungkan sesi dari server dengan data lokal. Sesi dengan updatedAt terbaru menang. */
export function mergeSessions(
  local: AttendanceSession[],
  incoming: AttendanceSession[],
  deleted: DeletedMap = {},
): AttendanceSession[] {
  const map = new Map(
    local
      .filter((session) => {
        const deletedAt = deleted[session.id]
        return !deletedAt || (session.updatedAt ?? '') > deletedAt
      })
      .map((session) => [session.id, session]),
  )
  for (const session of incoming) {
    const deletedAt = deleted[session.id]
    if (deletedAt && (session.updatedAt ?? '') <= deletedAt) continue
    const existing = map.get(session.id)
    if (!existing || (session.updatedAt ?? '') >= (existing.updatedAt ?? '')) {
      map.set(session.id, session)
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt),
  )
}

export async function fetchAttendanceSnapshot(): Promise<AttendanceSnapshot | null> {
  try {
    const response = await fetch(apiUrl('/api/attendance'), { cache: 'no-store' })
    if (!response.ok) return null
    const payload = (await response.json()) as AttendanceResponse
    const deleted =
      payload.deleted && typeof payload.deleted === 'object' ? payload.deleted : {}
    return {
      sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
      deleted,
    }
  } catch {
    return null
  }
}

/** Mengirim satu atau beberapa sesi absensi ke server administrator. */
export async function pushAttendanceSessions(
  sessions: AttendanceSession[],
  user: User | null,
): Promise<boolean> {
  if (sessions.length === 0) return true
  try {
    const response = await fetch(apiUrl('/api/attendance'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions, submittedBy: submitter(user) }),
    })
    if (!response.ok) throw new Error('Server menolak data absensi.')
    clearPending(sessions.map((session) => session.id))
    return true
  } catch {
    queuePending(sessions)
    return false
  }
}

/** Kirim ulang absensi yang sempat gagal dikirim karena server/offline. */
export async function flushPendingAttendance(user: User | null): Promise<boolean> {
  const pending = readPending()
  if (pending.length === 0) return true
  const ok = await pushAttendanceSessions(pending, user)
  return ok
}

export async function deleteAttendanceSession(id: string): Promise<boolean> {
  try {
    const response = await fetch(apiUrl(`/api/attendance?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
    })
    return response.ok
  } catch {
    return false
  }
}

export function pendingAttendanceCount(): number {
  return readPending().length
}
