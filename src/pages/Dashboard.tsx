import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  CalendarCheck2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, ProgressRing, cn } from '../components/ui'
import { useApp } from '../store/AppContext'
import { STATUS_META, STATUS_ORDER } from '../lib/constants'
import {
  formatDate,
  greeting,
  percent,
  rateOf,
  summarizeSessions,
  toISODate,
} from '../lib/utils'

function ChartTip({ active, payload, label, suffix = '%' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      {payload.map((item: any) => (
        <p key={item.name} className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-navy-950">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
          {item.name}: {item.value}
          {suffix}
        </p>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  suffix,
  hint,
  icon,
  tone,
  delta,
  deltaUp,
}: {
  label: string
  value: string | number
  suffix?: string
  hint: string
  icon: React.ReactNode
  tone: 'brand' | 'emerald' | 'rose' | 'amber' | 'navy'
  delta?: string
  deltaUp?: boolean
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    navy: 'bg-navy-50 text-navy-700',
  }
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[28px] font-extrabold leading-none tracking-tight text-navy-950">{value}</span>
            {suffix && <span className="text-sm font-bold text-slate-400">{suffix}</span>}
          </div>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105', tones[tone])}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[10.5px] text-slate-500">{hint}</p>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              deltaUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
            )}
          >
            {deltaUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta}
          </span>
        )}
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { data, user } = useApp()
  const navigate = useNavigate()
  const [range, setRange] = useState<7 | 14 | 30>(14)

  const today = toISODate(new Date())
  const activeStudents = data.students.filter((s) => s.status === 'aktif')
  const sortedDates = useMemo(
    () => Array.from(new Set(data.sessions.map((s) => s.date))).sort(),
    [data.sessions],
  )
  const latestDate = sortedDates[sortedDates.length - 1] ?? today
  const activeDate = data.sessions.some((s) => s.date === today) ? today : latestDate
  const isToday = activeDate === today
  const classMap = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes])
  const studentMap = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students])

  const todaySessions = useMemo(
    () => data.sessions.filter((s) => s.date === activeDate),
    [data.sessions, activeDate],
  )
  const todayRecords = todaySessions.flatMap((s) => Object.values(s.records))
  const todayPresent = todayRecords.filter((v) => v === 'hadir' || v === 'terlambat').length
  const todayRate = percent(todayPresent, todayRecords.length)

  const previousDate = sortedDates.filter((d) => d < activeDate).slice(-1)[0]
  const prevSessions = previousDate ? data.sessions.filter((s) => s.date === previousDate) : []
  const prevRecords = prevSessions.flatMap((s) => Object.values(s.records))
  const prevRate = percent(prevRecords.filter((v) => v === 'hadir' || v === 'terlambat').length, prevRecords.length)
  const delta = todayRate && prevRate ? Math.round((todayRate - prevRate) * 10) / 10 : 0

  const sessions30 = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffISO = toISODate(cutoff)
    return data.sessions.filter((s) => s.date >= cutoffISO)
  }, [data.sessions])

  const statusData = useMemo(
    () =>
      STATUS_ORDER.map((status) => {
        const count = sessions30.reduce(
          (acc, session) => acc + Object.values(session.records).filter((v) => v === status).length,
          0,
        )
        return { name: STATUS_META[status].label, value: count, color: STATUS_META[status].chart, key: status }
      }).filter((d) => d.value > 0),
    [sessions30],
  )
  const totalRecords = statusData.reduce((a, b) => a + b.value, 0)

  const trendData = useMemo(() => {
    const dates = sortedDates.filter((d) => d <= activeDate).slice(-range)
    return dates.map((date) => {
      const sessions = data.sessions.filter((s) => s.date === date)
      const values = sessions.flatMap((s) => Object.values(s.records))
      const present = values.filter((v) => v === 'hadir' || v === 'terlambat').length
      return {
        date,
        label: formatDate(date, 'short'),
        full: formatDate(date, 'long'),
        kehadiran: percent(present, values.length),
      }
    })
  }, [data.sessions, sortedDates, activeDate, range])

  const classRates = useMemo(
    () =>
      data.classes.map((clazz) => {
        const sessions = sessions30.filter((s) => s.classId === clazz.id)
        const values = sessions.flatMap((s) => Object.values(s.records))
        return {
          id: clazz.id,
          name: clazz.name,
          rate: percent(values.filter((v) => v === 'hadir' || v === 'terlambat').length, values.length),
          students: activeStudents.filter((s) => s.classId === clazz.id).length,
        }
      }),
    [data.classes, sessions30, activeStudents],
  )

  const attention = useMemo(() => {
    const summary = summarizeSessions(sessions30, [])
    const rows = Object.entries(summary)
      .map(([studentId, values]) => {
        const student = studentMap.get(studentId)
        if (!student || student.status !== 'aktif') return null
        const rate = rateOf(values)
        return {
          student,
          rate,
          alpa: values.alpa,
          sakit: values.sakit,
          izin: values.izin,
          total: values.total,
          className: classMap.get(student.classId)?.name ?? '-',
        }
      })
      .filter(Boolean)
      .filter((row: any) => row.total > 0 && (row.rate < 90 || row.alpa >= 3))
      .sort((a: any, b: any) => b.alpa - a.alpa || a.rate - b.rate)
      .slice(0, 5)
    return rows as any[]
  }, [sessions30, studentMap, classMap])

  const recent = useMemo(
    () =>
      [...data.sessions]
        .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
        .slice(0, 5),
    [data.sessions],
  )

  const totalAttention = useMemo(() => {
    const summary = summarizeSessions(sessions30, [])
    return Object.values(summary).filter((v) => v.total > 0 && rateOf(v) < 90).length
  }, [sessions30])

  const classesCovered = new Set(todaySessions.map((s) => s.classId)).size

  return (
    <div className="stagger-children space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
            <Sparkles size={11} />
            {formatDate(activeDate, 'full')}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">
            {greeting()}, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Berikut ringkasan kehadiran peserta didik {isToday ? 'hari ini' : `pada ${formatDate(activeDate, 'long')}`}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={() => navigate('/rekap')}>
            <Download size={15} />
            Unduh Rekap
          </Button>
          <Button onClick={() => navigate('/absensi')} size="md">
            <Plus size={15} />
            Input Absensi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Peserta Didik"
          value={activeStudents.length}
          hint={`${data.classes.length} kelas aktif · ${data.teachers.filter((t) => t.status === 'aktif').length} guru`}
          icon={<Users size={19} />}
          tone="brand"
        />
        <StatCard
          label={isToday ? 'Kehadiran Hari Ini' : 'Kehadiran Terakhir'}
          value={todayRate}
          suffix="%"
          hint={`${todayPresent} dari ${todayRecords.length} catatan kehadiran`}
          icon={<UserCheck size={19} />}
          tone="emerald"
          delta={delta ? `${Math.abs(delta)}%` : undefined}
          deltaUp={delta >= 0}
        />
        <StatCard
          label="Perlu Perhatian"
          value={totalAttention}
          hint="Kehadiran di bawah ambang batas 90%"
          icon={<UserX size={19} />}
          tone="rose"
        />
        <StatCard
          label="Sesi Tercatat"
          value={todaySessions.length}
          hint={`${classesCovered} dari ${data.classes.length} kelas terlayani`}
          icon={<ClipboardCheck size={19} />}
          tone="navy"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Tren Kehadiran"
            description={`Persentase kehadiran ${range} hari sekolah terakhir`}
            action={
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                {[7, 14, 30].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRange(value as 7 | 14 | 30)}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
                      range === value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {value} Hari
                  </button>
                ))}
              </div>
            }
          />
          <div className="mt-4 h-[250px] px-1 pb-2 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b9df8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3b9df8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#bfe3ff', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="kehadiran"
                  name="Kehadiran"
                  stroke="#257ee5"
                  strokeWidth={2.4}
                  fill="url(#attendanceFill)"
                  dot={{ r: 3, fill: '#fff', stroke: '#257ee5', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#257ee5', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-brand-600" /> Persentase kehadiran
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Data diperbarui otomatis</span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Distribusi Kehadiran" description="30 hari terakhir" />
          <div className="relative mx-auto h-[185px] w-full max-w-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg">
                        <p className="font-bold text-slate-700">{payload[0].name}</p>
                        <p className="text-slate-500">
                          {payload[0].value} catatan · {percent(payload[0].value, totalRecords)}%
                        </p>
                      </div>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-extrabold leading-none text-navy-950">
                {percent(statusData.find((s) => s.key === 'hadir')?.value ?? 0, totalRecords)}%
              </span>
              <span className="mt-1 text-[9.5px] font-medium text-slate-400">Total hadir</span>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 px-5 py-3.5">
            {statusData.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-[10.5px] font-bold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Kehadiran per Kelas"
            description="Rata-rata 30 hari terakhir"
            action={<Badge tone="brand">Bahasa: persen</Badge>}
          />
          <div className="mt-2 h-[250px] px-2 pb-2 pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classRates} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={6} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }: any) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg">
                        <p className="font-bold text-slate-700">Kelas {label}</p>
                        <p className="text-slate-500">Kehadiran: {payload[0].value}%</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} fill="#257ee5" maxBarSize={38}>
                  {classRates.map((entry) => (
                    <Cell key={entry.id} fill={entry.rate >= 92 ? '#10b981' : entry.rate >= 88 ? '#3b9df8' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 px-5 py-3">
            {[
              { color: 'bg-emerald-500', label: '≥ 92% Baik' },
              { color: 'bg-brand-500', label: '88–91% Cukup' },
              { color: 'bg-amber-500', label: '< 88% Perhatian' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[9.5px] text-slate-500">
                <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
                {item.label}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Peserta Didik Perlu Perhatian"
            description="Kehadiran rendah atau alpa tinggi"
            action={
              <Link to="/rekap" className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700">
                Lihat rekap <ChevronRight size={12} />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100 px-5 pb-2">
            {attention.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">Semua peserta didik dalam kondisi baik 🎉</div>
            ) : (
              attention.map((row) => (
                <div key={row.student.id} className="flex items-center gap-3 py-3">
                  <Avatar name={row.student.name} src={row.student.photo} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-navy-950">{row.student.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Kelas {row.className} · Alpa {row.alpa}x · Sakit {row.sakit}x
                    </p>
                  </div>
                  <div className="text-right">
                    <ProgressRing
                      value={row.rate}
                      size={38}
                      stroke={3.5}
                      color={row.rate < 75 ? '#f43f5e' : row.rate < 85 ? '#f59e0b' : '#3b9df8'}
                    />
                    <p className="mt-0.5 text-[8.5px] text-slate-400">{row.total} sesi</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-inset ring-amber-100">
            <p className="text-[10px] leading-relaxed text-amber-700">
              <span className="font-bold">Catatan:</span> Ambang batas kehadiran minimal {data.settings.minimumAttendance}%.
              Peserta didik di bawah 90% perlu ditindaklanjuti oleh wali kelas.
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Aktivitas Absensi Terbaru"
          description="Sesi absensi yang terakhir diperbarui"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/absensi')}>
              Lihat semua <ChevronRight size={13} />
            </Button>
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5">Kelas & Mapel</th>
                <th className="px-4 py-2.5">Tanggal / Jam</th>
                <th className="px-4 py-2.5">Guru</th>
                <th className="px-4 py-2.5">Kehadiran</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((session) => {
                const values = Object.values(session.records)
                const present = values.filter((v) => v === 'hadir' || v === 'terlambat').length
                const rate = percent(present, values.length)
                const teacher = data.teachers.find((t) => t.id === session.teacherId)
                return (
                  <tr key={session.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                          {classMap.get(session.classId)?.name}
                        </span>
                        <div>
                          <p className="text-[11.5px] font-semibold text-navy-950">{session.subject}</p>
                          <p className="text-[9.5px] text-slate-400">{session.period}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-medium text-slate-700">{formatDate(session.date, 'medium')}</p>
                      <p className="flex items-center gap-1 text-[9.5px] text-slate-400">
                        <Clock3 size={10} /> {session.createdAt.slice(11, 16)} WIB
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">{teacher?.name.split(',')[0] ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full', rate >= 92 ? 'bg-emerald-500' : rate >= 85 ? 'bg-brand-500' : 'bg-amber-500')}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{rate}%</span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-slate-400">{present}/{values.length} hadir</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={rate >= 92 ? 'emerald' : rate >= 85 ? 'amber' : 'rose'}>
                        {rate >= 92 ? 'Sangat baik' : rate >= 85 ? 'Cukup' : 'Perhatian'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/absensi?date=${session.date}&class=${session.classId}`)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10.5px] font-semibold text-brand-600 opacity-0 transition-opacity hover:bg-brand-50 group-hover:opacity-100"
                      >
                        Detail <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <CalendarCheck2 size={12} /> {data.sessions.length} sesi absensi tersimpan
          </span>
          <span className="text-[10px] text-slate-400">TA {data.settings.academicYear} · Semester {data.settings.semester}</span>
        </div>
      </Card>
    </div>
  )
}
