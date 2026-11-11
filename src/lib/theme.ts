export interface ThemePreset {
  id: string
  name: string
  color: string
  /** Warna pekat/gelap yang kontras dengan teks putih. */
  deep?: boolean
}

export interface BackgroundPreset {
  id: string
  name: string
  image: string
  size: string
  position: string
  repeat: string
  dark?: boolean
}

export interface AppTheme {
  /** Warna dasar tema (hex). */
  color: string
  /** id preset warna, atau 'custom' untuk warna pilihan sendiri. */
  colorId: string
  /** Tingkat transparansi permukaan (0-70 persen). */
  glass: number
  /** Kekuatan blur kaca dalam px (0-30). */
  blur: number
  /** id latar belakang yang dipilih. */
  background: string
  /** Foto latar belakang (data URL) bila pengguna mengunggah sendiri. */
  backgroundImage?: string
  /** Gaya tampilan. */
  mode: 'terang' | 'gelap' | 'semi' | 'default' | 'minim'
  /** Warna header (hex, opsional). */
  headerColor?: string
  /** Warna menu/sidebar (hex, opsional). */
  menuColor?: string
}

export const THEME_KEY = 'siap-absensi-theme-v1'
/** Setiap akun menyimpan preferensi tema pada kunci tersendiri. */
export const THEME_PREFIX = 'siap-absensi-theme-v2:'
export const THEME_GUEST_ID = 'guest'

export function themeStorageKey(accountId?: string | null): string {
  return `${THEME_PREFIX}${accountId || THEME_GUEST_ID}`
}

const defaultBackground = 'aurora'

