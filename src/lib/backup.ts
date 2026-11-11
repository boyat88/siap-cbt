import type { AppData, User } from '../types'

export const BACKUP_APP = 'SIAP SMP'
export const BACKUP_VERSION = 1

export interface BackupPayload {
  app: string
  version: number
  createdAt: string
  data: AppData
  profiles: Record<string, Partial<User>>
}

export interface RestoredBackup {
  data: AppData
  profiles: Record<string, Partial<User>>
  createdAt?: string
  legacy: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureItems(value: unknown, label: string, required: string[]): void {
  if (!Array.isArray(value)) {
    throw new Error(`Bagian "${label}" tidak ditemukan di file cadangan.`)
  }
  const invalid = value.find((item) => !isRecord(item) || required.some((key) => typeof item[key] !== 'string'))
  if (invalid) {
    throw new Error(`Ada data ${label} yang tidak valid di file cadangan.`)
  }
}

export function createBackup(data: AppData, profiles: Record<string, Partial<User>>): BackupPayload {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data,
    profiles,
  }
}

export function backupFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    'backup-siap-smp',
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}`,
  ].join('-').concat('.json')
}

export function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function parseBackup(text: string): RestoredBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File yang dipilih bukan JSON yang valid.')
  }

  if (!isRecord(parsed)) {
    throw new Error('Isi file cadangan tidak dikenali.')
  }

  // Dukung dua format: cadangan lengkap (dengan pembungkus) dan cadangan lama (AppData langsung).
  const legacy = !isRecord(parsed.data)
  const dataLike = legacy ? parsed : parsed.data

  if (!isRecord(dataLike)) {
    throw new Error('Isi file cadangan tidak dikenali.')
  }

  ensureItems(dataLike.students, 'siswa', ['id', 'name'])
  ensureItems(dataLike.teachers, 'guru', ['id', 'name'])
  ensureItems(dataLike.classes, 'kelas', ['id', 'name'])
  ensureItems(dataLike.sessions, 'sesi absensi', ['id', 'date'])
  ensureItems(dataLike.notifications ?? [], 'notifikasi', ['id'])

  if (!isRecord(dataLike.settings) || !isRecord(dataLike.settings.school)) {
    throw new Error('Pengaturan sekolah tidak ditemukan di file cadangan.')
  }
  if (typeof dataLike.settings.school.name !== 'string') {
    throw new Error('Nama sekolah pada file cadangan tidak valid.')
  }

  const data = {
    ...(dataLike as unknown as AppData),
    notifications: (dataLike.notifications ?? []) as AppData['notifications'],
  }

  const profiles = !legacy && isRecord(parsed.profiles) ? (parsed.profiles as Record<string, Partial<User>>) : {}
  const createdAt = !legacy && typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined

  return { data, profiles, createdAt, legacy }
}
