import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  GraduationCap,
  Pencil,
  Plus,
  RotateCcw,
  School,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ProgressRing,
  Select,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { percent } from '../lib/utils'
import type { ClassRoom } from '../types'

const gradeTone: Record<number, { bg: string; text: string; soft: string; ring: string }> = {
  7: { bg: 'from-brand-600 to-brand-500', text: 'text-brand-700', soft: 'bg-brand-50', ring: 'ring-brand-100' },
  8: { bg: 'from-emerald-600 to-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50', ring: 'ring-emerald-100' },
  9: { bg: 'from-violet-600 to-violet-500', text: 'text-violet-700', soft: 'bg-violet-50', ring: 'ring-violet-100' },
}

export function Kelas() {
  const { data, addClass, updateClass, deleteClass, deleteSession } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClassRoom | null>(null)
  const [form, setForm] = useState({ name: '', grade: '7', homeroomId: '', academicYear: data.settings.academicYear })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ClassRoom | null>(null)
  const [resetTarget, setResetTarget] = useState<ClassRoom | null>(null)

  const teacherMap = useMemo(() => new Map(data.teachers.map((t) => [t.id, t])), [data.teachers])

  const classStats = useMemo(
    () =>
      data.classes.map((clazz) => {
        const students = data.students.filter((s) => s.classId === clazz.id && s.status === 'aktif')
        const sessions = data.sessions.filter((s) => s.classId === clazz.id)
        const values = sessions.flatMap((s) => Object.values(s.records))
        const rate = percent(values.filter((v) => v === 'hadir' || v === 'terlambat').length, values.length)
        return {
          clazz,
          students,
          male: students.filter((s) => s.gender === 'L').length,
          female: students.filter((s) => s.gender === 'P').length,
          rate,
          sessions: sessions.length,
          homeroom: teacherMap.get(clazz.homeroomId),
        }
      }),
    [data.classes, data.students, data.sessions, teacherMap],
  )

  const overallRate = classStats.length
    ? Math.round(classStats.reduce((acc, c) => acc + c.rate, 0) / classStats.length)
    : 0

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', grade: '7', homeroomId: data.teachers[0]?.id ?? '', academicYear: data.settings.academicYear })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (clazz: ClassRoom) => {
    setEditing(clazz)
    setForm({ name: clazz.name, grade: String(clazz.grade), homeroomId: clazz.homeroomId, academicYear: clazz.academicYear })
    setErrors({})
    setModalOpen(true)
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Nama kelas wajib diisi'
    else if (!/^[789]$/.test(form.name.trim())) next.name = 'Gunakan satu angka: 7, 8, atau 9'
    else if (Number(form.name.trim()) !== Number(form.grade)) next.name = 'Tingkat harus sesuai dengan nama kelas'
    else if (
      data.classes.some(
        (c) => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== editing?.id,
      )
    )
      next.name = 'Nama kelas sudah digunakan'
    if (!form.homeroomId) next.homeroomId = 'Wali kelas wajib dipilih'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    if (editing) {
      updateClass({
        ...editing,
        name: form.name.trim(),
        grade: Number(form.grade) as 7 | 8 | 9,
        homeroomId: form.homeroomId,
        academicYear: form.academicYear,
      })
      toast('Data kelas berhasil diperbarui.', 'success')
    } else {
      addClass({
        id: `k_new_${Date.now()}`,
        name: form.name.trim(),
        grade: Number(form.grade) as 7 | 8 | 9,
        homeroomId: form.homeroomId,
        academicYear: form.academicYear,
      })
      toast('Kelas baru berhasil ditambahkan.', 'success')
    }
    setModalOpen(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const count = data.students.filter((s) => s.classId === deleteTarget.id).length
    if (count > 0) {
      toast('Kelas masih memiliki peserta didik. Pindahkan siswa terlebih dahulu.', 'error')
      setDeleteTarget(null)
      return
    }
    deleteClass(deleteTarget.id)
    toast('Kelas berhasil dihapus.', 'success')
    setDeleteTarget(null)
  }

  const confirmResetAttendance = () => {
    if (!resetTarget) return
    const sessions = data.sessions.filter((s) => s.classId === resetTarget.id)
    sessions.forEach((s) => deleteSession(s.id))
    toast(`Absensi kelas ${resetTarget.name} telah dikosongkan (${sessions.length} sesi).`, 'success')
    setResetTarget(null)
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Data Master</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Data Kelas</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola rombongan belajar, wali kelas, dan ringkasan kehadiran per kelas.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={15} /> Tambah Kelas
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <School size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.classes.length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Rombongan belajar</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.students.filter((s) => s.status === 'aktif').length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Peserta didik aktif</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.teachers.filter((t) => t.status === 'aktif').length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Guru aktif</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <UserRound size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{overallRate}%</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Rata-rata kehadiran</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classStats.map(({ clazz, students, male, female, rate, sessions, homeroom }) => {
          const tone = gradeTone[clazz.grade]
          return (
            <Card key={clazz.id} className="group overflow-hidden transition-shadow hover:shadow-lift">
              <div className={cn('relative bg-gradient-to-r px-5 py-4', tone.bg)}>
                <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-10 right-12 h-20 w-20 rounded-full bg-white/[0.07]" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[9.5px] font-medium uppercase tracking-[0.15em] text-white/70">Kelas</p>
                    <p className="text-2xl font-extrabold leading-tight text-white">{clazz.name}</p>
                    <p className="text-[10px] text-white/70">Tingkat {clazz.grade} · TA {clazz.academicYear}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(clazz)}
                      className="rounded-lg bg-white/15 p-1.5 text-white/90 backdrop-blur transition-colors hover:bg-white/25"
                      aria-label="Ubah kelas"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(clazz)}
                      className="rounded-lg bg-white/15 p-1.5 text-white/90 backdrop-blur transition-colors hover:bg-white/25"
                      aria-label="Hapus kelas"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => setResetTarget(clazz)}
                      className="rounded-lg bg-white/15 p-1.5 text-white/90 backdrop-blur transition-colors hover:bg-white/25"
                      aria-label="Reset absensi kelas"
                      title="Kosongkan absensi kelas ini"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={homeroom?.name ?? 'Wali Kelas'} src={homeroom?.photo} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Wali Kelas</p>
                    <p className="truncate text-[11px] font-semibold text-slate-700">{homeroom?.name ?? 'Belum ditentukan'}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-lg font-bold leading-none text-navy-950">{students.length}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">Peserta didik</p>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">{male} <span className="text-[8.5px] font-medium text-slate-400">L</span></p>
                    <p className="text-[11px] font-bold text-slate-700">{female} <span className="text-[8.5px] font-medium text-slate-400">P</span></p>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <ProgressRing value={rate} size={40} stroke={3.5} color={rate >= 92 ? '#10b981' : rate >= 85 ? '#3b9df8' : '#f59e0b'} />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-400">{sessions} sesi tercatat</span>
                  <button
                    onClick={() => navigate(`/siswa?class=${clazz.id}`)}
                    className={cn('flex items-center gap-1 text-[10.5px] font-semibold', tone.text)}
                  >
                    Lihat siswa <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed bg-slate-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
            <School size={17} />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-slate-700">Butuh menambah rombongan belajar baru?</p>
            <p className="text-[10px] text-slate-500">Pastikan wali kelas dan data peserta didik telah disiapkan.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={13} /> Tambah Kelas
        </Button>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit}>{editing ? 'Simpan Perubahan' : 'Tambah Kelas'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nama Kelas"
              placeholder="Contoh: 7"
              value={form.name}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 1)
                setForm((f) => ({ ...f, name: value, grade: value || f.grade }))
              }}
              error={errors.name}
              maxLength={1}
              hint="Gunakan satu angka: 7, 8, atau 9."
              required
            />
            <Select
              label="Tingkat"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value, name: e.target.value }))}
              options={[
                { value: '7', label: 'Kelas 7' },
                { value: '8', label: 'Kelas 8' },
                { value: '9', label: 'Kelas 9' },
              ]}
              required
            />
          </div>
          <Select
            label="Wali Kelas"
            value={form.homeroomId}
            onChange={(e) => setForm((f) => ({ ...f, homeroomId: e.target.value }))}
            options={data.teachers.map((t) => ({ value: t.id, label: t.name }))}
            error={errors.homeroomId}
            required
          />
          <Input
            label="Tahun Ajaran"
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
            placeholder="2026/2027"
            hint="Gunakan format tahun ajaran aktif, contoh 2026/2027."
          />
          {!editing && (
            <Alert tone="info" title="Kelas baru akan dibuat kosong">
              Tambahkan peserta didik melalui menu Data Siswa setelah kelas berhasil dibuat.
            </Alert>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus kelas?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 size={14} /> Hapus Kelas
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <Alert
            tone={data.students.some((s) => s.classId === deleteTarget.id) ? 'danger' : 'warning'}
            title={data.students.some((s) => s.classId === deleteTarget.id) ? 'Kelas masih memiliki siswa' : 'Kelas akan dihapus'}
          >
            Kelas {deleteTarget.name} memiliki{' '}
            <span className="font-bold">{data.students.filter((s) => s.classId === deleteTarget.id).length} peserta didik</span>.
            {data.students.some((s) => s.classId === deleteTarget.id)
              ? ' Pindahkan peserta didik ke kelas lain terlebih dahulu sebelum menghapus kelas ini.'
              : ' Tindakan ini tidak dapat dibatalkan.'}
          </Alert>
        )}
      </Modal>
      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Reset absensi kelas?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmResetAttendance}>
              <RotateCcw size={14} /> Reset Absensi
            </Button>
          </>
        }
      >
        {resetTarget && (
          <Alert tone="warning" title="Absensi akan dikosongkan">
            Semua sesi absensi kelas {resetTarget.name} akan dihapus dan dimulai dari awal. Data siswa tidak terpengaruh.
          </Alert>
        )}
      </Modal>
    </div>
  )
}
