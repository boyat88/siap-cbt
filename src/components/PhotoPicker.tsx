import { useRef, useState } from 'react'
import { Camera, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { Avatar, Button, cn } from './ui'
import { readImageAsDataUrl } from '../lib/image'

interface PhotoPickerProps {
  name: string
  value?: string
  onChange: (value: string | undefined) => void
  label?: string
  description?: string
  shape?: 'circle' | 'square'
  maxSize?: number
  className?: string
}

export function PhotoPicker({
  name,
  value,
  onChange,
  label,
  description,
  shape = 'circle',
  maxSize = 256,
  className,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      const dataUrl = await readImageAsDataUrl(file, {
        maxSize,
        quality: 0.8,
        mimeType: shape === 'square' ? 'image/png' : 'image/jpeg',
        cropSquare: shape === 'circle',
      })
      onChange(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <p className="mb-1.5 text-xs font-semibold text-slate-700">{label}</p>}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {shape === 'circle' ? (
            <Avatar name={name || 'Pengguna'} src={value} size="xl" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {value ? (
                <img src={value} alt={name} className="h-full w-full object-contain" />
              ) : (
                <ImageIcon size={26} className="text-slate-300" />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-70"
            aria-label="Pilih foto"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
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
              <Camera size={13} /> {value ? 'Ubah Foto' : 'Pilih Foto'}
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
            {description || 'JPG, PNG, atau WebP. Maksimal 8 MB, otomatis dikompres.'}
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
