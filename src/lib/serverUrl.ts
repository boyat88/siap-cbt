const STORAGE_KEY = 'siap-absensi-server-url'

export function getServerBaseUrl(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return ''
    return raw.trim().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export function setServerBaseUrl(value: string): void {
  try {
    const normalized = value.trim().replace(/\/+$/, '')
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Abaikan jika localStorage tidak tersedia.
  }
}

export function apiUrl(path: string): string {
  const base = getServerBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalizedPath}` : normalizedPath
}
