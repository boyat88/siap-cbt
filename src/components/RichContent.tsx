import { useEffect, useRef } from 'react'
import katex from 'katex'

interface RichContentProps {
  content: string
  className?: string
}

/**
 * Komponen untuk menampilkan konten soal yang dapat berisi HTML (gambar, kode),
 * teks biasa, dan rumus matematika LaTeX ($...$ atau $$...$$).
 * HTML dirender dengan dangerouslySetInnerHTML; konten berasal dari impor file
 * yang dipercaya (guru). Rumus LaTeX dirender dengan KaTeX.
 */
export function RichContent({ content, className }: RichContentProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    // Render rumus LaTeX inline ($...$) dan display ($$...$$).
    const container = ref.current
    // Proses node teks yang mengandung $...$
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (!text.includes('$')) return
        const parent = node.parentNode
        if (!parent) return
        // Pecah berdasarkan $$...$$ (display) lalu $...$ (inline).
        const parts: { type: 'text' | 'inline' | 'display'; value: string }[] = []
        let remaining = text
        // Display math $$...$$
        const displayRegex = /\$\$([\s\S]+?)\$\$/g
        let lastIndex = 0
        let match: RegExpExecArray | null
        const segments: { start: number; end: number; type: 'display' | 'inline'; value: string }[] = []
        while ((match = displayRegex.exec(text)) !== null) {
          segments.push({ start: match.index, end: match.index + match[0].length, type: 'display', value: match[1] })
        }
        const inlineRegex = /\$([^$\n]+?)\$/g
        while ((match = inlineRegex.exec(text)) !== null) {
          // Pastikan tidak overlap dengan display math.
          const overlaps = segments.some((s) => match!.index >= s.start && match!.index < s.end)
          if (!overlaps) {
            segments.push({ start: match.index, end: match.index + match[0].length, type: 'inline', value: match[1] })
          }
        }
        segments.sort((a, b) => a.start - b.start)

        if (segments.length === 0) return

        const frag = document.createDocumentFragment()
        let cursor = 0
        for (const seg of segments) {
          if (seg.start > cursor) {
            frag.appendChild(document.createTextNode(text.slice(cursor, seg.start)))
          }
          const span = document.createElement('span')
          try {
            katex.render(seg.value, span, {
              displayMode: seg.type === 'display',
              throwOnError: false,
              output: 'html',
            })
          } catch {
            span.textContent = seg.type === 'display' ? `$$${seg.value}$$` : `$${seg.value}$`
          }
          frag.appendChild(span)
          cursor = seg.end
        }
        if (cursor < text.length) {
          frag.appendChild(document.createTextNode(text.slice(cursor)))
        }
        parent.replaceChild(frag, node)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(walk)
      }
    }
    walk(container)
  }, [content])

  // Deteksi apakah konten mengandung tag HTML.
  const hasHtml = /<[a-z][\s\S]*>/i.test(content)

  if (hasHtml) {
    return (
      <div
        ref={ref}
        className={`${className ?? ''} prose-code`}
        style={{ whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // Teks biasa: konversi newline ke <br>, lalu render math.
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />')

  return (
    <div
      ref={ref}
      className={`${className ?? ''} prose-code`}
      style={{ whiteSpace: 'pre-wrap' }}
      dangerouslySetInnerHTML={{ __html: escaped }}
    />
  )
}