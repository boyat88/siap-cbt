import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, PenTool, School, Signature, UserRound } from 'lucide-react'
import { Alert, Badge, Card, CardHeader, EmptyState, cn } from '../components/ui'
import { SignaturePicker } from '../components/SignaturePicker'
import { useApp } from '../store/AppContext'

export function TandaTangan() {
  const { data, updateSettings, updateTeacher } = useApp()

  const classes = useMemo(
    () => [...data.classes].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)),
    [data.classes],
  )

  const setHeadmasterSignature = (value: string | undefined) => {
    updateSettings({
      ...data.settings,
      school: { ...data.settings.school, headmasterSignature: value },
    })
  }

  const setHomeroomSignature = (teacherId: string, value: string | undefined) => {
    const teacher = data.teachers.find((item) => item.id === teacherId)
    if (!teacher) return
    updateTeacher({ ...teacher, signature: value })
  }

  const signedCount = classes.filter((clazz) => {
    const teacher = data.teachers.find((item) => item.id === clazz.homeroomId)
    return Boolean(teacher?.signature)
  }).length

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Sistem</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Tanda Tangan</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Unggah tanda tangan kepala sekolah dan wali kelas untuk ditampilkan pada bagian penandatanganan laporan.
          </p>
        </div>
        <Badge tone="emerald" className="gap-1.5">
          <BadgeCheck size={13} /> Tersimpan otomatis
        </Badge>
      </div>

      <Alert tone="info" title="Nama lengkap & gelar otomatis">
        Nama pada laporan diambil langsung dari data guru dan identitas sekolah, termasuk gelar. Gambar tanda tangan
        sebaiknya berformat PNG transparan atau foto dengan latar putih — latar putih akan dibersihkan otomatis.
      </Alert>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <School size={16} className="text-brand-500" /> Kepala Sekolah
              </span>
            }
            description="Tanda tangan untuk kolom mengetahui pada laporan."
          />
          <div className="px-5 py-5">
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Nama & Gelar</p>
              <p className="mt-1 text-[13px] font-bold leading-snug text-navy-950">
                {data.settings.school.headmaster || 'Belum diisi'}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                NIP. {data.settings.school.headmasterNip || '-'}
              </p>
            </div>
            <SignaturePicker
              name={data.settings.school.headmaster}
              value={data.settings.school.headmasterSignature}
              onChange={setHeadmasterSignature}
              label="Gambar Tanda Tangan"
              description="Unggah tanda tangan kepala sekolah. Tampil di laporan semua kelas."
            />
            <Link
              to="/pengaturan"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <UserRound size={13} /> Ubah Nama &amp; NIP Kepala Sekolah <ArrowRight size={13} />
            </Link>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Signature size={16} className="text-brand-500" /> Wali Kelas
              </span>
            }
            description={`${signedCount} dari ${classes.length} wali kelas sudah memiliki tanda tangan.`}
          />

          {classes.length === 0 ? (
            <EmptyState
              icon={<School size={22} />}
              title="Belum ada kelas"
              description="Tambahkan kelas terlebih dahulu melalui menu Data Kelas."
            />
          ) : (
            <div className="space-y-3 px-5 py-5">
              {classes.map((clazz) => {
                const teacher = data.teachers.find((item) => item.id === clazz.homeroomId)
                return (
                  <div
                    key={clazz.id}
                    className={cn(
                      'rounded-xl border p-3.5 transition-colors',
                      teacher?.signature ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[12px] font-bold text-brand-600">
                          {clazz.name}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Wali Kelas {clazz.name}
                          </p>
                          <p className="mt-0.5 text-[12.5px] font-bold leading-snug text-navy-950">
                            {teacher?.name ?? 'Belum ditentukan'}
                          </p>
                          <p className="text-[10px] text-slate-500">NIP. {teacher?.nip || '-'}</p>
                        </div>
                      </div>
                      <Badge tone={teacher?.signature ? 'emerald' : teacher ? 'amber' : 'slate'}>
                        {teacher?.signature ? 'Sudah ditandatangani' : teacher ? 'Belum ada tanda tangan' : 'Wali kelas kosong'}
                      </Badge>
                    </div>

                    {teacher ? (
                      <SignaturePicker
                        name={teacher.name}
                        value={teacher.signature}
                        onChange={(value) => setHomeroomSignature(teacher.id, value)}
                        description="Tanda tangan akan dipakai pada laporan kelas ini."
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="text-[10.5px] text-slate-500">Tentukan wali kelas terlebih dahulu untuk mengunggah tanda tangan.</p>
                        <Link
                          to="/kelas"
                          className="flex items-center gap-1 text-[10.5px] font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Atur Wali Kelas <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
        <PenTool size={14} className="text-brand-400" />
        Setelah tanda tangan diunggah, buka menu <span className="font-semibold text-slate-600">Laporan</span> lalu pilih kelas
        dan periode untuk melihat hasilnya pada bagian penandatanganan. Gunakan tombol Cetak untuk mencetak laporan.
      </div>
    </div>
  )
}
