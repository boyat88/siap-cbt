import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType } from 'docx'
import { jsPDF } from 'jspdf'
import type { CbtExam } from '../types'
import type { Student } from '../types'

export interface ExamCardInfo {
  exam: CbtExam
  students: Student[]
  examDate: string
  examTime: string
  examType: string
  schoolName: string
  academicYear: string
  headmasterSignature?: string
  headmasterName?: string
  headmasterNip?: string
  includePhoto?: boolean
}

function dayName(isoDate: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const d = new Date(isoDate)
  return days[d.getDay()] ?? ''
}

function formatDateLong(isoDate: string): string {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const d = new Date(isoDate)
  return `${dayName(isoDate)}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

async function fetchImageBuffer(src: string): Promise<ArrayBuffer | null> {
  try {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes.buffer
    }
    const res = await fetch(src)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

async function fetchImageDataUrl(src: string): Promise<string | null> {
  try {
    if (src.startsWith('data:')) return src
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Word (.docx) - 6 kartu per lembar (2 kolom x 3 baris)               */
/* ------------------------------------------------------------------ */

export async function generateExamCardWord(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, headmasterSignature, headmasterName, headmasterNip, includePhoto } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`

  const cardsPerPage = 6
  const totalPages = Math.ceil(students.length / cardsPerPage)

  const children: (Paragraph | Table)[] = []

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }))
    }

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    // Tabel 3 baris x 2 kolom.
    const rows: TableRow[] = []
    for (let r = 0; r < 3; r++) {
      const cells: TableCell[] = []
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoBuffer = (includePhoto !== false && student.photo) ? await fetchImageBuffer(student.photo) : null
          const sigBuffer = headmasterSignature ? await fetchImageBuffer(headmasterSignature) : null

          const cellChildren: Paragraph[] = []

          // Header kartu: judul + sekolah + tahun ajaran
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: title, bold: true, size: 9, color: '1e40af' })],
              spacing: { after: 0 },
              shading: { type: ShadingType.CLEAR, fill: 'dbeafe' },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: subtitle, bold: true, size: 8 })],
              spacing: { after: 0 },
              shading: { type: ShadingType.CLEAR, fill: 'dbeafe' },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: yearLine, size: 7, italics: true })],
              spacing: { after: 60 },
              shading: { type: ShadingType.CLEAR, fill: 'dbeafe' },
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '93c5fd' } },
            }),
          )

          // Foto siswa (opsional)
          if (includePhoto !== false) {
            if (photoBuffer) {
              cellChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: photoBuffer,
                      transformation: { width: 45, height: 56 },
                    }),
                  ],
                  spacing: { after: 40 },
                }),
              )
            } else {
              cellChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '[Foto]', size: 7, italics: true, color: '999999' })],
                  spacing: { after: 40 },
                }),
              )
            }
          }

          // Nama siswa
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: student.name, bold: true, size: 9 })],
              spacing: { after: 10 },
            }),
          )

          // NISN
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `NISN: ${student.nisn}`, size: 7 })],
              spacing: { after: 40 },
            }),
          )

          // Detail ujian
          const details = [
            { label: 'Ujian', value: exam.title },
            { label: 'Mapel', value: exam.subject },
            { label: 'Hari/Tgl', value: formatDateLong(examDate) },
            { label: 'Waktu', value: examTime },
            { label: 'Kelas', value: student.classId.replace('k', '') },
          ]
          for (const d of details) {
            cellChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${d.label}: `, bold: true, size: 7 }),
                  new TextRun({ text: d.value, size: 7 }),
                ],
                spacing: { after: 2 },
              }),
            )
          }

          // Area tanda tangan kepala sekolah
          cellChildren.push(
            new Paragraph({ text: '', spacing: { before: 60 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: sigBuffer
                ? [new ImageRun({ data: sigBuffer, transformation: { width: 50, height: 25 } })]
                : [new TextRun({ text: '', size: 7 })],
              spacing: { after: 10 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: headmasterName ?? 'Kepala Sekolah', size: 7, bold: true })],
              spacing: { after: 0 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: headmasterNip ? `NIP. ${headmasterNip}` : '', size: 6 })],
              spacing: { after: 0 },
            }),
          )

          cells.push(
            new TableCell({
              children: cellChildren,
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.DASHED, size: 6, color: '60a5fa' },
                bottom: { style: BorderStyle.DASHED, size: 6, color: '60a5fa' },
                left: { style: BorderStyle.DASHED, size: 6, color: '60a5fa' },
                right: { style: BorderStyle.DASHED, size: 6, color: '60a5fa' },
              },
            }),
          )
        }
        rows.push(new TableRow({ children: cells }))
      }

      children.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      )
    }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `Kartu_Ujian_${exam.subject}_${examType}.docx`)
}
}

/* ------------------------------------------------------------------ */
/* PDF (.pdf) - 6 kartu per lembar (2 kolom x 3 baris)                 */
/* ------------------------------------------------------------------ */

export async function generateExamCardPdf(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, headmasterSignature, headmasterName, headmasterNip, includePhoto } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 8
  const gap = 4
  const cardW = (pageW - margin * 2 - gap) / 2
  const cardH = (pageH - margin * 2 - gap * 2 - 12) / 3
  const cardsPerPage = 6

  const totalPages = Math.ceil(students.length / cardsPerPage)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage()

    // Judul halaman
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 64, 175)
    pdf.text(title, pageW / 2, 8, { align: 'center' })
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text(subtitle, pageW / 2, 12, { align: 'center' })
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'italic')
    pdf.text(yearLine, pageW / 2, 16, { align: 'center' })

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    for (let i = 0; i < pageStudents.length; i++) {
      const student = pageStudents[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * (cardW + gap)
      const y = 20 + row * (cardH + gap)

      // Border kartu (dashed cut line)
      pdf.setDrawColor(96, 165, 250)
      pdf.setLineWidth(0.4)
      pdf.setLineDashPattern([2, 2], 0)
      pdf.rect(x, y, cardW, cardH)
      pdf.setLineDashPattern([], 0)

      let cursorY = y + 3

      // Header: judul + sekolah + tahun ajaran
      pdf.setFillColor(219, 234, 254)
      pdf.rect(x + 0.5, y + 0.5, cardW - 1, 10, 'F')
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 64, 175)
      pdf.text(title, x + cardW / 2, cursorY + 2, { align: 'center' })
      cursorY += 3
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(subtitle, x + cardW / 2, cursorY + 2, { align: 'center' })
      cursorY += 3
      pdf.setFontSize(5.5)
      pdf.setFont('helvetica', 'italic')
      pdf.text(yearLine, x + cardW / 2, cursorY + 2, { align: 'center' })
      cursorY += 6

      // Foto siswa (opsional)
      const includePhoto = info.includePhoto !== false
      if (includePhoto) {
        const photoSize = 18
        const photoX = x + (cardW - photoSize) / 2
        if (student.photo) {
          const dataUrl = await fetchImageDataUrl(student.photo)
          if (dataUrl) {
            try {
              pdf.addImage(dataUrl, 'PNG', photoX, cursorY, photoSize, photoSize * 1.2)
            } catch {
              pdf.setFillColor(240, 240, 240)
              pdf.rect(photoX, cursorY, photoSize, photoSize * 1.2, 'F')
              pdf.setFontSize(5)
              pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.2) / 2, { align: 'center' })
            }
          } else {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(photoX, cursorY, photoSize, photoSize * 1.2, 'F')
            pdf.setFontSize(5)
            pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.2) / 2, { align: 'center' })
          }
        } else {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(photoX, cursorY, photoSize, photoSize * 1.2, 'F')
          pdf.setFontSize(5)
          pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.2) / 2, { align: 'center' })
        }
        cursorY += photoSize * 1.2 + 3
      }

      // Nama siswa
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(student.name, x + cardW / 2, cursorY, { align: 'center' })
      cursorY += 3.5

      // NISN
      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`NISN: ${student.nisn}`, x + cardW / 2, cursorY, { align: 'center' })
      cursorY += 4

      // Detail ujian
      pdf.setFontSize(6.5)
      const details = [
        { label: 'Ujian', value: exam.title },
        { label: 'Mapel', value: exam.subject },
        { label: 'Hari/Tgl', value: formatDateLong(examDate) },
        { label: 'Waktu', value: examTime },
        { label: 'Kelas', value: student.classId.replace('k', '') },
      ]
      for (const d of details) {
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${d.label}:`, x + 3, cursorY)
        pdf.setFont('helvetica', 'normal')
        pdf.text(d.value, x + 18, cursorY)
        cursorY += 3.5
      }

      // Area tanda tangan kepala sekolah (di bawah)
      const sigY = y + cardH - 18
      if (headmasterSignature) {
        const dataUrl = await fetchImageDataUrl(headmasterSignature)
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, 'PNG', x + (cardW - 30) / 2, sigY, 30, 12)
          } catch {
            // ignore
          }
        }
      }
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(headmasterName ?? 'Kepala Sekolah', x + cardW / 2, sigY + 14, { align: 'center' })
      if (headmasterNip) {
        pdf.setFontSize(5.5)
        pdf.text(`NIP. ${headmasterNip}`, x + cardW / 2, sigY + 17, { align: 'center' })
      }
    }
  }

  pdf.save(`Kartu_Ujian_${exam.subject}_${examType}.pdf`)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
