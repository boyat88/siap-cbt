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
  examRoom?: string
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

/* ------------------------------------------------------------------ */
/* Word (.doc) - HTML sederhana yang Word bisa buka                    */
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

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Kartu Ujian</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 8mm; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  table.grid { width: 100%; border-collapse: separate; border-spacing: 4mm; }
  td.card { width: 50%; border: 2px solid #3b82f6; padding: 6px; vertical-align: top; background-color: #f0f9ff; }
  .header { text-align: center; background-color: #dbeafe; padding: 4px; margin: -6px -6px 6px -6px; }
  .header .title { font-size: 9pt; font-weight: bold; color: #1e40af; }
  .header .school { font-size: 8pt; font-weight: bold; }
  .header .year { font-size: 7pt; font-style: italic; }
  .name { font-size: 9pt; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .nisn { font-size: 7pt; text-align: center; color: #6b7280; margin-bottom: 4px; }
  .detail { font-size: 7pt; margin-bottom: 1px; }
  .detail b { font-weight: bold; }
  .sig { text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px solid #d1d5db; }
  .sig .name { font-size: 7pt; font-weight: bold; }
  .sig .nip { font-size: 6pt; color: #6b7280; }
  .sig img { max-width: 60px; max-height: 25px; display: block; margin: 4px auto 2px auto; }
  .titimangsa { text-align: center; font-size: 7pt; margin-bottom: 4px; }
</style>
</head>
<body>
`

  for (let page = 0; page < totalPages; page++) {
    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    html += `<div class="page"><table class="grid">\n`

    for (let r = 0; r < 3; r++) {
      html += `<tr>\n`
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const details = [
            { label: 'Nama', value: student.name },
            { label: 'NIS/NISN', value: student.nisn },
            { label: 'No. Peserta', value: String(students.indexOf(student) + 1) },
            { label: 'Ruang Ujian', value: info.examRoom || '-' },
          ]

          html += `<td class="card">
  <div class="header">
    <div class="title">${title}</div>
    <div class="school">${subtitle}</div>
    <div class="year">${yearLine}</div>
    ${semesterLine ? `<div class="year">${semesterLine}</div>` : ''}
  </div>
  <div class="name">${student.name}</div>
  <div class="nisn">NISN: ${student.nisn}</div>
  <table cellpadding="0" cellspacing="0" style="width:100%; margin-top:4px;">
    <tr>
      ${includePhoto !== false && student.photo ? `<td style="width:45px; vertical-align:top; padding-right:6px;"><img src="${student.photo}" width="42" height="52" alt="Foto" style="border:1px solid #ccc;" /></td>` : (includePhoto !== false ? `<td style="width:45px; vertical-align:top; padding-right:6px; background-color:#e5e7eb; text-align:center; font-size:7pt; color:#9ca3af; height:52px;">[Foto]</td>` : '')}
      <td style="vertical-align:top;">
        ${details.map((d) => `<div class="detail"><b>${d.label}:</b> ${d.value}</div>`).join('')}
      </td>
    </tr>
  </table>
  <div class="sig">
    <div class="titimangsa">${printLocation}, ${printDate}</div>
    ${headmasterSignature ? `<img src="${headmasterSignature}" width="60" height="25" alt="TTD" style="margin:4px auto; display:block;" />` : ''}
    <div class="name">${headmasterName ?? 'Kepala Sekolah'}</div>
    <div class="nip">${headmasterNip ? `NIP. ${headmasterNip}` : ''}</div>
  </div>
</td>\n`
        } else {
          html += `<td class="card" style="border:none; background:transparent;"></td>\n`
        }
      }
      html += `</tr>\n`
    }

    html += `</table></div>\n`
  }

  html += `</body></html>`

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  downloadBlob(blob, `Kartu_Ujian_${exam.subject}_${examType}.doc`)
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
        { label: 'Nama', value: student.name },
        { label: 'NIS/NISN', value: student.nisn },
        { label: 'No. Peserta', value: String(students.indexOf(student) + 1) },
        { label: 'Ruang Ujian', value: info.examRoom || '-' },
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