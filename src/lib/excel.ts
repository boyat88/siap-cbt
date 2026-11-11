import type { AttendanceStatus } from '../types'

/*
 * Pustaka Excel (xlsx) berukuran besar, jadi dimuat hanya saat benar-benar
 * dipakai (impor/ekspor). Dengan begitu halaman data tetap terbuka cepat.
 */
type XlsxModule = typeof import('xlsx')
let xlsxPromise: Promise<XlsxModule> | null = null

function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) xlsxPromise = import('xlsx')
  return xlsxPromise
}

export interface ExcelSheet {
  name: string
  rows: (string | number | boolean | null | undefined)[][]
  widths?: number[]
}

export async function exportExcel(filename: string, sheets: ExcelSheet[]): Promise<void> {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows)
    const columnCount = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0)
    const widths = sheet.widths ?? Array.from({ length: columnCount }, (_, col) => {
      const maxLength = sheet.rows.reduce((max, row) => {
        const value = row[col] == null ? '' : String(row[col])
        return Math.max(max, value.length)
      }, 8)
      return Math.min(42, maxLength + 2)
    })
    worksheet['!cols'] = widths.map((width) => ({ wch: width }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export async function downloadExcelTemplate(
  filename: string,
  headers: string[],
  samples: (string | number)[][],
): Promise<void> {
  await exportExcel(filename, [
    {
      name: 'Template',
      rows: [headers, ...samples],
      widths: headers.map((header) => Math.max(12, header.length + 2)),
    },
  ])
}

export async function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('File tidak memiliki lembar kerja.')
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  })
  return rawRows.map((row) => {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = typeof value === 'string' ? value.trim() : value
    }
    return normalized
  })
}

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')
}

export function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const key = normalizeKey(alias)
    if (row[key] !== undefined && row[key] !== '') return row[key]
  }
  return ''
}

export function cellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return formatDateValue(value)
  return String(value).trim()
}

export function cellDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDateValue(value)
  if (typeof value === 'number' && value > 0) {
    // Tanggal serial Excel: jumlah hari sejak 30 Des 1899 (koreksi tahun kabisat 1900).
    const parsed = new Date(Math.round((value - 25569) * 86400000))
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`
    }
  }
  const text = cellText(value)
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  const date = new Date(text)
  if (!Number.isNaN(date.getTime())) return formatDateValue(date)
  return text
}

export function cellNumber(value: unknown): string {
  return cellText(value).replace(/[^\d]/g, '')
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function normalizeGender(value: unknown): 'L' | 'P' | null {
  const text = cellText(value).toLowerCase()
  if (['l', 'lk', 'laki-laki', 'laki laki', 'pria', 'male', 'm'].includes(text)) return 'L'
  if (['p', 'pr', 'perempuan', 'wanita', 'female', 'f'].includes(text)) return 'P'
  return null
}

export function normalizeActiveStatus(value: unknown): 'aktif' | 'nonaktif' {
  const text = cellText(value).toLowerCase()
  if (['nonaktif', 'non aktif', 'tidak aktif', 'inactive', '0', 'tidak'].includes(text)) return 'nonaktif'
  return 'aktif'
}

export function normalizeAttendanceStatus(value: unknown): AttendanceStatus | null {
  const key = normalizeKey(cellText(value))
  const map: Record<string, AttendanceStatus> = {
    hadir: 'hadir',
    h: 'hadir',
    present: 'hadir',
    terlambat: 'terlambat',
    t: 'terlambat',
    late: 'terlambat',
    izin: 'izin',
    i: 'izin',
    permit: 'izin',
    sakit: 'sakit',
    s: 'sakit',
    sick: 'sakit',
    alpa: 'alpa',
    a: 'alpa',
    alpha: 'alpa',
  }
  return map[key] ?? null
}

export function normalizePeriod(value: unknown): string {
  const text = cellText(value)
  const numbers = text.match(/\d+/g)
  if (!numbers || numbers.length === 0) return ''
  const allowed = ['1-2', '3-4', '5-6', '7-8']
  if (numbers.length >= 2) {
    const range = `${numbers[0]}-${numbers[1]}`
    if (allowed.includes(range)) return `Jam ${range}`
  }
  const start = Number(numbers[0])
  const mapped: Record<number, string> = { 1: '1-2', 2: '1-2', 3: '3-4', 4: '3-4', 5: '5-6', 6: '5-6', 7: '7-8', 8: '7-8' }
  return mapped[start] ? `Jam ${mapped[start]}` : ''
}
