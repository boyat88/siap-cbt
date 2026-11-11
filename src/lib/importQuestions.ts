import type { CbtQuestion } from '../types'
import * as XLSX from 'xlsx'

/**
 * Pustaka berat (mammoth, pdfjs) dimuat secara lazy agar halaman editor
 * tetap cepat dibuka. Hanya diunduh saat pengguna benar-benar mengimpor file.
 */
type MammothModule = typeof import('mammoth')
let mammothPromise: Promise<MammothModule> | null = null
function loadMammoth(): Promise<MammothModule> {
  if (!mammothPromise) mammothPromise = import('mammoth')
  return mammothPromise
}

type PdfJsModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfJsModule> | null = null
function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist')
  return pdfjsPromise
}

function uid(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Konversi data URL gambar ke tag <img> yang bisa disimpan dalam teks soal (HTML). */
function imgTag(dataUrl: string, alt = 'gambar'): string {
  return `<img src="${dataUrl}" alt="${alt}" style="max-width:100%;height:auto;margin:8px 0;" />`
}

/* ------------------------------------------------------------------ */
/* Excel (.xlsx / .xls / .csv)                                         */
/* ------------------------------------------------------------------ */

/**
 * Format Excel yang diharapkan (header baris pertama):
 *   No | Tipe | Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban | Poin
 *
 * Tipe: 'pg' atau 'essay' (default 'pg' jika kosong).
 * Jawaban: huruf A-D (untuk PG) atau kosong (esai).
 * Opsi boleh berisi HTML/gambar base64.
 */
export async function importFromExcel(file: File): Promise<CbtQuestion[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('File Excel tidak memiliki lembar kerja.')
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })

  const questions: CbtQuestion[] = []
  for (const row of rows) {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = String(value ?? '').trim()
    }
    const get = (...keys: string[]): string => {
      for (const key of keys) {
        if (normalized[key] !== undefined && normalized[key] !== '') return normalized[key]
      }
      return ''
    }

    const sectionStimulus = get('sectionstimulus', 'instruksibagian', 'stimulusbagian', 'section', 'grup', 'group')
    const stimulus = get('stimulus', 'instruksi', 'bacaan', 'teks', 'passage', 'instruction')
    const text = get('pertanyaan', 'soal', 'question', 'text', 'q')
    if (!text) continue

    const typeRaw = get('tipe', 'type', 'jenis').toLowerCase()
    const type: 'pg' | 'essay' = typeRaw.includes('esai') || typeRaw.includes('essay') ? 'essay' : 'pg'

    const options = type === 'pg'
      ? [
          get('opsia', 'opsiA', 'a', 'optiona'),
          get('opsib', 'opsiB', 'b', 'optionb'),
          get('opsic', 'opsiC', 'c', 'optionc'),
          get('opsid', 'opsiD', 'd', 'optiond'),
        ].map((v) => v || '')
      : []

    const answerRaw = get('jawaban', 'kunci', 'answer', 'key').toUpperCase()
    let answer: string | undefined
    if (type === 'pg' && answerRaw) {
      const idx = 'ABCD'.indexOf(answerRaw.charAt(0))
      if (idx >= 0) answer = String(idx)
    }

    const points = Number(get('poin', 'point', 'points', 'nilai', 'score')) || (type === 'pg' ? 1 : 10)

    questions.push({ id: uid(), type, sectionStimulus: sectionStimulus || undefined, stimulus: stimulus || undefined, text, options, answer, points })
  }

  if (questions.length === 0) throw new Error('Tidak ada soal yang dapat dibaca. Pastikan header kolom sesuai format (Pertanyaan, Opsi A-D, Jawaban, Poin).')
  return questions
}

/* ------------------------------------------------------------------ */
/* Word (.docx)                                                        */
/* ------------------------------------------------------------------ */

/**
 * Konversi .docx ke HTML menggunakan mammoth, lalu pecah menjadi soal.
 * Gambar diubah menjadi data URL base64 agar tetap muncul.
 * Persamaan matematika (OMML) tidak selalu terkonversi sempurna; gunakan
 * notasi LaTeX ($...$) di dokumen agar dirender oleh KaTeX.
 */
