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

export async function generateExamCardWord(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear } = info
  const title = `KARTU UJIAN ${examType} ${exam.subject} Tahun Ajaran ${academicYear} Kelas ${exam.classIds.map((c) => c.replace('k', '')).join('/')}`

  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 14 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: schoolName, size: 10, italics: true })],
      spacing: { after: 300 },
    }),
  )

  const cardsPerPage = 4
  const totalPages = Math.ceil(students.length / cardsPerPage)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }))
    }

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    const rows: TableRow[] = []
    for (let r = 0; r < 2; r++) {
      const cells: TableCell[] = []
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoBuffer = student.photo ? await fetchImageBuffer(student.photo) : null
          const cellChildren: Paragraph[] = []

          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: schoolName, size: 8, bold: true })],
              spacing: { after: 40 },
            }),
          )

          if (photoBuffer) {
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: photoBuffer,
                    transformation: { width: 60, height: 75 },
                  }),
                ],
                spacing: { after: 40 },
              }),
            )
          } else {
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '[Foto]', size: 8, italics: true, color: '999999' })],
                spacing: { after: 40 },
              }),
            )
          }

          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: student.name, bold: true, size: 10 })],
              spacing: { after: 20 },
            }),
          )

          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `NISN: ${student.nisn}`, size: 9 })],
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
            cellChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${d.label}: `, bold: true, size: 8 }),
                  new TextRun({ text: d.value, size: 8 }),
                ],
                spacing: { after: 10 },
              }),
            )
          }

          cells.push(
            new TableCell({
              children: cellChildren,
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
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

export async function generateExamCardPdf(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear } = info
  const title = `KARTU UJIAN ${examType} ${exam.subject} Tahun Ajaran ${academicYear} Kelas ${exam.classIds.map((c) => c.replace('k', '')).join('/')}`

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 10
  const cardW = (pageW - margin * 3) / 2
  const cardH = (pageH - margin * 3 - 20) / 2
  const cardsPerPage = 4

  const totalPages = Math.ceil(students.length / cardsPerPage)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage()

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, pageW / 2, 12, { align: 'center' })
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text(schoolName, pageW / 2, 17, { align: 'center' })

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    for (let i = 0; i < pageStudents.length; i++) {
      const student = pageStudents[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * (cardW + margin)
      const y = 22 + row * (cardH + margin)

      pdf.setDrawColor(150)
      pdf.setLineWidth(0.3)
      pdf.rect(x, y, cardW, cardH)

      let cursorY = y + 5

      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'bold')
      pdf.text(schoolName, x + cardW / 2, cursorY, { align: 'center' })
      cursorY += 5

      const photoSize = 25
      const photoX = x + (cardW - photoSize) / 2
      if (student.photo) {
        const dataUrl = await fetchImageDataUrl(student.photo)
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, 'PNG', photoX, cursorY, photoSize, photoSize * 1.25)
          } catch {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
            pdf.setFontSize(6)
            pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
          }
        } else {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
          pdf.setFontSize(6)
          pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
        }
      } else {
        pdf.setFillColor(240, 240, 240)
        pdf.rect(photoX, cursorY, photoSize, photoSize * 1.25, 'F')
        pdf.setFontSize(6)
        pdf.text('[Foto]', photoX + photoSize / 2, cursorY + (photoSize * 1.25) / 2, { align: 'center' })
      }
      cursorY += photoSize * 1.25 + 4

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text(student.name, x + cardW / 2, cursorY, { align: 'center' })
      cursorY += 4

      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`NISN: ${student.nisn}`, x + cardW / 2, cursorY, { align: 'center' })
      cursorY += 5

      pdf.setFontSize(7)
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
        pdf.text(d.value, x + 22, cursorY)
        cursorY += 4
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