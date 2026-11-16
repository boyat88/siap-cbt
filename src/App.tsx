import { lazy, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import { CbtProvider } from './store/CbtContext'
import { ThemeProvider } from './store/ThemeContext'
import { ToastProvider } from './components/ui'
import { ThemePanel } from './components/ThemePanel'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'

/*
 * Halaman dimuat terpisah (code splitting) supaya pembukaan aplikasi tidak
 * perlu mengunduh seluruh halaman sekaligus. Halaman dengan Excel/chart baru
 * diunduh saat benar-benar dibuka, sehingga tampilan awal jauh lebih cepat.
 */
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const GuruDashboard = lazy(() =>
  import('./pages/GuruDashboard').then((m) => ({ default: m.GuruDashboard })),
)
const Absensi = lazy(() => import('./pages/Absensi').then((m) => ({ default: m.Absensi })))
const Siswa = lazy(() => import('./pages/Siswa').then((m) => ({ default: m.Siswa })))
const Kelas = lazy(() => import('./pages/Kelas').then((m) => ({ default: m.Kelas })))
const Guru = lazy(() => import('./pages/Guru').then((m) => ({ default: m.Guru })))
const Rekap = lazy(() => import('./pages/Rekap').then((m) => ({ default: m.Rekap })))
const Laporan = lazy(() => import('./pages/Laporan').then((m) => ({ default: m.Laporan })))
const Pengaturan = lazy(() => import('./pages/Pengaturan').then((m) => ({ default: m.Pengaturan })))
const Profil = lazy(() => import('./pages/Profil').then((m) => ({ default: m.Profil })))
const Tampilan = lazy(() => import('./pages/Tampilan').then((m) => ({ default: m.Tampilan })))
const TandaTangan = lazy(() =>
  import('./pages/TandaTangan').then((m) => ({ default: m.TandaTangan })),
)
const Cbt = lazy(() => import('./pages/Cbt').then((m) => ({ default: m.Cbt })))
const CbtEditor = lazy(() => import('./pages/CbtEditor').then((m) => ({ default: m.CbtEditor })))
const CbtHasil = lazy(() => import('./pages/CbtHasil').then((m) => ({ default: m.CbtHasil })))
/** Halaman ujian siswa; tidak memerlukan login guru/administrator. */
const Ujian = lazy(() => import('./pages/Ujian').then((m) => ({ default: m.Ujian })))

function ProtectedLayout() {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

/** Membatasi halaman yang hanya boleh diakses administrator. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/**
 * Dasbor berbeda untuk tiap peran: akun guru mendapat dasbor ringkas
 * (tanpa grafik) agar cepat dibuka di HP.
 */
function DashboardRoute() {
  const { user } = useApp()
  if (user?.role === 'guru') return <GuruDashboard />
  return <Dashboard />
}

/**
 * Panel tema melayang di pojok kanan bawah (ukuran ringkas) untuk pengguna
 * yang sudah masuk. Tidak ditampilkan di halaman login/mode ujian siswa.
 * Untuk akun guru di HP disembunyikan agar tampilan lebih bersih.
 */
function ThemePanelHost() {
  const { user } = useApp()
  if (!user) return null
  if (user.role === 'guru') {
    return (
      <div className="hidden lg:block">
        <ThemePanel />
      </div>
    )
  }
  return <ThemePanel />
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ThemeProvider>
          <ThemePanelHost />
          <CbtProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                {/* Mode ujian siswa: di luar layout admin/guru. */}
                <Route path="/ujian" element={<Ujian />} />
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<DashboardRoute />} />
                  <Route path="/absensi" element={<Absensi />} />
                  <Route
                    path="/siswa"
                    element={
                      <AdminOnly>
                        <Siswa />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/kelas"
                    element={
                      <AdminOnly>
                        <Kelas />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/guru"
                    element={
                      <AdminOnly>
                        <Guru />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/cbt"
                    element={
                      <AdminOnly>
                        <Cbt />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/cbt/baru"
                    element={
                      <AdminOnly>
                        <CbtEditor />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/cbt/hasil/:examId"
                    element={
                      <AdminOnly>
                        <CbtHasil />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/cbt/:examId"
                    element={
                      <AdminOnly>
                        <CbtEditor />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/rekap"
                    element={
                      <AdminOnly>
                        <Rekap />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/laporan"
                    element={
                      <AdminOnly>
                        <Laporan />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/tanda-tangan"
                    element={
                      <AdminOnly>
                        <TandaTangan />
                      </AdminOnly>
                    }
                  />
                  <Route
                    path="/pengaturan"
                    element={
                      <AdminOnly>
                        <Pengaturan />
                      </AdminOnly>
                    }
                  />
                  <Route path="/profil" element={<Profil />} />
                  <Route
                    path="/tampilan"
                    element={
                      <AdminOnly>
                        <Tampilan />
                      </AdminOnly>
                    }
                  />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </CbtProvider>
        </ThemeProvider>
      </ToastProvider>
    </AppProvider>
  )
}