export async function importFromWord(file: File): Promise<CbtQuestion[]> {
  const mammoth = await loadMammoth()
  const arrayBuffer = await file.arrayBuffer()

  const images: string[] = []
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.readAsBase64String()
        const src = `data:${image.contentType};base64,${base64}`
        images.push(src)
        return { src }
      }),
    },
  )

  const html = result.value
  if (!html.trim()) throw new Error('Dokumen Word kosong atau tidak dapat dibaca.')

  // Pecah HTML menjadi blok paragraf. Bersihkan atribut yang tidak perlu.
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  /** Bersihkan elemen: hapus atribut class/style, pertahankan tag dasar. */
  function cleanElement(el: Element): string {
    const tag = el.tagName.toLowerCase()
    // Tag yang dipertahankan apa adanya.
    if (tag === 'img') {
      const src = el.getAttribute('src') ?? ''
      const alt = el.getAttribute('alt') ?? 'gambar'
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;margin:8px 0;" />`
    }
    if (tag === 'br') return '<br />'
    if (tag === 'hr') return '<hr />'
    // Tag pembungkus: ambil innerHTML yang sudah dibersihkan.
    const inner = Array.from(el.childNodes)
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.textContent ?? ''
        if (child.nodeType === Node.ELEMENT_NODE) return cleanElement(child as Element)
        return ''
      })
      .join('')
    if (tag === 'strong' || tag === 'b') return `<strong>${inner}</strong>`
    if (tag === 'em' || tag === 'i') return `<em>${inner}</em>`
    if (tag === 'u') return `<u>${inner}</u>`
    if (tag === 'code') return `<code>${inner}</code>`
    if (tag === 'pre') return `<pre>${inner}</pre>`
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? ''
      return `<a href="${href}" target="_blank" rel="noopener">${inner}</a>`
    }
    // Paragraf, div, li, dll. -> paragraf
    if (inner.trim() === '') return ''
    return `<p>${inner}</p>`
  }

  const blocks: { tag: string; html: string }[] = []
  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const cleaned = cleanElement(el)
      if (cleaned.trim()) blocks.push({ tag: el.tagName.toLowerCase(), html: cleaned })
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      blocks.push({ tag: 'p', html: `<p>${node.textContent.trim()}</p>` })
    }
  })

  // Heuristik: soal biasanya diawali angka (1., 2., ...) diikuti opsi A/B/C/D.
  const questions: CbtQuestion[] = []
  let current: { text: string; options: string[]; answer?: string; points: number } | null = null

  const flush = () => {
    if (current && current.text.trim()) {
      const type: 'pg' | 'essay' = current.options.length >= 2 ? 'pg' : 'essay'
      questions.push({
        id: uid(),
        type,
        text: current.text.trim(),
        options: type === 'pg' ? current.options : [],
        answer: type === 'pg' ? current.answer : undefined,
        points: current.points,
      })
    }
    current = null
  }

  const optionRegex = /^([A-E])[.)]\s*(.*)$/i
  const questionRegex = /^(\d+)[.)]\s*(.*)$/

  for (const block of blocks) {
    const text = block.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const qMatch = questionRegex.exec(text)
    const oMatch = optionRegex.exec(text)

    if (qMatch) {
      flush()
      // Hapus nomor dari awal teks di dalam HTML (mis. <p>1. Teks</p> -> <p>Teks</p>).
      const cleaned = block.html.replace(/^(<[^>]+>)\s*\d+[.)]\s*/, '$1')
      current = { text: cleaned || block.html, options: [], points: 1 }
    } else if (oMatch && current) {
      const letter = oMatch[1].toUpperCase()
      const idx = 'ABCDE'.indexOf(letter)
      // Pastikan array options cukup panjang.
      while (current.options.length <= idx) current.options.push('')
      // Hapus huruf opsi dari awal teks di dalam HTML (mis. <p>A. Teks</p> -> <p>Teks</p>).
      const cleanedOpt = block.html.replace(/^(<[^>]+>)\s*[A-E][.)]\s*/i, '$1')
      current.options[idx] = cleanedOpt || block.html
      // Deteksi kunci jawaban jika opsi diakhiri dengan tanda (benar/kunci).
      if (/\(kunci\)|\(benar\)|\*$/i.test(text)) {
        current.answer = String(idx)
        current.options[idx] = current.options[idx].replace(/\(kunci\)|\(benar\)|\*$/i, '').trim()
      }
    } else if (current) {
      // Lanjutan teks soal (paragraf tambahan / gambar).
      current.text += block.html
    } else {
      // Blok sebelum soal pertama — abaikan atau jadikan soal.
      if (text) {
        current = { text: block.html, options: [], points: 1 }
      }
    }
  }
  flush()

  // Jika tidak ada soal terdeteksi, jadikan seluruh dokumen sebagai satu soal esai.
  if (questions.length === 0) {
    questions.push({
      id: uid(),
      type: 'essay',
      text: html,
      options: [],
      points: 10,
    })
  }

  // Pastikan opsi PG selalu 4 slot.
  for (const q of questions) {
    if (q.type === 'pg') {
      while (q.options.length < 4) q.options.push('')
      q.options = q.options.slice(0, 4)
    }
  }

  return questions
}

