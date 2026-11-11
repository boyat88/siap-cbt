import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { PhotoPicker } from '../components/PhotoPicker'
import { SUBJECTS } from '../lib/constants'
import { formatDate, toISODate } from '../lib/utils'

export function Profil() {
  const { user, updateProfile, logout, data } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    nip: user?.nip ?? '',
    phone: user?.phone ?? '',
    subject: user?.subject ?? '',
    photo: user?.photo,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const roleLabel = user?.role === 'admin' ? 'Administrator Sistem' : 'Guru Mata Pelajaran'
  const mySessions = data.sessions.filter(
    (s) => data.teachers.find((t) => t.id === s.teacherId)?.name === user?.name,
  ).length

  const saveProfile = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Nama wajib diisi'
    if (!form.email.trim()) next.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Format email tidak valid'
    if (form.nip.trim() && !/^\d{18}$/.test(form.nip.trim())) next.nip = 'NIP harus 18 digit angka atau dikosongkan'
    if (form.phone && !/^[0-9+\-\s]{8,20}$/.test(form.phone)) next.phone = 'Nomor telepon tidak valid'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    updateProfile({ ...form })
    toast('Profil berhasil diperbarui.', 'success')
  }

  const savePassword = () => {
    const next: Record<string, string> = {}
    if (!password.current) next.current = 'Kata sandi saat ini wajib diisi'
    if (!password.next) next.next = 'Kata sandi baru wajib diisi'
    else if (password.next.length < 8) next.next = 'Minimal 8 karakter'
    if (password.confirm !== password.next) next.confirm = 'Konfirmasi kata sandi tidak sama'
    setPasswordErrors(next)
    if (Object.keys(next).length > 0) return
    setPassword({ current: '', next: '', confirm: '' })
    toast('Kata sandi berhasil diperbarui (simulasi).', 'success')
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Akun</p>
        <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola informasi akun dan keamanan akses Anda.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-navy-950 via-navy-900 to-brand-800" />
          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end justify-between">
              <Avatar name={form.name || 'Pengguna'} src={form.photo} size="xl" className="ring-4 ring-white" />
              <Badge tone="emerald"><BadgeCheck size={11} /> Akun aktif</Badge>
            </div>
            <h2 className="mt-3 text-base font-bold text-navy-950">{form.name}</h2>
            <p className="text-[11px] text-slate-500">{roleLabel}</p>

            <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate text-[11px] text-slate-600">{form.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <UserRound size={14} className="text-slate-400" />
                <span className="text-[11px] text-slate-600">NIP {form.nip || '-'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="text-slate-400" />
                <span className="text-[11px] text-slate-600">{form.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CalendarDays size={14} className="text-slate-400" />
                <span className="text-[11px] text-slate-600">Bergabung sejak 2024</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-lg font-extrabold text-navy-950">{data.sessions.length}</p>
                <p className="text-[9px] text-slate-500">Sesi tercatat</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-lg font-extrabold text-navy-950">{mySessions}</p>
                <p className="text-[9px] text-slate-500">Sesi saya</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 ring-1 ring-inset ring-brand-100">
              <ShieldCheck size={14} className="shrink-0 text-brand-500" />
              <p className="text-[9.5px] leading-relaxed text-brand-800">Sesi Anda terlindungi. Keluar saat menggunakan perangkat bersama.</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={13} /> Keluar dari Akun
            </Button>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Informasi Pribadi" description="Perubahan akan langsung diterapkan pada akun Anda." />
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PhotoPicker
                  name={form.name || 'Pengguna'}
                  value={form.photo}
                  onChange={(photo) => setForm((f) => ({ ...f, photo }))}
                  label="Foto Profil"
                  description="Foto ini tampil pada header dan menu profil aplikasi."
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Nama Lengkap & Gelar"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  error={errors.name}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
                required
              />
              <Input
                label="Nomor Telepon"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                error={errors.phone}
              />
              <Input
                label="NIP"
                value={form.nip}
                onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value.replace(/\D/g, '').slice(0, 18) }))}
                error={errors.nip}
                placeholder="18 digit angka (opsional)"
                hint="Opsional. Kosongkan jika belum memiliki NIP."
                inputMode="numeric"
              />
              <Select
                label="Jabatan"
                value={user?.role ?? 'admin'}
                disabled
                options={[{ value: 'admin', label: 'Administrator' }, { value: 'guru', label: 'Guru' }]}
              />
              {user?.role === 'guru' && (
                <div className="sm:col-span-2">
                  <Select
                    label="Mata Pelajaran"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3.5">
              <Button onClick={saveProfile}><Save size={14} /> Simpan Profil</Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <KeyRound size={16} className="text-brand-500" /> Keamanan Akun
                </span>
              }
              description="Gunakan kata sandi yang kuat dan unik."
            />
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Kata Sandi Saat Ini"
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
                  error={passwordErrors.current}
                  placeholder="••••••••"
                />
              </div>
              <Input
                label="Kata Sandi Baru"
                type="password"
                value={password.next}
                onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))}
                error={passwordErrors.next}
                placeholder="Minimal 8 karakter"
              />
              <Input
                label="Konfirmasi Kata Sandi"
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                error={passwordErrors.confirm}
                placeholder="Ulangi kata sandi baru"
              />
            </div>
            <div className="mx-5 mb-5">
              <Alert tone="info" title="Perubahan kata sandi bersifat simulasi">
                Aplikasi demo ini menyimpan data secara lokal. Integrasikan dengan server autentikasi sekolah untuk penggunaan produksi.
              </Alert>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3.5">
              <Button variant="secondary" onClick={savePassword}><ShieldCheck size={14} /> Perbarui Kata Sandi</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Aktivitas Akun" description={`Login terakhir ${formatDate(toISODate(new Date()), 'long')}`} />
            <div className="divide-y divide-slate-100 px-5">
              {[
                { label: 'Perangkat', value: 'Chrome · Windows' },
                { label: 'Lokasi akses', value: 'Cikatomas, Tasikmalaya' },
                { label: 'Status verifikasi', value: 'Terverifikasi' },
                { label: 'Peran akses', value: roleLabel },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3">
                  <span className="text-[11px] text-slate-500">{item.label}</span>
                  <span className="text-[11px] font-semibold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
