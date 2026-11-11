import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  LayoutDashboard,
  Palette,
  School,
  Settings,
  Signature,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Warna aksen untuk ikon dan sorotan menu. */
  accent: string
  /** Role yang boleh melihat menu. Kosong berarti semua role. */
  roles?: Role[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#38bdf8' },
      { to: '/absensi', label: 'Absensi', icon: ClipboardCheck, accent: '#34d399' },
    ],
  },
  {
    label: 'Ujian',
    items: [
      { to: '/cbt', label: 'Ujian CBT', icon: ClipboardList, accent: '#22d3ee' },
    ],
  },
  {
    label: 'Data Master',
    items: [
      { to: '/siswa', label: 'Data Siswa', icon: Users, accent: '#60a5fa' },
      { to: '/kelas', label: 'Data Kelas', icon: School, accent: '#fbbf24', roles: ['admin'] },
      { to: '/guru', label: 'Data Guru', icon: GraduationCap, accent: '#a78bfa', roles: ['admin'] },
    ],
  },
  {
    label: 'Analitik & Laporan',
    items: [
      { to: '/rekap', label: 'Rekap Absensi', icon: BarChart3, accent: '#f472b6' },
      { to: '/laporan', label: 'Laporan', icon: FileBarChart2, accent: '#fb923c' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/tampilan', label: 'Pengaturan Ubah', icon: Palette, accent: '#f472b6' },
      { to: '/tanda-tangan', label: 'Tanda Tangan', icon: Signature, accent: '#2dd4bf', roles: ['admin'] },
      { to: '/pengaturan', label: 'Pengaturan', icon: Settings, accent: '#c084fc', roles: ['admin'] },
    ],
  },
]

export const allMenuItems = navGroups.flatMap((group) => group.items)

/** Menu yang tidak boleh disembunyikan agar pengguna tidak terkunci. */
export const LOCKED_MENUS = ['/dashboard', '/pengaturan']

export const mobileNavItems = [
  { to: '/dashboard', label: 'Beranda', icon: LayoutDashboard, accent: '#38bdf8' },
  { to: '/absensi', label: 'Absensi', icon: ClipboardCheck, accent: '#34d399' },
  { to: '/rekap', label: 'Rekap', icon: BarChart3, accent: '#f472b6' },
  { to: '/siswa', label: 'Siswa', icon: Users, accent: '#60a5fa' },
]

export function canAccessMenu(item: NavItem, role: Role | undefined): boolean {
  if (!item.roles || item.roles.length === 0) return true
  return role ? item.roles.includes(role) : false
}

export function visibleNavGroups(role: Role | undefined, hiddenMenus: string[]): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => canAccessMenu(item, role) && !hiddenMenus.includes(item.to),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

export function visibleMobileNav(role: Role | undefined, hiddenMenus: string[]): typeof mobileNavItems {
  return mobileNavItems.filter((item) => {
    if (hiddenMenus.includes(item.to)) return false
    const match = navGroups.flatMap((group) => group.items).find((nav) => nav.to === item.to)
    return match ? canAccessMenu(match, role) : true
  })
}
