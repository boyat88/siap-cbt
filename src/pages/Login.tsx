import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
} from 'lucide-react'
import { Brand } from '../components/Brand'
import { Button, Input, useToast, cn } from '../components/ui'
import { useApp } from '../store/AppContext'

const loginLogoItems = [
  { src: '/logos/logo-merdeka.png', label: 'Kurikulum Merdeka' },
  { src: '/logos/logo-bermutu.png', label: 'Pendidikan Bermutu untuk Semua' },
  { src: '/logos/logo-kemendikdasmen.png', label: 'Kemendikdasmen Ramah' },
]

/** Deretan logo instansi di luar kartu login (kanan atas). */
function LoginLogos({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('relative flex items-center', compact ? 'gap-2.5' : 'gap-4')}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -inset-y-3 rounded-full bg-white/80 blur-lg"
      />
      {loginLogoItems.map((logo) => (
        <img
          key={logo.src}
          src={logo.src}
          alt={logo.label}
          title={logo.label}
          className={cn(
            'relative w-auto object-contain drop-shadow-[0_2px_5px_rgba(2,10,30,0.45)]',
            compact ? 'h-5' : 'h-6 xl:h-7',
          )}
        />
      ))}
    </div>
  )
}

export function Login() {
  const { login, user, refreshFromServer } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverReady, setServerReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void refreshFromServer().finally(() => setServerReady(true))
  }, [refreshFromServer])

  if (user && !success) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!email.trim()) nextErrors.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Format email tidak valid'
    if (!password) nextErrors.password = 'Kata sandi wajib diisi'
    else if (password.length < 6) nextErrors.password = 'Kata sandi minimal 6 karakter'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    window.setTimeout(() => {
      const ok = login(email, password)
      setSubmitting(false)
      if (ok) {
        setSuccess(true)
        toast('Selamat datang kembali di SIAP SMP.', 'success')
        window.setTimeout(() => navigate('/dashboard'), 900)
      } else {
        setErrors({
          form:
            'Email atau kata sandi tidak sesuai. Akun guru baru harus didaftarkan & diaktifkan administrator terlebih dahulu.',
        })
      }
    }, 500)
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#03102b]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#020a1e_0%,#061f52_28%,#0b4aa2_58%,#1e8fe8_84%,#63c8ff_100%)]" />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="login-grid" width="58" height="58" patternUnits="userSpaceOnUse">
            <path d="M58 0H0V58" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
          <pattern id="login-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="#ffffff" fillOpacity="0.16" />
          </pattern>
          <linearGradient id="login-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1000" height="700" fill="url(#login-grid)" />
        <rect x="0" y="0" width="1000" height="700" fill="url(#login-dots)" opacity="0.5" />

        <polygon points="640,0 1000,0 1000,300" fill="#ffffff" fillOpacity="0.05" />
        <polygon points="640,0 1000,0 1000,300" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
        <polygon points="0,470 250,700 0,700" fill="#ffffff" fillOpacity="0.06" />
        <polygon points="0,470 250,700 0,700" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
        <polygon points="760,430 940,560 820,690 640,560" fill="#7dd3fc" fillOpacity="0.06" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />

        <circle cx="838" cy="128" r="150" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
        <circle cx="838" cy="128" r="104" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
        <circle cx="96" cy="606" r="118" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" />

        <path d="M-40 360 L420 0" stroke="url(#login-line)" strokeWidth="1" />
        <path d="M120 700 L720 130" stroke="url(#login-line)" strokeWidth="1" />
        <path d="M520 700 L1000 220" stroke="url(#login-line)" strokeWidth="1" />

        <g fill="#ffffff" fillOpacity="0.55">
          <circle cx="560" cy="96" r="3" />
          <circle cx="612" cy="140" r="2" />
          <circle cx="918" cy="352" r="3" />
          <circle cx="880" cy="392" r="2" />
          <circle cx="188" cy="120" r="2.5" />
          <circle cx="236" cy="86" r="2" />
          <circle cx="360" cy="620" r="2.5" />
        </g>
      </svg>

      <div className="pointer-events-none absolute -left-40 top-1/3 h-[460px] w-[460px] rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 right-1/4 h-[520px] w-[520px] rounded-full bg-cyan-200/15 blur-3xl login-orb-delayed" />

      <div className="absolute right-6 top-6 z-20 hidden lg:block xl:right-8 xl:top-7">
        <LoginLogos />
      </div>

      <div className="relative z-10 hidden w-[60%] flex-col overflow-hidden p-6 lg:flex xl:p-8">
        <div className="relative z-10">
          <Brand dark logo="/images/app-logo.png" />
        </div>

        <div className="relative z-10 my-auto w-full py-6">
          <div className="relative mb-4 -mx-6 w-[calc(100%+3rem)] xl:-mx-8 xl:w-[calc(100%+4rem)]">
    <div className="pointer-events-none absolute left-0 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-sky-300/25 blur-3xl" />
    <div className="pointer-events-none absolute right-0 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-cyan-200/20 blur-3xl" />
    <img
      src="/images/siap-banner.png"
      alt="Siswa belajar bersama"
      className="relative h-auto max-h-[48vh] w-full object-contain [mask-image:linear-gradient(to_right,transparent_0%,black_7%,black_93%,transparent_100%),linear-gradient(to_bottom,black_80%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
    />
  </div>
          <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold text-brand-200">
            <Sparkles size={12} />
            Absensi digital untuk pendidikan yang lebih baik
          </div>
          <h1 className="text-[34px] font-extrabold leading-[1.15] tracking-tight text-white xl:text-[42px]">
            Kehadiran tertata,
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-sky-200 bg-clip-text text-transparent">
              masa depan lebih cerah.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Kelola kehadiran peserta didik SMPN Satu Atap 1 Cikatomas secara cepat, akurat, dan transparan
            dalam satu platform terpadu.
          </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-5 text-[10px] text-white/90 drop-shadow">
          <span>© 2026 SMPN Satu Atap 1 Cikatomas</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Sistem aktif
          </span>
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-col overflow-y-auto lg:w-[40%]">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Brand dark logo="/images/app-logo.png" />
          <span className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[9px] font-bold text-white/90">TA 2026/2027</span>
        </div>

        <div className="flex justify-end px-5 pb-2 lg:hidden">
          <LoginLogos compact />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
          <div className="w-full max-w-[400px] animate-scale-in rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_30px_80px_-20px_rgba(2,10,30,0.65)] backdrop-blur-xl sm:p-7">
            <div className="mb-4">
              <div className="mb-2 hidden h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 lg:flex">
                <LockKeyhole size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-navy-950">Masuk ke akun Anda</h2>
              <p className="mt-1 text-[12px] text-slate-500">
                Gunakan akun yang telah terdaftar untuk mengakses SIAP SMP.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              <Input
                label="Alamat Email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nama@smpn1cikatomas.sch.id"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: undefined, form: undefined }))
                }}
                error={errors.email}
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast('Silakan hubungi administrator sekolah untuk reset kata sandi.', 'info')}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((prev) => ({ ...prev, password: undefined, form: undefined }))
                    }}
                    className={cn(
                      'h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
                      errors.password && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-[11px] font-medium text-rose-600">{errors.password}</p>}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
                Ingat perangkat ini
              </label>

              {errors.form && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11.5px] font-medium text-rose-700">
                  {errors.form}
                </div>
              )}

              <Button type="submit" size="lg" loading={submitting || !serverReady} className="group w-full">
                {serverReady ? 'Masuk ke Dashboard' : 'Menghubungkan ke server...'}
                {serverReady && !submitting && (
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                )}
              </Button>
            </form>

            <div className="mt-3 flex items-center justify-center gap-2 border-t border-slate-100 pt-3 text-[11px]">
              <span className="text-slate-400">Siswa akan ujian?</span>
              <button
                type="button"
                onClick={() => navigate('/ujian')}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Masuk Mode Ujian →
              </button>
            </div>

            <p className="mt-3 text-center text-[10.5px] leading-relaxed text-slate-400">
              Dengan masuk, Anda menyetujui kebijakan privasi dan ketentuan penggunaan SIAP SMP.
              <br />
              © 2026 SMPN Satu Atap 1 Cikatomas
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-navy-950/80 backdrop-blur-xl animate-fade-in">
          <div className="animate-scale-in text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
              <span className="success-ping absolute inset-0 rounded-full border-2 border-brand-300/70" />
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <p className="mt-5 text-lg font-bold text-white">Berhasil masuk</p>
            <p className="mt-1 text-sm text-slate-300">Membuka dashboard SIAP SMP...</p>
            <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-brand-300 to-sky-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
