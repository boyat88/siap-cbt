import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { Brand } from './Brand'
import { Avatar, Badge, Button, cn } from './ui'
import { useApp } from '../store/AppContext'
import { useTheme } from '../store/ThemeContext'
import { visibleMobileNav, visibleNavGroups } from '../lib/navigation'
import { formatDate, relativeTime, toISODate } from '../lib/utils'
import { attachGlobalRipple } from '../lib/ripple'

const pageTitles: Record<string, { title: string; group: string }> = {
  '/dashboard': { title: 'Dashboard', group: 'Ringkasan' },
  '/absensi': { title: 'Absensi', group: 'Kehadiran' },
  '/siswa': { title: 'Data Siswa', group: 'Data Master' },
  '/kelas': { title: 'Data Kelas', group: 'Data Master' },
  '/guru': { title: 'Data Guru', group: 'Data Master' },
  '/rekap': { title: 'Rekap Absensi', group: 'Analitik' },
  '/laporan': { title: 'Laporan', group: 'Analitik' },
  '/cbt': { title: 'Ujian CBT', group: 'Ujian' },
  '/cbt/baru': { title: 'Buat Ujian', group: 'Ujian' },
  '/tanda-tangan': { title: 'Tanda Tangan', group: 'Sistem' },
  '/pengaturan': { title: 'Pengaturan', group: 'Sistem' },
  '/profil': { title: 'Profil Saya', group: 'Akun' },
}

/** Judul halaman untuk rute dinamis Ujian CBT (sunting ujian / hasil ujian). */
function resolvePageTitle(pathname: string): { title: string; group: string } {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/cbt/hasil/')) return { title: 'Hasil Ujian CBT', group: 'Ujian' }
  if (pathname.startsWith('/cbt/')) return { title: 'Sunting Ujian', group: 'Ujian' }
  return { title: 'SIAP SMP', group: 'Sistem' }
}

function LogoBlock({ logo, collapsed = false }: { logo?: string; collapsed?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex h-[80px] shrink-0 items-center border-b border-white/[0.08]',
        collapsed ? 'justify-center px-2' : 'px-5',
      )}
      title={collapsed ? 'SIAP SMP' : undefined}
    >
      <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <Brand dark compact={collapsed} logo={logo} />
    </div>
  )
}

