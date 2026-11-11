import { useMemo, useRef, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  HardDrive,
  Info,
  Laptop,
  Palette,
  PanelLeftClose,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
  Select,
  Toggle,
  cn,
  useToast,
} from '../components/ui'
import { readStoredProfiles, useApp } from '../store/AppContext'
import { useTheme } from '../store/ThemeContext'
import { PhotoPicker } from '../components/PhotoPicker'
import { LOCKED_MENUS, allMenuItems } from '../lib/navigation'
import { backupFileName, createBackup, downloadJson, parseBackup, type RestoredBackup } from '../lib/backup'
import {
  applyDeviceSettings,
  collectDeviceSettings,
  deviceSettingsFileName,
  parseDeviceSettings,
  type DeviceSettingsPayload,
} from '../lib/deviceSettings'
import { findBackground } from '../lib/theme'
import { defaultSettings, formatDate } from '../lib/utils'
import { getServerBaseUrl, setServerBaseUrl } from '../lib/serverUrl'
import type { Settings } from '../types'

type RestoreCandidate = RestoredBackup & { fileName: string }
type DeviceRestoreCandidate = DeviceSettingsPayload & { fileName: string }

const menuGroupLabels: Record<string, string> = {
  '/dashboard': 'Utama',
  '/absensi': 'Utama',
  '/siswa': 'Data Master',
  '/kelas': 'Data Master',
  '/guru': 'Data Master',
  '/rekap': 'Analitik & Laporan',
  '/laporan': 'Analitik & Laporan',
  '/tanda-tangan': 'Sistem',
  '/pengaturan': 'Sistem',
}

