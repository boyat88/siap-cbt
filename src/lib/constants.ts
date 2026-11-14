export const SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Bahasa Sunda',
  'Ilmu Pengetahuan Alam',
  'Ilmu Pengetahuan Sosial',
  'Pendidikan Pancasila',
  'Pendidikan Agama Islam',
  'Seni Budaya',
  'PJOK',
  'Informatika',
  'Prakarya',
  'Ko Kurikuler',
]

export const STATUS_ORDER = ['hadir', 'terlambat', 'izin', 'sakit', 'alpa'] as const

export const STATUS_META: Record<
  string,
  { label: string; short: string; color: string; bg: string; border: string; chart: string }
> = {
  hadir: {
    label: 'Hadir',
    short: 'H',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    chart: '#10b981',
  },
  terlambat: {
    label: 'Terlambat',
    short: 'T',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    chart: '#8b5cf6',
  },
  izin: {
    label: 'Izin',
    short: 'I',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    chart: '#0ea5e9',
  },
  sakit: {
    label: 'Sakit',
    short: 'S',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    chart: '#f59e0b',
  },
  alpa: {
    label: 'Alpa',
    short: 'A',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    chart: '#f43f5e',
  },
}

export const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
