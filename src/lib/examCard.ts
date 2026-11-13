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
  /** Lokasi cetak (mis. "Cikatomas"). Default: "Cikatomas". */
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
/* Word (.doc) - HTML table layout, 6 kartu per lembar A4               */
/* ------------------------------------------------------------------ */

export async function generateExamCardWord(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, semester, headmasterSignature, headmasterName, headmasterNip, includePhoto, cardBgColor, cardBgImage } = info
  const printLocation = info.printLocation ?? 'Cikatomas'
  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`
  const semesterLine = info.semester ? `Semester ${info.semester}` : ''
  const bgColor = cardBgColor || '#f0f9ff'

  const cardsPerPage = 6
  const totalPages = Math.ceil(students.length / cardsPerPage)

  let html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Kartu Ujian</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: 21cm 29.7cm; margin: 8mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  table.grid { width: 100%; border-collapse: separate; border-spacing: 4mm 4mm; }
  td.card {
    width: 50%;
    border: 2px dashed #3b82f6;
    padding: 6px;
    vertical-align: top;
    background-color: ${bgColor};
  }
  .card-header {
    text-align: center;
    background-color: #dbeafe;
    padding: 4px;
    margin: -6px -6px 6px -6px;
    border-bottom: 1px solid #93c5fd;
  }
  .card-header .title { font-size: 9pt; font-weight: bold; color: #1e40af; }
  .card-header .school { font-size: 8pt; font-weight: bold; }
  .card-header .year { font-size: 7pt; font-style: italic; }
  .card-photo {
    width: 40px;
    height: 50px;
    background-color: #e5e7eb;
    text-align: center;
    vertical-align: middle;
    font-size: 7pt;
    color: #9ca3af;
    float: left;
    margin-right: 6px;
    margin-bottom: 4px;
  }
  .card-photo img { width: 40px; height: 50px; }
  .card-name { font-size: 9pt; font-weight: bold; margin-bottom: 2px; text-align: center; }
  .card-nisn { font-size: 7pt; color: #6b7280; margin-bottom: 4px; text-align: center; }
  .card-detail { font-size: 7pt; margin-bottom: 1px; }
  .card-detail b { font-weight: bold; }
  .card-sig {
    text-align: center;
    margin-top: 6px;
    padding-top: 4px;
    border-top: 1px solid #d1d5db;
  }
  .card-sig img { max-width: 50px; max-height: 20px; }
  .card-sig .name { font-size: 7pt; font-weight: bold; }
  .card-sig .nip { font-size: 6pt; color: #6b7280; }
</style>
</head>
<body>
`

  for (let page = 0; page < totalPages; page++) {
    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    html += `<div class="page"><table class="grid" cellspacing="0" cellpadding="0">\n`

    for (let r = 0; r < 3; r++) {
      html += `<tr>\n`
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoHtml = (includePhoto !== false && student.photo)
            ? `<td style="width:42px; vertical-align:top; padding-right:6px;"><img src="${student.photo}" width="40" height="50" alt="Foto" /></td>`
            : (includePhoto !== false ? `<td style="width:42px; vertical-align:top; padding-right:6px; background-color:#e5e7eb; text-align:center; font-size:7pt; color:#9ca3af;">[Foto]</td>` : '')

          const details = [
            { label: 'Mapel', value: exam.subject },
            { label: 'Hari/Tgl', value: formatDateLong(examDate) },
            { label: 'Waktu', value: examTime },
            { label: 'Kelas', value: student.classId.replace('k', '') },
          ]

          const sigHtml = headmasterSignature
            ? `<img src="${headmasterSignature}" width="50" height="20" alt="TTD" />`
            : ''

          const detailsHtml = details.map((d) => `<div class="card-detail"><b>${d.label}:</b> ${d.value}</div>`).join('')

          html += `<td class="card" style="background-color:${bgColor};">
  <div class="card-header">
    <div class="title">${title}</div>
    <div class="school">${subtitle}</div>
    <div class="year">${yearLine}</div>
    ${semesterLine ? `<div class="year">${semesterLine}</div>` : ''}
  </div>
  <table cellpadding="0" cellspacing="0" style="width:100%; margin-top:4px;">
    <tr>
      ${photoHtml}
      <td style="vertical-align:top;">
        <div class="card-name">${student.name}</div>
        <div class="card-nisn">NISN: ${student.nisn}</div>
        ${detailsHtml}
      </td>
    </tr>
  </table>
  <div class="card-sig">
    <div style="text-align:center; font-size:7pt; margin-bottom:4px;">${printLocation}, ${printDate}</div>
    ${sigHtml}
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
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, semester, headmasterSignature, headmasterName, headmasterNip, includePhoto, cardBgColor, cardBgImage } = info
  const printLocation = info.printLocation ?? 'Cikatomas'
  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`
  const semesterLine = info.semester ? `Semester ${info.semester}` : ''

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 6
  const gap = 3
  const cardW = (pageW - margin * 2 - gap) / 2
  const cardH = (pageH - margin * 2 - gap * 2 - 14) / 3
  const cardsPerPage = 6

  const totalPages = Math.ceil(students.length / cardsPerPage)

  const bgColor = cardBgColor ? hexToRgb(cardBgColor) : [240, 249, 255] as [number, number, number]

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

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    for (let i = 0; i < pageStudents.length; i++) {
      const student = pageStudents[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * (cardW + gap)
      const y = 20 + row * (cardH + gap)

      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      pdf.rect(x, y, cardW, cardH, 'F')

      pdf.setDrawColor(96, 165, 250)
      pdf.setLineWidth(0.5)
      pdf.setLineDashPattern([2, 2], 0)
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
      pdf.text(student.name, x + cardW / 2, nameY + 3, { align: 'center' })

      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`NISN: ${student.nisn}`, x + cardW / 2, nameY + 7, { align: 'center' })

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
        pdf.text(`${d.label}:`, detailX, detailY)
        pdf.setFont('helvetica', 'normal')
        pdf.text(d.value, detailX + 16, detailY)
        detailY += 3.5
      }

      let sigY = y + cardH - 20
      // Titimangsa
      pdf.setFontSize(6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${printLocation}, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, x + cardW / 2, sigY, { align: 'center' })
      sigY += 4
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}