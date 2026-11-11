import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  ChevronUp,
  ClipboardList,
  Copy,
  FileText,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Timer,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { useCbt } from '../store/CbtContext'
import { SUBJECTS } from '../lib/constants'
import { essayQuestions, examTotalPoints, pgQuestions } from '../lib/cbt'
import { relativeTime } from '../lib/utils'
import type { CbtExam, CbtExamStatus } from '../types'

type StatusFilter = 'semua' | CbtExamStatus

const statusMeta: Record<CbtExamStatus, { label: string; tone: 'slate' | 'emerald' | 'sky' }> = {
  draft: { label: 'Draft', tone: 'slate' },
  aktif: { label: 'Aktif', tone: 'emerald' },
  selesai: { label: 'Selesai', tone: 'sky' },
}

const filters: { key: StatusFilter; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'draft', label: 'Draft' },
  { key: 'selesai', label: 'Selesai' },
]

export function Cbt() {
  const { data } = useApp()
  const cbt = useCbt()
  const navigate = useNavigate()
  const toast = useToast()
  const [filter, setFilter] = useState<StatusFilter>('semua')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CbtExam | null>(null)

  const classMap = useMemo(() => new Map(data.classes.map((clazz) => [clazz.id, clazz])), [data.classes])

  const exams = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cbt.exams
      .filter((exam) => (filter === 'semua' ? true : exam.status === filter))
      .filter((exam) => {
        if (!term) return true
        return (
          exam.title.toLowerCase().includes(term) ||
          exam.subject.toLowerCase().includes(term) ||
          exam.token.toLowerCase().includes(term)
        )
      })
  }, [cbt.exams, filter, search])

  const stats = useMemo(() => {
    const count = (status: CbtExamStatus) => cbt.exams.filter((exam) => exam.status === status).length
    return { total: cbt.exams.length, aktif: count('aktif'), draft: count('draft'), selesai: count('selesai') }
  }, [cbt.exams])

  const attemptCount = (examId: string) => cbt.attempts.filter((attempt) => attempt.examId === examId).length

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast(`Token ${token} berhasil disalin.`, 'success')
    } catch {
      toast('Gagal menyalin token. Salin manual dari layar.', 'error')
    }
  }

  /** Validasi ringan sebelum ujian diaktifkan. */
  const canActivate = (exam: CbtExam): string | null => {
    if (exam.questions.length === 0) return 'Ujian harus memiliki minimal satu soal.'
    if (exam.classIds.length === 0) return 'Pilih minimal satu kelas peserta terlebih dahulu.'
    if (exam.durationMinutes < 1) return 'Durasi ujian belum diatur.'
    const pg = pgQuestions(exam)
    if (pg.some((q) => q.answer === undefined || q.answer === null || q.answer === '')) {
      return 'Ada soal pilihan ganda yang belum memiliki kunci jawaban.'
    }
    return null
  }

  const setStatus = (exam: CbtExam, status: CbtExamStatus) => {
    if (status === 'aktif') {
      const problem = canActivate(exam)
      if (problem) {
        toast(problem, 'error')
        return
      }
    }
    cbt.upsertExam({ ...exam, status, updatedAt: new Date().toISOString() })
    const messages: Record<CbtExamStatus, string> = {
      draft: 'Ujian dikembalikan menjadi draft.',
      aktif: 'Ujian diaktifkan. Siswa dapat masuk dengan token sekarang.',
      selesai: 'Ujian ditandai selesai.',
    }
    toast(messages[status], 'success')
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    cbt.deleteExam(deleteTarget.id)
    toast(`Ujian "${deleteTarget.title}" beserta datanya dihapus.`, 'success')
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Computer-Based Test"
        title="Ujian CBT"
        description="Kelola ujian berbasis komputer: buat bank soal pilihan ganda & esai, bagikan token ke siswa, dan pantau hasilnya secara langsung."
        actions={
          <>
            <Button variant="outline" size="md" onClick={() => void cbt.refreshNow()}>
              <RotateCcw size={15} />
              Muat Ulang
            </Button>
            <Button size="md" onClick={() => navigate('/cbt/baru')}>
              <Plus size={16} />
              Buat Ujian
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Ujian', value: stats.total, tone: 'text-navy-950' },
          { label: 'Sedang Aktif', value: stats.aktif, tone: 'text-emerald-600' },
          { label: 'Draft', value: stats.draft, tone: 'text-slate-500' },
          { label: 'Selesai', value: stats.selesai, tone: 'text-sky-600' },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', item.tone)}>{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === item.key
                  ? 'bg-navy-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari judul, mapel, atau token..."
          className="w-full sm:w-64"
        />
      </div>

      {exams.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={22} />}
            title={cbt.exams.length === 0 ? 'Belum ada ujian CBT' : 'Tidak ada ujian yang cocok'}
            description={
              cbt.exams.length === 0
                ? 'Buat ujian pertama Anda, susun soal pilihan ganda dan esai, lalu bagikan token kepada siswa.'
                : 'Coba ubah filter atau kata kunci pencarian.'
            }
            action={
              cbt.exams.length === 0 ? (
                <Button onClick={() => navigate('/cbt/baru')}>
                  <Plus size={15} />
                  Buat Ujian Pertama
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map((exam) => {
            const meta = statusMeta[exam.status]
            const pg = pgQuestions(exam).length
            const essay = essayQuestions(exam).length
            const peserta = attemptCount(exam.id)
            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <span className="truncate">{exam.title}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </span>
                  }
                  description={`${exam.subject} · diperbarui ${relativeTime(exam.updatedAt)}`}
                />
                <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {exam.classIds.length === 0 ? (
                      <Badge tone="rose">Kelas belum dipilih</Badge>
                    ) : (
                      exam.classIds.map((classId) => (
                        <Badge key={classId} tone="navy">
                          Kelas {classMap.get(classId)?.name ?? classId}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <span className="flex items-center gap-1.5">
                      <Timer size={13} className="text-slate-400" />
                      {exam.durationMinutes} menit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-slate-400" />
                      {pg} PG · {essay} Esai
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-slate-400" />
                      {examTotalPoints(exam)} poin
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ClipboardList size={13} className="text-slate-400" />
                      {peserta} peserta
                    </span>
                  </div>

                  <button
                    onClick={() => void copyToken(exam.token)}
                    className="group inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-navy-950 transition-colors hover:border-brand-400 hover:bg-brand-50"
                    title="Klik untuk menyalin token"
                  >
                    {exam.token}
                    <Copy size={13} className="text-slate-400 transition-colors group-hover:text-brand-600" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/cbt/${exam.id}`)}>
                    <Pencil size={13} />
                    Sunting
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => navigate(`/cbt/hasil/${exam.id}`)}
                    disabled={peserta === 0}
                  >
                    <BarChart3 size={13} />
                    Hasil
                  </Button>
                  <span className="flex-1" />
                  {exam.status === 'draft' && (
                    <Button variant="primary" size="sm" onClick={() => setStatus(exam, 'aktif')}>
                      <Play size={13} />
                      Aktifkan
                    </Button>
                  )}
                  {exam.status === 'aktif' && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => setStatus(exam, 'selesai')}>
                        <Square size={13} />
                        Akhiri
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatus(exam, 'draft')}
                        title="Kembalikan ke draft"
                      >
                        <ChevronUp size={13} />
                        Draft
                      </Button>
                    </>
                  )}
                  {exam.status === 'selesai' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(exam, 'aktif')}>
                      <Play size={13} />
                      Buka Lagi
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setDeleteTarget(exam)}
                    aria-label="Hapus ujian"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Hapus ujian?"
        description="Tindakan ini tidak dapat dibatalkan."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" size="md" onClick={confirmDelete}>
              <Trash2 size={15} />
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Ujian <span className="font-semibold text-navy-950">"{deleteTarget?.title}"</span> akan dihapus
          beserta seluruh data peserta dan jawaban siswa yang terhubung dengan ujian ini. Sebaiknya ekspor
          hasil ke Excel terlebih dahulu dari halaman Hasil jika data masih dibutuhkan.
        </p>
      </Modal>
    </div>
  )
}
