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
  cardBgColor?: string
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
/* Word (.doc) - HTML yang bisa dibuka Word, 6 kartu per lembar A4      */
/* ------------------------------------------------------------------ */

export async function generateExamCardWord(info: ExamCardInfo): Promise<void> {
  const { exam, students, examDate, examTime, examType, schoolName, academicYear, headmasterSignature, headmasterName, headmasterNip, includePhoto, cardBgColor, cardBgImage } = info
  const title = `SUMATIF AKHIR SEMESTER (${examType})`
  const subtitle = schoolName
  const yearLine = `Tahun Ajaran ${academicYear}`

  const cardsPerPage = 6
  const totalPages = Math.ceil(students.length / cardsPerPage)
  const bgColor = cardBgColor || '#f0f9ff'

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
  .grid { display: table; width: 100%; border-collapse: separate; border-spacing: 4mm; }
  .row { display: table-row; }
  .card {
    display: table-cell;
    width: 50%;
    border: 2px dashed #3b82f6;
    border-radius: 6px;
    padding: 6px;
    background-color: ${bgColor};
    ${cardBgImage ? `background-image: url('${cardBgImage}'); background-size: cover; background-position: center;` : ''}
    vertical-align: top;
    break-inside: avoid;
  }
  .card-header {
    text-align: center;
    background: #dbeafe;
    padding: 4px;
    margin: -6px -6px 6px -6px;
    border-bottom: 1px solid #93c5fd;
  }
  .card-header .title { font-size: 9pt; font-weight: bold; color: #1e40af; }
  .card-header .school { font-size: 8pt; font-weight: bold; }
  .card-header .year { font-size: 7pt; font-style: italic; }
  .card-body { display: flex; gap: 6px; }
  .card-photo {
    width: 40px;
    height: 50px;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: #9ca3af;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
  }
  .card-photo img { width: 100%; height: 100%; object-fit: cover; }
  .card-details { flex: 1; }
  .card-name { font-size: 9pt; font-weight: bold; margin-bottom: 2px; }
  .card-nisn { font-size: 7pt; color: #6b7280; margin-bottom: 4px; }
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
  .spacer { height: 4mm; }
</style>
</head>
<body>
`

  for (let page = 0; page < totalPages; page++) {
    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

    html += `<div class="page">\n`

    // 3 baris, masing-masing 2 kolom
    for (let r = 0; r < 3; r++) {
      html += `<div class="grid" style="margin-bottom: 4mm;">\n`
      for (let c = 0; c < 2; c++) {
        const idx = r * 2 + c
        const student = pageStudents[idx]
        if (student) {
          const photoHtml = (includePhoto !== false && student.photo)
            ? `<div class="card-photo"><img src="${student.photo}" alt="Foto" /></div>`
            : (includePhoto !== false ? `<div class="card-photo">[Foto]</div>` : '')

          const details = [
            { label: 'Ujian', value: exam.title },
            { label: 'Mapel', value: exam.subject },
            { label: 'Hari/Tgl', value: formatDateLong(examDate) },
            { label: 'Waktu', value: examTime },
            { label: 'Kelas', value: student.classId.replace('k', '') },
          ]

          const sigHtml = headmasterSignature
            ? `<img src="${headmasterSignature}" alt="TTD" />`
            : ''

          html += `<div class="card">
  <div class="card-header">
    <div class="title">${title}</div>
    <div class="school">${subtitle}</div>
    <div class="year">${yearLine}</div>
  </div>
  <div class="card-body">
    ${photoHtml}
    <div class="card-details">
      <div class="card-name">${student.name}</div>
      <div class="card-nisn">NISN: ${student.nisn}</div>
      ${details.map((d) => `<div class="card-detail"><b>${d.label}:</b> ${d.value}</div>`).join('\n      ')}
    </div>
  </div>
  <div class="card-sig">
    ${sigHtml}
    <div class="name">${headmasterName ?? 'Kepala Sekolah'}</div>
    <div class="nip">${headmasterNip ? `NIP. ${headmasterNip}` : ''}</div>
  </div>
</div>\n`
        } else {
          // Cell kosong untuk genapkan grid
          html += `<div class="card" style="border: none; background: transparent;"></div>\n`
        }
      }
      html += `</div>\n`
    }

    html += `</div>\n`
  }

  html += `</body></html>`

  // Download as .doc (Word can open HTML files)
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  downloadBlob(blob, `Kartu_Ujian_${exam.subject}_${examType}.doc`)
}

/* ------------------------------------------------------------------ */
/* PDF (.pdf) - 6 kartu per lembar (2 kolom x 3 baris)                 */
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

  const bgColor = cardBgColor ? hexToRgb(cardBgColor) : [240, 249, 255] as [number, number, number]

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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}