/* ------------------------------------------------------------------ */
/* PDF (.pdf)                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ekstrak teks dari PDF dan pecah menjadi soal dengan heuristik yang sama
 * seperti Word. Gambar di PDF tidak dapat diekstrak dengan andal di browser;
 * gunakan dokumen Word/Excel untuk soal bergambar.
 */
export async function importFromPdf(file: File): Promise<CbtQuestion[]> {
  const pdfjs = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? String((item as { str: string }).str) : ''))
      .join(' ')
    fullText += pageText + '\n'
  }

  if (!fullText.trim()) throw new Error('PDF tidak mengandung teks yang dapat dibaca (mungkin hasil scan gambar).')

  // Pecah per baris, lalu terapkan heuristik soal.
  const lines = fullText.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const questions: CbtQuestion[] = []
  let current: { text: string; options: string[]; answer?: string; points: number } | null = null

  const flush = () => {
    if (current && current.text.trim()) {
      const type: 'pg' | 'essay' = current.options.length >= 2 ? 'pg' : 'essay'
      questions.push({
        id: uid(),
        type,
        text: current.text.trim(),
        options: type === 'pg' ? current.options : [],
        answer: type === 'pg' ? current.answer : undefined,
        points: current.points,
      })
    }
    current = null
  }

  const optionRegex = /^([A-E])[.)]\s*(.*)$/i
  const questionRegex = /^(\d+)[.)]\s*(.*)$/

  for (const line of lines) {
    const qMatch = questionRegex.exec(line)
    const oMatch = optionRegex.exec(line)

    if (qMatch) {
      flush()
      current = { text: qMatch[2] || line, options: [], points: 1 }
    } else if (oMatch && current) {
      const letter = oMatch[1].toUpperCase()
      const idx = 'ABCDE'.indexOf(letter)
      while (current.options.length <= idx) current.options.push('')
      current.options[idx] = oMatch[2] || ''
      if (/\(kunci\)|\(benar\)|\*$/i.test(line)) {
        current.answer = String(idx)
        current.options[idx] = current.options[idx].replace(/\(kunci\)|\(benar\)|\*$/i, '').trim()
      }
    } else if (current) {
      current.text += ' ' + line
    } else if (line) {
      current = { text: line, options: [], points: 1 }
    }
  }
  flush()

  if (questions.length === 0) {
    questions.push({ id: uid(), type: 'essay', text: fullText.trim(), options: [], points: 10 })
  }

  for (const q of questions) {
    if (q.type === 'pg') {
      while (q.options.length < 4) q.options.push('')
      q.options = q.options.slice(0, 4)
    }
  }

  return questions
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export type ImportFormat = 'excel' | 'word' | 'pdf'

export function detectFormat(file: File): ImportFormat | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'excel'
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'word'
  if (name.endsWith('.pdf')) return 'pdf'
  return null
}

export async function importQuestionsFromFile(file: File): Promise<CbtQuestion[]> {
  const format = detectFormat(file)
  if (!format) throw new Error('Format file tidak didukung. Gunakan .xlsx/.xls/.csv, .docx, atau .pdf.')
  if (format === 'excel') return importFromExcel(file)
  if (format === 'word') return importFromWord(file)
  return importFromPdf(file)
}
