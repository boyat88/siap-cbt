import { useRef, useState } from 'react'
import { ImageIcon, Loader2, PenTool, Trash2, Upload } from 'lucide-react'
import { Button, cn } from './ui'
import { readImageAsDataUrl, removeWhiteBackground } from '../lib/image'

interface SignaturePickerProps {
  name: string
  value?: string
  onChange: (value: string | undefined) => void
  label?: string
  description?: string
  className?: string
}

const checkerboard = {
  backgroundImage:
    'repeating-conic-gradient(rgba(148, 163, 184, 0.16) 0% 25%, transparent 0% 50%)',
  backgroundSize: '12px 12px',
}

export function SignaturePicker({
  name,
  value,
  onChange,
  label,
  description,
  className,
}: SignaturePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      const dataUrl = await readImageAsDataUrl(file, {
        maxSize: 640,
        quality: 1,
        mimeType: 'image/png',
        cropSquare: false,
      })
      const cleaned = await removeWhiteBackground(dataUrl)
      onChange(cleaned)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar tanda tangan.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <p className="mb-1.5 text-xs font-semibold text-slate-700">{label}</p>}
      <div className="flex flex-wrap items-center gap-3.5">
        <div
          className="relative flex h-[92px] w-full max-w-[210px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white"
          style={value ? checkerboard : undefined}
        >
          {value ? (
            <img src={value} alt={`Tanda tangan ${name || 'pejabat sekolah'}`} className="h-full w-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-300">
              <PenTool size={22} />
              <span className="text-[9.5px] font-medium">Belum ada tanda tangan</span>
            </div>
          )}
          {value && (
            <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
              <ImageIcon size={8} /> PNG transparan
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {value ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  onChange(undefined)
                  setError('')
                }}
                disabled={busy}
              >
                <Trash2 size={13} /> Hapus
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
            {description || 'Gunakan gambar tanda tangan dengan latar putih atau transparan. Latar putih otomatis dibersihkan.'}
          </p>
          {error && <p className="mt-1 text-[10.5px] font-medium text-rose-600">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
