import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Toggle,
  cn,
  useToast,
} from '../components/ui'
import { useApp } from '../store/AppContext'
import { useCbt } from '../store/CbtContext'
import { SUBJECTS } from '../lib/constants'
import { OPTION_LABELS, examTotalPoints, generateToken } from '../lib/cbt'
import { importQuestionsFromFile, detectFormat } from '../lib/importQuestions'
import { RichContent } from '../components/RichContent'
import { RichTextEditor } from '../components/RichTextEditor'
import type { CbtExam, CbtQuestion, CbtQuestionType } from '../types'

const MAX_OPTIONS = 4

function emptyQuestion(type: CbtQuestionType): CbtQuestion {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    stimulus: '',
    text: '',
    options: type === 'pg' ? ['', '', '', ''] : [],
    answer: type === 'pg' ? undefined : undefined,
    points: type === 'pg' ? 1 : 10,
  }
}

export function CbtEditor() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, user } = useApp()
  const cbt = useCbt()
  const isEditing = Boolean(examId)

  const existing = useMemo(
    () => (examId ? cbt.exams.find((exam) => exam.id === examId) ?? null : null),
    [examId, cbt.exams],
  )

  const [draft, setDraft] = useState<CbtExam | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // State untuk impor soal dari file (Word/Excel/PDF).
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<CbtQuestion[] | null>(null)
  const [importFileName, setImportFileName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (file: File) => {
    setImportError(null)
    setImportPreview(null)
    setImportFileName(file.name)
    setImportLoading(true)
    try {
      const questions = await importQuestionsFromFile(file)
      setImportPreview(questions)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Gagal membaca file.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.length === 0) return
    setDraft((prev) =>
      prev ? { ...prev, questions: [...prev.questions, ...importPreview] } : prev,
    )
    setImportOpen(false)
    setImportPreview(null)
    setImportFileName('')
    setImportError(null)
    toast(`${importPreview.length} soal berhasil diimpor.`, 'success')
  }

  // Inisialisasi draf: dari ujian yang ada (sunting) atau template baru.
  useEffect(() => {
    if (draft) return
    if (isEditing) {
      if (existing) setDraft(structuredClone(existing))
      return
    }
    const now = new Date().toISOString()
    setDraft({
      id: `cbt_${Date.now()}`,
      title: '',
      subject: SUBJECTS[0],
      classIds: [],
      teacherId: user?.id ?? '',
      teacherName: user?.name ?? '',
      durationMinutes: 60,
      token: generateToken(),
      status: 'draft',
      shuffleQuestions: true,
      shuffleOptions: true,
      maxViolations: 3,
      showResult: true,
      questions: [],
      createdAt: now,
      updatedAt: now,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, existing, draft, user])

  // Ujian tidak ditemukan (terhapus / salah tautan) -> kembali ke daftar.
  useEffect(() => {
    if (isEditing && !existing && cbt.syncStatus !== 'syncing') {
      toast('Ujian tidak ditemukan atau sudah dihapus.', 'error')
      navigate('/cbt', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, existing])

  if (!draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Menyiapkan editor ujian...
      </div>
    )
  }

  const update = <K extends keyof CbtExam>(key: K, value: CbtExam[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    setErrors((prev) => ({ ...prev, [key as string]: '', form: '' }))
  }

  const updateQuestion = (id: string, changes: Partial<CbtQuestion>) => {
    setDraft((prev) =>
      prev
        ? { ...prev, questions: prev.questions.map((q) => (q.id === id ? { ...q, ...changes } : q)) }
        : prev,
    )
  }

  const addQuestion = (type: CbtQuestionType) => {
    setDraft((prev) => (prev ? { ...prev, questions: [...prev.questions, emptyQuestion(type)] } : prev))
  }

  const removeQuestion = (id: string) => {
    setDraft((prev) => (prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== id) } : prev))
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = [...prev.questions]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, questions: next }
    })
  }

  const toggleClass = (classId: string) => {
    setDraft((prev) => {
      if (!prev) return prev
      const has = prev.classIds.includes(classId)
      return {
        ...prev,
        classIds: has ? prev.classIds.filter((id) => id !== classId) : [...prev.classIds, classId],
      }
    })
    setErrors((prev) => ({ ...prev, classIds: '' }))
  }

  const regenerateToken = () => {
    let token = generateToken()
    // Pastikan token unik antar ujian.
    let guard = 0
    while (cbt.exams.some((exam) => exam.token === token) && guard < 20) {
      token = generateToken()
      guard += 1
    }
    update('token', token)
    toast('Token baru berhasil dibuat.', 'success')
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = 'Judul ujian wajib diisi'
    else if (draft.title.trim().length < 4) next.title = 'Judul minimal 4 karakter'
    if (draft.classIds.length === 0) next.classIds = 'Pilih minimal satu kelas peserta'
    if (draft.durationMinutes < 1) next.durationMinutes = 'Durasi minimal 1 menit'
    else if (draft.durationMinutes > 480) next.durationMinutes = 'Durasi maksimal 480 menit'
    if (draft.maxViolations < 1) next.maxViolations = 'Batas pelanggaran minimal 1'
    else if (draft.maxViolations > 10) next.maxViolations = 'Batas pelanggaran maksimal 10'
    if (draft.questions.length === 0) next.questions = 'Ujian harus memiliki minimal satu soal'

    draft.questions.forEach((question, index) => {
      const key = `q_${index}`
      if (!question.text.trim()) {
        next[key] = 'Teks soal wajib diisi'
        return
      }
      if (!Number.isFinite(question.points) || question.points < 1) {
        next[key] = 'Poin minimal 1'
        return
      }
      if (question.type === 'pg') {
        if (question.options.some((option) => !option.trim())) {
          next[key] = 'Semua opsi jawaban wajib terisi'
          return
        }
        if (question.answer === undefined || question.answer === null || question.answer === '') {
          next[key] = 'Pilih kunci jawaban yang benar'
        }
      }
    })

    setErrors(next)
    return Object.keys(next).filter((key) => next[key]).length === 0
  }

  const save = (activate: boolean) => {
    if (!validate()) {
      toast('Periksa kembali isian yang ditandai merah.', 'error')
      return
    }
    const now = new Date().toISOString()
    const payload: CbtExam = {
      ...draft,
      title: draft.title.trim(),
      durationMinutes: Math.round(draft.durationMinutes),
      maxViolations: Math.round(draft.maxViolations),
      questions: draft.questions.map((question) => ({
        ...question,
        stimulus: (question.stimulus ?? '').trim() || undefined,
        text: question.text.trim(),
        options: question.options.map((option) => option.trim()),
        points: Math.round(question.points),
      })),
      status: activate ? 'aktif' : draft.status === 'aktif' ? 'aktif' : 'draft',
      updatedAt: now,
    }
    cbt.upsertExam(payload)
    toast(
      activate ? 'Ujian disimpan dan diaktifkan. Siswa dapat masuk dengan token.' : 'Ujian berhasil disimpan.',
      'success',
    )
    navigate('/cbt')
  }

  const pgCount = draft.questions.filter((q) => q.type === 'pg').length
  const essayCount = draft.questions.filter((q) => q.type === 'essay').length

  return (
    <div>
      <PageHeader
        eyebrow={isEditing ? 'Sunting Ujian' : 'Ujian Baru'}
        title={isEditing ? draft.title || 'Sunting ujian' : 'Buat ujian CBT baru'}
        description="Susun pengaturan ujian dan bank soal pilihan ganda (dinilai otomatis) serta esai (dinilai guru)."
        actions={
          <>
            <Button variant="ghost" size="md" onClick={() => navigate('/cbt')}>
              <ArrowLeft size={15} />
              Kembali
            </Button>
            <Button variant="outline" size="md" onClick={() => save(false)}>
              Simpan Draft
            </Button>
            <Button size="md" onClick={() => save(true)}>
              <Play size={15} />
              Simpan &amp; Aktifkan
            </Button>
          </>
        }
      />

      {isEditing && existing && existing.status === 'aktif' && (
        <div className="mb-4">
          <Alert tone="warning" title="Ujian sedang aktif">
            Perubahan yang Anda simpan akan langsung terlihat oleh siswa yang sedang/mulai mengerjakan.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Pengaturan ujian */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Identitas Ujian" description="Informasi dasar ujian" />
            <div className="space-y-4 px-5 py-4">
              <div>
                <Input
                  label="Judul Ujian"
                  placeholder="cth. Ulangan Harian 1 - Bilangan Bulat"
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  error={errors.title}
                  required
                />
              </div>
              <Select
                label="Mata Pelajaran"
                options={SUBJECTS.map((subject) => ({ value: subject, label: subject }))}
                value={draft.subject}
                onChange={(e) => update('subject', e.target.value)}
              />
              <div>
                <Input
                  label="Durasi (menit)"
                  type="number"
                  min={1}
                  max={480}
                  value={draft.durationMinutes}
                  onChange={(e) => update('durationMinutes', Number(e.target.value))}
                  error={errors.durationMinutes}
                  required
                />
              </div>
              <div>
                <Input
                  label="Batas Pelanggaran"
                  type="number"
                  min={1}
                  max={10}
                  value={draft.maxViolations}
                  onChange={(e) => update('maxViolations', Number(e.target.value))}
                  error={errors.maxViolations}
                  hint="Siswa otomatis didiskualifikasi setelah melewati batas pelanggaran anti-kecurangan."
                  required
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Token & Kelas Peserta" />
            <div className="space-y-4 px-5 py-4">
              <div>
                <Label required>Token Ujian</Label>
                <div className="flex items-center gap-2">
                  <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-base font-bold tracking-[0.25em] text-navy-950">
                    {draft.token}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={regenerateToken}
                    aria-label="Buat token baru"
                    title="Buat token baru"
                  >
                    <RefreshCw size={15} />
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Diketik siswa bersama NISN di halaman Mode Ujian untuk masuk.
                </p>
              </div>
              <div>
                <Label required>Kelas Peserta</Label>
                {errors.classIds && <p className="mb-1 text-[11px] font-medium text-rose-600">{errors.classIds}</p>}
                <div className="space-y-2">
                  {[...data.classes]
                    .sort((a, b) => a.grade - b.grade)
                    .map((clazz) => {
                      const selected = draft.classIds.includes(clazz.id)
                      const students = data.students.filter(
                        (student) => student.classId === clazz.id && student.status === 'aktif',
                      ).length
                      return (
                        <button
                          key={clazz.id}
                          type="button"
                          onClick={() => toggleClass(clazz.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                            selected
                              ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                              : 'border-slate-200 bg-white hover:border-slate-300',
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md border',
                                selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white',
                              )}
                            >
                              {selected && <CheckCircle2 size={13} />}
                            </span>
                            <span className="text-sm font-semibold text-navy-950">Kelas {clazz.name}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">{students} siswa</span>
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pengaturan Anti-Kecurangan" />
            <div className="divide-y divide-slate-100 px-5 py-2">
              <Toggle
                checked={draft.shuffleQuestions}
                onChange={(checked) => update('shuffleQuestions', checked)}
                label="Acak urutan soal"
                description="Urutan soal berbeda untuk setiap siswa."
              />
              <Toggle
                checked={draft.shuffleOptions}
                onChange={(checked) => update('shuffleOptions', checked)}
                label="Acak opsi jawaban"
                description="Urutan opsi A-D berbeda untuk setiap siswa."
              />
              <Toggle
                checked={draft.showResult}
                onChange={(checked) => update('showResult', checked)}
                label="Tampilkan nilai ke siswa"
                description="Nilai PG langsung muncul setelah ujian selesai; esai menunggu penilaian guru."
              />
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Selama ujian berlangsung sistem otomatis mendeteksi siswa pindah tab/aplikasi, keluar layar,
                keluar mode layar penuh, dan penggunaan dua layar. Pelanggaran melebihi batas akan
                mendiskualifikasi siswa secara otomatis.
              </p>
            </div>
          </Card>
        </div>

        {/* Bank soal */}
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  Bank Soal
                  <Badge tone="brand">
                    {pgCount} PG · {essayCount} Esai · {examTotalPoints(draft)} poin
                  </Badge>
                </span>
              }
              description="Soal pilihan ganda dinilai otomatis; esai dinilai guru di halaman Hasil."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" size="sm" onClick={() => setImportOpen(true)}>
                    <FileUp size={13} />
                    Impor Soal
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion('pg')}>
                    <Plus size={13} />
                    Soal PG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion('essay')}>
                    <Plus size={13} />
                    Soal Esai
                  </Button>
                </div>
              }
            />
            {errors.questions && (
              <div className="px-5 pt-3">
                <Alert tone="danger" title="Bank soal kosong">
                  Tambahkan minimal satu soal sebelum ujian dapat diaktifkan.
                </Alert>
              </div>
            )}
            <div className="space-y-4 px-5 py-4">
              {draft.questions.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                  <FileText size={26} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Belum ada soal</p>
                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Tambahkan soal pilihan ganda (A-D) untuk penilaian otomatis, atau soal esai untuk
                    penilaian manual oleh guru.
                  </p>
                </div>
              )}

              {draft.questions.map((question, index) => {
                const error = errors[`q_${index}`]
                return (
                  <div
                    key={question.id}
                    className={cn(
                      'rounded-2xl border bg-white transition-colors',
                      error ? 'border-rose-300' : 'border-slate-200',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <Badge tone={question.type === 'pg' ? 'brand' : 'violet'}>
                          {question.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                        </Badge>
                        {error && <span className="text-[11px] font-medium text-rose-600">{error}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="mr-2 flex items-center gap-1.5">
                          <Label htmlFor={`points_${question.id}`}>Poin</Label>
                          <input
                            id={`points_${question.id}`}
                            type="number"
                            min={1}
                            max={100}
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: Number(e.target.value) })}
                            className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          />
                        </div>
                        <button
                          onClick={() => moveQuestion(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Naikkan soal"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 1)}
                          disabled={index === draft.questions.length - 1}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Turunkan soal"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus soal"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-3.5">
                      <div>
                        <Label>Instruksi / Stimulus (opsional)</Label>
                        <RichTextEditor
                          value={question.stimulus ?? ''}
                          onChange={(val) => updateQuestion(question.id, { stimulus: val })}
                          placeholder="cth. Bacalah teks berikut dengan saksama! atau Pilihlah salah satu jawaban yang paling benar!"
                          minHeight="80px"
                        />
                      </div>
                      <div>
                        <Label required>Teks Soal</Label>
                        <RichTextEditor
                          value={question.text}
                          onChange={(val) => updateQuestion(question.id, { text: val })}
                          placeholder={
                            question.type === 'pg'
                              ? 'cth. Hasil dari -12 + 8 adalah...'
                              : 'cth. Jelaskan proses terjadinya hujan...'
                          }
                          minHeight="100px"
                        />
                      </div>
                      {question.text && /<[a-z]/i.test(question.text) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview (hasil render):</p>
                          <RichContent content={question.text} className="text-sm text-slate-700" />
                        </div>
                      )}

                      {question.type === 'pg' && (
                        <div>
                          <Label required>Opsi Jawaban &amp; Kunci</Label>
                          <div className="space-y-2">
                            {question.options.slice(0, MAX_OPTIONS).map((option, optionIndex) => {
                              const isCorrect = question.answer === String(optionIndex)
                              return (
                                <div
                                  key={optionIndex}
                                  className={cn(
                                    'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
                                    isCorrect ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white',
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(question.id, { answer: String(optionIndex) })}
                                    className={cn(
                                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-400',
                                    )}
                                    title="Tandai sebagai kunci jawaban"
                                  >
                                    {OPTION_LABELS[optionIndex]}
                                  </button>
                                  <input
                                    value={option}
                                    onChange={(e) => {
                                      const options = [...question.options]
                                      options[optionIndex] = e.target.value
                                      updateQuestion(question.id, { options })
                                    }}
                                    placeholder={`Opsi ${OPTION_LABELS[optionIndex]}`}
                                    className="h-9 flex-1 rounded-lg border-0 bg-transparent px-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-0"
                                  />
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                                      Kunci
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            Klik huruf untuk menandai kunci jawaban yang benar.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal impor soal dari file Word/Excel/PDF */}
      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setImportPreview(null)
          setImportFileName('')
          setImportError(null)
        }}
        title="Impor Soal dari File"
        description="Unggah file Word (.docx), Excel (.xlsx/.csv), atau PDF. Soal akan diparsing otomatis."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setImportOpen(false)
                setImportPreview(null)
                setImportFileName('')
                setImportError(null)
              }}
            >
              Batal
            </Button>
            <Button
              size="md"
              onClick={handleConfirmImport}
              disabled={!importPreview || importPreview.length === 0}
            >
              Impor {importPreview ? `(${importPreview.length} soal)` : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.xlsx,.xls,.csv,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="md"
              className="w-full"
              loading={importLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={15} />
              {importFileName ? importFileName : 'Pilih File (Word/Excel/PDF)'}
            </Button>
          </div>

          {importError && (
            <Alert tone="danger" title="Gagal membaca file">
              {importError}
            </Alert>
          )}

          {importLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-slate-500">
              Membaca file...
            </div>
          )}

          {importPreview && importPreview.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Preview {importPreview.length} soal terdeteksi
              </p>
              <div className="max-h-[40vh] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                {importPreview.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-900 text-[11px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <Badge tone={q.type === 'pg' ? 'brand' : 'violet'}>
                        {q.type === 'pg' ? 'PG' : 'Esai'} · {q.points} poin
                      </Badge>
                    </div>
                    <div
                      className="text-sm text-slate-700"
                      dangerouslySetInnerHTML={{ __html: q.text }}
                    />
                    {q.type === 'pg' && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
                              q.answer === String(oi)
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 text-slate-600',
                            )}
                          >
                            <span className="font-bold">{OPTION_LABELS[oi]}.</span>
                            <span dangerouslySetInnerHTML={{ __html: opt || '(kosong)' }} />
                            {q.answer === String(oi) && (
                              <span className="ml-auto text-[10px] font-bold text-emerald-600">Kunci</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Periksa preview di atas. Soal akan ditambahkan ke bank soal setelah Anda klik "Impor".
              </p>
            </div>
          )}

          {!importPreview && !importLoading && !importError && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
              <p className="text-xs text-slate-500">
                Format yang didukung:
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
                <li><strong>Excel (.xlsx/.csv):</strong> kolom Pertanyaan, Opsi A-D, Jawaban (A-D), Poin, Tipe</li>
                <li><strong>Word (.docx):</strong> soal bernomor (1., 2., ...) dengan opsi A/B/C/D</li>
                <li><strong>PDF:</strong> teks soal bernomor dengan opsi A/B/C/D</li>
              </ul>
              <p className="mt-3 text-[11px] text-amber-600">
                Gambar, rumus matematika, dan kode akan dipertahankan sebaik mungkin. Untuk hasil terbaik gunakan format Excel terstruktur.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
