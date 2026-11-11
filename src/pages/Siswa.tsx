import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownUp,
  Download,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
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
  Textarea,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { ImportModal, type ImportValidation } from '../components/ImportModal'
import { PhotoPicker } from '../components/PhotoPicker'
import { cellDate, cellNumber, cellText, exportExcel, normalizeActiveStatus, normalizeGender, pick } from '../lib/excel'
import { formatDate } from '../lib/utils'
import type { Gender, Student } from '../types'

const emptyForm: Omit<Student, 'id'> = {
  nisn: '',
  name: '',
  gender: 'L',
  classId: '',
  birthDate: '',
  guardian: '',
  phone: '',
  address: '',
  status: 'aktif',
}

type SortKey = 'name' | 'nisn' | 'class'

export function Siswa() {
  const { data, user, addStudent, updateStudent, deleteStudent } = useApp()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState(searchParams.get('class') || 'all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<Omit<Student, 'id'>>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const classMap = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes])

  const filtered = useMemo(() => {
    const rows = data.students.filter((student) => {
      if (classFilter !== 'all' && student.classId !== classFilter) return false
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false
      if (query) {
        const q = query.toLowerCase()
        const className = classMap.get(student.classId)?.name.toLowerCase() ?? ''
        if (
          !student.name.toLowerCase().includes(q) &&
          !student.nisn.includes(q) &&
          !className.includes(q) &&
          !student.guardian.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
    return rows.sort((a, b) => {
      let result = 0
      if (sortKey === 'name') result = a.name.localeCompare(b.name)
      else if (sortKey === 'nisn') result = a.nisn.localeCompare(b.nisn)
      else result = (classMap.get(a.classId)?.name ?? '').localeCompare(classMap.get(b.classId)?.name ?? '')
      return sortDir === 'asc' ? result : -result
    })
  }, [data.students, classFilter, genderFilter, query, sortKey, sortDir, classMap])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const male = data.students.filter((s) => s.gender === 'L').length
  const female = data.students.filter((s) => s.gender === 'P').length

  const resetFilters = () => {
    setQuery('')
    setClassFilter('all')
    setGenderFilter('all')
    setPage(1)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, classId: data.classes[0]?.id ?? '' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditing(student)
    const { id: _id, ...rest } = student
    setForm(rest)
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Nama lengkap wajib diisi'
    else if (form.name.trim().length < 3) next.name = 'Nama terlalu pendek'
    if (!form.nisn.trim()) next.nisn = 'NISN wajib diisi'
    else if (!/^\d{10}$/.test(form.nisn.trim())) next.nisn = 'NISN harus 10 digit angka'
    else if (data.students.some((s) => s.nisn === form.nisn.trim() && s.id !== editing?.id))
      next.nisn = 'NISN sudah digunakan siswa lain'
    if (!form.classId) next.classId = 'Kelas wajib dipilih'
    if (!form.birthDate) next.birthDate = 'Tanggal lahir wajib diisi'
    if (!form.guardian.trim()) next.guardian = 'Nama wali wajib diisi'
    if (form.phone && !/^[0-9+\-\s]{8,16}$/.test(form.phone)) next.phone = 'Nomor telepon tidak valid'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (editing) {
      updateStudent({ ...editing, ...form, name: form.name.trim(), nisn: form.nisn.trim() })
      toast('Data peserta didik berhasil diperbarui.', 'success')
    } else {
      addStudent({ id: `s_new_${Date.now()}`, ...form, name: form.name.trim(), nisn: form.nisn.trim() })
      toast('Peserta didik baru berhasil ditambahkan.', 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteStudent(deleteTarget.id)
    toast(`Data ${deleteTarget.name} berhasil dihapus.`, 'success')
    setDeleteTarget(null)
  }

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ['NISN', 'NAMA', 'JENIS_KELAMIN', 'KELAS', 'TANGGAL_LAHIR', 'NAMA_WALI', 'TELEPON', 'ALAMAT', 'STATUS'],
      ...filtered.map((s) => [
        s.nisn,
        s.name,
        s.gender,
        classMap.get(s.classId)?.name ?? '',
        s.birthDate,
        s.guardian,
        s.phone,
        s.address,
        s.status,
      ]),
    ]
    exportExcel(`data-siswa-smpn1cikatomas-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: 'Data Siswa', rows, widths: [14, 28, 14, 10, 15, 24, 16, 34, 12] },
    ])
    toast('Data siswa berhasil diekspor ke Excel.', 'success')
  }

  const validateImport = (rows: Record<string, unknown>[]): ImportValidation<Omit<Student, 'id'>>[] => {
    const seenNisn = new Set(data.students.map((s) => s.nisn))
    return rows.map((row, index) => {
      const rowNumber = index + 2
      const nisn = cellNumber(pick(row, ['nisn', 'nomor induk', 'nis']))
      const name = cellText(pick(row, ['nama', 'nama siswa', 'nama peserta didik', 'nama lengkap']))
      const gender = normalizeGender(pick(row, ['jenis kelamin', 'gender', 'jk']))
      const classRaw = cellText(pick(row, ['kelas', 'tingkat', 'rombel']))
      const gradeDigit = classRaw.match(/[789]/)?.[0] ?? ''
      const clazz = data.classes.find(
        (c) => c.name === classRaw || c.id === classRaw || c.name === gradeDigit || String(c.grade) === gradeDigit,
      )
      const birthDate = cellDate(pick(row, ['tanggal lahir', 'tgl lahir', 'tanggal_lahir', 'birthdate']))
      const guardian = cellText(pick(row, ['nama wali', 'wali', 'orang tua', 'nama orang tua', 'nama_wali']))
      const phone = cellText(pick(row, ['telepon', 'no telepon', 'no hp', 'whatsapp', 'wa', 'telepon']))
      const address = cellText(pick(row, ['alamat', 'alamat lengkap']))
      const status = normalizeActiveStatus(pick(row, ['status', 'status aktif']))

      if (!name) return { row: rowNumber, error: 'Nama peserta didik wajib diisi.' }
      if (!/^\d{10}$/.test(nisn)) return { row: rowNumber, error: 'NISN harus 10 digit angka.' }
      if (seenNisn.has(nisn)) return { row: rowNumber, error: `NISN ${nisn} sudah terdaftar atau duplikat dalam file.` }
      if (!gender) return { row: rowNumber, error: 'Jenis kelamin harus L/P atau Laki-laki/Perempuan.' }
      if (!clazz) return { row: rowNumber, error: `Kelas "${classRaw || '-'}" tidak ditemukan. Gunakan 7, 8, atau 9.` }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { row: rowNumber, error: 'Tanggal lahir tidak valid. Gunakan format YYYY-MM-DD.' }
      if (!guardian) return { row: rowNumber, error: 'Nama wali wajib diisi.' }
      if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) return { row: rowNumber, error: 'Nomor telepon tidak valid.' }

      seenNisn.add(nisn)
      return {
        row: rowNumber,
        item: {
          nisn,
          name,
          gender,
          classId: clazz.id,
          birthDate,
          guardian,
          phone,
          address,
          status,
        },
      }
    })
  }

  const handleImport = (items: Omit<Student, 'id'>[]) => {
    items.forEach((item, index) => addStudent({ id: `s_imp_${Date.now()}_${index}`, ...item }))
    setImportOpen(false)
    setPage(1)
    toast(`${items.length} data siswa berhasil diimpor dari Excel.`, 'success')
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortIcon = (key: SortKey) => (
    <ArrowDownUp size={11} className={cn('ml-1 inline transition-colors', sortKey === key ? 'text-brand-500' : 'text-slate-300')} />
  )

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Data Master</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Data Peserta Didik</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola identitas dan penempatan kelas seluruh peserta didik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'admin' && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp size={15} /> Impor Excel
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download size={15} /> Ekspor Excel
              </Button>
            </>
          )}
          <Button onClick={openAdd}>
            <Plus size={15} /> Tambah Siswa
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{data.students.length}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Total peserta didik</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{male}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Laki-laki · {Math.round((male / Math.max(1, data.students.length)) * 100)}%</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-navy-950">{female}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">Perempuan · {Math.round((female / Math.max(1, data.students.length)) * 100)}%</p>
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
            placeholder="Cari nama, NISN, wali..."
            className="w-full sm:w-64"
          />
          <Select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value)
              setPage(1)
            }}
            className="w-[calc(50%-4px)] sm:w-36"
            options={[{ value: 'all', label: 'Semua Kelas' }, ...data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))]}
          />
          <Select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value)
              setPage(1)
            }}
            className="w-[calc(50%-4px)] sm:w-32"
            options={[
              { value: 'all', label: 'Semua Gender' },
              { value: 'L', label: 'Laki-laki' },
              { value: 'P', label: 'Perempuan' },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="slate">{filtered.length} data</Badge>
            {(query || classFilter !== 'all' || genderFilter !== 'all') && (
              <button onClick={resetFilters} className="text-[10.5px] font-semibold text-brand-600 hover:text-brand-700">
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                <th className="w-12 px-5 py-2.5">No</th>
                <th className="cursor-pointer px-4 py-2.5 select-none" onClick={() => toggleSort('name')}>
                  Nama Peserta Didik {sortIcon('name')}
                </th>
                <th className="cursor-pointer px-4 py-2.5 select-none" onClick={() => toggleSort('nisn')}>
                  NISN {sortIcon('nisn')}
                </th>
                <th className="cursor-pointer px-4 py-2.5 select-none" onClick={() => toggleSort('class')}>
                  Kelas {sortIcon('class')}
                </th>
                <th className="px-4 py-2.5">Gender</th>
                <th className="px-4 py-2.5">Wali / Kontak</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((student, index) => (
                <tr key={student.id} className="group transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3 text-[10.5px] text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={student.name} src={student.photo} size="sm" />
                      <div>
                        <p className="text-[12px] font-semibold text-navy-950">{student.name}</p>
                        <p className="text-[9.5px] text-slate-400">Lahir {formatDate(student.birthDate, 'medium')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10.5px] text-slate-500">{student.nisn}</td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{classMap.get(student.classId)?.name ?? '-'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[10.5px] text-slate-600">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td className="px-4 py-3">
                    <p className="text-[10.5px] font-medium text-slate-600">{student.guardian}</p>
                    <p className="text-[9.5px] text-slate-400">{student.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={student.status === 'aktif' ? 'emerald' : 'slate'}>
                      {student.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(student)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        aria-label={`Ubah data ${student.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setDeleteTarget(student)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Hapus data ${student.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {pageRows.map((student) => (
            <div key={student.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={student.name} src={student.photo} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-navy-950">{student.name}</p>
                <p className="font-mono text-[9.5px] text-slate-400">{student.nisn}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone="brand">{classMap.get(student.classId)?.name}</Badge>
                  <span className="text-[9.5px] text-slate-400">{student.gender === 'L' ? 'L' : 'P'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(student)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label="Ubah">
                  <Pencil size={15} />
                </button>
                {user?.role === 'admin' && (
                  <button onClick={() => setDeleteTarget(student)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={<Search size={22} />}
            title="Data tidak ditemukan"
            description="Coba ubah kata kunci atau filter kelas dan gender."
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filter
              </Button>
            }
          />
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
        description={editing ? 'Perbarui identitas peserta didik.' : 'Lengkapi identitas peserta didik baru.'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editing ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50/60 p-3 ring-1 ring-inset ring-brand-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
              <UserPlus size={18} />
            </div>
            <p className="text-[11px] leading-relaxed text-brand-800">
              Data akan tersedia pada formulir absensi dan rekap kelas terkait secara otomatis.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PhotoPicker
                name={form.name || 'Siswa'}
                value={form.photo}
                onChange={(photo) => setForm((f) => ({ ...f, photo }))}
                label="Foto Peserta Didik"
                description="Foto akan tampil pada daftar siswa, absensi, dan rekap."
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Nama Lengkap"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Ahmad Fauzi"
                error={errors.name}
                required
              />
            </div>
            <Input
              label="NISN"
              value={form.nisn}
              onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="10 digit angka"
              error={errors.nisn}
              inputMode="numeric"
              required
            />
            <Select
              label="Jenis Kelamin"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' },
              ]}
              required
            />
            <Select
              label="Kelas"
              value={form.classId}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
              options={data.classes.map((c) => ({ value: c.id, label: `Kelas ${c.name}` }))}
              error={errors.classId}
              required
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              error={errors.birthDate}
              required
            />
            <Input
              label="Nama Wali"
              value={form.guardian}
              onChange={(e) => setForm((f) => ({ ...f, guardian: e.target.value }))}
              placeholder="Nama orang tua / wali"
              error={errors.guardian}
              required
            />
            <Input
              label="Nomor Telepon"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              error={errors.phone}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Alamat"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Alamat lengkap peserta didik"
                rows={2}
              />
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'aktif' | 'nonaktif' }))}
              options={[
                { value: 'aktif', label: 'Aktif' },
                { value: 'nonaktif', label: 'Nonaktif' },
              ]}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus data siswa?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={14} /> Hapus
            </Button>
          </>
        }
      >
        <Alert tone="danger" title="Data akan dihapus permanen">
          Data <span className="font-bold">{deleteTarget?.name}</span> akan dihapus dari daftar peserta didik. Riwayat
          absensi yang sudah tercatat tetap tersimpan pada sesi kelas.
        </Alert>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Impor Data Siswa"
        description="Unggah file Excel berisi data peserta didik."
        templateName="template-impor-siswa.xlsx"
        templateHeaders={['NISN', 'NAMA', 'JENIS_KELAMIN', 'KELAS', 'TANGGAL_LAHIR', 'NAMA_WALI', 'TELEPON', 'ALAMAT', 'STATUS']}
        templateSamples={[
          ['1100120001', 'Ahmad Fauzi', 'L', '7', '2012-05-12', 'Bapak Hidayat', '081234567890', 'Kp. Cikatomas', 'aktif'],
          ['1100120002', 'Siti Aisyah', 'P', '8', '2011-08-20', 'Ibu Komariah', '081234567891', 'Desa Cimanuk', 'aktif'],
          ['1100120003', 'Rizki Pratama', 'L', '9', '2010-03-05', 'Bapak Suryana', '081234567892', 'Desa Pakemitan', 'aktif'],
        ]}
        note="Gunakan kelas 7, 8, atau 9. NISN harus unik 10 digit dan tanggal lahir berformat YYYY-MM-DD."
        previewColumns={[{ label: 'Nama' }, { label: 'NISN' }, { label: 'Kelas' }, { label: 'L/P' }, { label: 'Tgl Lahir' }, { label: 'Status' }]}
        previewRow={(item) => [
          item.name,
          item.nisn,
          classMap.get(item.classId)?.name ?? '-',
          item.gender,
          item.birthDate,
          item.status,
        ]}
        validate={validateImport}
        onImport={handleImport}
        importLabel="Impor Siswa"
      />
    </div>
  )
}
