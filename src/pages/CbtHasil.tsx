import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  Ban,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  PenLine,
  RotateCcw,
  ShieldAlert,
  Timer,
  Users,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  ProgressRing,
  cn,
  useToast,
} from '../components/ui'
import { RichContent } from '../components/RichContent'
import { useApp } from '../store/AppContext'
import { useCbt } from '../store/CbtContext'
import { exportExcel } from '../lib/excel'
import {
  OPTION_LABELS,
  VIOLATION_META,
  attemptProgress,
  computeFinalScore,
  durationMinutes,
  essayPointsEarned,
  essayQuestions,
  examEssayPoints,
  examPgPoints,
  formatCountdown,
  pgQuestions,
  ungradedEssayCount,
} from '../lib/cbt'
import { formatTime, relativeTime } from '../lib/utils'
import type { CbtAttempt, CbtAttemptStatus } from '../types'

const attemptStatusMeta: Record<CbtAttemptStatus, { label: string; tone: 'emerald' | 'sky' | 'rose' }> = {
  berlangsung: { label: 'Sedang Ujian', tone: 'sky' },
  selesai: { label: 'Selesai', tone: 'emerald' },
  diskualifikasi: { label: 'Diskualifikasi', tone: 'rose' },
}

export function CbtHasil() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, data } = useApp()
  const cbt = useCbt()
  const [gradingTarget, setGradingTarget] = useState<CbtAttempt | null>(null)
  const [essayDraft, setEssayDraft] = useState<Record<string, string>>({})
  const [detailTarget, setDetailTarget] = useState<CbtAttempt | null>(null)

  const exam = useMemo(
    () => (examId ? cbt.exams.find((item) => item.id === examId) ?? null : null),
    [examId, cbt.exams],
  )

  const attempts = useMemo(
    () =>
      cbt.attempts
        .filter((attempt) => attempt.examId === examId)
        .sort((a, b) => a.studentName.localeCompare(b.studentName, 'id')),
    [cbt.attempts, examId],
  )

  useEffect(() => {
    if (!exam && cbt.syncStatus !== 'syncing' && cbt.lastSyncedAt !== null) {
      toast('Ujian tidak ditemukan.', 'error')
      navigate('/cbt', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam])

  if (!exam) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Memuat data ujian...
      </div>
    )
  }

  const stats = {
    peserta: attempts.length,
    berlangsung: attempts.filter((attempt) => attempt.status === 'berlangsung').length,
    selesai: attempts.filter((attempt) => attempt.status === 'selesai').length,
    diskualifikasi: attempts.filter((attempt) => attempt.status === 'diskualifikasi').length,
    ungraded: attempts.filter(
      (attempt) => attempt.submittedAt !== undefined && ungradedEssayCount(exam, attempt) > 0,
    ).length,
  }
  const gradedAttempts = attempts.filter((attempt) => attempt.finalScore !== undefined)
  const avgScore =
    gradedAttempts.length > 0
      ? Math.round(gradedAttempts.reduce((sum, attempt) => sum + (attempt.finalScore ?? 0), 0) / gradedAttempts.length)
      : null

  const openGrading = (attempt: CbtAttempt) => {
    setGradingTarget(attempt)
    const initial: Record<string, string> = {}
    for (const question of essayQuestions(exam)) {
      initial[question.id] = attempt.essayScores?.[question.id] !== undefined ? String(attempt.essayScores[question.id]) : ''
    }
    setEssayDraft(initial)
  }

  const saveGrading = () => {
    if (!gradingTarget) return
    const essayScores: Record<string, number> = {}
    for (const question of essayQuestions(exam)) {
      const raw = essayDraft[question.id]
      if (raw === undefined || raw.trim() === '') continue
      const value = Math.max(0, Math.min(Number(raw) || 0, question.points))
      essayScores[question.id] = value
    }
    const next: CbtAttempt = {
      ...gradingTarget,
      essayScores,
      gradedBy: user?.name ?? '',
      gradedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    next.finalScore = computeFinalScore(exam, next)
    cbt.upsertAttempt(next, true)
    toast(`Nilai esai ${gradingTarget.studentName} berhasil disimpan.`, 'success')
    setGradingTarget(null)
  }

  const exportResults = async () => {
    try {
      const nilaiRows: (string | number)[][] = [
        [
          'No',
          'NISN',
          'Nama',
          'Kelas',
          'Status',
          'Mulai',
          'Selesai',
          'Durasi (menit)',
          'Pelanggaran',
          'Terjawab',
          'Poin PG',
          'Poin Esai',
          'Nilai Akhir',
          'Keterangan',
        ],
      ]
      attempts.forEach((attempt, index) => {
        const progress = attemptProgress(exam, attempt)
        nilaiRows.push([
          index + 1,
          attempt.studentId.replace(/^s_/, ''),
          attempt.studentName,
          attempt.className,
          attemptStatusMeta[attempt.status].label,
          formatTime(attempt.startedAt),
          attempt.submittedAt ? formatTime(attempt.submittedAt) : '-',
          durationMinutes(attempt),
          attempt.violations.length,
          `${progress.answered}/${progress.total}`,
          attempt.autoPoints ?? 0,
          essayPointsEarned(exam, attempt),
          attempt.finalScore ?? '-',
          attempt.status === 'diskualifikasi'
            ? 'Didiskualifikasi sistem'
            : ungradedEssayCount(exam, attempt) > 0
              ? 'Menunggu penilaian esai'
              : 'Lengkap',
        ])
      })

      const pelanggaranRows: (string | number)[][] = [['No', 'Nama', 'Kelas', 'Waktu', 'Jenis Pelanggaran']]
      let violationNo = 0
      for (const attempt of attempts) {
        for (const violation of attempt.violations) {
          violationNo += 1
          pelanggaranRows.push([
            violationNo,
            attempt.studentName,
            attempt.className,
            formatTime(violation.at),
            VIOLATION_META[violation.type].label,
          ])
        }
      }

      await exportExcel(`Nilai CBT - ${exam.title} (${exam.token})`, [
        { name: 'Nilai', rows: nilaiRows },
        { name: 'Pelanggaran', rows: pelanggaranRows },
      ])
      toast('Hasil ujian berhasil diekspor ke Excel.', 'success')
    } catch {
      toast('Gagal mengekspor Excel.', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Hasil Ujian CBT"
        title={exam.title}
        description={`${exam.subject} · Token ${exam.token} · ${exam.durationMinutes} menit · ${exam.questions.length} soal (${pgQuestions(exam).length} PG, ${essayQuestions(exam).length} esai)`}
        actions={
          <>
            <Button variant="ghost" size="md" onClick={() => navigate('/cbt')}>
              <ArrowLeft size={15} />
              Kembali
            </Button>
            <Button variant="outline" size="md" onClick={() => void cbt.refreshNow()}>
              <RotateCcw size={15} />
              Segarkan
            </Button>
            <Button size="md" onClick={() => void exportResults()} disabled={attempts.length === 0}>
              <FileSpreadsheet size={15} />
              Ekspor Excel
            </Button>

          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            cbt.syncStatus === 'synced'
              ? 'bg-emerald-500'
              : cbt.syncStatus === 'syncing'
                ? 'animate-pulse bg-amber-400'
                : cbt.syncStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-300',
          )}
        />
        {cbt.lastSyncedAt
          ? `Data terakhir disinkronkan ${relativeTime(cbt.lastSyncedAt)}`
          : 'Menyambungkan ke server...'}
        <Badge tone={exam.status === 'aktif' ? 'emerald' : exam.status === 'draft' ? 'slate' : 'sky'}>
          Ujian {exam.status === 'aktif' ? 'Aktif' : exam.status === 'draft' ? 'Draft' : 'Selesai'}
        </Badge>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Peserta', value: stats.peserta, icon: <Users size={15} />, tone: 'text-navy-950' },
          { label: 'Sedang Ujian', value: stats.berlangsung, icon: <Timer size={15} />, tone: 'text-sky-600' },
          { label: 'Selesai', value: stats.selesai, icon: <CheckCircle2 size={15} />, tone: 'text-emerald-600' },
          { label: 'Diskualifikasi', value: stats.diskualifikasi, icon: <Ban size={15} />, tone: 'text-rose-600' },
          {
            label: 'Rata-rata Nilai',
            value: avgScore === null ? '—' : avgScore,
            icon: <Award size={15} />,
            tone: 'text-violet-600',
          },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <span className="text-slate-300">{item.icon}</span>
            </div>
            <p className={cn('mt-1 text-2xl font-bold', item.tone)}>{item.value}</p>
          </Card>
        ))}
      </div>

      {stats.ungraded > 0 && (
        <div className="mb-4">
          <Alert tone="warning" title={`${stats.ungraded} peserta menunggu penilaian esai`}>
            Buka kolom tindakan pada tabel lalu pilih "Nilai Esai" untuk menilai jawaban esai siswa.
          </Alert>
        </div>
      )}

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              Daftar Peserta &amp; Hasil
              <Badge tone="slate">{attempts.length} peserta</Badge>
            </span>
          }
          description="Data diperbarui otomatis setiap 15 detik."
        />
        {attempts.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="Belum ada peserta"
            description={
              exam.status === 'aktif'
                ? 'Siswa dapat masuk melalui halaman Mode Ujian dengan NISN dan token ujian ini.'
                : 'Aktifkan ujian terlebih dahulu agar siswa dapat mengerjakan.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Siswa</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Progres</th>
                  <th className="px-3 py-3 font-semibold">Waktu</th>
                  <th className="px-3 py-3 font-semibold">Pelanggaran</th>
                  <th className="px-3 py-3 text-right font-semibold">Nilai PG</th>
                  <th className="px-3 py-3 text-right font-semibold">Nilai Esai</th>
                  <th className="px-3 py-3 text-right font-semibold">Akhir</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attempts.map((attempt) => {
                  const meta = attemptStatusMeta[attempt.status]
                  const progress = attemptProgress(exam, attempt)
                  const answeredPct = progress.total > 0 ? (progress.answered / progress.total) * 100 : 0
                  const ungraded = ungradedEssayCount(exam, attempt)
                  return (
                    <tr key={attempt.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={attempt.studentName} size="sm" />
                          <div>
                            <p className="font-semibold text-navy-950">
                              {attempt.studentName}
                              {attempt.previousAttemptId && (
                                <Badge tone="amber" className="ml-1.5">Ulang</Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Kelas {attempt.className} · NISN {attempt.studentId.replace(/^s_/, '')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                answeredPct === 100 ? 'bg-emerald-500' : 'bg-brand-500',
                              )}
                              style={{ width: `${answeredPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {progress.answered}/{progress.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {attempt.status === 'berlangsung' ? (
                          <span className="flex items-center gap-1 font-semibold text-sky-600">
                            <Timer size={12} />
                            sisa {formatCountdown(new Date(attempt.expiresAt).getTime() - Date.now())}
                          </span>
                        ) : (
                          <>
                            <p>{attempt.submittedAt ? formatTime(attempt.submittedAt) : '-'} selesai</p>
                            <p className="text-slate-400">{durationMinutes(attempt)} menit</p>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {attempt.violations.length === 0 ? (
                          <span className="text-[11px] text-slate-400">Aman</span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 ring-1 ring-inset ring-rose-200"
                            title={attempt.violations
                              .map((violation) => `${formatTime(violation.at)} - ${VIOLATION_META[violation.type].label}`)
                              .join('\n')}
                          >
                            <ShieldAlert size={11} />
                            {attempt.violations.length}x
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-navy-950">
                          {attempt.autoPoints ?? '—'}
                          <span className="text-[11px] font-normal text-slate-400">
                            /{attempt.pgTotalPoints ?? examPgPoints(exam)}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {essayQuestions(exam).length === 0 ? (
                          <span className="text-[11px] text-slate-400">—</span>
                        ) : attempt.status === 'berlangsung' ? (
                          <span className="text-[11px] text-slate-400">Ujian berjalan</span>
                        ) : (
                          <span className="text-sm font-semibold text-navy-950">
                            {essayPointsEarned(exam, attempt)}
                            <span className="text-[11px] font-normal text-slate-400">/{examEssayPoints(exam)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {attempt.finalScore === undefined ? (
                          <span className="text-[11px] font-medium text-amber-600">
                            {ungraded > 0 ? `Esai ${ungraded}x belum` : 'Menunggu'}
                          </span>
                        ) : (
                          <ProgressRing
                            value={attempt.finalScore}
                            size={38}
                            color={attempt.finalScore >= 75 ? '#10b981' : attempt.finalScore >= 60 ? '#f59e0b' : '#f43f5e'}
                          >
                            {attempt.finalScore}
                          </ProgressRing>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {essayQuestions(exam).length > 0 && attempt.status !== 'berlangsung' && (
                            <Button variant="soft" size="sm" onClick={() => openGrading(attempt)}>
                              <PenLine size={13} />
                              Nilai Esai
                            </Button>
                          )}
                          {attempt.status !== 'berlangsung' && !attempt.retakeApproved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const next: CbtAttempt = {
                                  ...attempt,
                                  retakeApproved: true,
                                  retakeApprovedBy: user?.name ?? 'Admin',
                                  retakeApprovedAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                }
                                cbt.upsertAttempt(next, true)
                                toast(`Pengulangan diizinkan untuk ${attempt.studentName}.`, 'success')
                              }}
                            >
                              <RotateCcw size={13} />
                              Izinkan Ulang
                            </Button>
                          )}
                          {attempt.retakeApproved && (
                            <Badge tone="amber">Ulang diizinkan</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailTarget(attempt)}
                            aria-label="Lihat detail jawaban"
                          >
                            <Eye size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal penilaian esai */}
      <Modal
        open={gradingTarget !== null}
        onClose={() => setGradingTarget(null)}
        title={`Nilai Esai — ${gradingTarget?.studentName ?? ''}`}
        description={`Kelas ${gradingTarget?.className ?? ''} · beri poin per soal sesuai rubrik guru.`}
        size="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setGradingTarget(null)}>
              Batal
            </Button>
            <Button size="md" onClick={saveGrading}>
              Simpan Nilai
            </Button>
          </>
        }
      >
        {gradingTarget &&
          essayQuestions(exam).map((question, index) => {
            const answer = gradingTarget.answers[question.id] ?? ''
            return (
              <div key={question.id} className="mb-4 rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[11px] font-bold text-violet-700">
                        {index + 1}
                      </span>
                      <Badge tone="violet">Esai · {question.points} poin</Badge>
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={question.points}
                      value={essayDraft[question.id] ?? ''}
                      onChange={(e) =>
                        setEssayDraft((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                      className="h-9 w-24"
                      placeholder="0"
                    />
                  </div>
                  <RichContent content={question.text} className="mt-2 text-sm text-slate-700" />
                </div>
                <div className="px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Jawaban Siswa
                  </p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    {answer.trim() || <span className="italic text-slate-400">Tidak dijawab</span>}
                  </p>
                </div>
              </div>
            )
          })}
      </Modal>

      {/* Modal detail jawaban */}
      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title={`Detail Jawaban — ${detailTarget?.studentName ?? ''}`}
        description={`Kelas ${detailTarget?.className ?? ''} · PG dinilai otomatis, esai dinilai guru.`}
        size="lg"
      >
        {detailTarget &&
          detailTarget.questionOrder
            .map((id) => exam.questions.find((question) => question.id === id))
            .filter((question): question is NonNullable<typeof question> => Boolean(question))
            .map((question, index) => {
              const answer = detailTarget.answers[question.id] ?? ''
              const order = detailTarget.optionOrder[question.id] ?? question.options.map((_, i) => i)
              return (
                <div key={question.id} className="mb-3 rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-900 text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                      <Badge tone={question.type === 'pg' ? 'brand' : 'violet'}>
                        {question.type === 'pg' ? 'PG' : 'Esai'} · {question.points} poin
                      </Badge>
                      {question.type === 'pg' && (
                        <span
                          className={cn(
                            'text-[11px] font-bold',
                            answer === question.answer
                              ? 'text-emerald-600'
                              : answer === ''
                                ? 'text-slate-400'
                                : 'text-rose-600',
                          )}
                        >
                          {answer === ''
                            ? 'Tidak dijawab'
                            : answer === question.answer
                              ? 'Benar'
                              : 'Salah'}
                        </span>
                      )}
                    </div>
                    {question.sectionStimulus && (
                      <div className="mb-2 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">Instruksi Bagian</p>
                        <RichContent content={question.sectionStimulus} className="text-xs text-slate-700" />
                      </div>
                    )}
                  {question.stimulus && (
                      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                        <RichContent content={question.stimulus} className="text-xs text-slate-700" />
                      </div>
                    )}
                    <RichContent content={question.text} className="mt-2 text-sm text-slate-700" />
                  </div>
                  <div className="space-y-1.5 px-4 py-3">
                    {question.type === 'pg' ? (
                      order.map((originalIndex, displayIndex) => {
                        const isPicked = answer === String(originalIndex)
                        const isCorrect = question.answer === String(originalIndex)
                        return (
                          <div
                            key={displayIndex}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                              isPicked && isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : isPicked
                                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                                  : isCorrect
                                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700'
                                    : 'border-slate-200 text-slate-600',
                            )}
                          >
                            <span className="text-[11px] font-bold">{OPTION_LABELS[displayIndex]}.</span>
                            <RichContent content={question.options[originalIndex]} className="flex-1" />
                            {isPicked && (
                              <span className="text-[10px] font-bold uppercase">
                                {isCorrect ? '✓ Jawaban siswa' : '✗ Jawaban siswa'}
                              </span>
                            )}
                            {isCorrect && !isPicked && (
                              <span className="text-[10px] font-bold uppercase text-emerald-600">Kunci</span>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div>
                        <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          {answer.trim() || <span className="italic text-slate-400">Tidak dijawab</span>}
                        </p>
                        {detailTarget.essayScores?.[question.id] !== undefined && (
                          <p className="mt-1.5 text-right text-[11px] font-bold text-violet-600">
                            Nilai guru: {detailTarget.essayScores[question.id]}/{question.points} poin
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
      </Modal>


    </div>
  )
}
