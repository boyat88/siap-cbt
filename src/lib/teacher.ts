import type { Teacher } from '../types'

/** Bentuk data guru lama yang masih menyimpan satu mata pelajaran. */
export type LegacyTeacher = Teacher & { subject?: string }

/**
 * Mengembalikan daftar mata pelajaran guru. Data lama yang hanya memiliki
 * `subject` tunggal otomatis dibaca sebagai satu mata pelajaran.
 */
export function teacherSubjects(
  teacher: Pick<Teacher, 'subjects'> & { subject?: string },
): string[] {
  if (Array.isArray(teacher.subjects)) return teacher.subjects.filter(Boolean)
  if (typeof teacher.subject === 'string' && teacher.subject.trim()) return [teacher.subject.trim()]
  return []
}
