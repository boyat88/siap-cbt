import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Cloud,
  CloudOff,
  FileSpreadsheet,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Textarea,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { STATUS_META, STATUS_ORDER, SUBJECTS } from '../lib/constants'
import { formatDate, isSchoolDay, percent, relativeTime, toISODate } from '../lib/utils'
import type { AttendanceSession, AttendanceStatus } from '../types'

export function Absensi() {
  const {
    data,
    user,
    upsertSession,
    deleteSession,
    syncStatus,
    lastSyncedAt,
    pendingSyncCount,
    syncNow,
  } = useApp()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const today = toISODate(new Date())
  const [tab, setTab] = useState<'input' | 'riwayat'>('input')

  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || today)
  const [classId, setClassId] = useState(searchParams.get('class') || data.classes[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [note, setNote] = useState('')
  const defaultTeacher = data.teachers.find((t) => t.name === user?.name) || data.teachers[0]
  const [teacherId, setTeacherId] = useState(defaultTeacher?.id || '')
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({})
  const [recordNotes, setRecordNotes] = useState<Record<string, string>>({})
  const [existingId, setExistingId] = useState<string | null>(null)
  const [studentQuery, setStudentQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const allowedSubjects = useMemo(() => {
    if (user?.role !== 'guru') return SUBJECTS
    const teacher = data.teachers.find(
      (item) => item.email.toLowerCase() === user.email.toLowerCase() || item.name === user.name,
    )
    return teacher?.subjects?.length ? teacher.subjects : []
  }, [user, data.teachers])

  useEffect(() => {
    if (!subject && allowedSubjects.length > 0) setSubject(allowedSubjects[0])
  }, [allowedSubjects, subject])

  const [historyQuery, setHistoryQuery] = useState('')
  const [historyClass, setHistoryClass] = useState('all')
  const [historyDate, setHistoryDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null)

  const roster = useMemo(
    () =>
      data.students
        .filter((s) => s.classId === classId && s.status === 'aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.students, classId],
  )

  const classMap = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes])
  const currentClass = classMap.get(classId)

  useEffect(() => {
    const existing = data.sessions.find(
      (s) => s.date === selectedDate && s.classId === classId && s.subject === subject,
    )
    if (existing) {
      setExistingId(existing.id)
      setSubject(existing.subject)
      setTeacherId(existing.teacherId)
      setNote(existing.note)
      setRecords({ ...existing.records })
      setRecordNotes({ ...(existing.recordNotes ?? {}) })
    } else {
      setExistingId(null)
      setNote('')
      const initial: Record<string, AttendanceStatus> = {}
      for (const student of roster) initial[student.id] = 'hadir'
      setRecords(initial)
      setRecordNotes({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, classId, subject, data.sessions])

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 }
    for (const student of roster) {
      const status = records[student.id]
      if (status) result[status] += 1
    }
    return result
  }, [records, roster])

  const present = counts.hadir + counts.terlambat
  const presentRate = percent(present, roster.length)
  const filteredRoster = roster.filter(
    (s) =>
      s.name.toLowerCase().includes(studentQuery.toLowerCase()) ||
      s.nisn.includes(studentQuery),
  )

  const setAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = { ...records }
    for (const student of roster) next[student.id] = status
    setRecords(next)
    toast(status === 'hadir' ? 'Semua peserta didik ditandai hadir.' : 'Status diperbarui.', 'info')
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSave = () => {
    if (!selectedDate) {
      toast('Tanggal absensi wajib dipilih.', 'error')
      return
    }
    if (selectedDate > today) {
      toast('Tanggal absensi tidak boleh melebihi hari ini.', 'error')
      return
    }
    if (!classId || roster.length === 0) {
      toast('Kelas belum dipilih atau belum memiliki peserta didik.', 'error')
      return
    }
    if (!isSchoolDay(selectedDate, data.settings.holidays ?? [])) {
      toast('Tanggal yang dipilih adalah hari libur/akhir pekan. Pilih hari efektif (Senin–Jumat).', 'error')
      return
    }
    if (!subject || !teacherId) {
      toast('Mata pelajaran dan guru pengampu wajib diisi.', 'error')
      return
    }
    if (Object.keys(records).length === 0) {
      toast('Lengkapi status kehadiran seluruh peserta didik.', 'error')
      return
    }

    const now = new Date().toISOString()
    const id = existingId ?? `ses_${selectedDate}_${classId}_${subject.replace(/\s/g, '')}`
    const existing = data.sessions.find((s) => s.id === id)
    upsertSession({
      id,
      date: selectedDate,
      classId,
      subject,
      period: '',
      teacherId,
      note,
      records,
      recordNotes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    setExistingId(id)
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      toast(existing ? 'Data absensi berhasil diperbarui.' : 'Absensi berhasil disimpan.', 'success')
    }, 450)
  }

  const startEdit = (session: AttendanceSession) => {
    setSelectedDate(session.date)
    setClassId(session.classId)
    setSubject(session.subject)
    setTeacherId(session.teacherId)
    setTab('input')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteSession(deleteTarget.id)
    toast('Sesi absensi berhasil dihapus.', 'success')
    if (existingId === deleteTarget.id) {
      setExistingId(null)
    }
    setDeleteTarget(null)
  }

  const history = useMemo(() => {
    return data.sessions
      .filter((s) => {
        if (historyClass !== 'all' && s.classId !== historyClass) return false
        if (historyDate && s.date !== historyDate) return false
        if (historyQuery) {
          const q = historyQuery.toLowerCase()
          const className = classMap.get(s.classId)?.name.toLowerCase() ?? ''
          if (!s.subject.toLowerCase().includes(q) && !className.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt))
  }, [data.sessions, historyClass, historyDate, historyQuery, classMap])

  useEffect(() => {
    setPage(1)
  }, [historyQuery, historyClass, historyDate, pageSize])

  const pagedHistory = history.slice((page - 1) * pageSize, page * pageSize)
  const sessionsToday = data.sessions.filter((s) => s.date === today).length
  const avgRate = history.length
    ? Math.round(
        history.reduce((acc, s) => {
          const values = Object.values(s.records)
          return acc + percent(values.filter((v) => v === 'hadir' || v === 'terlambat').length, values.length)
        }, 0) / history.length,
      )
    : 0

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Kehadiran</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Absensi Peserta Didik</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Catat kehadiran per kelas dan jam pelajaran. Data tersimpan otomatis dan langsung masuk ke rekap.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncStatus === 'syncing'}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors',
              syncStatus === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                : syncStatus === 'syncing'
                  ? 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            )}
            title="Kirim dan tarik data absensi dari server administrator"
          >
            {syncStatus === 'syncing' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : syncStatus === 'error' ? (
              <CloudOff size={14} />
            ) : (
              <Cloud size={14} />
            )}
            <span>
              {syncStatus === 'syncing'
                ? 'Menyinkronkan...'
                : syncStatus === 'error'
                  ? 'Server offline'
                  : syncStatus === 'synced'
                    ? 'Tersinkron'
                    : 'Sinkronkan'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold">{pendingSyncCount} antre</span>
            )}
            <RefreshCw size={11} className={cn(syncStatus === 'syncing' && 'animate-spin')} />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
            <CalendarDays size={14} className="text-brand-500" />
            <span className="font-semibold text-slate-700">{formatDate(today, 'long')}</span>
            <span className="h-4 w-px bg-slate-200" />
            <span>{sessionsToday} sesi hari ini</span>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
        <Cloud size={12} className="text-emerald-500" />
        Semua absensi otomatis dikirim ke server administrator.
        {lastSyncedAt && <span className="ml-1">Sinkron terakhir {relativeTime(lastSyncedAt)}.</span>}
      </p>

      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card w-fit">
        <button
          onClick={() => setTab('input')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'input' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          )}
        >
          <ClipboardCheck size={14} /> Isi Absensi
        </button>
        <button
          onClick={() => setTab('riwayat')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-semibold transition-colors',
            tab === 'riwayat' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          )}
        >
          <History size={14} /> Riwayat
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-bold',
              tab === 'riwayat' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500',
            )}
          >
            {data.sessions.length}
          </span>
        </button>
      </div>

      {tab === 'input' ? (
        <>
          <Card>
            <CardHeader
              title="Detail Sesi"
              description="Pilih tanggal, kelas, dan jam pelajaran yang akan diisi"
              action={
                currentClass && (
                  <Badge tone="navy">
                    Kelas {currentClass.name} · {roster.length} siswa
                  </Badge>
                )
              }
            />
            {!isSchoolDay(selectedDate, data.settings.holidays ?? []) && (
              <div className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] font-medium text-amber-700">
                Tanggal yang dipilih adalah akhir pekan/hari libur. Kehadiran tidak dapat diisi.
              </div>
            )}
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
              <Input
                label="Tanggal"
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
              <Select
                label="Kelas"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))}
                required
              />
              <Select
                label="Mata Pelajaran"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value)
                  const match = data.teachers.find((t) => t.subjects.includes(e.target.value))
                  if (match) setTeacherId(match.id)
                }}
                options={allowedSubjects.map((s) => ({ value: s, label: s }))}
                required
              />
              <Select
                label="Guru Pengampu"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                options={data.teachers.map((t) => ({ value: t.id, label: t.name }))}
                required
              />
              <div className="sm:col-span-2 xl:col-span-3">
                <Textarea
                  label="Catatan Sesi (opsional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: pembelajaran berjalan kondusif, atau catatan khusus terkait kehadiran..."
                  className="min-h-[44px]"
                  rows={1}
                />
              </div>
            </div>
            {existingId && (
              <div className="mx-5 mb-5">
                <Alert tone="warning" title="Sesi absensi sudah tercatat">
                  Data yang tersimpan telah dimuat ke formulir. Menyimpan perubahan akan memperbarui sesi ini, bukan membuat sesi baru.
                </Alert>
              </div>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status]
              return (
                <Card key={status} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold', meta.bg, meta.color)}
                    >
                      {meta.short}
                    </span>
                    <div>
                      <p className="text-[10px] text-slate-500">{meta.label}</p>
                      <p className="text-lg font-bold leading-none text-navy-950">{counts[status]}</p>
                    </div>
                  </div>
                  <ProgressPill value={percent(counts[status], roster.length)} color={meta.chart} />
                </Card>
              )
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="text-[15px] font-bold text-navy-950">Daftar Kehadiran</h3>
                <p className="text-xs text-slate-500">
                  {present} dari {roster.length} peserta didik hadir · {presentRate}% kehadiran
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput value={studentQuery} onChange={setStudentQuery} placeholder="Cari nama / NISN..." className="w-full sm:w-52" />
                <Button variant="outline" size="sm" onClick={() => setAll('hadir')}>
                  <CheckCheck size={14} /> Semua Hadir
                </Button>
              </div>
            </div>

            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-12 px-5 py-2.5">No</th>
                    <th className="px-4 py-2.5">Peserta Didik</th>
                    <th className="px-4 py-2.5">NISN</th>
                    <th className="px-4 py-2.5">Status Kehadiran</th>
                    <th className="px-5 py-2.5 text-right">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((student, index) => {
                    const status = records[student.id] ?? 'hadir'
                    return (
                      <tr key={student.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-[11px] text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={student.name} src={student.photo} size="sm" />
                            <div>
                              <p className="text-[12px] font-semibold text-navy-950">{student.name}</p>
                              <p className="text-[9.5px] text-slate-400">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10.5px] text-slate-500">{student.nisn}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <StatusPicker
                              value={status}
                              onChange={(next) => setStatus(student.id, next)}
                              disabledStatuses={isSchoolDay(selectedDate, data.settings.holidays ?? []) ? [] : ['hadir', 'terlambat', 'izin', 'sakit']}
                            />
                            {(status === 'terlambat' || status === 'izin' || status === 'sakit') && (
                              <input
                                type="text"
                                value={recordNotes[student.id] ?? ''}
                                onChange={(e) =>
                                  setRecordNotes((prev) => ({ ...prev, [student.id]: e.target.value }))
                                }
                                placeholder="Keterangan (opsional)"
                                className="h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={cn(
                              'text-[10.5px] font-semibold',
                              status === 'hadir' || status === 'terlambat' ? 'text-emerald-600' : 'text-slate-400',
                            )}
                          >
                            {status === 'hadir' || status === 'terlambat' ? 'Dihitung' : 'Tidak dihitung'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredRoster.map((student) => {
                const status = records[student.id] ?? 'hadir'
                return (
                  <div key={student.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={student.name} src={student.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-navy-950">{student.name}</p>
                        <p className="font-mono text-[9px] text-slate-400">{student.nisn}</p>
                      </div>
                      <Badge tone={status === 'hadir' ? 'emerald' : status === 'alpa' ? 'rose' : status === 'sakit' ? 'amber' : status === 'izin' ? 'sky' : 'violet'}>
                        {STATUS_META[status].label}
                      </Badge>
                    </div>
                    <StatusPicker
  value={status}
  onChange={(next) => setStatus(student.id, next)}
  className="mt-2.5 w-full"
  disabledStatuses={isSchoolDay(selectedDate, data.settings.holidays ?? []) ? [] : ['hadir', 'terlambat', 'izin', 'sakit']}
/>
{(status === 'terlambat' || status === 'izin' || status === 'sakit') && (
  <input
    type="text"
    value={recordNotes[student.id] ?? ''}
    onChange={(e) => setRecordNotes((prev) => ({ ...prev, [student.id]: e.target.value }))}
    placeholder="Keterangan (opsional)"
    className="mt-2 h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
  />
)}
                  </div>
                )
              })}
            </div>

            {filteredRoster.length === 0 && (
              <EmptyState icon={<Users size={22} />} title="Peserta didik tidak ditemukan" description="Coba ubah kata kunci pencarian atau pilih kelas lain." />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-4 text-[10.5px]">
                <span className="font-semibold text-slate-600">
                  Kehadiran: <span className="text-emerald-600">{presentRate}%</span>
                </span>
                <span className="text-slate-400">
                  {existingId ? 'Mode perbarui sesi tersimpan' : 'Sesi baru'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTab('riwayat')}>
                  Riwayat
                </Button>
                <Button size="md" loading={saving} onClick={handleSave} disabled={!isSchoolDay(selectedDate, data.settings.holidays ?? [])}>
                  {existingId ? 'Perbarui Absensi' : 'Simpan Absensi'}
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h3 className="text-[15px] font-bold text-navy-950">Riwayat Absensi</h3>
              <p className="text-xs text-slate-500">Seluruh sesi absensi yang telah dicatat</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="emerald">Rata-rata {avgRate}%</Badge>
              <Badge tone="brand">{history.length} sesi</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            <SearchInput value={historyQuery} onChange={setHistoryQuery} placeholder="Cari kelas / mapel..." className="w-full sm:w-60" />
            <Select
              value={historyClass}
              onChange={(e) => setHistoryClass(e.target.value)}
              className="sm:w-40"
              options={[{ value: 'all', label: 'Semua Kelas' }, ...data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))]}
            />
            <Input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="sm:w-44" max={today} />
            {(historyQuery || historyClass !== 'all' || historyDate) && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setHistoryQuery('')
                  setHistoryClass('all')
                  setHistoryDate('')
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Kelas</th>
                  <th className="px-4 py-2.5">Mata Pelajaran</th>
                  <th className="px-4 py-2.5">Guru</th>
                  <th className="px-4 py-2.5">Kehadiran</th>
                  <th className="px-5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={<FileSpreadsheet size={22} />} title="Belum ada riwayat" description="Tidak ada sesi absensi yang sesuai dengan filter." />
                    </td>
                  </tr>
                ) : (
                  pagedHistory.map((session) => {
                    const values = Object.values(session.records)
                    const presentCount = values.filter((v) => v === 'hadir' || v === 'terlambat').length
                    const rate = percent(presentCount, values.length)
                    const teacher = data.teachers.find((t) => t.id === session.teacherId)
                    return (
                      <tr key={session.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="text-[11.5px] font-semibold text-slate-700">{formatDate(session.date, 'medium')}</p>
                          <p className="text-[9.5px] text-slate-400">{session.date}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex h-7 w-8 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                            {classMap.get(session.classId)?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11.5px] font-medium text-slate-700">{session.subject}</p>
                          {session.note && <p className="max-w-[180px] truncate text-[9.5px] text-slate-400">{session.note}</p>}
                        </td>
                        <td className="px-4 py-3 text-[10.5px] text-slate-600">{teacher?.name.split(',')[0]}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700">{presentCount}/{values.length}</span>
                            <Badge tone={rate >= 92 ? 'emerald' : rate >= 85 ? 'amber' : 'rose'}>{rate}%</Badge>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEdit(session)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                              aria-label="Ubah absensi"
                              title="Ubah"
                            >
                              <Pencil size={14} />
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => setDeleteTarget(session)}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Hapus absensi"
                                title="Hapus"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={history.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus sesi absensi?"
        description="Tindakan ini tidak dapat dibatalkan."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 size={14} /> Hapus Sesi
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <Alert tone="danger" title="Data akan dihapus permanen">
              Sesi {deleteTarget.subject} kelas {classMap.get(deleteTarget.classId)?.name} tanggal{' '}
              {formatDate(deleteTarget.date, 'long')} akan dihapus dari seluruh rekap dan laporan.
            </Alert>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                Guru: <span className="font-semibold">{data.teachers.find((t) => t.id === deleteTarget.teacherId)?.name}</span>
              </p>
              <p className="mt-0.5">Tanggal {deleteTarget.date}</p>
              <p className="mt-0.5">Jumlah catatan: {Object.keys(deleteTarget.records).length} peserta didik</p>
            </div>
          </div>
        )}
      </Modal>

      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <AlertCircle size={12} />
        Pastikan seluruh status kehadiran telah sesuai sebelum menyimpan. Data langsung memperbarui rekap dan laporan.
      </div>
    </div>
  )
}

function StatusPicker({
  value,
  onChange,
  className,
  disabled = false,
  disabledStatuses = [],
}: {
  value: AttendanceStatus
  onChange: (value: AttendanceStatus) => void
  className?: string
  disabled?: boolean
  disabledStatuses?: AttendanceStatus[]
}) {
  const isDisabledDay = disabled
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5', className, isDisabledDay && 'opacity-60')}>
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status]
        const active = value === status
        const blocked = isDisabledDay || disabledStatuses.includes(status)
        return (
          <button
            key={status}
            type="button"
            disabled={blocked}
            onClick={() => {
              if (blocked) return
              onChange(status)
            }}
            title={blocked ? 'Hari libur/akhir pekan' : meta.label}
            className={cn(
              'flex-1 rounded-lg px-2 py-1.5 text-[9.5px] font-semibold transition-all',
              blocked ? 'cursor-not-allowed text-slate-300' : '',
              active && !blocked
                ? cn('border shadow-sm', meta.bg, meta.color, meta.border)
                : 'border border-transparent text-slate-400 hover:bg-white hover:text-slate-600',
            )}
          >
            <span className="hidden sm:inline">{meta.label}</span>
            <span className="sm:hidden">{meta.short}</span>
          </button>
        )
      })}
    </div>
  )
}

function ProgressPill({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-semibold text-slate-400">{value}%</span>
    </div>
  )
}