export const colorPresets: ThemePreset[] = [
  { id: 'biru', name: 'Biru', color: '#257ee5' },
  { id: 'langit', name: 'Langit', color: '#0ea5e9' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
  { id: 'teal', name: 'Teal', color: '#0d9488' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'hijau', name: 'Hijau', color: '#22c55e' },
  { id: 'lime', name: 'Lime', color: '#65a30d' },
  { id: 'mint', name: 'Mint', color: '#2dd4bf' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'gold', name: 'Gold', color: '#eab308' },
  { id: 'oranye', name: 'Oranye', color: '#f97316' },
  { id: 'koral', name: 'Koral', color: '#fb7185' },
  { id: 'merah', name: 'Merah', color: '#ef4444' },
  { id: 'rose', name: 'Rose', color: '#e11d48' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'fuchsia', name: 'Fuchsia', color: '#c026d3' },
  { id: 'ungu', name: 'Ungu', color: '#8b5cf6' },
  { id: 'violet', name: 'Violet', color: '#7c3aed' },
  { id: 'indigo', name: 'Indigo', color: '#4f46e5' },
  { id: 'biru-tua', name: 'Biru Tua', color: '#1d4ed8' },
  { id: 'samudra', name: 'Samudra', color: '#0284c7' },
  { id: 'forest', name: 'Forest', color: '#15803d' },
  { id: 'tosca', name: 'Tosca', color: '#14b8a6' },
  { id: 'cokelat', name: 'Cokelat', color: '#b45309' },
  { id: 'maroon', name: 'Maroon', color: '#9f1239' },
  { id: 'grafit', name: 'Grafit', color: '#475569' },
  { id: 'baja', name: 'Baja', color: '#64748b' },
  { id: 'midnight', name: 'Midnight', color: '#1e3a8a' },
  { id: 'pekat-navy', name: 'Navy Pekat', color: '#0b1f3a', deep: true },
  { id: 'pekat-emerald', name: 'Emerald Pekat', color: '#065f46', deep: true },
  { id: 'pekat-maroon', name: 'Maroon Pekat', color: '#7f1d1d', deep: true },
  { id: 'pekat-ungu', name: 'Ungu Pekat', color: '#4c1d95', deep: true },
  { id: 'pekat-oranye', name: 'Oranye Pekat', color: '#9a3412', deep: true },
  { id: 'pekat-emas', name: 'Emas Pekat', color: '#854d0e', deep: true },
  { id: 'pekat-teal', name: 'Teal Pekat', color: '#134e4a', deep: true },
  { id: 'pekat-rose', name: 'Rose Pekat', color: '#881337', deep: true },
  { id: 'pekat-biru', name: 'Biru Pekat', color: '#172554', deep: true },
  { id: 'pekat-indigo', name: 'Indigo Pekat', color: '#312e81', deep: true },
  { id: 'pekat-slate', name: 'Slate Pekat', color: '#1e293b', deep: true },
  { id: 'pekat-hitam', name: 'Hitam Pekat', color: '#0f172a', deep: true },
]

export const backgroundPresets: BackgroundPreset[] = [
  {
    id: 'plain',
    name: 'Polos',
    image: 'linear-gradient(150deg, #f8fafc 0%, #eef4fb 100%)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    image:
      'radial-gradient(1100px 620px at 8% -10%, rgb(var(--brand-400) / 0.42), transparent 62%), radial-gradient(900px 700px at 92% 8%, rgba(168, 85, 247, 0.3), transparent 60%), radial-gradient(1000px 800px at 55% 110%, rgba(56, 189, 248, 0.34), transparent 62%), linear-gradient(150deg, #f4f8ff 0%, #f8fafc 50%, #eef6ff 100%)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'ocean',
    name: 'Samudra',
    image:
      'radial-gradient(900px 600px at 12% 0%, rgb(var(--brand-400) / 0.45), transparent 60%), radial-gradient(900px 700px at 88% 100%, rgba(34, 211, 238, 0.3), transparent 62%), linear-gradient(150deg, #eff6ff, #f0fdfa 55%, #e0f2fe)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'sunset',
    name: 'Senja',
    image:
      'radial-gradient(1000px 600px at 10% 0%, rgba(251, 146, 60, 0.32), transparent 60%), radial-gradient(900px 700px at 90% 10%, rgba(244, 63, 94, 0.26), transparent 62%), linear-gradient(150deg, #fff7ed, #fff1f2 55%, #fefce8)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'forest',
    name: 'Hutan',
    image:
      'radial-gradient(1000px 620px at 8% 0%, rgba(16, 185, 129, 0.3), transparent 60%), radial-gradient(900px 700px at 92% 100%, rgba(20, 184, 166, 0.26), transparent 62%), linear-gradient(150deg, #f0fdf4, #ecfdf5 55%, #f0fdfa)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'candy',
    name: 'Permen',
    image:
      'radial-gradient(1000px 620px at 10% 0%, rgba(236, 72, 153, 0.28), transparent 60%), radial-gradient(900px 700px at 90% 100%, rgba(139, 92, 246, 0.28), transparent 62%), linear-gradient(150deg, #fdf4ff, #faf5ff 55%, #eff6ff)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'mono',
    name: 'Netral',
    image:
      'radial-gradient(1000px 620px at 12% 0%, rgb(var(--brand-300) / 0.28), transparent 62%), linear-gradient(150deg, #f8fafc, #f1f5f9 60%, #e2e8f0)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    image:
      'radial-gradient(1000px 640px at 8% 0%, rgb(var(--brand-500) / 0.45), transparent 60%), radial-gradient(900px 700px at 92% 100%, rgba(14, 165, 233, 0.3), transparent 62%), linear-gradient(150deg, #0b1220, #10233f 55%, #0b1220)',
    size: 'cover',
    position: 'center',
    repeat: 'no-repeat',
    dark: true,
  },
  {
    id: 'grid',
    name: 'Grid',
    image:
      'linear-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px), radial-gradient(900px 600px at 10% 0%, rgb(var(--brand-300) / 0.34), transparent 62%), linear-gradient(150deg, #f8fafc, #eef4fb)',
    size: '32px 32px, 32px 32px, cover, cover',
    position: 'center, center, center, center',
    repeat: 'repeat, repeat, no-repeat, no-repeat',
  },
  {
    id: 'dots',
    name: 'Titik',
    image:
      'radial-gradient(rgba(15, 23, 42, 0.09) 1.15px, transparent 1.15px), radial-gradient(900px 600px at 90% 0%, rgb(var(--brand-300) / 0.35), transparent 60%), linear-gradient(150deg, #f8fafc, #eef4fb)',
    size: '22px 22px, cover, cover',
    position: 'center, center, center',
    repeat: 'repeat, no-repeat, no-repeat',
  },
  {
    id: 'waves',
    name: 'Gelombang',
    image:
      'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 2px, transparent 2px, transparent 18px), radial-gradient(1000px 640px at 12% 0%, rgb(var(--brand-400) / 0.38), transparent 62%), radial-gradient(900px 700px at 88% 100%, rgba(126, 34, 206, 0.2), transparent 60%), linear-gradient(150deg, #eef4fb, #f8fafc 60%, #e0f2fe)',
    size: 'auto, cover, cover, cover',
    position: 'center, center, center, center',
    repeat: 'repeat, no-repeat, no-repeat, no-repeat',
  },
]

export const defaultTheme: AppTheme = {
  color: '#257ee5',
  colorId: 'biru',
  glass: 14,
  blur: 14,
  background: defaultBackground,
  mode: 'default',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(hex: string): [number, number, number] {
  let value = hex.trim().replace('#', '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const int = Number.parseInt(value, 16)
  if (Number.isNaN(int) || value.length !== 6) return [37, 126, 229]
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) return [0, 0, lightness * 100]

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = 0
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4

  hue *= 60
  if (hue < 0) hue += 360
  return [hue, saturation * 100, lightness * 100]
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const h = ((hue % 360) + 360) % 360
  const s = clamp(saturation, 0, 100) / 100
  const l = clamp(lightness, 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return rgb.map((channel) => Math.round((channel + m) * 255)) as [number, number, number]
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastWithWhite(rgb: [number, number, number]): number {
  return 1.05 / (relativeLuminance(rgb) + 0.05)
}

export type Foreground = 'dark' | 'light'

/** Warna teks yang kontras untuk sebuah warna latar (hex). */
export function foregroundForColor(hex?: string): Foreground {
  if (!hex) return 'dark'
  return contrastWithWhite(hexToRgb(hex)) >= 4.5 ? 'light' : 'dark'
}

const photoLuminanceCache = new Map<string, number>()
const pendingPhotoSamples = new Set<string>()
let activeTheme: AppTheme | null = null

function sampleImageLuminance(src: string): Promise<number> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return Promise.resolve(0.5)
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const size = 24
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) {
          resolve(0.5)
          return
        }
        context.drawImage(image, 0, 0, size, size)
        const { data } = context.getImageData(0, 0, size, size)
        const linear = (value: number) =>
          value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        let total = 0
        for (let index = 0; index < data.length; index += 4) {
          total +=
            0.2126 * linear(data[index] / 255) +
            0.7152 * linear(data[index + 1] / 255) +
            0.0722 * linear(data[index + 2] / 255)
        }
        resolve(total / (data.length / 4))
      } catch {
        resolve(0.5)
      }
    }
    image.onerror = () => resolve(0.5)
    image.src = src
  })
}

