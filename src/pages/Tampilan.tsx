import { useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { Button, Card, CardHeader, Select, cn, useToast } from '../components/ui'
import { useTheme } from '../store/ThemeContext'
import { applyTheme, defaultTheme } from '../lib/theme'

export function Tampilan() {
  const { theme, updateTheme, resetTheme, setPanelOpen } = useTheme()
  const toast = useToast()
  const [headerColor, setHeaderColor] = useState(theme.headerColor || '')
  const [menuColor, setMenuColor] = useState(theme.menuColor || '')

  const applyMode = (mode: typeof theme.mode) => {
    if (mode === 'terang') updateTheme({ mode, background: 'aurora', glass: 14, blur: 14 })
    else if (mode === 'gelap') updateTheme({ mode, background: 'midnight', glass: 20, blur: 14 })
    else if (mode === 'semi') updateTheme({ mode, glass: 40, blur: 20 })
    else if (mode === 'minim') updateTheme({ mode, glass: 0, blur: 0 })
    else updateTheme({ mode: 'default', background: 'aurora', glass: 14, blur: 14 })
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Sistem</p>
        <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Pengaturan Ubah Tampilan</h1>
        <p className="mt-1 text-sm text-slate-500">Atur gaya tampilan, warna header, dan warna menu.</p>
      </div>

      <Card>
        <CardHeader title="Gaya Tampilan" description="Pilih mode tampilan yang diinginkan." />
        <div className="grid grid-cols-5 gap-2 px-5 py-5">
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
      </Card>

      <Card>
        <CardHeader title="Warna Header & Menu" description="Ubah warna header dan menu/sidebar." />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-700">Warna Header</span>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: headerColor || '#ffffff' }} />
              <input
                type="color"
                value={headerColor || '#ffffff'}
                onChange={(e) => {
                  setHeaderColor(e.target.value)
                  updateTheme({ headerColor: e.target.value })
                }}
                className="h-9 w-16 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
              />
              <Button variant="outline" size="sm" onClick={() => { setHeaderColor(''); updateTheme({ headerColor: undefined }) }}>
                Reset
              </Button>
            </div>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-700">Warna Menu</span>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: menuColor || '#0a1c33' }} />
              <input
                type="color"
                value={menuColor || '#0a1c33'}
                onChange={(e) => {
                  setMenuColor(e.target.value)
                  updateTheme({ menuColor: e.target.value })
                }}
                className="h-9 w-16 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
              />
              <Button variant="outline" size="sm" onClick={() => { setMenuColor(''); updateTheme({ menuColor: undefined }) }}>
                Reset
              </Button>
            </div>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Tema Lengkap" description="Buka panel tema untuk warna, latar belakang, dan transparansi." />
        <div className="px-5 py-5">
          <Button onClick={() => setPanelOpen(true)}>
            <Palette size={15} /> Buka Panel Tema
          </Button>
          <Button variant="outline" className="ml-2" onClick={() => { resetTheme(); toast('Tema direset.', 'info') }}>
            <RotateCcw size={15} /> Reset Semua
          </Button>
        </div>
      </Card>
    </div>
  )
}