function SidebarAccountMenu({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    onNavigate?.()
    navigate(path)
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white'

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div
          data-keep-surface
          className={cn(
            'absolute z-50 origin-bottom animate-fade-up overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-2xl',
            collapsed ? 'bottom-0 left-full ml-2 w-64' : 'bottom-full left-0 right-0 mb-2',
          )}
        >
          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="truncate text-xs font-bold text-white">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
            <span className="mt-1.5 inline-flex rounded-md bg-brand-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-300">
              {isAdmin ? 'Administrator' : 'Guru'}
            </span>
          </div>
          <div className="p-1.5">
            <button onClick={() => go('/profil')} className={itemClass}>
              <UserRound size={15} /> Profil Saya
            </button>
            {isAdmin && (
              <button onClick={() => go('/guru')} className={itemClass}>
                <GraduationCap size={15} /> Kelola Akun Guru
              </button>
            )}
            {isAdmin && (
              <button onClick={() => go('/pengaturan')} className={itemClass}>
                <Settings size={15} /> Pengaturan
              </button>
            )}
          </div>
          <div className="border-t border-white/[0.07] p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center rounded-xl border border-transparent py-2 text-left transition-all hover:border-white/[0.08] hover:bg-white/[0.07] active:scale-[0.99]',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
        )}
        aria-label="Menu akun"
        title={collapsed ? user?.name ?? 'Menu akun' : undefined}
      >
        <Avatar name={user?.name ?? 'Administrator'} src={user?.photo} size="sm" className="ring-navy-900" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-100">{user?.name}</p>
              <p className="text-[9.5px] capitalize text-slate-500">{isAdmin ? 'Administrator' : 'Guru'}</p>
            </div>
            <ChevronDown
              size={13}
              className={cn('text-slate-500 transition-transform', open && 'rotate-180')}
            />
          </>
        )}
      </button>
    </div>
  )
}

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { data, user, hiddenMenus } = useApp()
  const { theme } = useTheme()
  const location = useLocation()
  const groups = visibleNavGroups(user?.role, hiddenMenus)
  const [railTip, setRailTip] = useState<{ label: string; x: number; y: number } | null>(null)

  // Tooltip mengikuti posisi ikon dan dirender lewat portal agar tidak terpotong
  // oleh area gulir menu saat sidebar dalam mode ringkas.
  const showRailTip = (label: string, element: HTMLElement) => {
    if (!collapsed) return
    const rect = element.getBoundingClientRect()
    setRailTip({ label, x: rect.right + 12, y: rect.top + rect.height / 2 })
  }

  return (
    <div
      data-menu-surface
      className={cn(
        'relative flex h-full flex-col bg-navy-950',
        collapsed ? 'overflow-visible' : 'overflow-hidden',
      )}
      style={theme.menuColor ? { backgroundColor: theme.menuColor } : undefined}
    >
      <div className="sidebar-glow pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top_right,rgba(96,165,250,0.28),transparent_65%)]" />
      <div className="sidebar-glow pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.2),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent" />
      <LogoBlock logo={data.settings.appLogo} collapsed={collapsed} />

      {!collapsed && (
        <div className="px-3 pt-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.06] p-3 shadow-inner-top backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400/30 to-brand-600/20 text-brand-200 shadow-glow-sm ring-1 ring-inset ring-white/10">
                <Building2 size={15} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold leading-snug text-white">{data.settings.school.name}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-400">NPSN {data.settings.school.npsn}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className={cn(
          'relative mt-4 overflow-y-auto overscroll-contain pb-4',
          collapsed ? 'space-y-4 px-2' : 'space-y-5 px-3',
        )}
        style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        {groups.map((group) => {
          const items = group.items
          return (
            <div key={group.label}>
              {collapsed ? (
                <>
                  <span className="sr-only">{group.label}</span>
                  <div className="mx-auto mb-2 h-px w-7 bg-white/[0.09]" aria-hidden="true" />
                </>
              ) : (
                <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: group.items[0]?.accent ?? '#64748b' }}
                  />
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      onMouseEnter={(event) => showRailTip(item.label, event.currentTarget)}
                      onMouseLeave={() => setRailTip(null)}
                      onFocus={(event) => showRailTip(item.label, event.currentTarget)}
                      onBlur={() => setRailTip(null)}
                      className={cn(
                        'nav-link group relative flex items-center rounded-xl text-[12.5px] font-medium transition-all',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                        active ? 'text-white' : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-100',
                      )}
                      style={
                        active
                          ? {
                              background: `linear-gradient(90deg, ${item.accent}38, ${item.accent}0d)`,
                              boxShadow: `inset 0 0 0 1px ${item.accent}33, 0 12px 28px -18px ${item.accent}cc`,
                            }
                          : undefined
                      }
                    >
                      {active && (
                        <span
                          className={cn(
                            'absolute top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full',
                            collapsed ? '-left-2' : '-left-3',
                          )}
                          style={{ backgroundColor: item.accent, boxShadow: `0 0 12px ${item.accent}` }}
                        />
                      )}
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-300 group-hover:scale-110 group-active:scale-90',
                          !active && 'text-slate-500 group-hover:text-slate-300',
                        )}
                        style={
                          active
                            ? { backgroundColor: `${item.accent}24`, color: item.accent, boxShadow: `0 0 16px -6px ${item.accent}` }
                            : undefined
                        }
                      >
                        <Icon size={16} />
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.to === '/absensi' && (
                            <span
                              className="rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                              style={
                                active
                                  ? { backgroundColor: `${item.accent}30`, color: 'var(--menu-ink, #ffffff)' }
                                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: item.accent }
                              }
                            >
                              Harian
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className={cn('relative mt-4 border-t border-white/[0.06] pb-4 pt-3', collapsed ? 'px-2' : 'px-3')}>
        <SidebarAccountMenu onNavigate={onNavigate} collapsed={collapsed} />
      </div>

      {railTip &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[90] -translate-y-1/2 animate-fade-in whitespace-nowrap rounded-lg border border-white/10 bg-navy-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl backdrop-blur-md"
            style={{ left: railTip.x, top: railTip.y }}
          >
            {railTip.label}
          </span>,
          document.body,
        )}
    </div>
  )
}

function NotificationsMenu() {
  const { data, markRead, markAllRead } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = data.notifications.filter((n) => !n.read).length

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tone = {
    info: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-inner-top backdrop-blur-md transition-all hover:border-brand-200 hover:bg-slate-50 hover:text-brand-600 hover:shadow-glow-sm active:scale-95"
        aria-label="Notifikasi"
      >
        <Bell size={18} className="origin-top group-hover:animate-bell-swing" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div data-keep-surface className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-lift backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-navy-950">Notifikasi</p>
              <p className="text-[11px] text-slate-500">{unread} belum dibaca</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {data.notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-500">Tidak ada notifikasi</div>
            ) : (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex w-full gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/80',
                    !n.read && 'bg-brand-50/30',
                  )}
                >
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone[n.type])}>
                    <Bell size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-[12px] leading-snug', n.read ? 'font-medium text-slate-600' : 'font-semibold text-navy-950')}>
                        {n.title}
                      </p>
                      {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{relativeTime(n.time)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-500">Notifikasi diperbarui secara otomatis</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 pr-1.5 transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-inner-top sm:pr-2.5"
      >
        <Avatar name={user?.name ?? 'Administrator'} src={user?.photo} />
        <div className="hidden text-left sm:block">
          <p className="max-w-[140px] truncate text-[12px] font-semibold leading-tight text-navy-950">{user?.name}</p>
          <p className="text-[10px] capitalize text-slate-500">{user?.role === 'admin' ? 'Administrator' : 'Guru Mata Pelajaran'}</p>
        </div>
        <ChevronDown size={14} className={cn('hidden text-slate-400 transition-transform sm:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div data-keep-surface className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-lift backdrop-blur-2xl">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <p className="truncate text-xs font-bold text-navy-950">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
            <Badge tone="brand" className="mt-2 capitalize">
              {user?.role === 'admin' ? 'Administrator' : 'Guru'}
            </Badge>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/profil')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <UserRound size={15} /> Profil Saya
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/pengaturan')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings size={15} /> Pengaturan
              </button>
            )}
          </div>
          <div className="border-t border-slate-100 p-1.5">
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const SIDEBAR_KEY = 'siap-absensi-sidebar-v1'

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()
  const { data, hiddenMenus, user } = useApp()
  const { theme } = useTheme()
  const [today, setToday] = useState(toISODate(new Date()))
  const [routeTick, setRouteTick] = useState(1)
  const page = resolvePageTitle(location.pathname)
  const isGuru = user?.role === 'guru'
  const mobileItems = visibleMobileNav(user?.role, hiddenMenus)

  // Urutan menu dipakai untuk menentukan arah transisi (maju: geser dari kanan).
  const navOrder = useMemo(
    () => visibleNavGroups(user?.role, hiddenMenus).flatMap((group) => group.items.map((item) => item.to)),
    [user?.role, hiddenMenus],
  )
  const navIndex = useMemo(() => {
    const exact = navOrder.indexOf(location.pathname)
    if (exact !== -1) return exact
    return navOrder.findIndex((to) => location.pathname.startsWith(`${to}/`))
  }, [navOrder, location.pathname])
  const prevNavIndexRef = useRef<number | null>(null)
  const slideDirection =
    prevNavIndexRef.current !== null && navIndex !== -1 && prevNavIndexRef.current !== -1
      ? Math.sign(navIndex - prevNavIndexRef.current)
      : 0
  const pageTransitionClass =
    slideDirection > 0
      ? 'animate-page-slide-left'
      : slideDirection < 0
        ? 'animate-page-slide-right'
        : 'animate-page-in'
  useEffect(() => {
    prevNavIndexRef.current = navIndex
  }, [navIndex])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      // Abaikan jika localStorage tidak tersedia.
    }
    // Dipakai CSS agar foto latar tidak masuk ke area menu samping.
    document.documentElement.dataset.sidebar = sidebarCollapsed ? 'collapsed' : 'open'
  }, [sidebarCollapsed])

  // Peran pengguna dipakai CSS untuk meringankan tampilan di HP
  // (akun guru memakai mode minimalis).
  useEffect(() => {
    document.documentElement.dataset.role = user?.role ?? 'guest'
  }, [user?.role])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setToday(toISODate(new Date())), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => attachGlobalRipple(), [])

  return (
    <div data-app-shell className="min-h-screen bg-transparent">
      {routeTick > 1 && <div key={routeTick} className="route-progress print:hidden" />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden h-screen w-[260px] shadow-[18px_0_60px_-40px_rgba(2,6,23,0.8)] transition-[width] duration-300 ease-in-out will-change-[width] print:hidden lg:block glass-sidebar',
          sidebarCollapsed ? 'overflow-visible lg:w-[76px]' : 'overflow-hidden lg:w-[260px]',
        )}
        style={{ position: 'fixed', top: 0, bottom: 0 }}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-300 ease-out lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-[280px] overflow-hidden shadow-2xl transition-transform duration-300 ease-in-out will-change-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ position: 'absolute', top: 0, bottom: 0 }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-5 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </aside>
      </div>

      <div
        className={cn(
          'print:pl-0 transition-[padding-left] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]',
        )}
      >
        <header data-header-surface className="app-header sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 print:hidden" style={theme.headerColor ? { backgroundColor: theme.headerColor } : undefined}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-inner-top backdrop-blur-md transition-all hover:border-brand-200 hover:bg-slate-50 hover:text-brand-600 hover:shadow-glow-sm active:scale-95 lg:flex"
              aria-label={sidebarCollapsed ? 'Perbesar menu samping' : 'Perkecil menu samping'}
              title={sidebarCollapsed ? 'Perbesar menu' : 'Perkecil menu'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-inner-top backdrop-blur-md transition-all hover:bg-white hover:text-brand-600 active:scale-95 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0" data-header-text>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span className="hidden sm:inline">SIAP SMP</span>
                <span className="hidden sm:inline">/</span>
                <span>{page.group}</span>
              </div>
              <h2 className="truncate text-[15px] font-bold tracking-tight text-navy-950">{page.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-inner-top backdrop-blur-md md:flex">
              <CalendarDays size={14} className="text-brand-500" />
              <div className="leading-tight">
                <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Tahun Ajaran</p>
                <p className="text-[11px] font-bold text-slate-700">{data.settings.academicYear}</p>
              </div>
              <span className="mx-1 h-6 w-px bg-slate-200/80" />
              <div className="leading-tight">
                <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Semester</p>
                <p className="text-[11px] font-bold text-brand-600">{data.settings.semester}</p>
              </div>
            </div>

            <div className="hidden items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-2.5 py-2 text-[10px] font-semibold text-emerald-700 shadow-sm shadow-emerald-500/5 backdrop-blur-sm xl:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              {formatDate(today, 'full')}
            </div>

            <NotificationsMenu />
            <div className="hidden h-7 w-px bg-slate-200/80 sm:block" />
            <ProfileMenu />
          </div>
        </header>

        <main data-content-body className="mx-auto w-full max-w-[1480px] overflow-x-clip px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 print:max-w-none print:p-0">
          {!online && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] font-medium text-amber-700">
              Mode offline: data yang tersimpan di perangkat ini digunakan. Sinkronisasi ke server akan dilakukan saat online kembali.
            </div>
          )}
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-500/25 border-t-brand-600" />
                  <span className="text-xs font-semibold text-slate-500">Memuat halaman…</span>
                </div>
              </div>
            }
          >
            <div key={location.pathname} className={pageTransitionClass}>
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <nav data-mobile-nav className="mobile-nav-glass fixed inset-x-0 bottom-0 z-40 flex pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden">
        {mobileItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          const Icon = item.icon
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[9.5px] font-semibold transition-all active:scale-90',
                active ? '' : 'text-slate-400 hover:text-slate-600',
              )}
              style={active ? { color: item.accent } : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-10 items-center justify-center rounded-lg transition-all',
                  active && 'animate-bounce-soft',
                )}
                style={
                  active
                    ? { backgroundColor: `${item.accent}1f`, boxShadow: `0 8px 20px -12px ${item.accent}` }
                    : undefined
                }
              >
                <Icon size={18} />
              </span>
              {item.label}
            </button>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2.5 text-[9.5px] font-semibold text-slate-400 transition-colors hover:text-slate-600',
            isGuru && 'hidden',
          )}
        >
          <span className="flex h-7 w-10 items-center justify-center rounded-lg">
            <Menu size={18} />
          </span>
          Menu
        </button>
      </nav>
    </div>
  )
}
