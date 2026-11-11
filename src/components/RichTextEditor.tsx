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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const savedRange = useRef<Range | null>(null)
  const pendingImageSrc = useRef<string | null>(null)

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && ref.current && ref.current.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // Simpan selection setiap kali user berinteraksi dengan editor.
  const handleEditorInteraction = () => {
    // Gunakan setTimeout agar selection sudah final.
    setTimeout(saveSelection, 0)
  }

  const restoreSelection = (): boolean => {
    if (!ref.current) return false
    const sel = window.getSelection()
    if (!sel) return false
    if (savedRange.current) {
      try {
        sel.removeAllRanges()
        sel.addRange(savedRange.current)
        return true
      } catch {
        savedRange.current = null
      }
    }
    // Fallback: tempatkan cursor di akhir konten.
    try {
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
      return true
    } catch {
      return false
    }
  }

  const insertImageAtCursor = (src: string) => {
    if (!ref.current) return

    // Fokus editor.
    ref.current.focus()

    // Restore selection.
    restoreSelection()

    // Sisipkan gambar menggunakan Range.insertNode (lebih andal dari execCommand).
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      // Pastikan range berada di dalam editor kita.
      if (!ref.current.contains(range.commonAncestorContainer)) {
        // Selection tidak di editor kita, tempatkan di akhir.
        const endRange = document.createRange()
        endRange.selectNodeContents(ref.current)
        endRange.collapse(false)
        sel.removeAllRanges()
        sel.addRange(endRange)
      }

      const finalRange = sel.getRangeAt(0)
      const img = document.createElement('img')
      img.src = src
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.margin = '8px 0'
      img.style.display = 'block'
      img.alt = 'gambar'

      finalRange.deleteContents()
      finalRange.insertNode(img)

      // Pindahkan cursor setelah gambar.
      const newRange = document.createRange()
      newRange.setStartAfter(img)
      newRange.setEndAfter(img)
      sel.removeAllRanges()
      sel.addRange(newRange)

      // Simpan selection baru.
      savedRange.current = newRange.cloneRange()
    }

    // Update state.
    requestAnimationFrame(() => {
      handleInput()
    })
  }

  const insertImageFromUrl = () => {
    const url = window.prompt('URL gambar (atau data URL):')
    if (url) {
      // Simpan selection sebelum prompt (prompt bisa mengubah focus).
      saveSelection()
      // Tunda sedikit agar focus kembali ke editor.
      setTimeout(() => {
        insertImageAtCursor(url)
      }, 100)
    }
  }

  const insertImageFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (PNG/JPG).')
      return
    }
    // Simpan selection SEBELUM membuka file dialog.
    saveSelection()

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      if (dataUrl && ref.current) {
        // Tunda untuk memastikan dialog file sudah tertutup dan editor siap.
        setTimeout(() => {
          insertImageAtCursor(dataUrl)
        }, 200)
      }
    }
    reader.onerror = () => {
      alert('Gagal membaca file gambar.')
    }
    reader.readAsDataURL(file)
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
          title="Sisipkan gambar dari URL"
          onMouseDown={(e) => { e.preventDefault(); insertImageFromUrl() }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          🔗 URL
        </button>
        <button
          type="button"
          title="Sisipkan gambar dari file (PNG/JPG)"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); fileInputRef.current?.click() }}
          className="flex h-7 px-2 items-center justify-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          🖼 File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          tabIndex={-1}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) insertImageFromFile(file)
            e.target.value = ''
          }}
        />
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
        onMouseUp={handleEditorInteraction}
        onKeyUp={handleEditorInteraction}
        onFocus={handleEditorInteraction}
        onBlur={handleEditorInteraction}
        onClick={handleEditorInteraction}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-2.5 text-sm text-slate-800 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
        style={{ minHeight }}
      />
    </div>
  )
}