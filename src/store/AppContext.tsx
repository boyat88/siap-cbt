import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, AppNotification, AttendanceSession, ClassRoom, Settings, Student, Teacher, User } from '../types'
import { demoAccounts, demoTeacherAccount, seedData } from '../data/seed'
import { LOCKED_MENUS } from '../lib/navigation'
import { teacherSubjects, type LegacyTeacher } from '../lib/teacher'
import { apiUrl } from '../lib/serverUrl'
import {
  deleteAttendanceSession,
  fetchAttendanceSnapshot,
  flushPendingAttendance,
  mergeSessions,
  pendingAttendanceCount,
  pushAttendanceSessions,
} from '../lib/attendanceApi'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

const DATA_KEY = 'siap-absensi-v1'
const AUTH_KEY = 'siap-absensi-auth-v1'
const PROFILE_KEY = 'siap-absensi-profiles-v1'
const MENU_KEY = 'siap-absensi-menu-v1'

function persist(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Gagal menyimpan ${key} ke localStorage.`, error)
  }
}

function loadProfiles(): Record<string, Partial<User>> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Partial<User>>) : {}
  } catch {
    return {}
  }
}

export function readStoredProfiles(): Record<string, Partial<User>> {
  return loadProfiles()
}

function saveProfile(id: string, profile: User) {
  const profiles = loadProfiles()
  profiles[id] = profile
  persist(PROFILE_KEY, JSON.stringify(profiles))
}

function loadHiddenMenus(): string[] {
  try {
    const raw = localStorage.getItem(MENU_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && !LOCKED_MENUS.includes(item))
  } catch {
    return []
  }
}

interface AppContextValue {
  data: AppData
  user: User | null
  login: (email: string, password: string) => boolean
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  upsertSession: (session: AttendanceSession) => void
  deleteSession: (id: string) => void
  addStudent: (student: Student) => void
  updateStudent: (student: Student) => void
  deleteStudent: (id: string) => void
  addTeacher: (teacher: Teacher) => void
  updateTeacher: (teacher: Teacher) => void
  deleteTeacher: (id: string) => void
  addClass: (clazz: ClassRoom) => void
  updateClass: (clazz: ClassRoom) => void
  deleteClass: (id: string) => void
  addNotification: (notification: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  updateSettings: (settings: Settings) => void
  hiddenMenus: string[]
  toggleMenuVisibility: (path: string) => void
  resetMenuVisibility: () => void
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  pendingSyncCount: number
  syncNow: () => Promise<void>
  refreshFromServer: () => Promise<void>
  resetData: () => void
  restoreData: (data: AppData, profiles: Record<string, Partial<User>>) => void
  clearPeopleData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

function migrateSettingsFormat(data: AppData): AppData {
  return {
    ...data,
    settings: {
      ...data.settings,
      holidays: Array.isArray(data.settings?.holidays) ? data.settings.holidays : [],
    },
  }
}

function migrateClassFormat(data: AppData): AppData {
  const hasSectionNames = data.classes.some((clazz) => /^[789][A-Za-z]$/i.test(clazz.name.trim()))
  if (!hasSectionNames) return data

  const oldToNewClass = new Map<string, string>()
  const newClasses: ClassRoom[] = []

  for (const grade of [7, 8, 9] as const) {
    const group = data.classes.filter((clazz) => clazz.grade === grade)
    if (group.length === 0) continue
    const id = `k${grade}`
    newClasses.push({
      id,
      name: String(grade),
      grade,
      homeroomId: group[0].homeroomId,
      academicYear: group[0].academicYear,
    })
    for (const clazz of group) oldToNewClass.set(clazz.id, id)
  }

  const students = data.students.map((student) => ({
    ...student,
    classId: oldToNewClass.get(student.classId) ?? student.classId,
  }))

  const merged = new Map<string, AttendanceSession>()
  for (const session of data.sessions) {
    const classId = oldToNewClass.get(session.classId) ?? session.classId
    const key = `${session.date}|${classId}|${session.period}`
    const existing = merged.get(key)
    if (existing) {
      existing.records = { ...existing.records, ...session.records }
      existing.note = [existing.note, session.note].filter(Boolean).join(' ')
      if (session.createdAt < existing.createdAt) existing.createdAt = session.createdAt
      if (session.updatedAt > existing.updatedAt) existing.updatedAt = session.updatedAt
    } else {
      merged.set(key, {
        ...session,
        id: `ses_${session.date}_${classId}_${session.period.replace(/[^a-zA-Z0-9]/g, '')}`,
        classId,
      })
    }
  }

  return {
    ...data,
    classes: newClasses,
    students,
    sessions: Array.from(merged.values()),
  }
}

/**
 * Guru lama belum memiliki akun login. Daftarkan akun demo untuk guru seed t2
 * sekali saja; akun guru lain tetap harus dibuat oleh administrator.
 */
function migrateTeacherAccounts(data: AppData): AppData {
  let changed = false
  const teachers = data.teachers.map((teacher) => {
    if (teacher.id !== 't2' || teacher.accountActive !== undefined || teacher.loginPassword) return teacher
    changed = true
    return {
      ...teacher,
      email:
        teacher.email === 'rudi.hartono@smpn1cikatomas.sch.id'
          ? demoTeacherAccount.email
          : teacher.email,
      accountActive: true,
      loginPassword: demoTeacherAccount.password,
    }
  })
  return changed ? { ...data, teachers } : data
}

/**
 * Data guru lama hanya menyimpan satu `subject`. Ubah menjadi `subjects`
 * (array) tanpa batas jumlah agar satu guru dapat mengampu banyak mapel.
 */
function migrateTeacherSubjects(data: AppData): AppData {
  let changed = false
  const teachers = data.teachers.map((teacher) => {
    const legacy = teacher as LegacyTeacher
    const hasArray = Array.isArray(legacy.subjects)
    const hasLegacy = typeof legacy.subject === 'string'
    if (hasArray && !hasLegacy) return teacher
    const { subject: _subject, ...rest } = legacy
    changed = true
    return { ...rest, subjects: teacherSubjects(legacy) }
  })
  return changed ? { ...data, teachers } : data
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed.students && parsed.classes && parsed.sessions) {
        const migrated = migrateSettingsFormat(
          migrateTeacherSubjects(migrateTeacherAccounts(migrateClassFormat(parsed))),
        )
        if (migrated !== parsed) persist(DATA_KEY, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch {
    // fall through to fresh seed
  }
  const fresh = seedData()
  persist(DATA_KEY, JSON.stringify(fresh))
  return fresh
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (!raw) return null
      const stored = JSON.parse(raw) as User
      const migratedEmail: Record<string, string> = {
        'admin@smpn1cikatomas.sch.id': 'admin@smpnsatap1ckm.sch.id',
        'guru@smpn1cikatomas.sch.id': 'guru@smpnsatap1ckm.sch.id',
      }
      if (migratedEmail[stored.email]) stored.email = migratedEmail[stored.email]
      return stored
    } catch {
      return null
    }
  })
  const [hiddenMenus, setHiddenMenus] = useState<string[]>(loadHiddenMenus)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const dataRef = useRef(data)
  const hasLoadedFromServer = useRef(false)
  const isApplyingRemote = useRef(false)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    persist(DATA_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (user) persist(AUTH_KEY, JSON.stringify(user))
    else persist(AUTH_KEY, null)
  }, [user])

  useEffect(() => {
    persist(MENU_KEY, JSON.stringify(hiddenMenus))
  }, [hiddenMenus])

  const login = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase()
      const admin = demoAccounts.find(
        (account) =>
          account.email.toLowerCase() === normalized && account.password === password,
      )
      if (admin) {
        const { password: _pw, ...base } = admin
        const profile = { ...base, ...loadProfiles()[admin.id] }
        setUser(profile)
        return true
      }

      // Akun guru hanya bisa masuk jika sudah didaftarkan & diaktifkan administrator.
      const teacher = data.teachers.find(
        (item) =>
          item.accountActive === true &&
          item.status === 'aktif' &&
          item.email.toLowerCase() === normalized &&
          item.loginPassword === password,
      )
      if (!teacher) return false

      const id = teacher.id === 't2' ? 'u_guru' : `u_teacher_${teacher.id}`
      const base: User = {
        id,
        name: teacher.name,
        email: teacher.email,
        role: 'guru',
        nip: teacher.nip,
        subject: teacherSubjects(teacher).join(', '),
        phone: teacher.phone,
        photo: teacher.photo,
      }
      setUser({ ...base, ...loadProfiles()[id] })
      return true
    },
    [data.teachers],
  )

  const logout = useCallback(() => setUser(null), [])

  const updateProfile = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      saveProfile(prev.id, next)
      return next
    })
  }, [])

  const pushCoreToServer = useCallback(async () => {
    if (isApplyingRemote.current || !hasLoadedFromServer.current) return
    try {
      await fetch(apiUrl('/api/state'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { ...data, sessions: [] },
          profiles: loadProfiles(),
          hiddenMenus,
        }),
      })
    } catch {
      // Abaikan kegagalan jaringan; data tetap tersimpan lokal.
    }
  }, [data, hiddenMenus])

  const refreshFromServer = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/state'))
      if (!response.ok) return
      const state = (await response.json()) as {
        data?: AppData
        profiles?: Record<string, Partial<User>>
        hiddenMenus?: string[]
      }
      const hasData =
        !!state?.data &&
        (Array.isArray(state.data.students) ||
          Array.isArray(state.data.teachers) ||
          Array.isArray(state.data.classes))
      if (!hasData && !state?.profiles && !Array.isArray(state?.hiddenMenus)) {
        if (!hasLoadedFromServer.current) {
          hasLoadedFromServer.current = true
          void pushCoreToServer()
        }
        return
      }

      isApplyingRemote.current = true
      if (state.data) {
        const migrated = migrateTeacherSubjects(
          migrateTeacherAccounts(migrateClassFormat(state.data)),
        )
        setData((prev) => ({
          ...prev,
          students: migrated.students,
          teachers: migrated.teachers,
          classes: migrated.classes,
          notifications: migrated.notifications,
          settings: migrated.settings,
        }))
      }
      if (state.profiles && typeof state.profiles === 'object') {
        persist(PROFILE_KEY, JSON.stringify(state.profiles))
        setUser((prev) =>
          prev && state.profiles?.[prev.id] ? { ...prev, ...state.profiles[prev.id] } : prev,
        )
      }
      if (Array.isArray(state.hiddenMenus)) {
        setHiddenMenus(
          state.hiddenMenus.filter(
            (item): item is string => typeof item === 'string' && !LOCKED_MENUS.includes(item),
          ),
        )
      }
      hasLoadedFromServer.current = true
    } catch {
      // Server tidak tersedia; gunakan data lokal.
    } finally {
      window.setTimeout(() => {
        isApplyingRemote.current = false
      }, 0)
    }
  }, [])

  useEffect(() => {
    void refreshFromServer()
  }, [refreshFromServer])

  useEffect(() => {
    const timer = window.setInterval(() => void refreshFromServer(), 30000)
    return () => window.clearInterval(timer)
  }, [refreshFromServer])

  useEffect(() => {
    if (!hasLoadedFromServer.current) return
    const timer = window.setTimeout(() => {
      void pushCoreToServer()
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [data, hiddenMenus, pushCoreToServer])

  const syncNow = useCallback(async () => {
    if (!user) return
    setSyncStatus('syncing')
    try {
      const snapshot = await fetchAttendanceSnapshot()
      if (!snapshot) throw new Error('Server tidak dapat dihubungi.')
      const remote = snapshot.sessions
      const local = dataRef.current.sessions
      const merged = mergeSessions(local, remote, snapshot.deleted)
      setData((prev) => ({ ...prev, sessions: mergeSessions(prev.sessions, remote, snapshot.deleted) }))

      const remoteMap = new Map(remote.map((session) => [session.id, session]))
      const pending = merged.filter((session) => {
        const deletedAt = snapshot.deleted[session.id]
        if (deletedAt && (session.updatedAt ?? '') <= deletedAt) return false
        const existing = remoteMap.get(session.id)
        return !existing || (session.updatedAt ?? '') > (existing.updatedAt ?? '')
      })
      if (pending.length > 0) {
        const ok = await pushAttendanceSessions(pending, user)
        if (!ok) throw new Error('Sebagian absensi belum terkirim.')
      }
      await flushPendingAttendance(user)
      setSyncStatus('synced')
      setLastSyncedAt(new Date().toISOString())
      setPendingSyncCount(0)
    } catch {
      setSyncStatus('error')
      setPendingSyncCount(pendingAttendanceCount())
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setSyncStatus('idle')
      return
    }
    void syncNow()
    const timer = window.setInterval(() => void syncNow(), 30000)
    return () => window.clearInterval(timer)
  }, [user, syncNow])

  const upsertSession = useCallback(
    (session: AttendanceSession) => {
      const stamped: AttendanceSession = {
        ...session,
        submittedById: user?.id,
        submittedByName: user?.name,
        submittedByRole: user?.role,
        syncedAt: new Date().toISOString(),
      }
      setData((prev) => {
        const exists = prev.sessions.some((item) => item.id === stamped.id)
        return {
          ...prev,
          sessions: exists
            ? prev.sessions.map((item) => (item.id === stamped.id ? stamped : item))
            : [stamped, ...prev.sessions],
        }
      })
      setSyncStatus('syncing')
      void pushAttendanceSessions([stamped], user).then((ok) => {
        setSyncStatus(ok ? 'synced' : 'error')
        if (ok) {
          setLastSyncedAt(new Date().toISOString())
          setPendingSyncCount(0)
        } else {
          setPendingSyncCount(pendingAttendanceCount())
        }
      })
    },
    [user],
  )

  const deleteSession = useCallback((id: string) => {
    setData((prev) => ({ ...prev, sessions: prev.sessions.filter((session) => session.id !== id) }))
    void deleteAttendanceSession(id)
  }, [])

  const addStudent = useCallback((student: Student) => {
    setData((prev) => ({ ...prev, students: [student, ...prev.students] }))
  }, [])

  const updateStudent = useCallback((student: Student) => {
    setData((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === student.id ? student : s)) }))
  }, [])

  const deleteStudent = useCallback((id: string) => {
    setData((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== id) }))
  }, [])

  const addTeacher = useCallback((teacher: Teacher) => {
    setData((prev) => ({ ...prev, teachers: [teacher, ...prev.teachers] }))
  }, [])

  const updateTeacher = useCallback((teacher: Teacher) => {
    setData((prev) => ({ ...prev, teachers: prev.teachers.map((t) => (t.id === teacher.id ? teacher : t)) }))
  }, [])

  const deleteTeacher = useCallback((id: string) => {
    setData((prev) => ({ ...prev, teachers: prev.teachers.filter((t) => t.id !== id) }))
  }, [])

  const addClass = useCallback((clazz: ClassRoom) => {
    setData((prev) => ({ ...prev, classes: [...prev.classes, clazz] }))
  }, [])

  const updateClass = useCallback((clazz: ClassRoom) => {
    setData((prev) => ({ ...prev, classes: prev.classes.map((c) => (c.id === clazz.id ? clazz : c)) }))
  }, [])

  const deleteClass = useCallback((id: string) => {
    setData((prev) => ({ ...prev, classes: prev.classes.filter((c) => c.id !== id) }))
  }, [])

  const addNotification = useCallback((notification: AppNotification) => {
    setData((prev) => ({ ...prev, notifications: [notification, ...prev.notifications] }))
  }, [])

  const markRead = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  }, [])

  const markAllRead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }))
  }, [])

  const updateSettings = useCallback((settings: Settings) => {
    setData((prev) => ({ ...prev, settings }))
  }, [])

  const toggleMenuVisibility = useCallback((path: string) => {
    if (LOCKED_MENUS.includes(path)) return
    setHiddenMenus((prev) => (prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]))
  }, [])

  const resetMenuVisibility = useCallback(() => setHiddenMenus([]), [])

  const resetData = useCallback(() => {
    const fresh = seedData()
    setData(fresh)
  }, [])

  const restoreData = useCallback((next: AppData, profiles: Record<string, Partial<User>>) => {
    const migrated = migrateSettingsFormat(migrateTeacherSubjects(migrateTeacherAccounts(migrateClassFormat(next))))
    setData(migrated)
    persist(DATA_KEY, JSON.stringify(migrated))

    if (Object.keys(profiles).length > 0) {
      persist(PROFILE_KEY, JSON.stringify(profiles))
      setUser((prev) => (prev && profiles[prev.id] ? { ...prev, ...profiles[prev.id] } : prev))
    }
  }, [])

  const clearPeopleData = useCallback(() => {
    setData((prev) => ({
      ...prev,
      students: [],
      teachers: [],
      sessions: [],
      notifications: [],
      // Lepaskan wali kelas agar tidak menunjuk ke guru yang sudah dihapus.
      classes: prev.classes.map((clazz) => ({ ...clazz, homeroomId: '' })),
    }))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      user,
      login,
      logout,
      updateProfile,
      upsertSession,
      deleteSession,
      addStudent,
      updateStudent,
      deleteStudent,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      addClass,
      updateClass,
      deleteClass,
      addNotification,
      markRead,
      markAllRead,
      updateSettings,
      hiddenMenus,
      toggleMenuVisibility,
      resetMenuVisibility,
      syncStatus,
      lastSyncedAt,
      pendingSyncCount,
      syncNow,
      refreshFromServer,
      resetData,
      restoreData,
      clearPeopleData,
    }),
    [
      data,
      user,
      login,
      logout,
      updateProfile,
      upsertSession,
      deleteSession,
      addStudent,
      updateStudent,
      deleteStudent,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      addClass,
      updateClass,
      deleteClass,
      addNotification,
      markRead,
      markAllRead,
      updateSettings,
      hiddenMenus,
      toggleMenuVisibility,
      resetMenuVisibility,
      syncStatus,
      lastSyncedAt,
      pendingSyncCount,
      syncNow,
      refreshFromServer,
      resetData,
      restoreData,
      clearPeopleData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
