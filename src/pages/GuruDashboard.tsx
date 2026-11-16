import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Mail,
  Pencil,
  Phone,
  School,
  UserCheck,
  Users,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState } from '../components/ui'
import { useApp } from '../store/AppContext'
import { dayName, formatDate, greeting, percent, toISODate } from '../lib/utils'

/**
 * Dasbor ringkas khusus akun guru.
 *
 * Sengaja tanpa grafik/efek berat supaya cepat dibuka di HP: fokus ke jadwal
 * mengajar hari ini, tombol isi absensi, dan data guru itu sendiri.
 */
export function GuruDashboard() {
  const { data, user } = useApp()
  const navigate = useNavigate()
  const today = toISODate(new Date())
  const day = dayName(today)

  // Data guru yang sedang login (dicocokkan lewat email atau nama).
  const teacher = useMemo(() => {
    if (!user) return null
    const email = user.email.toLowerCase()
    return (
      data.teachers.find((item) => item.email.toLowerCase() === email) ??
      data.teachers.find((item) => item.name === user.name) ??
      null
    )
  }, [data.teachers, user])

  const schedules = useMemo(
    () => (data.teachingSchedules ?? []).filter((schedule) => schedule.teacherId === teacher?.id),
    [data.teachingSchedules, teacher?.id],
  )
  const todaySchedules = useMemo(
    () => schedules.filter((schedule) => schedule.day === day),
    [schedules, day],
  )
  const myClassIds = useMemo(
    () => new Set(schedules.flatMap((schedule) => schedule.classIds)),
    [schedules],
  )
  const myClasses = useMemo(
    () => data.classes.filter((clazz) => myClassIds.has(clazz.id)),
    [data.classes, myClassIds],
  )
  const myStudents = useMemo(
    () =>
      data.students.filter(
        (student) => student.status === 'aktif' && myClassIds.has(student.classId),
      ),
    [data.students, myClassIds],
  )
  const todayAttendance = useMemo(() => {
    const sessions = data.sessions.filter(
      (session) => session.date === today && myClassIds.has(session.classId),
    )
    const records = sessions.flatMap((session) => Object.values(session.records))
    const present = records.filter((value) => value === 'hadir' || value === 'terlambat').length
    return { sessions: sessions.length, present, total: records.length, rate: percent(present, records.length) }
  }, [data.sessions, myClassIds, today])

  const openAbsensi = (classId?: string) =>
    navigate(classId ? `/absensi?class=${classId}` : '/absensi')

  return (
    <div className="space-y-4">
      {/* Sapaan + aksi utama */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-brand-800 p-5 text-white shadow-[0_18px_40px_-28px_rgba(2,10,30,0.85)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/85">
              <CalendarDays size={11} />
              {formatDate(today, 'full')}
            </p>
            <h1 className="mt-3 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
              {greeting()}, {user?.name.split(' ')[0] ?? 'Bapak/Ibu'} 👋
            </h1>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/75">
              {todaySchedules.length > 0
                ? `Ada ${todaySchedules.length} jadwal mengajar hari ini.`
                : 'Tidak ada jadwal mengajar hari ini.'}
            </p>
          </div>
          <Avatar name={user?.name ?? 'Guru'} src={user?.photo} size="lg" className="ring-2 ring-white/25" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => openAbsensi()}
            className="bg-white text-navy-950 hover:bg-white/90"
          >
            <ClipboardCheck size={14} />
            Isi Absensi
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/profil')}
            className="border border-white/25 text-white hover:bg-white/10"
          >
            <Pencil size={14} />
            Edit Data Saya
          </Button>
        </div>
      </section>

      {/* Ringkasan singkat */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-center shadow-sm">
          <School size={15} className="mx-auto text-brand-500" />
          <p className="mt-1 text-base font-extrabold leading-none text-navy-950">{myClasses.length}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Kelas</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-center shadow-sm">
          <Users size={15} className="mx-auto text-sky-500" />
          <p className="mt-1 text-base font-extrabold leading-none text-navy-950">{myStudents.length}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Siswa</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-center shadow-sm">
          <UserCheck size={15} className="mx-auto text-emerald-500" />
          <p className="mt-1 text-base font-extrabold leading-none text-navy-950">
            {todayAttendance.total > 0 ? `${todayAttendance.rate}%` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Hadir</p>
        </div>
      </div>

      {/* Jadwal hari ini */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Jadwal Hari Ini"
          description={`${day} · ${formatDate(today, 'long')}`}
          action={<Badge tone="brand">{todaySchedules.length} jadwal</Badge>}
        />
        <div className="px-5 py-4">
          {todaySchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={20} />}
              title="Belum ada jadwal hari ini"
              description={`Tidak ada mata pelajaran yang dijadwalkan pada hari ${day}.`}
              action={
                <Button size="sm" variant="soft" onClick={() => openAbsensi()}>
                  Buka Absensi
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {todaySchedules.map((schedule) => {
                const firstClass = schedule.classIds[0]
                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => openAbsensi(firstClass)}
                    className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 active:scale-[0.995]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-navy-950">{schedule.subject}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {schedule.classIds.map((classId) => {
                          const clazz = data.classes.find((item) => item.id === classId)
                          return (
                            <span
                              key={classId}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                            >
                              {clazz?.name ?? classId}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500/10 px-2 py-1 text-[10.5px] font-bold text-brand-700">
                      Absen
                      <ChevronRight size={12} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Data guru */}
      <Card className="overflow-hidden">
        <CardHeader title="Data Saya" description="Perbarui informasi akun dan data guru Anda." />
        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mata Pelajaran</p>
            <p className="mt-0.5 text-[13px] font-semibold text-navy-950">
              {teacher?.subjects?.length ? teacher.subjects.join(', ') : user?.subject || '—'}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-[12px] text-slate-600">
              <Mail size={13} className="text-slate-400" />
              <span className="truncate">{teacher?.email || user?.email}</span>
            </p>
            <p className="flex items-center gap-2 text-[12px] text-slate-600">
              <Phone size={13} className="text-slate-400" />
              <span>{teacher?.phone || user?.phone || '—'}</span>
            </p>
            <p className="flex items-center gap-2 text-[12px] text-slate-600">
              <School size={13} className="text-slate-400" />
              <span>NIP {teacher?.nip || user?.nip || '—'}</span>
            </p>
          </div>
          <Button size="sm" variant="soft" className="w-full" onClick={() => navigate('/profil')}>
            <Pencil size={14} />
            Edit Data Saya
          </Button>
        </div>
      </Card>
    </div>
  )
}
