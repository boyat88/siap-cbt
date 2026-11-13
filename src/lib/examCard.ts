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
  /** Warna background kartu (hex, mis. #f0f9ff). Default putih. */
  cardBgColor?: string
  /** Data URL gambar background (opsional). */
  cardBgImage?: string
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

/* ------------------------------------------------------------------ */
/* Word (.docx) - 6 kartu per lembar (2 kolom x 3 baris)               */
/* Layout: foto di kiri, detail di kanan                               */
/* ------------------------------------------------------------------ */

export async function generateExamCardWord(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, headmasterSignature, headmasterName, headmasterNip, includePhoto, cardBgColor, cardBgImage } = info
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

    const rows: TableRow[] = []
    for (let r = 0; r < 3; r++) {
      const cells: TableCell[] = []
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoBuffer = (includePhoto !== false && student.photo) ? await fetchImageBuffer(student.photo) : null
          const sigBuffer = headmasterSignature ? await fetchImageBuffer(headmasterSignature) : null
          const bgBuffer = cardBgImage ? await fetchImageBuffer(cardBgImage) : null

          const cellChildren: (Paragraph | Table)[] = []

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

          // Baris: foto (kiri) + detail (kanan) dalam tabel nested
          const detailRows: TableRow[] = []
          const detailCells: TableCell[] = []

          // Kolom foto
          if (includePhoto !== false) {
            const photoChildren: Paragraph[] = []
            if (photoBuffer) {
              photoChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({ data: photoBuffer, transformation: { width: 40, height: 50 } })],
                }),
              )
            } else {
              photoChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '[Foto]', size: 7, italics: true, color: '999999' })],
                }),
              )
            }
            detailCells.push(
              new TableCell({
                children: photoChildren,
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: 'center' as any,
              }),
            )
          }

          // Kolom detail
          const detailChildren: Paragraph[] = []
          detailChildren.push(
            new Paragraph({
              children: [new TextRun({ text: student.name, bold: true, size: 9 })],
              spacing: { after: 20 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `NISN: ${student.nisn}`, size: 7 })],
              spacing: { after: 40 },
            }),
          )
          const details = [
            { label: 'Ujian', value: exam.title },
            { label: 'Mapel', value: exam.subject },
            { label: 'Hari/Tgl', value: formatDateLong(examDate) },
            { label: 'Waktu', value: examTime },
            { label: 'Kelas', value: student.classId.replace('k', '') },
          ]
          for (const d of details) {
            detailChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${d.label}: `, bold: true, size: 7 }),
                  new TextRun({ text: d.value, size: 7 }),
                ],
                spacing: { after: 2 },
              }),
            )
          }

          detailCells.push(
            new TableCell({
              children: detailChildren,
              width: { size: includePhoto !== false ? 75 : 100, type: WidthType.PERCENTAGE },
              verticalAlign: 'center' as any,
            }),
          )

          cellChildren.push(
            new Table({
              rows: [new TableRow({ children: detailCells })],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          )

          // Area tanda tangan kepala sekolah
          cellChildren.push(
            new Paragraph({ text: '', spacing: { before: 40 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: sigBuffer
                ? [new ImageRun({ data: sigBuffer, transformation: { width: 50, height: 20 } })]
                : [new TextRun({ text: '', size: 7 })],
              spacing: { after: 2 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: headmasterName ?? 'Kepala Sekolah', size: 7, bold: true })],
              spacing: { after: 0 },
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: '000000' } },
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
                top: { style: BorderStyle.DASHED, size: 8, color: '3b82f6' },
                bottom: { style: BorderStyle.DASHED, size: 8, color: '3b82f6' },
                left: { style: BorderStyle.DASHED, size: 8, color: '3b82f6' },
                right: { style: BorderStyle.DASHED, size: 8, color: '3b82f6' },
              },
              shading: cardBgColor ? { type: ShadingType.CLEAR, fill: cardBgColor.replace('#', '') } : undefined,
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
/* Layout: foto di kiri, detail di kanan                               */
/* ------------------------------------------------------------------ */

export async function generateExamCardPdf(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, headmasterSignature, headmasterName, headmasterNip, includePhoto, cardBgColor, cardBgImage } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 6
  const gap = 3
  const cardW = (pageW - margin * 2 - gap) / 2
  const cardH = (pageH - margin * 2 - gap * 2 - 14) / 3
  const cardsPerPage = 6

  const totalPages = Math.ceil(students.length / cardsPerPage)

  // Background color
  const bgColor = cardBgColor ? hexToRgb(cardBgColor) : [255, 255, 255] as [number, number, number]

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

      // Background kartu
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      pdf.rect(x, y, cardW, cardH, 'F')

      // Border kartu (dashed cut line)
      pdf.setDrawColor(96, 165, 250)
      pdf.setLineWidth(0.5)
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

      // Layout: foto (kiri) + detail (kanan)
      const includePhotoVal = includePhoto !== false
      const photoSize = includePhotoVal ? 22 : 0
      const photoX = x + 3
      const detailX = includePhotoVal ? x + photoSize + 6 : x + 3
      const detailW = includePhotoVal ? cardW - photoSize - 9 : cardW - 6

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

      // Nama siswa (di kanan foto, bagian atas)
      const nameY = cursorY
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(student.name, detailX, nameY + 3, { align: 'left' })

      // NISN
      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`NISN: ${student.nisn}`, detailX, nameY + 7, { align: 'left' })

      // Detail ujian (di bawah nama)
      let detailY = nameY + 10
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
        pdf.text(`${d.label}:`, detailX, detailY)
        pdf.setFont('helvetica', 'normal')
        pdf.text(d.value, detailX + 16, detailY)
        detailY += 3.5
      }

      // Area tanda tangan kepala sekolah (di bawah kartu)
      const sigY = y + cardH - 16
      if (headmasterSignature) {
        const dataUrl = await fetchImageDataUrl(headmasterSignature)
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, 'PNG', x + (cardW - 28) / 2, sigY, 28, 10)
          } catch {
            // ignore
          }
        }
      }
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(headmasterName ?? 'Kepala Sekolah', x + cardW / 2, sigY + 12, { align: 'center' })
      if (headmasterNip) {
        pdf.setFontSize(5.5)
        pdf.text(`NIP. ${headmasterNip}`, x + cardW / 2, sigY + 15, { align: 'center' })
      }
      // Garis tanda tangan
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.2)
      pdf.setLineDashPattern([], 0)
      pdf.line(x + (cardW - 30) / 2, sigY + 11, x + (cardW + 30) / 2, sigY + 11)
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