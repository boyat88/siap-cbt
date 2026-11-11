import { useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, Palette, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { cn, useToast } from './ui'
import { useTheme } from '../store/ThemeContext'
import { backgroundPresets, colorPresets, type AppTheme, type BackgroundPreset, type ThemePreset } from '../lib/theme'
import { readImageAsDataUrl } from '../lib/image'

function presetStyle(preset: BackgroundPreset) {
  return {
    backgroundImage: preset.image,
    backgroundSize: preset.size,
    backgroundPosition: preset.position,
    backgroundRepeat: preset.repeat,
  }
}

export function ThemePanel() {
  const { theme, updateTheme, setColor, resetTheme, panelOpen, setPanelOpen, scopedToAccount } = useTheme()
  const toast = useToast()
  const applyMode = (mode: AppTheme['mode']) => {
    if (mode === 'terang') updateTheme({ mode, background: 'aurora', glass: 14, blur: 14 })
    else if (mode === 'gelap') updateTheme({ mode, background: 'midnight', glass: 20, blur: 14 })
    else if (mode === 'semi') updateTheme({ mode, glass: 40, blur: 20 })
    else if (mode === 'minim') updateTheme({ mode, glass: 0, blur: 0 })
    else updateTheme({ mode: 'default', background: 'aurora', glass: 14, blur: 14 })
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const standardPresets = colorPresets.filter((preset) => !preset.deep)
  const deepPresets = colorPresets.filter((preset) => preset.deep)

  const handleImage = async (file: File) => {
    setBusy(true)
    try {
      const dataUrl = await readImageAsDataUrl(file, {
        maxSize: 1600,
        quality: 0.72,
        mimeType: 'image/jpeg',
        cropSquare: false,
      })
      updateTheme({
        backgroundImage: dataUrl,
        background: 'custom',
        glass: Math.max(theme.glass, 18),
      })
      toast('Foto latar belakang berhasil dipasang.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Gagal memproses foto latar belakang.', 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const renderSwatch = (preset: ThemePreset) => {
    const active = theme.colorId === preset.id
    return (
      <button
        key={preset.id}
        onClick={() => setColor(preset.color, preset.id)}
        className={cn(
          'group relative flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 transition-all hover:scale-110 active:scale-95',
          active ? 'ring-navy-900' : 'ring-transparent',
        )}
        style={{ backgroundColor: preset.color }}
        title={preset.name}
        aria-label={`Warna ${preset.name}`}
      >
        {active && <Check size={14} className="text-white drop-shadow" strokeWidth={3} />}
        <span className="pointer-events-none absolute -bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-navy-950 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {preset.name}
        </span>
      </button>
    )
  }

  if (!panelOpen) {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="group fixed bottom-20 right-4 z-[75] flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-95 print:hidden lg:bottom-6 lg:right-6"
        aria-label="Buka pengaturan tema"
        title="Tema & tampilan"
      >
        <span className="absolute inset-0 rounded-2xl bg-brand-400/40 animate-ping-soft" />
        <Palette size={20} className="relative transition-transform duration-500 group-hover:rotate-12" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-[76] w-[min(384px,calc(100vw-2rem))] origin-bottom-right animate-scale-in overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-2xl print:hidden lg:bottom-6 lg:right-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-4 py-3.5 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25">
              <Sparkles size={17} />
            </span>
            <div>
              <p className="text-[13px] font-bold leading-tight">Tema &amp; Tampilan</p>
              <p className="text-[10px] text-white/70">Warna, transparansi, dan latar belakang</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                resetTheme()
                toast('Tema dikembalikan ke pengaturan awal.', 'info')
              }}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Atur ulang tema"
              title="Atur ulang tema"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Tutup panel tema"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[min(70vh,600px)] space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Warna Tema</p>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <span className="h-3 w-3 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: theme.color }} />
              {theme.color.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {standardPresets.map(renderSwatch)}
          </div>

          <div className="mt-4 mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warna Pekat</span>
            <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="rounded-full bg-navy-950 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white">
              Kontras tinggi
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {deepPresets.map(renderSwatch)}
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
            <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <Palette size={14} className="text-brand-500" /> Warna kustom
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-400">Pilih sendiri</span>
              <input
                type="color"
                value={theme.color}
                onChange={(event) => setColor(event.target.value, 'custom')}
                className="h-7 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                aria-label="Pilih warna kustom"
              />
            </span>
          </label>
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gaya Tampilan</p>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
              {theme.mode}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(['terang', 'gelap', 'semi', 'default', 'minim'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => applyMode(mode)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-[10px] font-bold capitalize transition-all',
                  theme.mode === mode
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50/40',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-400">
            Terang/Gelap mengubah latar belakang. Semi meningkatkan transparansi, Minim menonaktifkan efek kaca.
          </p>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Warna Header & Menu</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <span className="text-[11px] font-semibold text-slate-600">Header</span>
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: theme.headerColor || '#ffffff' }} />
                <input
                  type="color"
                  value={theme.headerColor || '#ffffff'}
                  onChange={(e) => updateTheme({ headerColor: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                />
              </span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <span className="text-[11px] font-semibold text-slate-600">Menu</span>
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: theme.menuColor || '#0a1c33' }} />
                <input
                  type="color"
                  value={theme.menuColor || '#0a1c33'}
                  onChange={(e) => updateTheme({ menuColor: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                />
              </span>
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => updateTheme({ headerColor: undefined, menuColor: undefined })}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Reset warna header/menu
            </button>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transparansi Panel</p>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
              {theme.glass}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={1}
            value={theme.glass}
            onChange={(event) => updateTheme({ glass: Number(event.target.value) })}
            className="theme-range w-full"
            aria-label="Tingkat transparansi panel"
          />
          <div className="mt-1 flex justify-between text-[9px] font-medium text-slate-400">
            <span>Solid</span>
            <span>Transparan</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
            <span className="text-[11px] font-semibold text-slate-600">Efek kaca (blur)</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={theme.blur}
                onChange={(event) => updateTheme({ blur: Number(event.target.value) })}
                className="theme-range w-24"
                aria-label="Kekuatan blur kaca"
              />
              <span className="w-8 text-right text-[10px] font-semibold text-slate-500">{theme.blur}px</span>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Latar Belakang</p>
          <div className="grid grid-cols-3 gap-2">
            {backgroundPresets.map((preset) => {
              const active = theme.background === preset.id && !theme.backgroundImage
              return (
                <button
                  key={preset.id}
                  onClick={() => updateTheme({ background: preset.id, backgroundImage: undefined })}
                  className={cn(
                    'relative overflow-hidden rounded-lg border-2 transition-all hover:scale-[1.03] active:scale-95',
                    active ? 'border-brand-500 shadow-glow' : 'border-white/70 hover:border-slate-300',
                  )}
                  style={presetStyle(preset)}
                  title={preset.name}
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/25 to-transparent" />
                  <span className="relative flex h-12 items-end justify-between px-1.5 pb-1">
                    <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                      {preset.name}
                    </span>
                    {active && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {theme.backgroundImage && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 p-2">
              <img src={theme.backgroundImage} alt="Latar belakang" className="h-10 w-14 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold text-brand-800">Foto latar belakang aktif</p>
                <p className="text-[9px] text-brand-600">Tersimpan otomatis di perangkat ini</p>
              </div>
              <button
                onClick={() => updateTheme({ backgroundImage: undefined, background: 'aurora' })}
                className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50"
                aria-label="Hapus foto latar belakang"
                title="Hapus foto latar belakang"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {busy ? 'Memproses foto...' : 'Unggah foto latar sendiri'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImage(file)
            }}
          />

          <p className="mt-2 text-[9.5px] leading-relaxed text-slate-400">
            Naikkan transparansi agar latar belakang terlihat di balik kartu. Pengaturan tema tersimpan otomatis
            {scopedToAccount ? ' untuk akun ini saja' : ' untuk halaman masuk'} dan tidak mengubah tampilan akun lain.
          </p>
        </section>
      </div>
    </div>
  )
}
