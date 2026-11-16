import type { TeachingSchedule } from '../types'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

/** ID unik untuk jadwal baru (aman walau dua jadwal dibuat dalam milidetik yang sama). */
export function newTeachingScheduleId(): string {
  return `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function isValidSchedule(value: unknown): value is TeachingSchedule {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<TeachingSchedule>
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.teacherId === 'string' &&
    typeof item.subject === 'string' &&
    typeof item.day === 'string' &&
    DAYS.includes(item.day as (typeof DAYS)[number]) &&
    Array.isArray(item.classIds)
  )
}

/**
 * Gabungkan jadwal mengajar dari data lokal dan server.
 *
 * Data lokal diprioritaskan agar jadwal yang baru saja ditambahkan (belum
 * sempat terkirim ke server) tidak hilang saat data server disegarkan.
 * ID yang sudah dihapus (tombstone) tetap dibuang supaya tidak muncul lagi.
 */
export function mergeTeachingSchedules(
  local: TeachingSchedule[] | undefined,
  remote: TeachingSchedule[] | undefined,
  tombstones?: Record<string, string>,
): TeachingSchedule[] {
  const map = new Map<string, TeachingSchedule>()
  for (const item of local ?? []) {
    if (isValidSchedule(item)) map.set(item.id, item)
  }
  for (const item of remote ?? []) {
    if (isValidSchedule(item) && !map.has(item.id)) map.set(item.id, item)
  }
  for (const id of Object.keys(tombstones ?? {})) map.delete(id)
  return Array.from(map.values())
}

/** Gabungkan daftar ID jadwal yang sudah dihapus (tombstone), ambil waktu terbaru. */
export function mergeScheduleTombstones(
  ...sources: (Record<string, string> | undefined)[]
): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    for (const [id, deletedAt] of Object.entries(source)) {
      if (typeof id !== 'string' || typeof deletedAt !== 'string') continue
      const existing = merged[id]
      if (!existing || deletedAt > existing) merged[id] = deletedAt
    }
  }
  return merged
}
