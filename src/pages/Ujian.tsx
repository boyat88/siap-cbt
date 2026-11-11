import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Timer,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ProgressRing,
  Textarea,
  cn,
  useToast,
} from '../components/ui'
import { RichContent } from '../components/RichContent'
import { useApp } from '../store/AppContext'
import { useCbt } from '../store/CbtContext'
import {
  OPTION_LABELS,
  VIOLATION_META,
  attemptProgress,
  detectDualScreen,
  finalizeAttempt,
  formatCountdown,
  ungradedEssayCount,
} from '../lib/cbt'
import { classLabel, formatTime } from '../lib/utils'
import type { CbtAttempt, CbtExam, CbtQuestion, CbtViolationType, Student } from '../types'

const ACTIVE_KEY = 'siap-cbt-active-v1'

type Phase = 'landing' | 'petunjuk' | 'ujian' | 'selesai'

export function Ujian() {
  const { data } = useApp()
  const cbt = useCbt()
  const navigate = useNavigate()
  const toast = useToast()

  const [phase, setPhase] = useState<Phase>('landing')
  const [nisn, setNisn] = useState('')
  const [token, setToken] = useState('')
  const [landingError, setLandingError] = useState<string | null>(null)
  const [landingInfo, setLandingInfo] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const [exam, setExam] = useState<CbtExam | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [violationWarn, setViolationWarn] = useState<{ type: CbtViolationType; count: number; max: number } | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [disqualified, setDisqualified] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [startError, setStartError] = useState<string | null>(null)
  const [fullscreenFailed, setFullscreenFailed] = useState(false)

  const submittingRef = useRef(false)
  const didFullscreenRef = useRef(false)
  const lastViolationAtRef = useRef(0)
  const attemptRef = useRef<CbtAttempt | null>(null)
  const examRef = useRef<CbtExam | null>(exam)
  const intervalRef = useRef<number | null>(null)

  const attempt = useMemo(
    () => (attemptId ? cbt.attempts.find((item) => item.id === attemptId) ?? null : null),
    [attemptId, cbt.attempts],
  )

  // Sinkronkan referensi mutable agar listener anti-cheat selalu membaca data terbaru.
  useEffect(() => {
    attemptRef.current = attempt
  }, [attempt])
  useEffect(() => {
    examRef.current = exam
  }, [exam])

  // Muat ulang dari server agar daftar ujian & attempt terbaru.
  useEffect(() => {
    void cbt.refreshNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-resume attempt yang masih berlangsung pada perangkat yang sama (sekali saat mount).
  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_KEY)
    if (!activeId) return
    const found = cbt.attempts.find((item) => item.id === activeId)
    if (!found) return
    const ex = cbt.exams.find((item) => item.id === found.examId)
    if (!ex) return
    const stu = data.students.find((s) => s.id === found.studentId) ?? null
    setExam(ex)
    setStudent(stu)
    setAttemptId(found.id)
    attemptRef.current = found
    if (found.status === 'berlangsung' && ex.status === 'aktif') {
      setPhase('ujian')
    } else {
      setDisqualified(found.status === 'diskualifikasi')
      setPhase('selesai')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Penanda ready: CbtProvider tidak mengekspos ready; gunakan first sync sebagai trigger.
  // Jalankan auto-resume juga setelah data tersedia.
  useEffect(() => {
    if (phase !== 'landing') return
    const activeId = localStorage.getItem(ACTIVE_KEY)
    if (!activeId) return
    const found = cbt.attempts.find((item) => item.id === activeId)
    if (!found) return
    const ex = cbt.exams.find((item) => item.id === found.examId)
    if (!ex) return
    if (found.status === 'berlangsung' && ex.status === 'aktif') {
      const stu = data.students.find((s) => s.id === found.studentId) ?? null
      setExam(ex)
      setStudent(stu)
      setAttemptId(found.id)
      setPhase('ujian')
    }
  }, [cbt.exams, cbt.attempts, data.students, phase])

  // Timer ujian: tick setiap detik.
  useEffect(() => {
    if (phase !== 'ujian') {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [phase])

  // Auto-submit saat waktu habis.
  useEffect(() => {
    if (phase !== 'ujian' || !attempt || !exam) return
    if (attempt.status !== 'berlangsung') return
    const expiresAt = new Date(attempt.expiresAt).getTime()
    if (now >= expiresAt && !submittingRef.current) {
      doSubmit('waktu habis', { status: 'selesai' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase])

  // Jika ujian ditutup guru saat siswa masih mengerjakan -> kumpulkan otomatis.
  useEffect(() => {
    if (phase !== 'ujian' || !exam) return
    if (exam.status !== 'aktif' && attempt?.status === 'berlangsung' && !submittingRef.current) {
      doSubmit('ujian ditutup', { status: 'selesai' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.status])

  const remainingMs = attempt ? new Date(attempt.expiresAt).getTime() - now : 0

  const recordViolation = useCallback((type: CbtViolationType) => {
    if (submittingRef.current) return
    const current = attemptRef.current
    const currentExam = examRef.current
    if (!current || !currentExam || current.status !== 'berlangsung') return

    const nowIso = new Date().toISOString()
    // Debounce agar visibilitychange + blur tidak dihitung dua kali.
    if (nowIso < new Date(lastViolationAtRef.current + 1200).toISOString()) return
    lastViolationAtRef.current = Date.parse(nowIso)

    const violations = [...current.violations, { type, at: nowIso }]
    const count = violations.length
    const max = currentExam.maxViolations || 3

    if (count >= max) {
      // Diskualifikasi otomatis.
      const finished = finalizeAttempt(currentExam, { ...current, violations, updatedAt: nowIso }, 'diskualifikasi')
      cbt.upsertAttempt(finished, true)
      submittingRef.current = true
      localStorage.removeItem(ACTIVE_KEY)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
      setDisqualified(true)
      setPhase('selesai')
      toast('Anda didiskualifikasi karena pelanggaran berulang.', 'error')
      return
    }

    cbt.upsertAttempt({ ...current, violations, updatedAt: nowIso }, true)
    setViolationWarn({ type, count, max })
  }, [cbt, toast])

  // Listener anti-cheat, hanya aktif selama phase ujian.
  useEffect(() => {
    if (phase !== 'ujian') return
    const onVisibility = () => {
      if (document.hidden) recordViolation('switch-tab')
    }
    const onBlur = () => {
      if (!document.hidden) recordViolation('leave-screen')
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && didFullscreenRef.current && !submittingRef.current) {
        recordViolation('exit-fullscreen')
      }
    }
    const block = (event: Event) => {
      event.preventDefault()
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submittingRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const dualTimer = window.setInterval(() => {
      if (detectDualScreen()) recordViolation('dual-screen')
    }, 3000)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.addEventListener('paste', block)
    document.addEventListener('contextmenu', block)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('paste', block)
      document.removeEventListener('contextmenu', block)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.clearInterval(dualTimer)
    }
  }, [phase, recordViolation])

  const doSubmit = useCallback((reason: string, options: { status?: 'selesai' | 'diskualifikasi' } = {}) => {
    if (submittingRef.current) return
    submittingRef.current = true
    const current = attemptRef.current
    const currentExam = examRef.current
    if (!current || !currentExam) return
    const status = options.status ?? 'selesai'
    const finished = finalizeAttempt(currentExam, current, status)
    cbt.upsertAttempt(finished, true)
    localStorage.removeItem(ACTIVE_KEY)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
    setDisqualified(status === 'diskualifikasi')
    setPhase('selesai')
    if (reason !== 'manual') {
      toast(reason === 'waktu habis' ? 'Waktu habis, jawaban dikumpulkan otomatis.' : 'Ujian dikumpulkan.', 'info')
    }
  }, [cbt, toast])

  const handleStart = async () => {
    if (!exam) return
    setStartError(null)
    if (detectDualScreen()) {
      setStartError('Monitor kedua terdeteksi pada perangkat ini. Lepaskan koneksi monitor/proyektor tambahan sebelum memulai ujian.')
      return
    }
    setFullscreenFailed(false)
    try {
      await document.documentElement.requestFullscreen()
      didFullscreenRef.current = true
    } catch {
      didFullscreenRef.current = false
      setFullscreenFailed(true)
    }
    const nowIso = new Date().toISOString()
    const questionOrder = exam.shuffleQuestions
      ? [...exam.questions.map((q) => q.id)].sort(() => Math.random() - 0.5)
      : exam.questions.map((q) => q.id)
    const optionOrder: Record<string, number[]> = {}
    for (const q of exam.questions) {
      if (q.type !== 'pg') continue
      const indices = q.options.map((_, i) => i)
      optionOrder[q.id] = exam.shuffleOptions
        ? indices.sort(() => Math.random() - 0.5)
        : indices
    }
    const newAttempt: CbtAttempt = {
      id: `att_${exam.id}_${student?.id ?? 'anon'}`,
      examId: exam.id,
      studentId: student?.id ?? '',
      studentName: student?.name ?? '',
      classId: student?.classId ?? '',
      className: student?.classId ? data.classes.find((c) => c.id === student.classId)?.name ?? '' : '',
      startedAt: nowIso,
      expiresAt: new Date(Date.now() + exam.durationMinutes * 60000).toISOString(),
      questionOrder,
      optionOrder,
      answers: {},
      status: 'berlangsung',
      violations: [],
      updatedAt: nowIso,
    }
    cbt.upsertAttempt(newAttempt, true)
    localStorage.setItem(ACTIVE_KEY, newAttempt.id)
    setAttemptId(newAttempt.id)
    attemptRef.current = newAttempt
    setCurrentIndex(0)
    setPhase('ujian')
  }

  const updateAnswer = (questionId: string, value: string) => {
    const current = attemptRef.current
    if (!current || current.status !== 'berlangsung') return
    const next: CbtAttempt = {
      ...current,
      answers: { ...current.answers, [questionId]: value },
      updatedAt: new Date().toISOString(),
    }
    attemptRef.current = next
    cbt.upsertAttempt(next, false)
  }

  const submitManual = () => {
    setConfirmSubmit(false)
    doSubmit('manual', { status: 'selesai' })
  }

  const validateLanding = async () => {
    setLandingError(null)
    setLandingInfo(null)
    const nisnValue = nisn.trim()
    const tokenValue = token.trim().toUpperCase()
    if (!nisnValue || !tokenValue) {
      setLandingError('NISN dan token ujian wajib diisi.')
      return
    }
    setValidating(true)
    try {
      const studentFound = data.students.find((s) => s.nisn === nisnValue && s.status === 'aktif')
      if (!studentFound) {
        setLandingError('NISN tidak ditemukan atau siswa tidak aktif.')
        return
      }
      const examFound = cbt.exams.find((e) => e.token.toUpperCase() === tokenValue)
      if (!examFound) {
        setLandingError('Token ujian tidak valid. Pastikan token dari guru benar.')
        return
      }
      if (examFound.status !== 'aktif') {
        setLandingError('Ujian tidak sedang aktif. Tunggu instruksi guru.')
        return
      }
      if (!examFound.classIds.includes(studentFound.classId)) {
        setLandingError('Kelas Anda tidak terdaftar pada ujian ini.')
        return
      }
      if (examFound.questions.length === 0) {
        setLandingError('Ujian belum memiliki soal.')
        return
      }

      const existingAttempts = cbt.attempts.filter((a) => a.examId === examFound.id && a.studentId === studentFound.id)
      // attempts diurutkan updatedAt desc, jadi index 0 adalah yang terbaru.
      const latestAttempt = existingAttempts.length > 0 ? existingAttempts[0] : null

      if (latestAttempt && latestAttempt.status === 'berlangsung') {
        setExam(examFound)
        setStudent(studentFound)
        setAttemptId(latestAttempt.id)
        attemptRef.current = latestAttempt
        setCurrentIndex(0)
        setPhase('ujian')
        return
      }

      // Sudah selesai / didiskualifikasi.
      if (latestAttempt && (latestAttempt.status === 'selesai' || latestAttempt.status === 'diskualifikasi')) {
        // Cek apakah admin mengizinkan pengulangan.
        if (latestAttempt.retakeApproved) {
          // Buat attempt baru untuk pengulangan.
          const retakeNum = existingAttempts.length
          const nowIso = new Date().toISOString()
          const questionOrder = examFound.shuffleQuestions
            ? [...examFound.questions.map((q) => q.id)].sort(() => Math.random() - 0.5)
            : examFound.questions.map((q) => q.id)
          const optionOrder: Record<string, number[]> = {}
          for (const q of examFound.questions) {
            if (q.type !== 'pg') continue
            const indices = q.options.map((_, i) => i)
            optionOrder[q.id] = examFound.shuffleOptions
              ? indices.sort(() => Math.random() - 0.5)
              : indices
          }
          const newAttempt: CbtAttempt = {
            id: `att_${examFound.id}_${studentFound.id}_r${retakeNum}`,
            examId: examFound.id,
            studentId: studentFound.id,
            studentName: studentFound.name,
            classId: studentFound.classId,
            className: data.classes.find((c) => c.id === studentFound.classId)?.name ?? '',
            startedAt: nowIso,
            expiresAt: new Date(Date.now() + examFound.durationMinutes * 60000).toISOString(),
            questionOrder,
            optionOrder,
            answers: {},
            status: 'berlangsung',
            violations: [],
            previousAttemptId: latestAttempt.id,
            updatedAt: nowIso,
          }
          cbt.upsertAttempt(newAttempt, true)
          localStorage.setItem(ACTIVE_KEY, newAttempt.id)
          setExam(examFound)
          setStudent(studentFound)
          setAttemptId(newAttempt.id)
          attemptRef.current = newAttempt
          setCurrentIndex(0)
          setPhase('ujian')
          toast('Pengulangan ujian diizinkan oleh administrator.', 'info')
          return
        }

        // Tidak diizinkan mengulang.
        setExam(examFound)
        setStudent(studentFound)
        setAttemptId(latestAttempt.id)
        attemptRef.current = latestAttempt
        setDisqualified(latestAttempt.status === 'diskualifikasi')
        setPhase('selesai')
        return
      }

      setExam(examFound)
      setStudent(studentFound)
      setPhase('petunjuk')
    } finally {
      setValidating(false)
    }
  }

  const currentQuestion: CbtQuestion | null = useMemo(() => {
    if (!exam || !attempt) return null
    const id = attempt.questionOrder[currentIndex]
    return exam.questions.find((q) => q.id === id) ?? null
  }, [exam, attempt, currentIndex])

  const progress = exam && attempt ? attemptProgress(exam, attempt) : { answered: 0, total: 0 }

  // ---------- LAYAR LANDING ----------
  if (phase === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-800 to-brand-700 px-4 py-10 text-white">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold backdrop-blur">
              CBT
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mode Ujian Siswa</h1>
            <p className="mt-1 text-sm text-slate-200">
              {data.settings.school.name}
            </p>
          </div>

          <Card className="p-6">
            <h2 className="mb-1 text-base font-bold text-navy-950">Masuk ke Ujian</h2>
            <p className="mb-4 text-xs text-slate-500">Ketik NISN Anda dan token ujian dari guru.</p>
            <div className="space-y-3">
              <Input
                label="NISN"
                placeholder="cth. 3120100001"
                value={nisn}
                onChange={(e) => {
                  setNisn(e.target.value)
                  setLandingError(null)
                }}
                inputMode="numeric"
                required
              />
              <Input
                label="Token Ujian"
                placeholder="cth. ABC123"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.toUpperCase())
                  setLandingError(null)
                }}
                className="font-mono tracking-[0.2em]"
                required
              />
            </div>
            {landingError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-medium text-rose-700">
                {landingError}
              </div>
            )}
            {landingInfo && (
              <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[11.5px] font-medium text-brand-700">
                {landingInfo}
              </div>
            )}
            <Button
              size="lg"
              className="mt-4 w-full"
              loading={validating}
              onClick={() => void validateLanding()}
            >
              Masuk ke Ujian
            </Button>
            <button
              onClick={() => navigate('/login')}
              className="mt-3 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Masuk sebagai guru / administrator →
            </button>
          </Card>

          <p className="mt-6 text-center text-[11px] text-slate-300">
            Pastikan Anda menggunakan browser Chrome/Edge dan koneksi internet stabil selama ujian.
          </p>
        </div>
      </div>
    )
  }

  // ---------- LAYAR PETUNJUK ----------
  if (phase === 'petunjuk') {
    const dual = detectDualScreen()
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h1 className="text-lg font-bold text-navy-950">{exam?.title}</h1>
              <p className="text-xs text-slate-500">
                {exam?.subject} · {exam?.durationMinutes} menit · {exam?.questions.length} soal · {examTotalPointsSafe(exam)} poin total
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Peserta: <span className="font-semibold text-navy-950">{student?.name}</span> (Kelas {student?.classId ? data.classes.find((c) => c.id === student.classId)?.name : '-'})
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <h2 className="text-sm font-bold text-navy-950">Petunjuk &amp; Aturan Ujian</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Ujian dikerjakan dalam mode <span className="font-semibold">layar penuh</span>.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Dilarang berpindah tab atau membuka aplikasi lain. Setiap pelanggaran terdeteksi otomatis.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Dilarang keluar dari mode layar penuh.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Penggunaan lebih dari satu layar/monitor terdeteksi otomatis.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Pelanggaran melebihi batas ({exam?.maxViolations}x) akan mendiskualifikasi siswa secara otomatis.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Jawaban tersimpan otomatis. Saat waktu habis, jawaban dikumpulkan otomatis.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />Pilihan ganda dinilai otomatis; esai dinilai guru setelah ujian selesai.</li>
              </ul>

              {dual && (
                <Alert tone="danger" title="Monitor kedua terdeteksi">
                  Lepaskan koneksi monitor/proyektor tambahan dari perangkat Anda sebelum memulai ujian. Tombol Mulai Ujian dinonaktifkan sampai monitor tambahan dilepas.
                </Alert>
              )}
              {startError && (
                <Alert tone="danger" title="Tidak dapat memulai">
                  {startError}
                </Alert>
              )}
              {fullscreenFailed && (
                <Alert tone="warning" title="Mode layar penuh tidak didukung">
                  Browser Anda tidak mengizinkan mode layar penuh. Ujian tetap dapat dikerjakan, namun deteksi keluar layar penuh tidak aktif.
                </Alert>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <Button variant="outline" size="md" onClick={() => { setPhase('landing'); setExam(null); setStudent(null) }}>
                <ArrowLeft size={15} />
                Batal
              </Button>
              <Button
                size="lg"
                disabled={dual}
                onClick={() => void handleStart()}
              >
                Mulai Ujian
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ---------- LAYAR UJIAN ----------
  if (phase === 'ujian' && exam && attempt) {
    const q = currentQuestion
    const isPg = q?.type === 'pg'
    const order = attempt.optionOrder[q?.id ?? ''] ?? (q?.options.map((_, i) => i) ?? [])
    const picked = q ? attempt.answers[q.id] ?? '' : ''
    const timerColor = remainingMs <= 60000 ? 'text-rose-600' : remainingMs <= 300000 ? 'text-amber-600' : 'text-navy-950'
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 select-none">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-950">{exam.title}</p>
              <p className="truncate text-[11px] text-slate-500">
                {student?.name} · Kelas {classLabel(attempt.className).replace('Kelas ', '')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn('flex items-center gap-1.5 font-mono text-lg font-bold', timerColor)}>
                <Timer size={18} />
                {formatCountdown(remainingMs)}
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
                  attempt.violations.length === 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700',
                )}
              >
                <ShieldAlert size={12} />
                {attempt.violations.length}/{exam.maxViolations}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmSubmit(true)}
                disabled={submittingRef.current}
              >
                Kumpulkan
              </Button>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${(progress.answered / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
          {/* Soal */}
          <main className="flex-1">
            {q ? (
              <Card className="p-5">
                {q.sectionStimulus && (
                  <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">Instruksi Bagian</p>
                    <RichContent content={q.sectionStimulus} className="text-sm leading-relaxed text-slate-700" />
                  </div>
                )}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-sm font-bold text-white">
                      {currentIndex + 1}
                    </span>
                    <Badge tone={isPg ? 'brand' : 'violet'}>
                      {isPg ? 'Pilihan Ganda' : 'Esai'} · {q.points} poin
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Terjawab {progress.answered} dari {progress.total}
                  </span>
                </div>
                {q.stimulus && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                    <RichContent content={q.stimulus} className="text-sm leading-relaxed text-slate-700" />
                  </div>
                )}
                <RichContent content={q.text} className="text-base font-medium leading-relaxed text-navy-950" />

                {isPg ? (
                  <div className="mt-4 space-y-2.5">
                    {order.map((originalIndex, displayIndex) => {
                      const selected = picked === String(originalIndex)
                      return (
                        <button
                          key={displayIndex}
                          onClick={() => updateAnswer(q.id, String(originalIndex))}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                            selected
                              ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                              selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {OPTION_LABELS[displayIndex]}
                          </span>
                          <RichContent content={q.options[originalIndex]} className="flex-1 text-sm text-slate-700" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-4">
                    <Textarea
                      placeholder="Tulis jawaban Anda di sini..."
                      value={picked}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      rows={8}
                    />
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ArrowLeft size={15} />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setCurrentIndex((i) => Math.min(progress.total - 1, i + 1))}
                    disabled={currentIndex >= progress.total - 1}
                  >
                    Berikutnya
                    <ArrowLeft size={15} className="rotate-180" />
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState title="Soal tidak ditemukan" description="Hubungi pengawas ujian." />
              </Card>
            )}
          </main>

          {/* Navigasi soal */}
          <aside className="lg:w-72">
            <Card className="p-4">
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Navigasi Soal</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {attempt.questionOrder.map((qid, idx) => {
                  const answered = (attempt.answers[qid] ?? '').trim() !== ''
                  const isCurrent = idx === currentIndex
                  return (
                    <button
                      key={qid}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all',
                        isCurrent
                          ? 'bg-navy-900 text-white ring-2 ring-brand-400'
                          : answered
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10.5px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-100" /> Terjawab
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-slate-100" /> Belum
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-navy-900" /> Aktif
                </span>
              </div>
            </Card>
          </aside>
        </div>

        {/* Modal peringatan pelanggaran */}
        <Modal
          open={violationWarn !== null}
          onClose={() => setViolationWarn(null)}
          title="Peringatan Pelanggaran"
          size="sm"
        >
          {violationWarn && (
            <div className="space-y-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {VIOLATION_META[violationWarn.type].description}
              </div>
              <p className="text-sm text-slate-600">
                Pelanggaran ke-<span className="font-bold text-rose-600">{violationWarn.count}</span> dari{' '}
                <span className="font-bold">{violationWarn.max}</span>. Jika melebihi batas, Anda akan
                didiskualifikasi otomatis.
              </p>
              <div className="flex justify-end">
                <Button size="md" onClick={() => setViolationWarn(null)}>
                  Saya Mengerti
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal konfirmasi kumpulkan */}
        <Modal
          open={confirmSubmit}
          onClose={() => setConfirmSubmit(false)}
          title="Kumpulkan Ujian?"
          size="sm"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Anda telah menjawab <span className="font-bold text-navy-950">{progress.answered}</span> dari{' '}
              <span className="font-bold text-navy-950">{progress.total}</span> soal.
              {progress.answered < progress.total && (
                <span className="font-semibold text-amber-600">
                  {' '}Masih ada {progress.total - progress.answered} soal yang belum dijawab.
                </span>
              )}
            </p>
            <p className="text-sm text-slate-600">Setelah dikumpulkan, jawaban tidak dapat diubah lagi.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => setConfirmSubmit(false)}>
                Batal
              </Button>
              <Button size="md" onClick={submitManual}>
                Ya, Kumpulkan
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ---------- LAYAR SELESAI ----------
  if (phase === 'selesai') {
    const finalAttempt = attempt
    const showResult = exam?.showResult ?? false
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <Card className="p-6 text-center">
            {disqualified ? (
              <>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <Ban size={30} />
                </div>
                <h1 className="text-xl font-bold text-rose-700">Ujian Didiskualifikasi</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Anda didiskualifikasi karena pelanggaran berulang ({finalAttempt?.violations.length ?? 0}x).
                  Jawaban yang sudah terkumpul tetap tersimpan.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={30} />
                </div>
                <h1 className="text-xl font-bold text-emerald-700">Ujian Selesai</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Jawaban Anda telah terkumpul pada {finalAttempt?.submittedAt ? formatTime(finalAttempt.submittedAt) : '-'}.
                </p>
                {finalAttempt?.previousAttemptId && (
                  <p className="mt-1 text-xs text-slate-500">
                    Ini adalah attempt pengulangan.
                  </p>
                )}
              </>
            )}

            {showResult && exam && finalAttempt && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Hasil Sementara</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-slate-400">Pilihan Ganda</p>
                    <p className="font-bold text-navy-950">
                      {finalAttempt.autoPoints ?? 0}/{finalAttempt.pgTotalPoints ?? 0} poin
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Esai</p>
                    <p className="font-bold text-navy-950">
                      {finalAttempt.essayScores
                        ? `${Object.values(finalAttempt.essayScores).reduce((a, b) => a + b, 0)}/${examEssayPointsSafe(exam)} poin`
                        : 'Menunggu penilaian guru'}
                    </p>
                  </div>
                  {finalAttempt.finalScore !== undefined && (
                    <div className="col-span-2 flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                      <span className="text-sm font-semibold text-slate-700">Nilai Akhir</span>
                      <ProgressRing value={finalAttempt.finalScore} size={44}>
                        {finalAttempt.finalScore}
                      </ProgressRing>
                    </div>
                  )}
                  {ungradedEssayCount(exam, finalAttempt) > 0 && (
                    <p className="col-span-2 text-[11px] text-amber-600">
                      {ungradedEssayCount(exam, finalAttempt)} soal esai menunggu penilaian guru. Nilai akhir akan diperbarui setelah penilaian selesai.
                    </p>
                  )}
                </div>
              </div>
            )}

            {finalAttempt && finalAttempt.violations.length > 0 && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 text-left">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">
                  Pelanggaran Terdeteksi ({finalAttempt.violations.length}x)
                </p>
                <ul className="space-y-0.5 text-[11.5px] text-rose-700">
                  {finalAttempt.violations.map((v, i) => (
                    <li key={i}>
                      {formatTime(v.at)} — {VIOLATION_META[v.type].label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  localStorage.removeItem(ACTIVE_KEY)
                  setPhase('landing')
                  setExam(null)
                  setStudent(null)
                  setAttemptId(null)
                  attemptRef.current = null
                  setDisqualified(false)
                  setNisn('')
                  setToken('')
                }}
              >
                <ArrowLeft size={15} />
                Kembali ke Halaman Awal
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Memuat...
    </div>
  )
}

function examTotalPointsSafe(exam: CbtExam | null): number {
  return exam ? exam.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) : 0
}

function examEssayPointsSafe(exam: CbtExam | null): number {
  if (!exam) return 0
  return exam.questions.filter((q) => q.type === 'essay').reduce((sum, q) => sum + (Number(q.points) || 0), 0)
}