/**
 * Menentukan apakah teks konten harus gelap atau terang berdasarkan
 * kecerahan latar belakang yang dipilih beserta tingkat transparansinya.
 */
function contentForeground(theme: AppTheme, imageLuminance: number): Foreground {
  const alpha = (100 - clamp(theme.glass, 0, 70)) / 100
  const preset = findBackground(theme.background)
  const backgroundLuminance = theme.backgroundImage
    ? imageLuminance
    : preset?.dark
      ? 0.1
      : 0.96
  // Latar halaman yang gelap (mis. gaya "gelap" atau foto gelap) membuat
  // seluruh teks konten perlu terang, termasuk judul di luar kartu.
  if (backgroundLuminance < 0.42) return 'light'
  // Permukaan kartu berwarna putih dengan alpha tertentu di atas latar.
  const effective = backgroundLuminance * (1 - alpha) + 0.97 * alpha
  return effective < 0.52 ? 'light' : 'dark'
}

function applyForeground(theme: AppTheme, imageLuminance: number): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const content = contentForeground(theme, imageLuminance)
  const header = theme.headerColor ? foregroundForColor(theme.headerColor) : 'dark'
  const menu = theme.menuColor ? foregroundForColor(theme.menuColor) : 'light'
  root.dataset.contentFg = content
  root.dataset.headerFg = header
  root.dataset.menuFg = menu
  // Dipakai elemen dengan warna inline (mis. badge pada menu aktif).
  root.style.setProperty('--menu-ink', menu === 'light' ? '#ffffff' : '#0f172a')
}

