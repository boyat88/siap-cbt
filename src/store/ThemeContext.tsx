import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, defaultTheme, loadTheme, saveTheme, type AppTheme } from '../lib/theme'
import { useApp } from './AppContext'

interface ThemeContextValue {
  theme: AppTheme
  updateTheme: (patch: Partial<AppTheme>) => void
  setColor: (color: string, colorId?: string) => void
  resetTheme: () => void
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** true bila tema sedang disimpan untuk akun yang login. */
  scopedToAccount: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useApp()
  const accountId = user?.id ?? null

  const [theme, setTheme] = useState<AppTheme>(() => loadTheme(accountId))
  const [loadedAccount, setLoadedAccount] = useState<string | null>(accountId)
  const [panelOpen, setPanelOpen] = useState(false)

  // Saat akun berganti (login/logout), muat tema milik akun tersebut sebelum
  // efek penyimpanan berjalan agar tema akun lain tidak tertimpa.
  if (loadedAccount !== accountId) {
    setLoadedAccount(accountId)
    setTheme(loadTheme(accountId))
  }

  useEffect(() => {
    applyTheme(theme)
    saveTheme(accountId, theme)
  }, [theme, accountId])

  const updateTheme = useCallback((patch: Partial<AppTheme>) => {
    setTheme((prev) => ({ ...prev, ...patch }))
  }, [])

  const setColor = useCallback((color: string, colorId = 'custom') => {
    setTheme((prev) => ({ ...prev, color, colorId }))
  }, [])

  const resetTheme = useCallback(() => {
    setTheme({ ...defaultTheme })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      updateTheme,
      setColor,
      resetTheme,
      panelOpen,
      setPanelOpen,
      scopedToAccount: Boolean(accountId),
    }),
    [theme, updateTheme, setColor, resetTheme, panelOpen, accountId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
