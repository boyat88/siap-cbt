import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
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
  semester?: string
  headmasterSignature?: string
  headmasterName?: string
  headmasterNip?: string
  includePhoto?: boolean
  cardBgColor?: string
  cardBgImage?: string
  printLocation?: string
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
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const dataUrl = await new Promise<string | null>((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) { resolve(null); return }
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = src
    })
    if (!dataUrl) return null
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
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
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, semester, headmasterSignature, headmasterName, headmasterNip, includePhoto } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`
  const semesterLine = semester ? `Semester ${semester}` : ''
  const printLocation = info.printLocation ?? 'Cikatomas'
  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  const cardsPerPage = 6
  const totalPages = Math.ceil(students.length / cardsPerPage)

  const children: (Paragraph | Table)[] = []

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      children.push(new Paragraph({ pageBreakBefore: true }))
    }

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    const rows: TableRow[] = []
    for (let r = 0; r < 3; r++) {
      const cells: TableCell[] = []
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoBuffer = (includePhoto !== false && student.photo) ? await fetchImageBuffer(student.photo) : null
          const sigBuffer = headmasterSignature ? await fetchImageBuffer(headmasterSignature) : null

          const cellChildren: (Paragraph | Table)[] = []

          // Header
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: title, bold: true, size: 9, color: '1E40AF' })],
              spacing: { after: 0 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: subtitle, bold: true, size: 8 })],
              spacing: { after: 0 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: yearLine, size: 7, italics: true })],
              spacing: { after: 0 },
            }),
          )
          if (semesterLine) {
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: semesterLine, size: 7, italics: true })],
                spacing: { after: 60 },
              }),
            )
          } else {
            cellChildren.push(new Paragraph({ text: '', spacing: { after: 60 } }))
          }

          // Nama siswa
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: student.name, bold: true, size: 9 })],
              spacing: { after: 20 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `NISN: ${student.nisn}`, size: 7 })],
              spacing: { after: 40 },
            }),
          )

          // Detail ujian
          const details = [
            { label: 'Mapel', value: exam.subject },
            { label: 'Hari/Tgl', value: formatDateLong(examDate) },
            { label: 'Waktu', value: examTime },
            { label: 'Kelas', value: student.classId.replace('k', '') },
          ]
          for (const d of details) {
            cellChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${d.label}:`.padEnd(10, ' '), bold: true, size: 7, font: 'Consolas' }),
                  new TextRun({ text: ` ${d.value}`, size: 7 }),
                ],
                spacing: { after: 2 },
              }),
            )
          }

          // Titimangsa + Tanda tangan
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${printLocation}, ${printDate}`, size: 7 })],
              spacing: { before: 60, after: 40 },
            }),
          )
          if (sigBuffer) {
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ data: sigBuffer, transformation: { width: 50, height: 20 } })],
                spacing: { after: 10 },
              }),
            )
          }
          cellChildren.push(
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
                top: { style: BorderStyle.SINGLE, size: 4, color: '3b82f6' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '3b82f6' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '3b82f6' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '3b82f6' },
              },
            }),
          )
        }
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

/* ------------------------------------------------------------------ */
/* PDF (.pdf) - 6 kartu per lembar (2 kolom x 3 baris)                 */
/* ------------------------------------------------------------------ */

export async function generateExamCardPdf(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, semester, headmasterSignature, headmasterName, headmasterNip, includePhoto } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`
  const semesterLine = semester ? `Semester ${semester}` : ''
  const printLocation = info.printLocation ?? 'Cikatomas'

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 5
  const gap = 5
  const cardW = (pageW - margin * 2 - gap) / 2
  const cardH = (pageH - margin * 2 - gap * 2 - 14) / 3
  const cardsPerPage = 6

  const totalPages = Math.ceil(students.length / cardsPerPage)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage()

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
    if (semesterLine) {
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'italic')
      pdf.text(semesterLine, pageW / 2, 20, { align: 'center' })
    }

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    for (let i = 0; i < pageStudents.length; i++) {
      const student = pageStudents[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * (cardW + gap)
      const y = 22 + row * (cardH + gap)

      pdf.setFillColor(240, 249, 255)
      pdf.rect(x, y, cardW, cardH, 'F')

      pdf.setDrawColor(30, 64, 175)
      pdf.setLineWidth(0.8)
      pdf.setLineDashPattern([3, 2], 0)
      pdf.rect(x, y, cardW, cardH)
      pdf.setLineDashPattern([], 0)

      let cursorY = y + 3

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
      cursorY += 3
      if (semesterLine) {
        pdf.setFontSize(5.5)
        pdf.setFont('helvetica', 'italic')
        pdf.text(semesterLine, x + cardW / 2, cursorY + 2, { align: 'center' })
        cursorY += 3
      }
      cursorY += 3

      const includePhotoVal = includePhoto !== false
      const photoSize = includePhotoVal ? 22 : 0
      const photoX = x + 3
      const detailX = includePhotoVal ? x + photoSize + 6 : x + 3

      if (includePhotoVal) {
        if (student.photo) {
          const dataUrl = await fetchImageDataUrl(student.photo)
          if (dataUrl) {
            try {
              pdf.addImage(dataUrl, 'PNG', photoX, cursorY, photoSize, photoSize * 1.25)
            } catch {
              pdf.setFillColor(240, 240, 240)
              pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
              pdf.setFontSize(5)
              pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
            }
          } else {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
            pdf.setFontSize(5)
            pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
          }
        } else {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
          pdf.setFontSize(5)
          pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
        }
      }

      const nameY = cursorY
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(student.name, detailX, nameY + 3, { align: 'left' })

      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`NISN: ${student.nisn}`, detailX, nameY + 7, { align: 'left' })

      let detailY = nameY + 10
      pdf.setFontSize(6.5)
      const details = [
        { label: 'Mapel', value: exam.subject },
        { label: 'Hari/Tgl', value: formatDateLong(examDate) },
        { label: 'Waktu', value: examTime },
        { label: 'Kelas', value: student.classId.replace('k', '') },
      ]
      for (const d of details) {
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${d.label}:`, detailX + 18, detailY, { align: 'right' })
        pdf.setFont('helvetica', 'normal')
        pdf.text(d.value, detailX + 20, detailY)
        detailY += 3.5
      }

      const sigY = y + cardH - 20
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${printLocation}, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, x + cardW / 2, sigY, { align: 'center' })

      let sigCursorY = sigY + 4
      if (headmasterSignature) {
        const dataUrl = await fetchImageDataUrl(headmasterSignature)
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, 'PNG', x + (cardW - 28) / 2, sigCursorY, 28, 10)
            sigCursorY += 11
          } catch {
            sigCursorY += 2
          }
        }
      }
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(headmasterName ?? 'Kepala Sekolah', x + cardW / 2, sigCursorY + 2, { align: 'center' })
      if (headmasterNip) {
        pdf.setFontSize(5.5)
        pdf.text(`NIP. ${headmasterNip}`, x + cardW / 2, sigCursorY + 5, { align: 'center' })
      }
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.2)
      pdf.setLineDashPattern([], 0)
      pdf.line(x + (cardW - 30) / 2, sigCursorY + 1, x + (cardW + 30) / 2, sigCursorY + 1)
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}