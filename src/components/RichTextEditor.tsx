import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

/**
 * Editor teks kaya (rich text) berbasis contenteditable.
 * Menampilkan teks terformat (tebal, miring, gambar, kode) tanpa menampilkan
 * tag HTML mentah kepada pengguna.
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = '120px' }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)

  // Sinkronkan value eksternal ke editor (hanya jika berbeda).
  useEffect(() => {
    if (!ref.current) return
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (!ref.current) return
    isInternalChange.current = true
    onChange(ref.current.innerHTML)
  }

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val)
    handleInput()
  }

  const insertImage = () => {
    const url = window.prompt('URL gambar (atau data URL):')
    if (url) exec('insertImage', url)
  }

  const buttons: { label: string; cmd: string; val?: string; title: string }[] = [
    { label: 'B', cmd: 'bold', title: 'Tebal' },
    { label: 'I', cmd: 'italic', title: 'Miring' },
    { label: 'U', cmd: 'underline', title: 'Garis bawah' },
    { label: 'S', cmd: 'strikeThrough', title: 'Coret' },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-2 py-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.cmd}
            type="button"
            title={btn.title}
            onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd, btn.val) }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            {btn.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          title="Daftar bullet"
          onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          • List
        </button>
        <button
          type="button"
          title="Daftar bernomor"
          onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          1. List
        </button>
        <button
          type="button"
          title="Sisipkan gambar"
          onMouseDown={(e) => { e.preventDefault(); insertImage() }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          🖼 Gambar
        </button>
        <button
          type="button"
          title="Kode"
          onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'pre') }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          {'</>'} Kode
        </button>
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-2.5 text-sm text-slate-800 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
        style={{ minHeight }}
      />
    </div>
  )
}