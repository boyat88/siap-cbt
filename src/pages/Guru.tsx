import { useMemo, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  EyeOff,
  FileUp,
  GraduationCap,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
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
  EmptyState,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Toggle,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { ImportModal, type ImportValidation } from '../components/ImportModal'
import { PhotoPicker } from '../components/PhotoPicker'
import { cellNumber, cellText, exportExcel, normalizeActiveStatus, normalizeGender, normalizeKey, pick } from '../lib/excel'
import { SUBJECTS } from '../lib/constants'
import type { Gender, Teacher } from '../types'

const emptyTeacher: Omit<Teacher, 'id'> = {
  name: '',
  nip: '',
  gender: 'L',
  subjects: [],
  phone: '',
  email: '',
  status: 'aktif',
  accountActive: false,
  loginPassword: '',
}

export function Guru() {
  const { data, addTeacher, updateTeacher, deleteTeacher } = useApp()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [form, setForm] = useState<Omit<Teacher, 'id'>>(emptyTeacher)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    return data.teachers.filter((teacher) => {
      if (subjectFilter !== 'all' && !teacher.subjects.includes(subjectFilter)) return false
      if (statusFilter !== 'all' && teacher.status !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (
          !teacher.name.toLowerCase().includes(q) &&
          !teacher.nip.includes(q) &&
          !teacher.subjects.some((subject) => subject.toLowerCase().includes(q)) &&
          !teacher.email.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [data.teachers, subjectFilter, statusFilter, query])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const homeroomMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const clazz of data.classes) {
      map.set(clazz.homeroomId, [...(map.get(clazz.homeroomId) ?? []), clazz.name])
    }
    return map
  }, [data.classes])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyTeacher })
    setErrors({})
    setShowPassword(false)
    setModalOpen(true)
  }

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher)
    const { id: _id, ...rest } = teacher
    setForm(rest)
    setErrors({})
    setShowPassword(false)
    setModalOpen(true)
  }

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((item) => item !== subject)
        : [...prev.subjects, subject],
    }))
    setErrors((prev) => ({ ...prev, subjects: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    const email = form.email.trim().toLowerCase()
    const subjects = Array.from(new Set(form.subjects.filter((subject) => SUBJECTS.includes(subject))))
    if (!form.name.trim()) next.name = 'Nama guru wajib diisi'
    if (form.nip.trim()) {
      if (!/^\d{18}$/.test(form.nip)) next.nip = 'NIP harus 18 digit angka'
      else if (data.teachers.some((t) => t.nip === form.nip && t.id !== editing?.id)) next.nip = 'NIP sudah terdaftar'
    }
    if (subjects.length === 0) next.subjects = 'Pilih minimal satu mata pelajaran'
    if (!form.email.trim()) next.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Format email tidak valid'
    else if (
      form.accountActive &&
      data.teachers.some((t) => t.id !== editing?.id && t.accountActive && t.email.toLowerCase() === email)
    )
      next.email = 'Email sudah dipakai akun guru lain'
    if (form.phone && !/^[0-9+\-\s]{8,16}$/.test(form.phone)) next.phone = 'Nomor telepon tidak valid'
    if (form.accountActive && (form.loginPassword ?? '').length < 6)
      next.loginPassword = 'Kata sandi minimal 6 karakter agar akun guru bisa digunakan'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    if (editing) {
      updateTeacher({ ...editing, ...form, subjects, name: form.name.trim(), email: form.email.trim() })
      toast('Data guru berhasil diperbarui.', 'success')
    } else {
      addTeacher({ id: `t_new_${Date.now()}`, ...form, subjects, name: form.name.trim(), email: form.email.trim() })
      toast(
        form.accountActive
          ? 'Guru baru dan akun login berhasil dibuat.'
          : 'Guru baru berhasil ditambahkan. Akun login belum diaktifkan.',
        'success',
      )
    }
    setModalOpen(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const classes = homeroomMap.get(deleteTarget.id) ?? []
    if (classes.length > 0) {
      toast(`Guru masih menjadi wali kelas ${classes.join(', ')}. Ganti wali kelas terlebih dahulu.`, 'error')
      setDeleteTarget(null)
      return
    }
    deleteTeacher(deleteTarget.id)
    toast('Data guru berhasil dihapus.', 'success')
    setDeleteTarget(null)
  }

  const exportData = () => {
    exportExcel(`data-guru-smpn1cikatomas-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Data Guru',
        rows: [
          ['NAMA', 'NIP', 'JENIS_KELAMIN', 'MATA_PELAJARAN', 'EMAIL', 'TELEPON', 'STATUS'],
          ...filtered.map((t) => [t.name, t.nip, t.gender, t.subjects.join('; '), t.email, t.phone, t.status]),
        ],
        widths: [30, 22, 14, 26, 36, 18, 12],
      },
    ])
    toast('Data guru berhasil diekspor ke Excel.', 'success')
  }

  const validateImport = (rows: Record<string, unknown>[]): ImportValidation<Omit<Teacher, 'id'>>[] => {
    const seenNip = new Set(data.teachers.map((t) => t.nip).filter(Boolean))
    return rows.map((row, index) => {
      const rowNumber = index + 2
      const name = cellText(pick(row, ['nama', 'nama guru', 'nama lengkap']))
      const nip = cellNumber(pick(row, ['nip', 'nomor induk pegawai']))
      const gender = normalizeGender(pick(row, ['jenis kelamin', 'gender', 'jk']))
      const subjectRaw = cellText(pick(row, ['mata pelajaran', 'mapel', 'bidang studi']))
      const subjectNames = subjectRaw
        .split(/[;|,/\n]+/)
        .map((name) => name.trim())
        .filter(Boolean)
      const unknownSubjects = subjectNames.filter(
        (name) => !SUBJECTS.some((subject) => normalizeKey(subject) === normalizeKey(name)),
      )
      const subjects = Array.from(
        new Set(
          subjectNames
            .map((name) => SUBJECTS.find((subject) => normalizeKey(subject) === normalizeKey(name)))
            .filter((subject): subject is string => Boolean(subject)),
        ),
      )
      const email = cellText(pick(row, ['email', 'surel', 'alamat email']))
      const phone = cellText(pick(row, ['telepon', 'no telepon', 'no hp', 'whatsapp']))
      const status = normalizeActiveStatus(pick(row, ['status', 'status aktif']))

      if (!name) return { row: rowNumber, error: 'Nama guru wajib diisi.' }
      if (nip && !/^\d{18}$/.test(nip)) return { row: rowNumber, error: 'NIP harus 18 digit angka atau boleh dikosongkan.' }
      if (nip && seenNip.has(nip)) return { row: rowNumber, error: `NIP ${nip} sudah terdaftar atau duplikat dalam file.` }
      if (!gender) return { row: rowNumber, error: 'Jenis kelamin harus L/P atau Laki-laki/Perempuan.' }
      if (subjectNames.length === 0) return { row: rowNumber, error: 'Mata pelajaran wajib diisi.' }
      if (unknownSubjects.length > 0)
        return {
          row: rowNumber,
          error: `Mata pelajaran tidak dikenal: ${unknownSubjects.join(', ')}. Pisahkan beberapa mapel dengan tanda ; atau ,`,
        }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { row: rowNumber, error: 'Format email tidak valid.' }
      if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) return { row: rowNumber, error: 'Nomor telepon tidak valid.' }

      if (nip) seenNip.add(nip)
      return {
        row: rowNumber,
        item: { name, nip, gender, subjects, email, phone, status },
      }
    })
  }

  const handleImport = (items: Omit<Teacher, 'id'>[]) => {
    items.forEach((item, index) => addTeacher({ id: `t_imp_${Date.now()}_${index}`, ...item }))
    setImportOpen(false)
    setPage(1)
    toast(`${items.length} data guru berhasil diimpor dari Excel.`, 'success')
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Data Master</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Data Guru</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data pendidik dan penugasan wali kelas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp size={15} /> Impor Excel
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download size={15} /> Ekspor Excel
          </Button>
          <Button onClick={openAdd}>
            <Plus size={15} /> Tambah Guru
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.teachers.length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Total guru terdaftar</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.teachers.filter((t) => t.status === 'aktif').length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Guru aktif mengajar</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.classes.length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Wali kelas terpenuhi</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v)
              setPage(1)
            }}
            placeholder="Cari nama, NIP, mata pelajaran..."
            className="w-full sm:w-72"
          />
          <Select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value)
              setPage(1)
            }}
            className="w-[calc(50%-4px)] sm:w-48"
            options={[{ value: 'all', label: 'Semua Mapel' }, ...SUBJECTS.map((s) => ({ value: s, label: s }))]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="w-[calc(50%-4px)] sm:w-32"
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'nonaktif', label: 'Nonaktif' },
            ]}
          />
          <Badge tone="slate" className="ml-auto">{filtered.length} guru</Badge>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5">Nama Guru</th>
                <th className="px-4 py-2.5">NIP</th>
                <th className="px-4 py-2.5">Mata Pelajaran</th>
                <th className="px-4 py-2.5">Wali Kelas</th>
                <th className="px-4 py-2.5">Kontak</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((teacher) => (
                <tr key={teacher.id} className="group transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={teacher.name} src={teacher.photo} size="sm" />
                      <div>
                        <p className="text-[12px] font-semibold text-navy-950">{teacher.name}</p>
                        <p className="text-[9.5px] text-slate-400">{teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[9.5px] text-slate-500">{teacher.nip || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[230px] flex-wrap gap-1">
                      {teacher.subjects.length > 0 ? (
                        teacher.subjects.map((subject) => (
                          <Badge key={subject} tone="brand">{subject}</Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(homeroomMap.get(teacher.id) ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {homeroomMap.get(teacher.id)?.map((name) => (
                          <span key={name} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-600">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1 text-[10px] text-slate-600"><Mail size={10} /> {teacher.email}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-slate-400"><Phone size={9} /> {teacher.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={teacher.status === 'aktif' ? 'emerald' : 'slate'}>
                      {teacher.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold">
                      {teacher.accountActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck size={10} /> Akun aktif</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400"><KeyRound size={10} /> Akun belum dibuat</span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(teacher)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label="Ubah guru">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(teacher)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus guru">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {pageRows.map((teacher) => (
            <div key={teacher.id} className="flex items-start gap-3 px-4 py-3.5">
              <Avatar name={teacher.name} src={teacher.photo} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-navy-950">{teacher.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {teacher.subjects.length > 0 ? teacher.subjects.join(' • ') : 'Belum ada mata pelajaran'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={teacher.status === 'aktif' ? 'emerald' : 'slate'}>{teacher.status}</Badge>
                  {(homeroomMap.get(teacher.id) ?? []).map((name) => (
                    <Badge key={name} tone="slate">Wali {name}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(teacher)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label="Ubah">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDeleteTarget(teacher)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={<Search size={22} />}
            title="Guru tidak ditemukan"
            description="Coba ubah kata kunci atau filter yang digunakan."
            action={<Button variant="outline" size="sm" onClick={() => { setQuery(''); setSubjectFilter('all'); setStatusFilter('all') }}>Reset Filter</Button>}
          />
        )}

        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ubah Data Guru' : 'Tambah Guru Baru'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={submit}>{editing ? 'Simpan Perubahan' : 'Tambah Guru'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PhotoPicker
              name={form.name || 'Guru'}
              value={form.photo}
              onChange={(photo) => setForm((f) => ({ ...f, photo }))}
              label="Foto Guru"
              description="Foto akan tampil pada daftar guru, wali kelas, dan absensi."
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Nama Lengkap & Gelar"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: Siti Aminah, S.Pd."
              error={errors.name}
              required
            />
          </div>
          <Input
            label="NIP"
            value={form.nip}
            onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value.replace(/\D/g, '').slice(0, 18) }))}
            placeholder="18 digit angka (opsional)"
            error={errors.nip}
            hint="Opsional. Kosongkan jika guru belum memiliki NIP."
            inputMode="numeric"
          />
          <Select
            label="Jenis Kelamin"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
            options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]}
          />
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                {form.subjects.length} dipilih
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((subject) => {
                const active = form.subjects.includes(subject)
                return (
                  <button
                    type="button"
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white',
                      )}
                    >
                      {active && <Check size={10} strokeWidth={3} />}
                    </span>
                    {subject}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              Pilih semua mata pelajaran yang diampu. Satu guru dapat mengampu beberapa mapel tanpa batas jumlah.
            </p>
            {errors.subjects && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">{errors.subjects}</p>
            )}
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'aktif' | 'nonaktif' }))}
            options={[{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }]}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="nama@smpn1cikatomas.sch.id"
            error={errors.email}
            required
          />
          <Input
            label="Nomor Telepon"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="08xxxxxxxxxx"
            error={errors.phone}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-600" />
              <p className="text-sm font-bold text-navy-950">Akun Login Guru (e-Rapor)</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Guru hanya dapat masuk setelah akunnya didaftarkan dan diaktifkan administrator. Hak akses guru
              terbatas pada pengisian absensi, cetak laporan &amp; rekap, serta edit data siswa.
            </p>
            <Toggle
              checked={form.accountActive === true}
              onChange={(checked) => setForm((f) => ({ ...f, accountActive: checked }))}
              label="Aktifkan akun login"
              description={
                form.accountActive
                  ? 'Guru dapat masuk memakai email dan kata sandi di bawah ini.'
                  : 'Guru belum dapat masuk ke aplikasi.'
              }
            />
            <div className="relative">
              <Input
                label="Kata Sandi Akun"
                type={showPassword ? 'text' : 'password'}
                name="loginPassword"
                value={form.loginPassword ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, loginPassword: e.target.value }))}
                placeholder="Minimal 6 karakter"
                error={errors.loginPassword}
                hint="Berikan kata sandi ini kepada guru. Administrator dapat mengubahnya kapan saja."
                autoComplete="new-password"
                disabled={!form.accountActive}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-[36px] rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-slate-500">
              <Mail size={11} /> Email login: {form.email || 'belum diisi'}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus data guru?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete}><Trash2 size={14} /> Hapus</Button>
          </>
        }
      >
        {deleteTarget && (
          <Alert
            tone={(homeroomMap.get(deleteTarget.id) ?? []).length ? 'danger' : 'warning'}
            title={(homeroomMap.get(deleteTarget.id) ?? []).length ? 'Guru masih menjadi wali kelas' : 'Data akan dihapus'}
          >
            {deleteTarget.name}
            {(homeroomMap.get(deleteTarget.id) ?? []).length
              ? ` masih bertugas sebagai wali kelas ${homeroomMap.get(deleteTarget.id)?.join(', ')}. Ganti wali kelas terlebih dahulu.`
              : ' akan dihapus dari daftar guru. Tindakan ini tidak dapat dibatalkan.'}
          </Alert>
        )}
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Impor Data Guru"
        description="Unggah file Excel berisi data pendidik."
        templateName="template-impor-guru.xlsx"
        templateHeaders={['NAMA', 'NIP', 'JENIS_KELAMIN', 'MATA_PELAJARAN', 'EMAIL', 'TELEPON', 'STATUS']}
        templateSamples={[
          ['Dewi Lestari, S.Pd.', '198805122014032001', 'P', 'Matematika; Ilmu Pengetahuan Alam', 'dewi.lestari@smpnsatap1ckm.sch.id', '081234567890', 'aktif'],
          ['Fajar Nugraha, S.Pd.', '199003172015011002', 'L', 'Bahasa Indonesia; Seni Budaya', 'fajar.nugraha@smpnsatap1ckm.sch.id', '081234567891', 'aktif'],
        ]}
        note="NIP bersifat opsional. Jika diisi, NIP harus unik 18 digit. Satu guru boleh memiliki beberapa mata pelajaran; pisahkan dengan tanda ; atau , pada kolom MATA_PELAJARAN."
        previewColumns={[{ label: 'Nama' }, { label: 'NIP' }, { label: 'L/P' }, { label: 'Mapel' }, { label: 'Email' }, { label: 'Status' }]}
        previewRow={(item) => [item.name, item.nip, item.gender, item.subjects.join('; '), item.email, item.status]}
        validate={validateImport}
        onImport={handleImport}
        importLabel="Impor Guru"
      />
    </div>
  )
}
