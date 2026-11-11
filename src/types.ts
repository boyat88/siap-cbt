export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa' | 'terlambat'

export type Role = 'admin' | 'guru'

export type Gender = 'L' | 'P'

export interface School {
  name: string
  npsn: string
  address: string
  phone: string
  email: string
  headmaster: string
  headmasterNip?: string
  headmasterPhoto?: string
  headmasterSignature?: string
  website: string
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  nip: string
  subject: string
  phone: string
  photo?: string
}

export interface Teacher {
  id: string
  name: string
  nip: string
  gender: Gender
  /** Satu guru dapat mengampu lebih dari satu mata pelajaran. */
  subjects: string[]
  phone: string
  email: string
  status: 'aktif' | 'nonaktif'
  photo?: string
  signature?: string
  /** Akun login guru. Dibuat dan diaktifkan oleh administrator. */
  accountActive?: boolean
  loginPassword?: string
}

export interface ClassRoom {
  id: string
  name: string
  grade: 7 | 8 | 9
  homeroomId: string
  academicYear: string
}

export interface Student {
  id: string
  nisn: string
  name: string
  gender: Gender
  classId: string
  birthDate: string
  guardian: string
  phone: string
  address: string
  status: 'aktif' | 'nonaktif'
  photo?: string
}

export interface AttendanceSession {
  id: string
  date: string
  classId: string
  subject: string
  period: string
  teacherId: string
  note: string
  records: Record<string, AttendanceStatus>
  /** Keterangan per siswa (terutama untuk terlambat, izin, sakit). */
  recordNotes?: Record<string, string>
  createdAt: string
  updatedAt: string
  /** Informasi pengirim saat absensi disinkronkan ke server administrator. */
  submittedById?: string
  submittedByName?: string
  submittedByRole?: Role
  syncedAt?: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  time: string
  read: boolean
}

export interface Settings {
  school: School
  academicYear: string
  semester: 'Ganjil' | 'Genap'
  minimumAttendance: number
  lateTolerance: number
  notifyGuardian: boolean
  weeklyReport: boolean
  appLogo?: string
  /** Daftar hari libur (tanggal ISO + nama). Sabtu/Minggu otomatis libur. */
  holidays?: { date: string; name: string }[]
}

export interface AppData {
  students: Student[]
  teachers: Teacher[]
  classes: ClassRoom[]
  sessions: AttendanceSession[]
  notifications: AppNotification[]
  settings: Settings
}

/* ------------------------------------------------------------------ */
/* CBT (Computer-Based Test)                                           */
/* ------------------------------------------------------------------ */

export type CbtQuestionType = 'pg' | 'essay'

export type CbtExamStatus = 'draft' | 'aktif' | 'selesai'

export type CbtAttemptStatus = 'berlangsung' | 'selesai' | 'diskualifikasi'

export type CbtViolationType = 'leave-screen' | 'switch-tab' | 'exit-fullscreen' | 'dual-screen'

export interface CbtQuestion {
  id: string
  type: CbtQuestionType
  /** Teks instruksi bagian/grup yang ditampilkan di atas nomor soal (mis. "Bacalah teks berikut untuk soal 1-6!"). */
  sectionStimulus?: string
  /** Teks instruksi/stimulus yang ditampilkan sebelum soal (mis. "Bacalah teks berikut!"). */
  stimulus?: string
  text: string
  /** Opsi jawaban untuk PG (A-D). */
  options: string[]
  /** Index opsi benar sebagai string (PG): '0'..'3'. */
  answer?: string
  points: number
}

export interface CbtExam {
  id: string
  title: string
  subject: string
  classIds: string[]
  teacherId: string
  teacherName: string
  durationMinutes: number
  /** Token yang diketik siswa untuk masuk ke ujian. */
  token: string
  status: CbtExamStatus
  shuffleQuestions: boolean
  shuffleOptions: boolean
  /** Batas pelanggaran sebelum siswa didiskualifikasi otomatis. */
  maxViolations: number
  /** Tampilkan nilai ke siswa setelah ujian selesai. */
  showResult: boolean
  questions: CbtQuestion[]
  createdAt: string
  updatedAt: string
}

export interface CbtViolation {
  type: CbtViolationType
  at: string
}

export interface CbtAttempt {
  id: string
  examId: string
  studentId: string
  studentName: string
  classId: string
  className: string
  startedAt: string
  expiresAt: string
  submittedAt?: string
  /** Urutan soal khusus siswa (hasil acakan). */
  questionOrder: string[]
  /** Pemetaan opsi per siswa: posisi tampil -> index opsi asli. */
  optionOrder: Record<string, number[]>
  /** Jawaban: questionId -> index opsi asli (PG) atau teks (esai). */
  answers: Record<string, string>
  status: CbtAttemptStatus
  violations: CbtViolation[]
  /** Poin PG yang dijawab benar (dinilai otomatis saat submit). */
  autoPoints?: number
  /** Total poin seluruh soal PG. */
  pgTotalPoints?: number
  /** Nilai esai per soal dari guru: questionId -> poin. */
  essayScores?: Record<string, number>
  /** Nilai akhir 0-100. */
  finalScore?: number
  gradedBy?: string
  gradedAt?: string
  /** Apakah admin mengizinkan siswa mengulang ujian ini. */
  retakeApproved?: boolean
  retakeApprovedBy?: string
  retakeApprovedAt?: string
  /** ID attempt sebelumnya (jika ini adalah attempt ulang). */
  previousAttemptId?: string
  updatedAt: string
}

export interface ShowToast {
  (message: string, type?: 'success' | 'error' | 'info'): void
}
