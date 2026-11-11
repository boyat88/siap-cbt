import type { CbtAttempt, CbtExam, CbtQuestion, CbtViolationType } from '../types'

/** Label opsi PG: A-D. */
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

export const VIOLATION_META: Record<CbtViolationType, { label: string; description: string }> = {
  'switch-tab': {
    label: 'Pindah tab/aplikasi',
    description: 'Anda terdeteksi berpindah tab atau membuka aplikasi lain saat ujian berlangsung.',
  },
  'leave-screen': {
    label: 'Keluar layar',
    description: 'Anda terdeteksi mengklik atau berpindah keluar dari jendela ujian.',
  },
  'exit-fullscreen': {
    label: 'Keluar mode layar penuh',
    description: 'Anda keluar dari mode layar penuh. Ujian wajib dikerjakan dalam layar penuh.',
  },
  'dual-screen': {
    label: 'Dua layar terdeteksi',
    description: 'Perangkat ini terhubung ke lebih dari satu layar/monitor.',
  },
}

/** Karakter token tanpa huruf/angka yang mudah tertukar (I, O, 0, 1). */
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateToken(length = 6): string {
  const random = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(random)
  } else {
    for (let i = 0; i < length; i += 1) random[i] = Math.floor(Math.random() * 0xffffffff)
  }
  let token = ''
  for (let i = 0; i < length; i += 1) token += TOKEN_CHARS[random[i] % TOKEN_CHARS.length]
  return token
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Apakah browser mendukung deteksi lebih dari satu layar (Window Management API). */
export function supportsDualScreenDetection(): boolean {
  try {
    return typeof window.screen !== 'undefined' && 'isExtended' in window.screen
  } catch {
    return false
  }
}

/** Deteksi perangkat terhubung ke monitor/proyektor tambahan (Chrome/Edge 100+). */
export function detectDualScreen(): boolean {
  try {
    const screen = window.screen as Screen & { isExtended?: boolean }
    return screen.isExtended === true
  } catch {
    return false
  }
}

export function pgQuestions(exam: CbtExam): CbtQuestion[] {
  return exam.questions.filter((q) => q.type === 'pg')
}

export function essayQuestions(exam: CbtExam): CbtQuestion[] {
  return exam.questions.filter((q) => q.type === 'essay')
}

export function examTotalPoints(exam: CbtExam): number {
  return exam.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
}

export function examPgPoints(exam: CbtExam): number {
  return pgQuestions(exam).reduce((sum, q) => sum + (Number(q.points) || 0), 0)
}

export function examEssayPoints(exam: CbtExam): number {
  return essayQuestions(exam).reduce((sum, q) => sum + (Number(q.points) || 0), 0)
}

/** Poin PG yang dijawab benar siswa (dinilai otomatis). */
export function scoreAuto(exam: CbtExam, attempt: CbtAttempt): number {
  return pgQuestions(exam).reduce((sum, q) => {
    return attempt.answers[q.id] !== undefined && attempt.answers[q.id] === q.answer ? sum + (Number(q.points) || 0) : sum
  }, 0)
}

/** Poin esai yang sudah dinilai guru (dibatasi maksimal poin soal). */
export function essayPointsEarned(exam: CbtExam, attempt: CbtAttempt): number {
  return essayQuestions(exam).reduce((sum, q) => {
    const given = attempt.essayScores?.[q.id]
    if (given === undefined) return sum
    return sum + Math.max(0, Math.min(Number(given) || 0, Number(q.points) || 0))
  }, 0)
}

/** Jumlah soal esai yang belum dinilai guru. */
export function ungradedEssayCount(exam: CbtExam, attempt: CbtAttempt): number {
  return essayQuestions(exam).filter((q) => attempt.essayScores?.[q.id] === undefined).length
}

/** Nilai akhir 0-100 dari poin PG otomatis + esai yang sudah dinilai. */
export function computeFinalScore(exam: CbtExam, attempt: CbtAttempt): number {
  const total = examTotalPoints(exam)
  if (total <= 0) return 0
  const earned = scoreAuto(exam, attempt) + essayPointsEarned(exam, attempt)
  return Math.round((earned / total) * 100)
}

/** Ringkasan progres jawaban siswa pada urutan soalnya. */
export function attemptProgress(exam: CbtExam, attempt: CbtAttempt): { answered: number; total: number } {
  const ids = attempt.questionOrder.filter((id) => exam.questions.some((q) => q.id === id))
  const answered = ids.filter((id) => (attempt.answers[id] ?? '').trim() !== '').length
  return { answered, total: ids.length }
}

/**
 * Menuntaskan attempt: menandai waktu submit, menghitung poin PG otomatis,
 * dan nilai akhir (langsung jika tidak ada soal esai).
 */
export function finalizeAttempt(
  exam: CbtExam,
  attempt: CbtAttempt,
  status: 'selesai' | 'diskualifikasi',
): CbtAttempt {
  const now = new Date().toISOString()
  const autoPoints = scoreAuto(exam, attempt)
  const pgTotalPoints = examPgPoints(exam)
  const next: CbtAttempt = {
    ...attempt,
    status,
    submittedAt: now,
    autoPoints,
    pgTotalPoints,
    updatedAt: now,
  }
  if (essayQuestions(exam).length === 0) {
    next.finalScore = computeFinalScore(exam, next)
  } else {
    // Nilai akhir diisi setelah guru menilai esai.
    next.finalScore = attempt.finalScore
  }
  return next
}

/** Format sisa waktu ujian menjadi hh:mm:ss / mm:ss. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** Selisih waktu pengerjaan dalam menit. */
export function durationMinutes(attempt: CbtAttempt): number {
  const end = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : Date.now()
  const start = new Date(attempt.startedAt).getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}
