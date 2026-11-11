import { useEffect, useMemo, useState } from 'react'
import { Download, FileBarChart2, Printer, School } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressRing,
  Select,
  cn,
  useToast,
} from '../components/ui'
import { BrandMark } from '../components/Brand'
import { useApp } from '../store/AppContext'
import { MONTHS, STATUS_META, STATUS_ORDER } from '../lib/constants'
import { downloadCSV, formatDate, percent, rateOf, summarizeSessions, toISODate } from '../lib/utils'

export function Laporan() {
  const { data } = useApp()
  const toast = useToast()
  const [classId, setClassId] = useState(data.classes[0]?.id ?? '')
  const [month, setMonth] = useState('')

  const monthOptions = useMemo(() => {
    const unique = Array.from(new Set(data.sessions.map((s) => s.date.slice(0, 7)))).sort().reverse()
    const current = new Date().toISOString().slice(0, 7)
    if (!unique.includes(current)) unique.unshift(current)
    return unique.map((value) => {
      const [y, m] = value.split('-').map(Number)
      return { value, label: `${MONTHS[m - 1]} ${y}` }
    })
  }, [data.sessions])

  useEffect(() => {
    if (!month && monthOptions.length > 0) setMonth(monthOptions[0].value)
  }, [month, monthOptions])

  const clazz = data.classes.find((c) => c.id === classId)
  const homeroom = data.teachers.find((t) => t.id === clazz?.homeroomId)
  const students = useMemo(
    () =>
      data.students
        .filter((s) => s.classId === classId && s.status === 'aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.students, classId],
  )
  const sessions = useMemo(
    () => data.sessions.filter((s) => s.classId === classId && s.date.startsWith(month)),
    [data.sessions, classId, month],
  )
  const summaries = useMemo(() => {
    const raw = summarizeSessions(sessions, students.map((s) => s.id))
    return students.map((student) => {
      const values = raw[student.id] ?? { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
      return { student, ...values, rate: rateOf(values) }
    })
  }, [sessions, students])

  const totals = summaries.reduce(
    (acc, row) => ({
      hadir: acc.hadir + row.hadir,
      terlambat: acc.terlambat + row.terlambat,
      izin: acc.izin + row.izin,
      sakit: acc.sakit + row.sakit,
      alpa: acc.alpa + row.alpa,
      total: acc.total + row.total,
    }),
    { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
  )
  const averageRate = rateOf(totals)
  const monthLabel = monthOptions.find((m) => m.value === month)?.label ?? '-'
  const belowThreshold = summaries.filter((s) => s.total > 0 && s.rate < data.settings.minimumAttendance).length

  const exportReport = () => {
    if (!clazz) return
    downloadCSV(
      `laporan-absensi-${clazz.name}-${month}.csv`,
      [
        ['LAPORAN KEHADIRAN PESERTA DIDIK'],
        [data.settings.school.name],
        [`Kelas: ${clazz.name}`, `Periode: ${monthLabel}`, `Tahun Ajaran: ${data.settings.academicYear}`],
        [],
        ['No', 'NISN', 'Nama', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa', 'Total', 'Persentase'],
        ...summaries.map((row, i) => [
          i + 1,
          row.student.nisn,
          row.student.name,
          row.hadir,
          row.terlambat,
          row.izin,
          row.sakit,
          row.alpa,
          row.total,
          `${row.rate}%`,
        ]),
        ['', '', 'JUMLAH', totals.hadir, totals.terlambat, totals.izin, totals.sakit, totals.alpa, totals.total, `${averageRate}%`],
        [],
        ['Wali Kelas', homeroom?.name ?? '-'],
        ['Kepala Sekolah', data.settings.school.headmaster],
      ],
    )
    toast('Laporan berhasil diekspor ke CSV.', 'success')
  }

  const handlePrint = () => {
    toast('Menyiapkan laporan untuk dicetak...', 'info')
    window.setTimeout(() => window.print(), 300)
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Analitik</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Laporan Kehadiran</h1>
          <p className="mt-1 text-sm text-slate-500">Cetak atau unduh laporan kehadiran resmi per kelas dan periode.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download size={15} /> Ekspor CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={15} /> Cetak Laporan
          </Button>
        </div>
      </div>

      <Card className="p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-52">
            <Select
              label="Kelas"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select label="Periode Laporan" value={month} onChange={(e) => setMonth(e.target.value)} options={monthOptions} />
          </div>
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-semibold text-slate-700">Ringkasan</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{sessions.length} sesi</Badge>
              <Badge tone="emerald">{averageRate}% kehadiran</Badge>
              <Badge tone={belowThreshold > 0 ? 'rose' : 'slate'}>{belowThreshold} di bawah ambang</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <div className="border-b-[3px] border-navy-900 px-6 py-6 sm:px-10">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <BrandMark size="lg" logo={data.settings.appLogo} />
            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Pemerintah Kabupaten Tasikmalaya · Dinas Pendidikan
              </p>
              <h2 className="mt-1 text-lg font-extrabold uppercase tracking-wide text-navy-950 sm:text-xl">
                {data.settings.school.name}
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {data.settings.school.address} · NPSN {data.settings.school.npsn}
              </p>
              <p className="text-[10px] text-slate-500">
                {data.settings.school.phone} · {data.settings.school.email}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Dokumen</p>
              <p className="text-[10px] font-bold text-slate-700">LAP-ABS/{month.replace('-', '')}/{clazz?.name ?? '-'}</p>
              <p className="text-[8.5px] text-slate-400">Dicetak {formatDate(toISODate(new Date()), 'medium')}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-navy-950">Laporan Kehadiran Peserta Didik</h3>
            <p className="mt-1 text-[10.5px] text-slate-500">
              Tahun Ajaran {data.settings.academicYear} · Semester {data.settings.semester} · Periode {monthLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[10.5px] sm:grid-cols-3 sm:px-10">
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-400">Kelas</p>
            <p className="mt-0.5 font-bold text-slate-700">{clazz?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-400">Wali Kelas</p>
            <p className="mt-0.5 font-bold text-slate-700">{homeroom?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-400">Jumlah Peserta Didik</p>
            <p className="mt-0.5 font-bold text-slate-700">{students.length} orang</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-6 py-5 sm:grid-cols-4 sm:px-10">
          {[
            { label: 'Rata-rata Kehadiran', value: `${averageRate}%`, sub: `${totals.hadir + totals.terlambat} catatan hadir` },
            { label: 'Total Sesi', value: sessions.length, sub: `${totals.total} catatan kehadiran` },
            { label: 'Tanpa Keterangan', value: totals.alpa, sub: 'alpa pada periode ini' },
            { label: 'Perlu Perhatian', value: belowThreshold, sub: `di bawah ${data.settings.minimumAttendance}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="mt-0.5 text-lg font-extrabold leading-none text-navy-950">{item.value}</p>
              <p className="mt-1 text-[8.5px] text-slate-400">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto px-2 sm:px-6">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-navy-900 text-[8.5px] font-bold uppercase tracking-wider text-white">
                <th className="rounded-l-lg px-3 py-2.5">No</th>
                <th className="px-3 py-2.5">NISN</th>
                <th className="px-3 py-2.5">Nama Peserta Didik</th>
                {STATUS_ORDER.map((status) => (
                  <th key={status} className="px-2 py-2.5 text-center">{STATUS_META[status].label}</th>
                ))}
                <th className="px-2 py-2.5 text-center">Total</th>
                <th className="rounded-r-lg px-3 py-2.5">Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((row, index) => (
                <tr key={row.student.id} className="text-[10px]">
                  <td className="px-3 py-2.5 text-slate-400">{index + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-[9px] text-slate-500">{row.student.nisn}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{row.student.name}</td>
                  <td className="px-2 py-2.5 text-center text-emerald-600">{row.hadir}</td>
                  <td className="px-2 py-2.5 text-center text-violet-600">{row.terlambat}</td>
                  <td className="px-2 py-2.5 text-center text-sky-600">{row.izin}</td>
                  <td className="px-2 py-2.5 text-center text-amber-600">{row.sakit}</td>
                  <td className="px-2 py-2.5 text-center text-rose-600">{row.alpa}</td>
                  <td className="px-2 py-2.5 text-center text-slate-500">{row.total}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', row.rate >= 90 ? 'bg-emerald-500' : row.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500')}
                          style={{ width: `${row.rate}%` }}
                        />
                      </div>
                      <span className={cn('text-[9px] font-bold', row.rate >= 90 ? 'text-emerald-600' : row.rate >= 75 ? 'text-amber-600' : 'text-rose-600')}>
                        {row.rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900 bg-slate-50 text-[9.5px] font-bold text-slate-700">
                <td colSpan={3} className="px-3 py-2.5 uppercase tracking-wider">Jumlah</td>
                <td className="px-2 py-2.5 text-center">{totals.hadir}</td>
                <td className="px-2 py-2.5 text-center">{totals.terlambat}</td>
                <td className="px-2 py-2.5 text-center">{totals.izin}</td>
                <td className="px-2 py-2.5 text-center">{totals.sakit}</td>
                <td className="px-2 py-2.5 text-center">{totals.alpa}</td>
                <td className="px-2 py-2.5 text-center">{totals.total}</td>
                <td className="px-3 py-2.5">{averageRate}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {summaries.length === 0 && (
          <EmptyState
            icon={<School size={22} />}
            title="Belum ada peserta didik"
            description="Kelas ini belum memiliki peserta didik aktif atau data absensi pada periode tersebut."
          />
        )}

        <div className="flex flex-wrap items-start justify-between gap-6 px-6 py-7 sm:px-10">
          <div className="max-w-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Catatan</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
              Persentase kehadiran dihitung dari jumlah kehadiran (hadir dan terlambat) dibagi total catatan sesi.
              Peserta didik dengan kehadiran di bawah {data.settings.minimumAttendance}% memerlukan tindak lanjut wali kelas.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="flex items-center gap-1 text-[9px] text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[status].chart }} />
                  {STATUS_META[status].label}: {totals[status]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-[9px] text-slate-500">Cikatomas, {formatDate(toISODate(new Date()), 'long')}</p>
              <p className="mt-0.5 text-[9px] font-semibold text-slate-600">Wali Kelas</p>
              <div className="mx-auto mt-2 flex h-[70px] w-full max-w-[160px] items-end justify-center">
                {homeroom?.signature && (
                  <img
                    src={homeroom.signature}
                    alt={`Tanda tangan ${homeroom.name}`}
                    className="max-h-[66px] max-w-full object-contain"
                  />
                )}
              </div>
              <div className="mx-auto mb-1 w-fit max-w-full border-b border-dashed border-slate-300 px-2 pb-0.5">
                <p className="text-[10px] font-bold leading-snug text-slate-700">{homeroom?.name ?? '-'}</p>
              </div>
              <p className="text-[8.5px] text-slate-400">NIP. {homeroom?.nip || '-'}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Mengetahui,</p>
              <p className="mt-0.5 text-[9px] font-semibold text-slate-600">Kepala Sekolah</p>
              <div className="mx-auto mt-2 flex h-[70px] w-full max-w-[160px] items-end justify-center">
                {data.settings.school.headmasterSignature && (
                  <img
                    src={data.settings.school.headmasterSignature}
                    alt={`Tanda tangan ${data.settings.school.headmaster}`}
                    className="max-h-[66px] max-w-full object-contain"
                  />
                )}
              </div>
              <div className="mx-auto mb-1 w-fit max-w-full border-b border-dashed border-slate-300 px-2 pb-0.5">
                <p className="text-[10px] font-bold leading-snug text-slate-700">{data.settings.school.headmaster}</p>
              </div>
              <p className="text-[8.5px] text-slate-400">NIP. {data.settings.school.headmasterNip || '-'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-[8px] text-slate-400 sm:px-10">
          <span>Dokumen dihasilkan oleh SIAP SMP — Sistem Informasi Absensi</span>
          <span className="flex items-center gap-1"><FileBarChart2 size={10} /> Laporan resmi sekolah</span>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-[10px] text-slate-400 print:hidden">
        <ProgressRing value={averageRate} size={34} stroke={3} color="#257ee5" />
        <span>
          Laporan menggunakan data {sessions.length} sesi pada {monthLabel}. Gunakan tombol <span className="font-semibold text-slate-600">Cetak Laporan</span> untuk
          menghasilkan dokumen siap tanda tangan.
        </span>
      </div>
    </div>
  )
}
