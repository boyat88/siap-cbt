/*
 * Pengaturan yang hanya tersimpan di perangkat (localStorage), misalnya tema
 * per akun, menu yang disembunyikan, dan status sidebar. Data ini tidak ikut
 * tersimpan di server, jadi perlu diekspor sendiri saat aplikasi dipindah ke
 * laptop lain.
 *
 * Alamat server sengaja TIDAK ikut diekspor: alamat itu khusus untuk perangkat
 * masing-masing dan bisa mengarah ke laptop lama setelah pemindahan.
 */

export const DEVICE_SETTINGS_APP = 'SIAP SMP'
export const DEVICE_SETTINGS_TYPE = 'device-settings'
export const DEVICE_SETTINGS_VERSION = 1

/** Kunci localStorage yang termasuk pengaturan perangkat. */
const EXACT_KEYS = [
  'siap-absensi-theme-v1',
  'siap-absensi-menu-v1',
  'siap-absensi-sidebar-v1',
]

/** Kunci bertema per akun, mis. siap-absensi-theme-v2:u_admin. */
const PREFIX_KEYS = ['siap-absensi-theme-v2:']

export interface DeviceSettingsPayload {
  app: string
  type: string
  version: number
  createdAt: string
  settings: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDeviceKey(key: string): boolean {
  return EXACT_KEYS.includes(key) || PREFIX_KEYS.some((prefix) => key.startsWith(prefix))
}

/** Mengumpulkan semua pengaturan perangkat yang sedang tersimpan. */
export function collectDeviceSettings(): DeviceSettingsPayload {
  const settings: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !isDeviceKey(key)) continue
      const value = localStorage.getItem(key)
      if (typeof value === 'string') settings[key] = value
    }
  } catch {
    // localStorage tidak tersedia; hasilnya objek kosong.
  }

  return {
    app: DEVICE_SETTINGS_APP,
    type: DEVICE_SETTINGS_TYPE,
    version: DEVICE_SETTINGS_VERSION,
    createdAt: new Date().toISOString(),
    settings,
  }
}

export function deviceSettingsFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    'pengaturan-perangkat-siap-smp',
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}`,
  ]
    .join('-')
    .concat('.json')
}

/** Membaca file pengaturan perangkat dan memastikan isinya aman diterapkan. */
export function parseDeviceSettings(text: string): DeviceSettingsPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File yang dipilih bukan JSON yang valid.')
  }

  if (!isRecord(parsed) || !isRecord(parsed.settings)) {
    throw new Error('File pengaturan perangkat tidak dikenali.')
  }

  if (parsed.type !== undefined && parsed.type !== DEVICE_SETTINGS_TYPE) {
    throw new Error('File tersebut bukan file pengaturan perangkat SIAP SMP.')
  }

  const settings: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.settings)) {
    if (!isDeviceKey(key) || typeof value !== 'string') continue
    settings[key] = value
  }

  if (Object.keys(settings).length === 0) {
    throw new Error('Tidak ada pengaturan tampilan yang bisa dipulihkan dari file ini.')
  }

  return {
    app: typeof parsed.app === 'string' ? parsed.app : DEVICE_SETTINGS_APP,
    type: DEVICE_SETTINGS_TYPE,
    version: typeof parsed.version === 'number' ? parsed.version : DEVICE_SETTINGS_VERSION,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    settings,
  }
}

/** Menghapus pengaturan perangkat lama lalu menerapkan isi file. */
export function applyDeviceSettings(payload: DeviceSettingsPayload): number {
  try {
    const existing: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && isDeviceKey(key)) existing.push(key)
    }
    existing.forEach((key) => localStorage.removeItem(key))
    for (const [key, value] of Object.entries(payload.settings)) {
      localStorage.setItem(key, value)
    }
    return Object.keys(payload.settings).length
  } catch {
    throw new Error('Pengaturan tidak dapat disimpan di perangkat ini.')
  }
}
