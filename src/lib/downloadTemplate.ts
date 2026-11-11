import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

/** Helper untuk mengunduh Blob sebagai file. */
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

/**
 * Unduh template Excel untuk impor soal.
 * Format kolom: No | Tipe | Stimulus | Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban | Poin
 */
export async function downloadExcelTemplate(): Promise<void> {
  const header = ['No', 'Tipe', 'Stimulus', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban', 'Poin']
  const rows: (string | number)[][] = [
    header,
    [1, 'pg', '', 'Hasil dari -12 + 8 adalah...', '-4', '4', '-20', '20', 'B', 5],
    [2, 'pg', 'Bacalah teks berikut dengan saksama!', 'Tema paragraf di atas adalah...', 'Pendidikan', 'Lingkungan', 'Teknologi', 'Kesehatan', 'A', 5],
    [3, 'essay', 'Perhatikan gambar berikut!', 'Jelaskan proses terjadinya hujan dengan bahasa Anda sendiri.', '', '', '', '', '', 10],
    [4, 'pg', '', 'Ibukota Indonesia adalah...', 'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'A', 3],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  // Atur lebar kolom.
  worksheet['!cols'] = [
    { wch: 5 },   // No
    { wch: 8 },   // Tipe
    { wch: 35 },  // Stimulus
    { wch: 50 },  // Pertanyaan
    { wch: 20 },  // Opsi A
    { wch: 20 },  // Opsi B
    { wch: 20 },  // Opsi C
    { wch: 20 },  // Opsi D
    { wch: 10 },  // Jawaban
    { wch: 6 },   // Poin
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal')

  // Tambahkan lembar petunjuk.
  const guideRows: (string | number)[][] = [
    ['PETUNJUK PENGISIAN TEMPLATE SOAL CBT'],
    [''],
    ['Kolom', 'Keterangan'],
    ['No', 'Nomor urut soal (opsional)'],
    ['Tipe', '"pg" untuk Pilihan Ganda, "essay" untuk Esai'],
    ['Stimulus', 'Instruksi/bacaan sebelum soal (opsional). Contoh: "Bacalah teks berikut!"'],
    ['Pertanyaan', 'Teks soal. Boleh berisi HTML (gambar, tebal, miring, kode).'],
    ['Opsi A-D', 'Pilihan jawaban untuk PG. Kosongkan untuk esai.'],
    ['Jawaban', 'Huruf A-D (kunci jawaban PG). Kosongkan untuk esai.'],
    ['Poin', 'Bobot nilai soal (angka).'],
    [''],
    ['CATATAN:'],
    ['- Hapus baris contoh, isi dengan soal Anda sendiri.'],
    ['- Jangan ubah nama kolom (header) agar terbaca otomatis.'],
    ['- Untuk soal bergambar, sisipkan gambar di kolom Pertanyaan sebagai HTML: <img src="data:image/png;base64,..." />'],
    ['- Untuk rumus matematika, gunakan notasi LaTeX: $x^2 + y^2 = z^2$'],
  ]
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
  guideSheet['!cols'] = [{ wch: 15 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Petunjuk')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(excelBlob, 'Template_Soal_CBT.xlsx')
}

/**
 * Unduh template Word untuk impor soal.
 * Format: soal bernomor (1., 2., ...) dengan opsi A/B/C/D.
 */
export async function downloadWordTemplate(): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'TEMPLATE SOAL CBT',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: 'Petunjuk: Soal bernomor (1., 2., ...) diikuti opsi A/B/C/D. Opsi yang benar ditandai dengan (Kunci) di akhir.',
            spacing: { after: 200 },
          }),

          new Paragraph({ text: '1. Hasil dari -12 + 8 adalah...', spacing: { before: 200 } }),
          new Paragraph({ text: 'A. -4' }),
          new Paragraph({ text: 'B. 4 (Kunci)' }),
          new Paragraph({ text: 'C. -20' }),
          new Paragraph({ text: 'D. 20' }),

          new Paragraph({ text: '', spacing: { after: 100 } }),

          new Paragraph({ text: '2. Bacalah teks berikut dengan saksama!' }),
          new Paragraph({ children: [new TextRun({ text: '   "Pendidikan adalah kunci masa depan."', italics: true })] }),
          new Paragraph({ text: '   Tema paragraf di atas adalah...' }),
          new Paragraph({ text: 'A. Pendidikan (Kunci)' }),
          new Paragraph({ text: 'B. Lingkungan' }),
          new Paragraph({ text: 'C. Teknologi' }),
          new Paragraph({ text: 'D. Kesehatan' }),

          new Paragraph({ text: '', spacing: { after: 100 } }),

          new Paragraph({ text: '3. Jelaskan proses terjadinya hujan dengan bahasa Anda sendiri.' }),
          new Paragraph({ children: [new TextRun({ text: '(Soal esai — tidak ada opsi A-D)', italics: true, size: 18 })] }),

          new Paragraph({ text: '', spacing: { after: 100 } }),

          new Paragraph({ text: '4. Ibukota Indonesia adalah...', spacing: { before: 200 } }),
          new Paragraph({ text: 'A. Jakarta (Kunci)' }),
          new Paragraph({ text: 'B. Bandung' }),
          new Paragraph({ text: 'C. Surabaya' }),
          new Paragraph({ text: 'D. Medan' }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          new Paragraph({
            text: 'CATATAN:',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: '- Ganti contoh soal di atas dengan soal Anda sendiri.' }),
          new Paragraph({ text: '- Nomor soal harus berurutan (1., 2., 3., ...).' }),
          new Paragraph({ text: '- Opsi harus A., B., C., D. (dengan titik).' }),
          new Paragraph({ text: '- Tandai kunci jawaban dengan (Kunci) di akhir opsi yang benar.' }),
          new Paragraph({ text: '- Untuk soal esai, jangan sertakan opsi A-D.' }),
          new Paragraph({ text: '- Gambar: sisipkan langsung di dokumen Word.' }),
          new Paragraph({ text: '- Rumus matematika: gunakan notasi LaTeX $x^2 + y^2 = z^2$' }),
          new Paragraph({ text: '- Kode program: gunakan font monospace atau blok kode.' }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, 'Template_Soal_CBT.docx')
}