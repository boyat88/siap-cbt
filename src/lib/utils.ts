import type { AttendanceStatus, Settings } from '../types'

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function formatDate(value: string, opts: 'long' | 'medium' | 'short' | 'full' = 'medium'): string {
  const date = typeof value === 'string' ? parseISODate(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  const options: Intl.DateTimeFormatOptions =
    opts === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : opts === 'full'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : opts === 'short'
          ? { day: '2-digit', month: 'short' }
          : { day: 'numeric', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('id-ID', options).format(date)
}

export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function relativeTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return formatDate(toISODate(date), 'short')
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function classLabel(className?: string): string {
  return className ? `Kelas ${className}` : '-'
}

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

export interface StudentRecap {
  studentId: string
  name: string
  nisn: string
  gender: string
  classId: string
  hadir: number
  terlambat: number
  izin: number
  sakit: number
  alpa: number
  total: number
  rate: number
}

export function summarizeSessions(
  sessions: { records: Record<string, AttendanceStatus> }[],
  studentIds: string[],
): Record<string, { hadir: number; terlambat: number; izin: number; sakit: number; alpa: number; total: number }> {
  const summary: Record<
    string,
    { hadir: number; terlambat: number; izin: number; sakit: number; alpa: number; total: number }
  > = {}
  for (const id of studentIds) {
    summary[id] = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
  }
  for (const session of sessions) {
    for (const [studentId, status] of Object.entries(session.records)) {
      if (!summary[studentId]) {
        summary[studentId] = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
      }
      summary[studentId][status] += 1
      summary[studentId].total += 1
    }
  }
  return summary
}

export function rateOf(summary: { hadir: number; terlambat: number; total: number }): number {
  if (!summary.total) return 0
  return Math.round(((summary.hadir + summary.terlambat) / summary.total) * 1000) / 10
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(';'),
    )
    .join('\r\n')
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isHoliday(value: string | Date, holidays: { date: string; name: string }[] = []): boolean {
  const iso = typeof value === 'string' ? value : toISODate(value)
  return holidays.some((holiday) => holiday.date === iso)
}

export function getISOWeek(value: string | Date): string {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value)
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  const year = new Date(firstThursday).getFullYear()
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function isSchoolDay(value: string | Date, holidays: { date: string; name: string }[] = []): boolean {
  const date = typeof value === 'string' ? parseISODate(value) : value
  return !isWeekend(date) && !isHoliday(typeof value === 'string' ? value : toISODate(date), holidays)
}

export function schoolDaysBack(count: number, start = new Date(), holidays: { date: string; name: string }[] = []): string[] {
  const dates: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (dates.length < count) {
    if (isSchoolDay(cursor, holidays)) dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dates.reverse()
}

export function schoolDaysOfMonth(year: number, month: number, holidays: { date: string; name: string }[] = []): string[] {
  const dates: string[] = []
  const cursor = new Date(year, month, 1)
  while (cursor.getMonth() === month) {
    if (isSchoolDay(cursor, holidays)) dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export const defaultSettings: Settings = {
  school: {
    name: 'SMPN Satu Atap 1 Cikatomas',
    npsn: '20257104',
    address: 'Jl. Raya Cikatomas, Kec. Cikatomas, Kab. Tasikmalaya, Jawa Barat',
    phone: '(0265) 555-0198',
    email: 'info@smpn1cikatomas.sch.id',
    headmaster: 'H. Ahmad Suryana, S.Pd., M.M.',
    headmasterNip: '196704121994031005',
    website: 'smpn1cikatomas.sch.id',
  },
  academicYear: '2026/2027',
  semester: 'Ganjil',
  minimumAttendance: 75,
  lateTolerance: 10,
  notifyGuardian: true,
  weeklyReport: true,
  appLogo: '/images/app-logo.png',
  holidays: [],
}