/** Menggelapkan warna sampai kontras teks putih cukup terbaca. */
function ensureContrast(rgb: [number, number, number], minimum: number): [number, number, number] {
  if (contrastWithWhite(rgb) >= minimum) return rgb
  const [hue, saturation, lightness] = rgbToHsl(rgb[0], rgb[1], rgb[2])
  let currentLightness = lightness
  let current = rgb
  let guard = 0
  while (contrastWithWhite(current) < minimum && currentLightness > 10 && guard < 45) {
    currentLightness -= 2
    current = hslToRgb(hue, saturation, currentLightness)
    guard += 1
  }
  return current
}

/** Menghasilkan 11 tingkat warna dari satu warna dasar. */
export function buildColorScale(hex: string): Record<string, string> {
  const [r, g, b] = hexToRgb(hex)
  const [hue, saturation, lightness] = rgbToHsl(r, g, b)
  const safeSaturation = Math.max(saturation, 24)
  const stepSaturation = [30, 48, 64, 80, 92, 100, 98, 92, 84, 76, 68]
  // Warna pekat memakai tangga lebih gelap agar tombol dan menu benar-benar
  // kontras dengan teks putih, bukan sekadar versi cerah dari warna tersebut.
  const stepLightness =
    lightness < 46
      ? [97, 92, 84, 74, 60, 44, 34, 27, 21, 15, 9]
      : [97, 93, 86, 77, 66, 55, 47, 40, 33, 27, 18]

  const scale: Record<string, string> = {}
  const tones = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
  for (let index = 0; index < stepLightness.length; index += 1) {
    const toneSaturation = Math.min(96, (safeSaturation * stepSaturation[index]) / 100)
    const [toneR, toneG, toneB] = hslToRgb(hue, toneSaturation, stepLightness[index])
    scale[tones[index]] = `${toneR} ${toneG} ${toneB}`
  }

  const result = scale

  // Pastikan teks putih di atas warna utama tetap terbaca, terutama untuk
  // tema kuning, lime, dan warna terang lainnya.
  const minimumContrast: Record<string, number> = { '500': 3, '600': 4.5, '700': 5.5, '800': 7 }
  for (const [tone, minimum] of Object.entries(minimumContrast)) {
    const channels = result[tone].split(' ').map(Number) as [number, number, number]
    result[tone] = ensureContrast(channels, minimum).join(' ')
  }

  return result
}

export function findBackground(id: string): BackgroundPreset | undefined {
  return backgroundPresets.find((preset) => preset.id === id)
}

