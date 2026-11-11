import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CbtAttempt, CbtExam } from '../types'
import {
  deleteCbtItem,
  fetchCbtSnapshot,
  flushPendingCbt,
  mergeCbtAttempts,
  mergeCbtExams,
  pushCbtUpdates,
} from '../lib/cbtApi'

export type CbtSyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

const STORE_KEY = 'siap-cbt-v1'

interface CbtStore {
  exams: CbtExam[]
  attempts: CbtAttempt[]
}

function loadStore(): CbtStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CbtStore>
      return {
        exams: Array.isArray(parsed.exams) ? parsed.exams : [],
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      }
    }
  } catch {
    // Lanjut dengan store kosong.
  }
  return { exams: [], attempts: [] }
}

function persist(store: CbtStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Gagal menyimpan data CBT ke localStorage.', error)
  }
}

interface CbtContextValue {
  exams: CbtExam[]
  attempts: CbtAttempt[]
  upsertExam: (exam: CbtExam) => void
  deleteExam: (id: string) => void
  upsertAttempt: (attempt: CbtAttempt, immediate?: boolean) => void
  deleteAttempt: (id: string) => void
  refreshNow: () => Promise<void>
  syncStatus: CbtSyncStatus
  lastSyncedAt: string | null
}

const CbtContext = createContext<CbtContextValue | null>(null)

/** Interval sinkronisasi otomatis dengan server. */
const SYNC_INTERVAL_MS = 15000
/** Penundaan pengiriman attempt yang sering berubah (siswa sedang mengetik). */
const ATTEMPT_PUSH_DEBOUNCE_MS = 3000

export function CbtProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<CbtStore>(loadStore)
  const [syncStatus, setSyncStatus] = useState<CbtSyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const storeRef = useRef(store)
  const pushingRef = useRef(false)
  const debouncedAttempts = useRef<Map<string, CbtAttempt>>(new Map())
  const debounceTimer = useRef<number | null>(null)

  useEffect(() => {
    storeRef.current = store
    persist(store)
  }, [store])

  const flushDebouncedAttempts = useCallback(async () => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    const items = Array.from(debouncedAttempts.current.values())
    debouncedAttempts.current.clear()
    if (items.length === 0) return
    await pushCbtUpdates([], items)
  }, [])

  const scheduleAttemptPush = useCallback(
    (attempt: CbtAttempt) => {
      debouncedAttempts.current.set(attempt.id, attempt)
      if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => {
        void flushDebouncedAttempts()
      }, ATTEMPT_PUSH_DEBOUNCE_MS)
    },
    [flushDebouncedAttempts],
  )

  /** Satu siklus sinkronisasi: ambil data server, gabungkan, lalu dorong yang lebih baru. */
  const syncCycle = useCallback(async () => {
    if (pushingRef.current) return
    pushingRef.current = true
    setSyncStatus('syncing')
    try {
      await flushDebouncedAttempts()
      const snapshot = await fetchCbtSnapshot()
      if (!snapshot) throw new Error('Server CBT tidak dapat dihubungi.')

      const mergedExams = mergeCbtExams(storeRef.current.exams, snapshot.exams, snapshot.deletedExams)
      const mergedAttempts = mergeCbtAttempts(
        storeRef.current.attempts,
        snapshot.attempts,
        snapshot.deletedAttempts,
      )

      // Kirim item lokal yang lebih baru daripada versi di server.
      const remoteExams = new Map(snapshot.exams.map((exam) => [exam.id, exam]))
      const toPushExams = mergedExams.filter((exam) => {
        const deletedAt = snapshot.deletedExams[exam.id]
        if (deletedAt && (exam.updatedAt ?? '') <= deletedAt) return false
        const remote = remoteExams.get(exam.id)
        return !remote || (exam.updatedAt ?? '') > (remote.updatedAt ?? '')
      })
      const remoteAttempts = new Map(snapshot.attempts.map((attempt) => [attempt.id, attempt]))
      const toPushAttempts = mergedAttempts.filter((attempt) => {
        const deletedAt = snapshot.deletedAttempts[attempt.id]
        if (deletedAt && (attempt.updatedAt ?? '') <= deletedAt) return false
        const remote = remoteAttempts.get(attempt.id)
        return !remote || (attempt.updatedAt ?? '') > (remote.updatedAt ?? '')
      })

      await flushPendingCbt()
      if (toPushExams.length > 0 || toPushAttempts.length > 0) {
        await pushCbtUpdates(toPushExams, toPushAttempts)
      }

      setStore({ exams: mergedExams, attempts: mergedAttempts })
      setSyncStatus('synced')
      setLastSyncedAt(new Date().toISOString())
    } catch {
      setSyncStatus('error')
    } finally {
      pushingRef.current = false
    }
  }, [])

  useEffect(() => {
    void syncCycle()
    const timer = window.setInterval(() => void syncCycle(), SYNC_INTERVAL_MS)
    return () => {
      window.clearInterval(timer)
      if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current)
    }
  }, [syncCycle])

  const upsertExam = useCallback(
    (exam: CbtExam) => {
      setStore((prev) => {
        const exists = prev.exams.some((item) => item.id === exam.id)
        return {
          ...prev,
          exams: exists
            ? prev.exams.map((item) => (item.id === exam.id ? exam : item))
            : [exam, ...prev.exams],
        }
      })
      void pushCbtUpdates([exam], []).then((ok) => {
        if (!ok) setSyncStatus('error')
      })
    },
    [],
  )

  const deleteExam = useCallback((id: string) => {
    setStore((prev) => ({ ...prev, exams: prev.exams.filter((exam) => exam.id !== id) }))
    void deleteCbtItem('exam', id)
  }, [])

  const upsertAttempt = useCallback(
    (attempt: CbtAttempt, immediate = false) => {
      setStore((prev) => {
        const exists = prev.attempts.some((item) => item.id === attempt.id)
        return {
          ...prev,
          attempts: exists
            ? prev.attempts.map((item) => (item.id === attempt.id ? attempt : item))
            : [attempt, ...prev.attempts],
        }
      })
      if (immediate) {
        debouncedAttempts.current.delete(attempt.id)
        void pushCbtUpdates([], [attempt]).then((ok) => {
          if (!ok) setSyncStatus('error')
        })
      } else {
        scheduleAttemptPush(attempt)
      }
    },
    [scheduleAttemptPush],
  )

  const deleteAttempt = useCallback((id: string) => {
    setStore((prev) => ({ ...prev, attempts: prev.attempts.filter((attempt) => attempt.id !== id) }))
    void deleteCbtItem('attempt', id)
  }, [])

  const value = useMemo<CbtContextValue>(
    () => ({
      exams: store.exams,
      attempts: store.attempts,
      upsertExam,
      deleteExam,
      upsertAttempt,
      deleteAttempt,
      refreshNow: syncCycle,
      syncStatus,
      lastSyncedAt,
    }),
    [store, upsertExam, deleteExam, upsertAttempt, deleteAttempt, syncCycle, syncStatus, lastSyncedAt],
  )

  return <CbtContext.Provider value={value}>{children}</CbtContext.Provider>
}

export function useCbt() {
  const ctx = useContext(CbtContext)
  if (!ctx) throw new Error('useCbt must be used inside CbtProvider')
  return ctx
}