export function Pengaturan() {
  const {
    data,
    updateSettings,
    resetData,
    restoreData,
    clearPeopleData,
    hiddenMenus,
    toggleMenuVisibility,
    resetMenuVisibility,
  } = useApp()
  const { theme, setPanelOpen } = useTheme()
  const toast = useToast()
  const [draft, setDraft] = useState<Settings>(() => JSON.parse(JSON.stringify(data.settings)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resetOpen, setResetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restoreCandidate, setRestoreCandidate] = useState<RestoreCandidate | null>(null)
  const [deviceCandidate, setDeviceCandidate] = useState<DeviceRestoreCandidate | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [serverUrl, setServerUrl] = useState(getServerBaseUrl())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const deviceInputRef = useRef<HTMLInputElement>(null)

  const storageSize = useMemo(() => {
    try {
      const raw = localStorage.getItem('siap-absensi-v1') ?? ''
      return `${(new Blob([raw]).size / 1024).toFixed(0)} KB`
    } catch {
      return '-'
    }
  }, [data])

  const currentBackground = findBackground(theme.background)
  const backgroundName = theme.backgroundImage ? 'Foto sendiri' : currentBackground?.name ?? 'Aurora'
  const backgroundStyle = theme.backgroundImage
    ? {
        backgroundImage: `url("${theme.backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : currentBackground
      ? {
          backgroundImage: currentBackground.image,
          backgroundSize: currentBackground.size,
          backgroundPosition: currentBackground.position,
          backgroundRepeat: currentBackground.repeat,
        }
      : {}

  const setSchool = (key: keyof Settings['school'], value: string) => {
    setDraft((prev) => ({ ...prev, school: { ...prev.school, [key]: value } }))
  }

  const addHoliday = () => {
    if (!holidayDate) {
      toast('Pilih tanggal hari libur.', 'error')
      return
    }
    if (!holidayName.trim()) {
      toast('Nama hari libur wajib diisi.', 'error')
      return
    }
    if ((draft.holidays ?? []).some((holiday) => holiday.date === holidayDate)) {
      toast('Tanggal tersebut sudah terdaftar sebagai hari libur.', 'error')
      return
    }
    setDraft((prev) => ({
      ...prev,
      holidays: [...(prev.holidays ?? []), { date: holidayDate, name: holidayName.trim() }],
    }))
    setHolidayDate('')
    setHolidayName('')
  }

  const removeHoliday = (date: string) => {
    setDraft((prev) => ({
      ...prev,
      holidays: (prev.holidays ?? []).filter((holiday) => holiday.date !== date),
    }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!draft.school.name.trim()) next.schoolName = 'Nama sekolah wajib diisi'
    if (!/^\d{8}$/.test(draft.school.npsn)) next.npsn = 'NPSN harus 8 digit angka'
    if (!draft.school.headmaster.trim()) next.headmaster = 'Nama kepala sekolah wajib diisi'
    if (draft.school.headmasterNip?.trim() && !/^\d{18}$/.test(draft.school.headmasterNip.trim())) {
      next.headmasterNip = 'NIP harus 18 digit angka atau dikosongkan'
    }
    if (draft.school.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.school.email)) next.email = 'Format email tidak valid'
    if (!draft.academicYear.trim() || !/^\d{4}\/\d{4}$/.test(draft.academicYear)) next.academicYear = 'Format tahun ajaran: 2026/2027'
    if (draft.minimumAttendance < 0 || draft.minimumAttendance > 100) next.minimum = 'Nilai harus 0-100'
    if (draft.lateTolerance < 0 || draft.lateTolerance > 120) next.late = 'Nilai harus 0-120 menit'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) {
      toast('Periksa kembali data yang belum valid.', 'error')
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      updateSettings(draft)
      setSaving(false)
      toast('Pengaturan berhasil disimpan.', 'success')
    }, 500)
  }

  const exportBackup = () => {
    const profiles = readStoredProfiles()
    downloadJson(createBackup(data, profiles), backupFileName())
    toast('Cadangan lengkap berhasil diunduh.', 'success')
  }

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      setRestoreCandidate({ ...parsed, fileName: file.name })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Gagal membaca file cadangan.', 'error')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmRestore = () => {
    if (!restoreCandidate) return
    restoreData(restoreCandidate.data, restoreCandidate.profiles)
    setDraft(JSON.parse(JSON.stringify(restoreCandidate.data.settings)))
    setRestoreCandidate(null)
    toast('Data berhasil dipulihkan dari cadangan.', 'success')
  }

  const exportDeviceSettings = () => {
    const payload = collectDeviceSettings()
    if (Object.keys(payload.settings).length === 0) {
      toast('Belum ada pengaturan perangkat yang bisa diunduh.', 'info')
      return
    }
    downloadJson(payload, deviceSettingsFileName())
    toast('Pengaturan tampilan perangkat berhasil diunduh.', 'success')
  }

  const handleDeviceFile = async (file: File) => {
    try {
      const parsed = parseDeviceSettings(await file.text())
      setDeviceCandidate({ ...parsed, fileName: file.name })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Gagal membaca file pengaturan.', 'error')
    } finally {
      if (deviceInputRef.current) deviceInputRef.current.value = ''
    }
  }

  const confirmDeviceRestore = () => {
    if (!deviceCandidate) return
    try {
      const count = applyDeviceSettings(deviceCandidate)
      setDeviceCandidate(null)
      toast(`${count} pengaturan tampilan diterapkan. Memuat ulang halaman…`, 'success')
      window.setTimeout(() => window.location.reload(), 800)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Gagal menerapkan pengaturan.', 'error')
    }
  }

  const handleDeleteAllPeople = () => {
    if (deleteConfirm.trim().toUpperCase() !== 'HAPUS') {
      toast('Ketik HAPUS untuk mengonfirmasi penghapusan.', 'error')
      return
    }
    clearPeopleData()
    setDeleteAllOpen(false)
    setDeleteConfirm('')
    toast('Semua data siswa dan guru berhasil dihapus.', 'success')
  }

  const handleReset = () => {
    resetData()
    setDraft(JSON.parse(JSON.stringify(defaultSettings)))
    setResetOpen(false)
    toast('Data demo berhasil dipulihkan ke kondisi awal.', 'success')
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Sistem</p>
          <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Pengaturan</h1>
          <p className="mt-1 text-sm text-slate-500">Sesuaikan identitas sekolah, periode akademik, dan preferensi aplikasi.</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save size={15} /> Simpan Perubahan
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Logo & Foto Identitas"
              description="Atur foto profil aplikasi dan foto kepala sekolah."
            />
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <PhotoPicker
                name={draft.school.name || 'SIAP SMP'}
                value={draft.appLogo}
                onChange={(appLogo) => setDraft((prev) => ({ ...prev, appLogo }))}
                label="Foto Profil Aplikasi (Logo)"
                description="Tampil di sidebar, halaman login, dan laporan."
                shape="square"
                maxSize={192}
              />
              <PhotoPicker
                name={draft.school.headmaster || 'Kepala Sekolah'}
                value={draft.school.headmasterPhoto}
                onChange={(headmasterPhoto) =>
                  setDraft((prev) => ({ ...prev, school: { ...prev.school, headmasterPhoto } }))
                }
                label="Foto Kepala Sekolah"
                description="Tampil pada halaman pengaturan dan tanda tangan laporan."
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Building2 size={16} className="text-brand-500" /> Identitas Sekolah
                </span>
              }
              description="Informasi ini tampil pada header aplikasi dan laporan resmi."
            />
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Nama Sekolah"
                  value={draft.school.name}
                  onChange={(e) => setSchool('name', e.target.value)}
                  error={errors.schoolName}
                  required
                />
              </div>
              <Input
                label="NPSN"
                value={draft.school.npsn}
                onChange={(e) => setSchool('npsn', e.target.value.replace(/\D/g, '').slice(0, 8))}
                error={errors.npsn}
                inputMode="numeric"
                required
              />
              <Input
                label="Nama Kepala Sekolah"
                value={draft.school.headmaster}
                onChange={(e) => setSchool('headmaster', e.target.value)}
                error={errors.headmaster}
                required
              />
              <Input
                label="NIP Kepala Sekolah"
                value={draft.school.headmasterNip ?? ''}
                onChange={(e) => setSchool('headmasterNip', e.target.value.replace(/\D/g, '').slice(0, 18))}
                error={errors.headmasterNip}
                placeholder="18 digit angka (opsional)"
                hint="Opsional. Kosongkan jika belum tersedia."
                inputMode="numeric"
              />
              <div className="sm:col-span-2">
                <Input label="Alamat" value={draft.school.address} onChange={(e) => setSchool('address', e.target.value)} />
              </div>
              <Input label="Telepon" value={draft.school.phone} onChange={(e) => setSchool('phone', e.target.value)} />
              <Input
                label="Email"
                type="email"
                value={draft.school.email}
                onChange={(e) => setSchool('email', e.target.value)}
                error={errors.email}
              />
              <Input label="Situs Web" value={draft.school.website} onChange={(e) => setSchool('website', e.target.value)} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-brand-500" /> Pengaturan Akademik
                </span>
              }
              description="Periode aktif dan ambang batas kehadiran."
            />
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <Select
                label="Semester"
                value={draft.semester}
                onChange={(e) => setDraft((prev) => ({ ...prev, semester: e.target.value as Settings['semester'] }))}
                options={[
                  { value: 'Ganjil', label: 'Semester Ganjil' },
                  { value: 'Genap', label: 'Semester Genap' },
                ]}
              />
              <Input
                label="Tahun Ajaran"
                value={draft.academicYear}
                onChange={(e) => setDraft((prev) => ({ ...prev, academicYear: e.target.value }))}
                error={errors.academicYear}
                placeholder="2026/2027"
                required
              />
              <Input
                label="Ambang Batas Kehadiran (%)"
                type="number"
                min={0}
                max={100}
                value={draft.minimumAttendance}
                onChange={(e) => setDraft((prev) => ({ ...prev, minimumAttendance: Number(e.target.value) }))}
                error={errors.minimum}
                hint="Peserta didik di bawah nilai ini ditandai perlu perhatian."
              />
              <Input
                label="Toleransi Keterlambatan (menit)"
                type="number"
                min={0}
                max={120}
                value={draft.lateTolerance}
                onChange={(e) => setDraft((prev) => ({ ...prev, lateTolerance: Number(e.target.value) }))}
                error={errors.late}
                hint="Digunakan sebagai acuan pencatatan status terlambat."
              />
            </div>
            <div className="mx-5 mb-5">
              <Alert tone="info" title="Perubahan periode akademik">
                Pastikan seluruh absensi pada periode sebelumnya telah diselesaikan sebelum mengganti tahun ajaran atau semester.
              </Alert>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Koneksi Server"
              description="Alamat server utama. Kosongkan untuk memakai server lokal (relative URL)."
            />
            <div className="space-y-3 px-5 py-5">
              <Input
                label="URL Server"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.10:5173"
                hint="Gunakan alamat IP/domain server utama agar perangkat lain dapat login dan sinkron."
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setServerBaseUrl(serverUrl)
                    toast('Alamat server disimpan. Muat ulang halaman untuk menerapkan.', 'success')
                  }}
                >
                  Simpan Alamat Server
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setServerUrl('')
                    setServerBaseUrl('')
                    toast('Kembali ke server lokal.', 'info')
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hari Libur"
              description="Sabtu dan Minggu otomatis libur. Tambahkan hari libur lain (mis. hari besar) di sini."
            />
            <div className="space-y-3 px-5 py-5">
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  label="Tanggal"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full sm:w-44"
                />
                <Input
                  label="Nama Hari Libur"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Contoh: Hari Raya Idul Fitri"
                  className="w-full sm:flex-1"
                />
                <Button type="button" onClick={addHoliday} className="sm:mb-[2px]">
                  <Plus size={15} /> Tambah
                </Button>
              </div>
              {(draft.holidays ?? []).length === 0 ? (
                <p className="text-[11px] text-slate-400">Belum ada hari libur tambahan.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {(draft.holidays ?? [])
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((holiday) => (
                      <div key={holiday.date} className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <div>
                          <p className="text-[12px] font-semibold text-navy-950">{holiday.name}</p>
                          <p className="text-[10px] text-slate-500">{formatDate(holiday.date, 'full')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHoliday(holiday.date)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus hari libur"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
              <p className="text-[9.5px] leading-relaxed text-slate-400">
                Hari libur akan dikecualikan dari hari efektif dan rekap kehadiran. Simpan pengaturan untuk menerapkan.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Preferensi Notifikasi" description="Atur pengingat otomatis untuk tenaga pendidik." />
            <div className="divide-y divide-slate-100 px-5 py-1">
              <Toggle
                label="Notifikasi wali peserta didik"
                description="Kirim pemberitahuan ketika peserta didik tidak hadir tanpa keterangan."
                checked={draft.notifyGuardian}
                onChange={(checked) => setDraft((prev) => ({ ...prev, notifyGuardian: checked }))}
              />
              <Toggle
                label="Laporan kehadiran mingguan"
                description="Siapkan ringkasan otomatis setiap akhir pekan untuk wali kelas."
                checked={draft.weeklyReport}
                onChange={(checked) => setDraft((prev) => ({ ...prev, weeklyReport: checked }))}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <PanelLeftClose size={16} className="text-brand-500" /> Menu Navigasi
                </span>
              }
              description="Sembunyikan menu yang jarang dipakai agar sidebar lebih ringkas."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetMenuVisibility}
                  disabled={hiddenMenus.length === 0}
                >
                  <RotateCcw size={13} /> Tampilkan Semua
                </Button>
              }
            />
            <div className="divide-y divide-slate-100 px-5 py-1">
              {allMenuItems.map((item) => {
                const locked = LOCKED_MENUS.includes(item.to)
                const visible = !hiddenMenus.includes(item.to)
                const group = menuGroupLabels[item.to] ?? 'Sistem'
                const Icon = item.icon
                return (
                  <div key={item.to} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {group} · {item.to}
                        </p>
                      </div>
                    </div>
                    {locked ? (
                      <Badge tone="slate">Wajib tampil</Badge>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visible}
                        aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} menu ${item.label}`}
                        onClick={() => toggleMenuVisibility(item.to)}
                        className={cn(
                          'relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
                          visible ? 'bg-brand-600' : 'bg-slate-200',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-transform',
                            visible ? 'translate-x-[22px] text-brand-600' : 'translate-x-0.5',
                          )}
                        >
                          {visible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mx-5 mb-5">
              <Alert tone="info" title="Tips menyembunyikan sidebar">
                Menu Dashboard dan Pengaturan selalu ditampilkan agar Anda tidak terkunci. Untuk menyembunyikan seluruh
                sidebar di layar desktop, gunakan tombol panel di header aplikasi.
              </Alert>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              <Save size={15} /> Simpan Perubahan
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Informasi Sistem" description="Status penyimpanan aplikasi" />
            <div className="space-y-3 px-5 py-5">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[10.5px] text-slate-500"><Info size={13} /> Versi aplikasi</span>
                <Badge tone="brand">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[10.5px] text-slate-500"><Database size={13} /> Total data siswa</span>
                <span className="text-[10.5px] font-bold text-slate-700">{data.students.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[10.5px] text-slate-500"><Users size={13} /> Total sesi absensi</span>
                <span className="text-[10.5px] font-bold text-slate-700">{data.sessions.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[10.5px] text-slate-500"><HardDrive size={13} /> Penyimpanan lokal</span>
                <span className="text-[10.5px] font-bold text-slate-700">{storageSize}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 ring-1 ring-inset ring-emerald-100">
                <CheckCircle2 size={13} className="mt-0.5 text-emerald-500" />
                <p className="text-[10px] leading-relaxed text-emerald-700">
                  Data tersimpan otomatis di perangkat ini. Unduh cadangan secara berkala.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Palette size={16} className="text-brand-500" /> Tema &amp; Tampilan
                </span>
              }
              description="Warna, transparansi, dan latar belakang aplikasi."
            />
            <div className="px-5 py-5">
              <div
                className="relative h-24 overflow-hidden rounded-xl border border-slate-200"
                style={backgroundStyle}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/30 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg border border-white/50 bg-white/80 px-2.5 py-2 shadow-sm backdrop-blur-md">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                    style={{ backgroundColor: theme.color }}
                  >
                    <Sparkles size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-navy-950">{backgroundName}</p>
                    <p className="text-[9px] text-slate-500">Transparansi {theme.glass}% · Blur {theme.blur}px</p>
                  </div>
                  <span
                    className="h-5 w-5 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: theme.color }}
                  />
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Pilih dari puluhan warna, atur transparansi panel, dan ganti latar belakang dengan gradien, pola, atau foto
                sendiri.
              </p>

              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPanelOpen(true)}>
                <Palette size={13} /> Buka Panel Tema
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Cadangan & Pemulihan" description="Amankan data atau pulihkan dari file cadangan." />
            <div className="space-y-3 px-5 py-5">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-500 shadow-sm">
                  <Download size={18} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-700">Unduh Cadangan</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">
                  Berisi siswa, guru, kelas, absensi, pengaturan, foto, dan profil pengguna dalam satu file JSON.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={exportBackup}>
                  <Download size={13} /> Unduh Cadangan (JSON)
                </Button>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-500 shadow-sm">
                  <Upload size={18} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-700">Pulihkan Cadangan</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">
                  Pilih file JSON hasil cadangan. Data yang ada saat ini akan diganti.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> Pilih File Cadangan
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleRestoreFile(file)
                  }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pengaturan Tampilan Perangkat"
              description="Tema per akun, warna, menu tersembunyi, dan status sidebar hanya tersimpan di browser ini."
            />
            <div className="space-y-3 px-5 py-5">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-500 shadow-sm">
                  <Laptop size={18} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-700">Unduh Pengaturan Perangkat</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">
                  Simpan tema, warna, dan menu tersembunyi untuk dipindahkan ke laptop lain.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={exportDeviceSettings}>
                  <Download size={13} /> Unduh Pengaturan (JSON)
                </Button>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-500 shadow-sm">
                  <Upload size={18} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-700">Pulihkan Pengaturan Perangkat</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">
                  Pilih file pengaturan hasil unduhan dari laptop lama. Data siswa, guru, dan absensi tidak terpengaruh.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => deviceInputRef.current?.click()}
                >
                  <Upload size={13} /> Pilih File Pengaturan
                </Button>
                <input
                  ref={deviceInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  data-device-import
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleDeviceFile(file)
                  }}
                />
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500">
                Gunakan bagian ini saat berpindah laptop agar tampilan tiap akun tetap sama. Halaman akan dimuat ulang
                setelah pengaturan diterapkan.
              </p>
            </div>
          </Card>

          <Card className="border-rose-200/80">
            <CardHeader title="Zona Berbahaya" description="Tindakan permanen pada data aplikasi." />
            <div className="px-5 py-5">
              <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <div className="flex items-start gap-2.5">
                  <Users size={16} className="mt-0.5 shrink-0 text-rose-500" />
                  <div>
                    <p className="text-[11px] font-semibold text-rose-800">Hapus semua data siswa & guru</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-rose-700">
                      Menghapus <strong>{data.students.length} siswa</strong>,{' '}
                      <strong>{data.teachers.length} guru</strong>, {data.sessions.length} sesi absensi, dan notifikasi.
                      Data kelas serta pengaturan tetap dipertahankan.
                    </p>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    setDeleteConfirm('')
                    setDeleteAllOpen(true)
                  }}
                  disabled={data.students.length === 0 && data.teachers.length === 0}
                >
                  <Trash2 size={13} /> Hapus Semua Siswa & Guru
                </Button>
              </div>

              <div className="my-3 border-t border-rose-100" />

              <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-100">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-[10px] leading-relaxed text-rose-700">
                  Mengatur ulang data akan menghapus seluruh perubahan dan memuat data demo awal. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <Button variant="danger" size="sm" className="mt-3 w-full" onClick={() => setResetOpen(true)}>
                <RefreshCw size={13} /> Atur Ulang Data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Atur ulang seluruh data?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Batal</Button>
            <Button variant="danger" onClick={handleReset}><Trash2 size={14} /> Ya, Atur Ulang</Button>
          </>
        }
      >
        <Alert tone="danger" title="Semua perubahan akan hilang">
          Data siswa, guru, kelas, sesi absensi, serta pengaturan akan dikembalikan ke kondisi awal aplikasi. Pastikan Anda telah
          mengunduh cadangan data.
        </Alert>
      </Modal>

      <Modal
        open={deleteAllOpen}
        onClose={() => {
          setDeleteAllOpen(false)
          setDeleteConfirm('')
        }}
        title="Hapus semua data siswa & guru?"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAllOpen(false)
                setDeleteConfirm('')
              }}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAllPeople}
              disabled={deleteConfirm.trim().toUpperCase() !== 'HAPUS'}
            >
              <Trash2 size={14} /> Hapus Semua
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert tone="danger" title="Tindakan ini tidak dapat dibatalkan">
            Data berikut akan dihapus permanen:
          </Alert>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">
                <Users size={11} /> Siswa
              </p>
              <p className="mt-0.5 text-lg font-bold text-navy-950">{data.students.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">
                <GraduationCap size={11} /> Guru
              </p>
              <p className="mt-0.5 text-lg font-bold text-navy-950">{data.teachers.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Sesi Absensi</p>
              <p className="mt-0.5 text-lg font-bold text-navy-950">{data.sessions.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Notifikasi</p>
              <p className="mt-0.5 text-lg font-bold text-navy-950">{data.notifications.length}</p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Kelas dan pengaturan sekolah tetap dipertahankan. Wali kelas akan dikosongkan karena data guru dihapus. Sebaiknya
            unduh cadangan terlebih dahulu melalui menu Cadangan & Pemulihan.
          </p>

          <Input
            label='Ketik "HAPUS" untuk melanjutkan'
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="HAPUS"
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(restoreCandidate)}
        onClose={() => setRestoreCandidate(null)}
        title="Pulihkan dari cadangan?"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRestoreCandidate(null)}>
              Batal
            </Button>
            <Button onClick={confirmRestore}>
              <Upload size={14} /> Pulihkan Data
            </Button>
          </>
        }
      >
        {restoreCandidate && (
          <div className="space-y-4">
            <Alert tone="warning" title="Data saat ini akan diganti">
              Seluruh data siswa, guru, kelas, absensi, dan pengaturan akan diganti dengan isi file cadangan. Tindakan ini tidak
              dapat dibatalkan.
            </Alert>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-500 shadow-sm">
                  <Database size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-semibold text-slate-800">{restoreCandidate.fileName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {restoreCandidate.createdAt
                      ? `Dibuat ${new Date(restoreCandidate.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}`
                      : 'Cadangan lama tanpa informasi tanggal'}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 sm:grid-cols-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Siswa</p>
                  <p className="text-sm font-bold text-navy-950">{restoreCandidate.data.students.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Guru</p>
                  <p className="text-sm font-bold text-navy-950">{restoreCandidate.data.teachers.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Kelas</p>
                  <p className="text-sm font-bold text-navy-950">{restoreCandidate.data.classes.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Sesi</p>
                  <p className="text-sm font-bold text-navy-950">{restoreCandidate.data.sessions.length}</p>
                </div>
              </div>

              {Object.keys(restoreCandidate.profiles).length > 0 && (
                <p className="mt-3 border-t border-slate-200/80 pt-2 text-[10px] text-slate-500">
                  Termasuk profil/foto {Object.keys(restoreCandidate.profiles).length} pengguna.
                </p>
              )}
            </div>

            {restoreCandidate.legacy && (
              <Alert tone="info" title="Cadangan format lama">
                File ini tidak berisi foto profil pengguna. Data utama tetap dapat dipulihkan.
              </Alert>
            )}

            <p className="text-[10.5px] leading-relaxed text-slate-500">
              Sebaiknya unduh cadangan data saat ini terlebih dahulu sebelum memulihkan.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deviceCandidate)}
        onClose={() => setDeviceCandidate(null)}
        title="Pulihkan pengaturan perangkat?"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeviceCandidate(null)}>
              Batal
            </Button>
            <Button onClick={confirmDeviceRestore}>
              <Upload size={14} /> Terapkan Pengaturan
            </Button>
          </>
        }
      >
        {deviceCandidate && (
          <div className="space-y-4">
            <Alert tone="warning" title="Pengaturan tampilan saat ini akan diganti">
              Tema, warna, dan menu tersembunyi di perangkat ini akan diganti dengan isi file. Data siswa, guru, dan
              absensi tidak terpengaruh.
            </Alert>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-500 shadow-sm">
                  <Laptop size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-semibold text-slate-800">{deviceCandidate.fileName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {Object.keys(deviceCandidate.settings).length} pengaturan tampilan
                    {deviceCandidate.createdAt
                      ? ` · dibuat ${new Date(deviceCandidate.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] leading-relaxed text-slate-500">
              Halaman akan dimuat ulang otomatis setelah pengaturan diterapkan.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