export function backgroundPreview(theme: AppTheme): string {
  if (theme.backgroundImage) {
    return `url("${theme.backgroundImage}") center / cover no-repeat, linear-gradient(150deg, #eef4fb, #f8fafc)`
  }
  const preset = findBackground(theme.background) ?? findBackground(defaultBackground)!
  return `${preset.image}`
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const scale = buildColorScale(theme.color)
  for (const [tone, value] of Object.entries(scale)) {
    root.style.setProperty(`--brand-${tone}`, value)
  }

  const glass = clamp(theme.glass, 0, 70)
  root.style.setProperty('--surface-alpha', String((100 - glass) / 100))
  root.style.setProperty('--glass-blur', `${clamp(theme.blur, 0, 30)}px`)
  root.dataset.glass = glass > 0 ? 'on' : 'off'
  root.dataset.themeMode = theme.mode || 'default'
  if (theme.headerColor) root.style.setProperty('--header-bg', theme.headerColor)
  else root.style.removeProperty('--header-bg')
  if (theme.menuColor) root.style.setProperty('--menu-bg', theme.menuColor)
  else root.style.removeProperty('--menu-bg')

  const preset = findBackground(theme.background) ?? findBackground(defaultBackground)!
  if (theme.backgroundImage) {
    root.style.setProperty(
      '--app-bg-image',
      `url("${theme.backgroundImage}"), linear-gradient(150deg, #eef4fb, #f8fafc)`,
    )
    root.style.setProperty('--app-bg-size', 'cover, cover')
    root.style.setProperty('--app-bg-position', 'center, center')
    root.style.setProperty('--app-bg-repeat', 'no-repeat, no-repeat')
    root.dataset.appBg = 'image'
  } else {
    root.style.setProperty('--app-bg-image', preset.image)
    root.style.setProperty('--app-bg-size', preset.size)
    root.style.setProperty('--app-bg-position', preset.position)
    root.style.setProperty('--app-bg-repeat', preset.repeat)
    root.dataset.appBg = preset.id
  }

  root.style.colorScheme = 'light'

  // Warna teks otomatis menyesuaikan warna header/menu dan kecerahan latar.
  activeTheme = theme
  const cachedLuminance = theme.backgroundImage
    ? photoLuminanceCache.get(theme.backgroundImage)
    : undefined
  applyForeground(theme, cachedLuminance ?? 0.5)

  // Foto latar dianalisis sekali, lalu hasilnya dipakai ulang (cache).
  if (
    theme.backgroundImage &&
    cachedLuminance === undefined &&
    !pendingPhotoSamples.has(theme.backgroundImage)
  ) {
    const image = theme.backgroundImage
    pendingPhotoSamples.add(image)
    void sampleImageLuminance(image).then((luminance) => {
      pendingPhotoSamples.delete(image)
      photoLuminanceCache.set(image, luminance)
      if (photoLuminanceCache.size > 8) {
        const oldest = photoLuminanceCache.keys().next().value
        if (oldest) photoLuminanceCache.delete(oldest)
      }
      if (activeTheme?.backgroundImage === image) applyForeground(activeTheme, luminance)
    })
  }
}

function normalizeThemeColor(value: unknown): string {
  if (typeof value !== 'string') return defaultTheme.color
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase()
  }
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : defaultTheme.color
}

function parseStoredTheme(raw: string | null): AppTheme | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AppTheme>
    const color = normalizeThemeColor(parsed.color)
    return {
      color,
      colorId: typeof parsed.colorId === 'string' ? parsed.colorId : 'custom',
      glass: typeof parsed.glass === 'number' ? clamp(parsed.glass, 0, 70) : defaultTheme.glass,
      blur: typeof parsed.blur === 'number' ? clamp(parsed.blur, 0, 30) : defaultTheme.blur,
      background: typeof parsed.background === 'string' ? parsed.background : defaultTheme.background,
      backgroundImage:
        typeof parsed.backgroundImage === 'string' && parsed.backgroundImage.startsWith('data:image/')
          ? parsed.backgroundImage
          : undefined,
      mode:
        parsed.mode === 'terang' || parsed.mode === 'gelap' || parsed.mode === 'semi' || parsed.mode === 'minim'
          ? parsed.mode
          : 'default',
      headerColor:
        typeof parsed.headerColor === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(parsed.headerColor)
          ? parsed.headerColor
          : undefined,
      menuColor:
        typeof parsed.menuColor === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(parsed.menuColor)
          ? parsed.menuColor
          : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Memuat tema milik akun tertentu. Tema global lama (`siap-absensi-theme-v1`)
 * dimigrasikan sekali ke akun pertama yang membuka aplikasi, lalu dihapus agar
 * tidak menimpa tema akun lain.
 */
export function loadTheme(accountId?: string | null): AppTheme {
  if (typeof localStorage === 'undefined') return defaultTheme
  const scoped = parseStoredTheme(localStorage.getItem(themeStorageKey(accountId)))
  if (scoped) return scoped

  if (accountId) {
    const legacy = parseStoredTheme(localStorage.getItem(THEME_KEY))
    if (legacy) {
      saveTheme(accountId, legacy)
      try {
        localStorage.removeItem(THEME_KEY)
      } catch {
        // Abaikan bila localStorage tidak dapat diubah.
      }
      return legacy
    }
  }

  return defaultTheme
}

export function saveTheme(accountId: string | null | undefined, theme: AppTheme): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(themeStorageKey(accountId), JSON.stringify(theme))
  } catch (error) {
    console.warn('Gagal menyimpan tema ke localStorage.', error)
  }
}

export function hasScopedTheme(accountId?: string | null): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(themeStorageKey(accountId)) !== null
}
