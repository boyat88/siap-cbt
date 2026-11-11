import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  BarChart3,
  CalendarRange,
  Download,
  Eye,
  FileDown,
  FileUp,
  Search,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Pagination,
  ProgressRing,
  SearchInput,
  Select,
  StatusBadge,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { ImportModal, type ImportValidation } from '../components/ImportModal'
import { cellDate, cellNumber, cellText, exportExcel, normalizeAttendanceStatus, normalizeKey, normalizePeriod, pick } from '../lib/excel'
import { MONTHS, STATUS_META, STATUS_ORDER, SUBJECTS } from '../lib/constants'
import { formatDate, getISOWeek, percent, rateOf, summarizeSessions } from '../lib/utils'
import type { AttendanceStatus, Student } from '../types'
interface AttendanceImportRow {
  studentId: string
  nisn: string
  studentName: string
  date: string
  classId: string
  className: string
  subject: string
  period: string
  status: AttendanceStatus
  note: string
  teacherId: string
}
type SortKey = 'name' | 'rate' | 'alpa' | 'hadir'
export function Rekap() {
  const { data, user, upsertSession } = useApp()
  const toast = useToast()
  const [classFilter, setClassFilter] = useState('all')
  const [month, setMonth] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [tab, setTab] = useState<'siswa' | 'harian' | 'semester' | 'mingguan' | 'bulanan'>('siswa')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detail, setDetail] = useState<Student | null>(null)
  const [dailyPage, setDailyPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [semesterChoice, setSemesterChoice] = useState<'1' | '2'>(() =>
    new Date().getMonth() >= 6 ? '1' : '2',
  )
  const [weekChoice, setWeekChoice] = useState('')
  const monthOptions = useMemo(() => {
    const unique = Array.from(new Set(data.sessions.map((s) => s.date.slice(0, 7)))).sort().reverse()
    const current = new Date().toISOString().slice(0, 7)
    if (!unique.includes(current)) unique.unshift(current)
    return unique.map((value) => {
      const [y, m] = value.split('-').map(Number)
      return { value, label: `${MONTHS[m - 1]} ${y}` }
    })
  }, [data.sessions])
  const weekOptions = useMemo(() => {
    const unique = Array.from(new Set(data.sessions.map((s) => getISOWeek(s.date)))).sort().reverse()
    const current = getISOWeek(new Date())
    if (!unique.includes(current)) unique.unshift(current)
    return unique.map((value) => ({ value, label: value }))
  }, [data.sessions])

  useEffect(() => {
    if (!weekChoice && weekOptions.length > 0) setWeekChoice(weekOptions[0].value)
  }, [weekChoice, weekOptions])

  const weeklySessions = useMemo(
    () =>
      data.sessions.filter(
        (s) => (classFilter === 'all' || s.classId === classFilter) && getISOWeek(s.date) === weekChoice,
      ),
    [data.sessions, classFilter, weekChoice],
  )
  const classMap = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes])
  const studentMap = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students])
  const filteredSessions = useMemo(
    () => data.sessions.filter((s) => (classFilter === 'all' || s.classId === classFilter) && s.date.startsWith(month)),
    [data.sessions, classFilter, month],
  )
  const students = useMemo(
    () =>
      data.students
        .filter((s) => classFilter === 'all' || s.classId === classFilter)
        .filter((s) => s.status === 'aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.students, classFilter],
  )
  const [academicStartYear, academicEndYear] = useMemo(() => {
    const parts = (data.settings.academicYear || '').split('/')
    const start = Number(parts[0]) || new Date().getFullYear()
    const end = Number(parts[1]) || start + 1
    return [start, end]
  }, [data.settings.academicYear])

  const semesterMonths = useMemo(() => {
    if (semesterChoice === '1') {
      return Array.from({ length: 6 }, (_, i) => `${academicStartYear}-${String(i + 7).padStart(2, '0')}`)
    }
    return Array.from({ length: 6 }, (_, i) => `${academicEndYear}-${String(i + 1).padStart(2, '0')}`)
  }, [semesterChoice, academicStartYear, academicEndYear])


    const semesterSessions = useMemo(
    () =>
      data.sessions.filter(
        (s) =>
          (classFilter === 'all' || s.classId === classFilter) &&
          semesterMonths.some((monthValue) => s.date.startsWith(monthValue)),
      ),
    [data.sessions, classFilter, semesterMonths],
  )
  const baseSessions = useMemo(() => {
    if (tab === 'mingguan') return weeklySessions
    if (tab === 'semester') return semesterSessions
    return filteredSessions
  }, [tab, weeklySessions, semesterSessions, filteredSessions])

  const summaries = useMemo(() => {
    const raw = summarizeSessions(baseSessions, students.map((s) => s.id))
    return students.map((student) => {
      const values = raw[student.id] ?? { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
      return { student, ...values, rate: rateOf(values) }
    })
  }, [baseSessions, students])
  const filteredSummaries = useMemo(() => {
    const rows = summaries.filter((row) => {
      if (statusFilter === 'attention' && !(row.rate < 90 || row.alpa >= 3)) return false
      if (statusFilter === 'perfect' && !(row.rate === 100 && row.total > 0)) return false
      if (query) {
        const q = query.toLowerCase()
        const className = classMap.get(row.student.classId)?.name.toLowerCase() ?? ''
        if (!row.student.name.toLowerCase().includes(q) && !row.student.nisn.includes(q) && !className.includes(q)) return false
      }
      return true
    })
    return rows.sort((a, b) => {
      let result = 0
      if (sortKey === 'name') result = a.student.name.localeCompare(b.student.name)
      else if (sortKey === 'rate') result = a.rate - b.rate
      else if (sortKey === 'alpa') result = a.alpa - b.alpa
      else result = a.hadir - b.hadir
      return sortDir === 'asc' ? result : -result
    })
  }, [summaries, statusFilter, query, classMap, sortKey, sortDir])
  const semesterRows = useMemo(() => {
    const raw = summarizeSessions(semesterSessions, students.map((student) => student.id))
    const effectiveDays = new Map<string, Set<string>>()
    const presentDays = new Map<string, Set<string>>()
    for (const session of semesterSessions) {
      for (const [studentId, status] of Object.entries(session.records)) {
        if (!effectiveDays.has(studentId)) effectiveDays.set(studentId, new Set())
        effectiveDays.get(studentId)!.add(session.date)
        if (status === 'hadir' || status === 'terlambat') {
          if (!presentDays.has(studentId)) presentDays.set(studentId, new Set())
          presentDays.get(studentId)!.add(session.date)
        }
      }
    }
    return students
      .map((student) => {
        const values = raw[student.id] ?? { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
        const effective = effectiveDays.get(student.id)?.size ?? 0
        const present = presentDays.get(student.id)?.size ?? 0
        return {
          student,
          ...values,
          effectiveDays: effective,
          presentDays: present,
          rate: effective ? Math.round((present / effective) * 1000) / 10 : 0,
        }
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name))
  }, [semesterSessions, students])

  useEffect(() => setPage(1), [classFilter, month, query, statusFilter, pageSize, sortKey, sortDir])
  useEffect(() => setDailyPage(1), [classFilter, month])
  const pageRows = filteredSummaries.slice((page - 1) * pageSize, page * pageSize)
  const totalRecords = summaries.reduce((acc, s) => acc + s.total, 0)
  const totalPresent = summaries.reduce((acc, s) => acc + s.hadir + s.terlambat, 0)
  const overallRate = percent(totalPresent, totalRecords)
  const totalAlpa = summaries.reduce((acc, s) => acc + s.alpa, 0)
  const attentionCount = summaries.filter((s) => s.rate < data.settings.minimumAttendance && s.total > 0).length
  const daily = useMemo(() => {
    const dates = Array.from(new Set(filteredSessions.map((s) => s.date))).sort((a, b) => b.localeCompare(a))
    return dates.map((date) => {
      const sessions = filteredSessions.filter((s) => s.date === date)
      const counts: Record<AttendanceStatus, number> = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 }
      for (const session of sessions) {
        for (const status of Object.values(session.records)) counts[status] += 1
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return { date, sessions: sessions.length, counts, total, rate: percent(counts.hadir + counts.terlambat, total) }
    })
  }, [filteredSessions])
  const dailyRows = daily.slice((dailyPage - 1) * 10, dailyPage * 10)
  const detailSessions = useMemo(() => {
    if (!detail) return []
    return filteredSessions
      .filter((s) => s.records[detail.id])
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => ({
        ...s,
        status: s.records[detail.id],
        className: classMap.get(s.classId)?.name ?? '-',
      }))
  }, [detail, filteredSessions, classMap])
  const detailSummary = detail ? summaries.find((s) => s.student.id === detail.id) : null
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }
  const sortIcon = (key: SortKey) => (
    <ArrowDownUp size={11} className={cn('ml-1 inline', sortKey === key ? 'text-brand-500' : 'text-slate-300')} />
  )
  const monthLabel = monthOptions.find((m) => m.value === month)?.label ?? '-'
  const exportRecap = () => {
    const infoRows: (string | number)[][] = [
      ['REKAP ABSENSI SMP'],
      ['Sekolah', data.settings.school.name],
      ['NPSN', data.settings.school.npsn],
      ['Tahun Ajaran', data.settings.academicYear],
      ['Semester', data.settings.semester],
      ['Periode', monthLabel],
      ['Kelas', classFilter === 'all' ? 'Semua Kelas' : `Kelas ${classMap.get(classFilter)?.name ?? '-'}`],
      ['Total Sesi', filteredSessions.length],
      ['Total Catatan', totalRecords],
      ['Rata-rata Kehadiran', `${overallRate}%`],
      ['Perlu Perhatian', attentionCount],
      ['Total Alpa', totalAlpa],
      ['Diekspor', formatDate(new Date().toISOString().slice(0, 10), 'full')],
    ]
    const studentRows: (string | number)[][] = [
      ['NISN', 'NAMA', 'KELAS', 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA', 'TOTAL', 'KEHADIRAN (%)'],
      ...filteredSummaries.map((row) => [
        row.student.nisn,
        row.student.name,
        classMap.get(row.student.classId)?.name ?? '-',
        row.hadir,
        row.terlambat,
        row.izin,
        row.sakit,
        row.alpa,
        row.total,
        row.rate,
      ]),
    ]
    const dailyRowsExport: (string | number)[][] = [
      ['TANGGAL', 'SESI', 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA', 'TOTAL', 'KEHADIRAN (%)'],
      ...daily.map((row) => [
        row.date,
        row.sessions,
        row.counts.hadir,
        row.counts.terlambat,
        row.counts.izin,
        row.counts.sakit,
        row.counts.alpa,
        row.total,
        row.rate,
      ]),
    ]
    exportExcel(`rekap-absensi-${month}-${classFilter}.xlsx`, [
      { name: 'Info', rows: infoRows, widths: [24, 44] },
      {
        name: 'Rekap Siswa',
        rows: studentRows,
        widths: [14, 30, 9, 8, 10, 8, 8, 8, 8, 14],
      },
      {
        name: 'Rekap Harian',
        rows: dailyRowsExport,
        widths: [13, 7, 8, 11, 7, 7, 7, 8, 14],
      },
    ])
    toast('Rekap absensi berhasil diekspor ke Excel.', 'success')
  }
  const validateImport = (rows: Record<string, unknown>[]): ImportValidation<AttendanceImportRow>[] => {
    const studentByNisn = new Map(data.students.map((s) => [s.nisn, s]))
    const teacherByName = new Map(data.teachers.map((t) => [normalizeKey(t.name), t]))
    const seen = new Set<string>()
    const today = new Date().toISOString().slice(0, 10)
    return rows.map((row, index) => {
      const rowNumber = index + 2
      const date = cellDate(pick(row, ['tanggal', 'date', 'tgl', 'tanggal absensi']))
      const classRaw = cellText(pick(row, ['kelas', 'class', 'rombel', 'tingkat']))
      const subjectRaw = cellText(pick(row, ['mata pelajaran', 'mapel', 'mata_pelajaran', 'subject']))
      const subject = SUBJECTS.find((s) => normalizeKey(s) === normalizeKey(subjectRaw))
      const period = normalizePeriod(pick(row, ['jam', 'jam ke', 'periode', 'waktu', 'jam pelajaran'])) || ''
      const nisn = cellNumber(pick(row, ['nisn', 'nis', 'nomor induk']))
      const studentName = cellText(pick(row, ['nama siswa', 'nama_siswa', 'nama', 'nama peserta didik']))
      const status = normalizeAttendanceStatus(pick(row, ['status', 'status kehadiran', 'kehadiran']))
      const note = cellText(pick(row, ['catatan', 'keterangan', 'note']))
      const teacherRaw = cellText(pick(row, ['guru', 'nama guru', 'guru pengampu', 'pengampu']))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { row: rowNumber, error: 'Tanggal tidak valid. Gunakan format YYYY-MM-DD.' }
      }
      if (date > today) {
        return { row: rowNumber, error: 'Tanggal absensi tidak boleh melebihi hari ini.' }
      }
      if (!subjectRaw) {
        return { row: rowNumber, error: 'Mata pelajaran wajib diisi.' }
      }
      if (!subject) {
        return { row: rowNumber, error: `Mata pelajaran "${subjectRaw}" tidak dikenal. Gunakan nama mapel pada template.` }
      }
      if (period && !/^\d+(-\d+)?$/.test(period)) {
        return { row: rowNumber, error: `Jam "${period}" tidak valid. Gunakan 1, 2, ... atau 1-2, atau kosongkan.` }
      }
      const parsedNisn = /^\d{10}$/.test(nisn) ? nisn : ''
      let student = parsedNisn ? studentByNisn.get(parsedNisn) : undefined
      if (!student && studentName) {
        const target = normalizeKey(studentName)
        student = data.students.find((s) => normalizeKey(s.name) === target)
      }
      if (!student) {
        return { row: rowNumber, error: `Peserta didik "${studentName || nisn || '-'}" tidak ditemukan. Periksa NISN atau nama siswa.` }
      }
      let clazz = data.classes.find(
        (c) => c.name === classRaw || c.id === classRaw || String(c.grade) === classRaw.replace(/\D/g, ''),
      )
      if (!clazz && !classRaw) clazz = classMap.get(student.classId)
      if (!clazz) {
        return { row: rowNumber, error: `Kelas "${classRaw || '-'}" tidak ditemukan. Gunakan 7, 8, atau 9.` }
      }
      if (student.classId !== clazz.id) {
        const actual = classMap.get(student.classId)?.name ?? '-'
        return { row: rowNumber, error: `${student.name} terdaftar di kelas ${actual}, bukan kelas ${clazz.name}.` }
      }
      if (!status) {
        return { row: rowNumber, error: `Status "${cellText(pick(row, ['status', 'status kehadiran', 'kehadiran'])) || '-'}" tidak valid. Gunakan Hadir/Terlambat/Izin/Sakit/Alpa.` }
      }
      const key = `${date}|${clazz.id}|${period}|${student.id}`
      if (seen.has(key)) {
        return { row: rowNumber, error: `${student.name} sudah tercatat pada tanggal, kelas, dan jam yang sama dalam file ini.` }
      }
      seen.add(key)
      const teacher =
        teacherByName.get(normalizeKey(teacherRaw)) ??
        data.teachers.find((t) => t.nip === cellNumber(teacherRaw) && cellNumber(teacherRaw)) ??
        data.teachers.find((t) => normalizeKey(t.email) === normalizeKey(teacherRaw))
      return {
        row: rowNumber,
        item: {
          studentId: student.id,
          nisn: student.nisn,
          studentName: student.name,
          date,
          classId: clazz.id,
          className: clazz.name,
          subject: subject,
          period,
          status,
          note,
          teacherId: teacher?.id ?? clazz.homeroomId ?? data.teachers[0]?.id ?? '',
        },
      }
    })
  }
  const handleImport = (items: AttendanceImportRow[]) => {
    const groups = new Map<string, AttendanceImportRow[]>()
    for (const item of items) {
      const key = `${item.date}|${item.classId}`
      const list = groups.get(key)
      if (list) list.push(item)
      else groups.set(key, [item])
    }
    const now = new Date().toISOString()
    let created = 0
    let updated = 0
    for (const group of groups.values()) {
      const first = group[0]
      const fallbackId = `ses_${first.date}_${first.classId}_${first.subject.replace(/\s/g, '')}`
      const existing = data.sessions.find(
        (s) => s.date === first.date && s.classId === first.classId && s.subject === first.subject,
      )
      const id = existing?.id ?? fallbackId
      const records = { ...(existing?.records ?? {}) }
      for (const row of group) records[row.studentId] = row.status
      if (existing) updated += 1
      else created += 1
      upsertSession({
        id,
        date: first.date,
        classId: first.classId,
        subject: existing?.subject ?? first.subject,
         period: '',
        teacherId: existing?.teacherId || first.teacherId,
        note: existing?.note || first.note,
        records,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    }
    setImportOpen(false)
    toast(
      `${items.length} catatan absensi diimpor ke ${created + updated} sesi (${created} baru, ${updated} diperbarui).`,
      'success',
    )
  }
  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Analitik</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Rekap Absensi</h1>
          <p className="mt-1 text-sm text-slate-500">Analisis kehadiran peserta didik per kelas dan per periode.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'admin' && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp size={15} /> Impor Excel
            </Button>
          )}
          <Button variant="outline" onClick={exportRecap}>
            <FileDown size={15} /> Ekspor Excel
          </Button>
        </div>
      </div>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          {tab === 'mingguan' ? (
            <div className="w-full sm:w-44">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Minggu</label>
              <Select
                value={weekChoice}
                onChange={(e) => setWeekChoice(e.target.value)}
                options={weekOptions}
              />
            </div>
          ) : tab === 'semester' ? (
            <div className="w-full sm:w-44">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Semester</label>
              <Select
                value={semesterChoice}
                onChange={(e) => setSemesterChoice(e.target.value as '1' | '2')}
                options={[
                  { value: '1', label: 'Semester 1' },
                  { value: '2', label: 'Semester 2' },
                ]}
              />
            </div>
          ) : (
            <div className="w-full sm:w-44">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Bulan</label>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={monthOptions}
              />
            </div>
          )}
          <div className="w-full sm:w-44">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Kelas</label>
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={[{ value: 'all', label: 'Semua Kelas' }, ...data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))]}
            />
          </div>
          <div className="w-full sm:w-52">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Filter Kehadiran</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Peserta Didik' },
                { value: 'attention', label: 'Perlu Perhatian' },
                { value: 'perfect', label: 'Kehadiran 100%' },
              ]}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Pencarian</label>
            <SearchInput value={query} onChange={setQuery} placeholder="Cari nama atau NISN..." />
          </div>
          <Badge tone="brand" className="mb-2.5 h-fit">{filteredSessions.length} sesi</Badge>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
          <CalendarRange size={12} /> Menampilkan data {monthLabel} · {classFilter === 'all' ? 'seluruh kelas' : `kelas ${classMap.get(classFilter)?.name}`}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Rata-rata Kehadiran</p>
              <p className="mt-1.5 text-2xl font-extrabold text-navy-950">{overallRate}%</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={16} /></span>
          </div>
          <p className="mt-2 text-[9.5px] text-slate-400">{totalPresent} dari {totalRecords} catatan</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Catatan</p>
              <p className="mt-1.5 text-2xl font-extrabold text-navy-950">{totalRecords}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><BarChart3 size={16} /></span>
          </div>
          <p className="mt-2 text-[9.5px] text-slate-400">{filteredSessions.length} sesi absensi</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Perlu Perhatian</p>
              <p className="mt-1.5 text-2xl font-extrabold text-navy-950">{attentionCount}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><UserX size={16} /></span>
          </div>
          <p className="mt-2 text-[9.5px] text-slate-400">Di bawah ambang {data.settings.minimumAttendance}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Alpa</p>
              <p className="mt-1.5 text-2xl font-extrabold text-rose-600">{totalAlpa}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><TrendingDown size={16} /></span>
          </div>
          <p className="mt-2 text-[9.5px] text-slate-400">Tanpa keterangan pada periode ini</p>
        </Card>
      </div>
      <div className="flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card">
        <button
          onClick={() => setTab('siswa')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'siswa' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <Users size={14} /> Rekap per Siswa
        </button>
        <button
          onClick={() => setTab('harian')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'harian' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <CalendarRange size={14} /> Rekap Harian
        </button>
        <button
          onClick={() => setTab('semester')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'semester' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <BarChart3 size={14} /> Rekap Semester
        </button>
        <button
          onClick={() => setTab('mingguan')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'mingguan' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <CalendarRange size={14} /> Rekap Mingguan
        </button>
        <button
          onClick={() => setTab('bulanan')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'bulanan' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <CalendarRange size={14} /> Rekap Bulanan
        </button>
      </div>
      {tab === 'siswa' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="w-10 px-4 py-2.5">No</th>
                  <th className="cursor-pointer px-4 py-2.5 select-none" onClick={() => toggleSort('name')}>Peserta Didik {sortIcon('name')}</th>
                  <th className="px-3 py-2.5">Kelas</th>
                  <th className="cursor-pointer px-3 py-2.5 text-center select-none" onClick={() => toggleSort('hadir')}>Hadir {sortIcon('hadir')}</th>
                  <th className="px-3 py-2.5 text-center">Terlambat</th>
                  <th className="px-3 py-2.5 text-center">Izin</th>
                  <th className="px-3 py-2.5 text-center">Sakit</th>
                  <th className="cursor-pointer px-3 py-2.5 text-center select-none" onClick={() => toggleSort('alpa')}>Alpa {sortIcon('alpa')}</th>
                  <th className="px-3 py-2.5 text-center">Total</th>
                  <th className="cursor-pointer px-4 py-2.5 select-none" onClick={() => toggleSort('rate')}>Kehadiran {sortIcon('rate')}</th>
                  <th className="px-4 py-2.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row, index) => (
                  <tr key={row.student.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-[10px] text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.student.name} src={row.student.photo} size="sm" />
                        <div>
                          <p className="text-[11.5px] font-semibold text-navy-950">{row.student.name}</p>
                          <p className="font-mono text-[9px] text-slate-400">{row.student.nisn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Badge tone="brand">{classMap.get(row.student.classId)?.name}</Badge></td>
                    <td className="px-3 py-3 text-center text-[11px] font-semibold text-emerald-600">{row.hadir}</td>
                    <td className="px-3 py-3 text-center text-[11px] text-violet-600">{row.terlambat}</td>
                    <td className="px-3 py-3 text-center text-[11px] text-sky-600">{row.izin}</td>
                    <td className="px-3 py-3 text-center text-[11px] text-amber-600">{row.sakit}</td>
                    <td className="px-3 py-3 text-center text-[11px] font-semibold text-rose-600">{row.alpa}</td>
                    <td className="px-3 py-3 text-center text-[10.5px] text-slate-500">{row.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full', row.rate >= 92 ? 'bg-emerald-500' : row.rate >= 85 ? 'bg-brand-500' : 'bg-rose-500')}
                            style={{ width: `${row.rate}%` }}
                          />
                        </div>
                        <span className={cn('text-[10px] font-bold', row.rate >= 92 ? 'text-emerald-600' : row.rate >= 85 ? 'text-brand-600' : 'text-rose-600')}>
                          {row.rate}%
                        </span>
                        {row.rate < data.settings.minimumAttendance && row.total > 0 && (
                          <span className="rounded bg-rose-50 px-1 py-0.5 text-[8px] font-bold text-rose-600">LOW</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(row.student)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                        aria-label="Lihat detail"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSummaries.length === 0 && (
            <EmptyState
              icon={<Search size={22} />}
              title="Tidak ada data rekap"
              description="Tidak ada peserta didik yang cocok dengan filter pada periode ini."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setStatusFilter('all')
                  }}
                >
                  Reset Filter
                </Button>
              }
            />
          )}
          <Pagination page={page} pageSize={pageSize} total={filteredSummaries.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </Card>
      ) : tab === 'harian' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <h3 className="text-[14px] font-bold text-navy-950">Rekap Harian</h3>
              <p className="text-[11px] text-slate-500">Agregasi seluruh sesi per tanggal</p>
            </div>
            <Badge tone="slate">{daily.length} hari efektif</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5 text-center">Sesi</th>
                  {STATUS_ORDER.map((status) => (
                    <th key={status} className="px-3 py-2.5 text-center">{STATUS_META[status].label}</th>
                  ))}
                  <th className="px-5 py-2.5">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRows.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="text-[11px] font-semibold text-slate-700">{formatDate(row.date, 'full')}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-[10.5px] text-slate-500">{row.sessions}</td>
                    {STATUS_ORDER.map((status) => (
                      <td key={status} className="px-3 py-3 text-center">
                        <span className={cn('text-[10.5px] font-semibold', row.counts[status] > 0 ? STATUS_META[status].color : 'text-slate-300')}>
                          {row.counts[status]}
                        </span>
                      </td>
                    ))}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className={cn('h-full rounded-full', row.rate >= 92 ? 'bg-emerald-500' : row.rate >= 85 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${row.rate}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{row.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {daily.length === 0 && (
            <EmptyState icon={<CalendarRange size={22} />} title="Belum ada data harian" description="Pilih periode atau kelas lain untuk melihat rekap harian." />
          )}
          <Pagination page={dailyPage} pageSize={10} total={daily.length} onPageChange={setDailyPage} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="text-[14px] font-bold text-navy-950">Rekap Semester</h3>
              <p className="text-[11px] text-slate-500">
                Jumlah hari hadir per siswa pada {semesterChoice === '1' ? 'Semester 1 (Juli–Desember)' : 'Semester 2 (Januari–Juni)'}
              </p>
            </div>
            <Select
              value={semesterChoice}
              onChange={(e) => setSemesterChoice(e.target.value as '1' | '2')}
              options={[
                { value: '1', label: 'Semester 1 (Jul–Des)' },
                { value: '2', label: 'Semester 2 (Jan–Jun)' },
              ]}
              className="w-48"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="w-10 px-4 py-2.5">No</th>
                  <th className="px-4 py-2.5">Peserta Didik</th>
                  <th className="px-4 py-2.5">Kelas</th>
                  <th className="px-4 py-2.5 text-center">Hari Efektif</th>
                  <th className="px-4 py-2.5 text-center">Hari Hadir</th>
                  <th className="px-4 py-2.5 text-center">Terlambat</th>
                  <th className="px-4 py-2.5 text-center">Izin</th>
                  <th className="px-4 py-2.5 text-center">Sakit</th>
                  <th className="px-4 py-2.5 text-center">Alpa</th>
                  <th className="px-4 py-2.5 text-center">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semesterRows.map((row, index) => (
                  <tr key={row.student.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-[10.5px] text-slate-400">{index + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.student.name} size="sm" />
                        <div>
                          <p className="text-[11.5px] font-semibold text-navy-950">{row.student.name}</p>
                          <p className="text-[9.5px] text-slate-400">NISN {row.student.nisn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[10.5px] text-slate-600">{classMap.get(row.student.classId)?.name}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] font-bold text-slate-700">{row.effectiveDays}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] font-bold text-emerald-700">{row.presentDays}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] text-violet-700">{row.terlambat}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] text-sky-700">{row.izin}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] text-amber-700">{row.sakit}</td>
                    <td className="px-4 py-2.5 text-center text-[11px] text-rose-700">{row.alpa}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge tone={row.rate >= 90 ? 'emerald' : row.rate >= 75 ? 'amber' : 'rose'}>{row.rate}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {semesterRows.length === 0 && (
              <EmptyState icon={<BarChart3 size={22} />} title="Belum ada data" description="Tidak ada absensi pada semester ini." />
            )}
          </div>
        </Card>
      )}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detail Kehadiran Siswa"
        description={detail ? `${detail.name} · ${classMap.get(detail.classId)?.name}` : ''}
        size="lg"
      >
        {detail && detailSummary && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={detail.name} src={detail.photo} size="lg" />
                <div>
                  <p className="text-sm font-bold text-navy-950">{detail.name}</p>
                  <p className="font-mono text-[10px] text-slate-500">NISN {detail.nisn}</p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge tone="brand">Kelas {classMap.get(detail.classId)?.name}</Badge>
                    <Badge tone={detailSummary.rate >= 90 ? 'emerald' : 'amber'}>{detailSummary.rate}% kehadiran</Badge>
                  </div>
                </div>
              </div>
              <ProgressRing value={detailSummary.rate} size={64} stroke={6} color={detailSummary.rate >= 90 ? '#10b981' : detailSummary.rate >= 75 ? '#f59e0b' : '#f43f5e'} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {STATUS_ORDER.map((status) => (
                <div key={status} className={cn('rounded-xl border px-3 py-2.5', STATUS_META[status].border, STATUS_META[status].bg)}>
                  <p className={cn('text-[9.5px] font-semibold', STATUS_META[status].color)}>{STATUS_META[status].label}</p>
                  <p className="mt-0.5 text-xl font-extrabold text-navy-950">{detailSummary[status]}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-navy-950">Riwayat Sesi</p>
                <span className="text-[10px] text-slate-400">{monthLabel} · {detailSessions.length} sesi</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Mata Pelajaran</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-3 py-2 text-[10.5px] text-slate-600">{formatDate(session.date, 'medium')}</td>
                        <td className="px-3 py-2 text-[10.5px] font-medium text-slate-700">{session.subject}</td>
                        <td className="px-3 py-2 text-right"><StatusBadge status={session.status} compact /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportExcel(`detail-kehadiran-${detail.nisn}.xlsx`, [
                    {
                      name: 'Detail Kehadiran',
                      rows: [
                        ['NISN', 'NAMA', 'KELAS', 'PERIODE'],
                        [detail.nisn, detail.name, classMap.get(detail.classId)?.name ?? '-', monthLabel],
                        [],
                        ['TANGGAL', 'MATA PELAJARAN', 'JAM', 'STATUS'],
                        ...detailSessions.map((s) => [s.date, s.subject, s.period, STATUS_META[s.status].label]),
                      ],
                      widths: [14, 30, 10, 26],
                    },
                  ])
                  toast('Detail kehadiran berhasil diekspor ke Excel.', 'success')
                }}
              >
                <Download size={14} /> Ekspor Detail
              </Button>
              <Button onClick={() => setDetail(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Impor Rekap Absensi"
        description="Unggah file Excel berisi catatan kehadiran peserta didik."
        templateName="template-impor-rekap-absensi.xlsx"
        templateHeaders={['TANGGAL', 'KELAS', 'MATA_PELAJARAN', 'JAM', 'NISN', 'NAMA_SISWA', 'STATUS', 'CATATAN', 'GURU']}
        templateSamples={[
          ['2026-07-20', '7', 'Matematika', 'Jam 1-2', '1100120001', 'Ahmad Fauzi', 'Hadir', '', 'Siti Aminah, S.Pd.'],
          ['2026-07-20', '7', 'Matematika', 'Jam 1-2', '1100120002', 'Siti Aisyah', 'Izin', 'Acara keluarga', 'Siti Aminah, S.Pd.'],
          ['2026-07-20', '8', 'Bahasa Indonesia', 'Jam 3-4', '1100120003', 'Rizki Pratama', 'Terlambat', 'Datang 10 menit', 'Rudi Hartono, S.Pd.'],
        ]}
        note="Satu baris mewakili satu siswa pada satu sesi. Tanggal gunakan YYYY-MM-DD, jam boleh 1-2 atau 1,2. Baris dengan tanggal, kelas, dan jam yang sama akan digabung menjadi satu sesi."
        previewColumns={[{ label: 'Tanggal' }, { label: 'Kelas' }, { label: 'Mapel' }, { label: 'Jam' }, { label: 'Siswa' }, { label: 'Status' }]}
        previewRow={(item) => [item.date, item.className, item.subject, item.period, item.studentName, STATUS_META[item.status].label]}
        validate={validateImport}
        onImport={handleImport}
        importLabel="Impor Absensi"
      />
    </div>
  )
}