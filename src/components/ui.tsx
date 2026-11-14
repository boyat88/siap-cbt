import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { STATUS_META } from '../lib/constants'
import { initials } from '../lib/utils'
import type { AttendanceStatus, ShowToast } from '../types'

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'btn-primary text-white shadow-glow-blue hover:shadow-glow-lg hover:-translate-y-0.5 focus-visible:ring-brand-500 disabled:bg-none disabled:bg-brand-300 disabled:shadow-none smooth-transition',
  secondary:
    'bg-gradient-to-br from-navy-900 to-navy-800 text-white shadow-sm shadow-navy-900/25 hover:from-navy-800 hover:to-navy-700 hover:shadow-lift focus-visible:ring-navy-700 disabled:bg-navy-400',
  outline:
    'border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm shadow-slate-900/[0.04] backdrop-blur-md hover:border-brand-200 hover:bg-white hover:text-brand-700 hover:shadow-glow-sm focus-visible:ring-brand-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
  danger: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-600/25 hover:from-rose-600 hover:to-rose-700 hover:shadow-glow focus-visible:ring-rose-400 disabled:bg-rose-300',
  soft: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-100 hover:shadow-glow-sm focus-visible:ring-brand-300',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-[14px]',
  icon: 'h-10 w-10 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('glass-card hover-lift', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex items-start gap-2.5">
        <span className="mt-[3px] h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-300 via-brand-500 to-brand-700 shadow-[0_0_10px_rgb(var(--brand-400)/0.6)]" />
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-navy-950">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-sm shadow-brand-500/5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgb(var(--brand-400)/0.9)]" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Badges & Avatar                                                     */
/* ------------------------------------------------------------------ */

type BadgeTone = 'brand' | 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'navy'

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, compact = false }: { status: AttendanceStatus; compact?: boolean }) {
  const toneMap: Record<AttendanceStatus, BadgeTone> = {
    hadir: 'emerald',
    terlambat: 'violet',
    izin: 'sky',
    sakit: 'amber',
    alpa: 'rose',
  }
  const meta = STATUS_META[status]
  return (
    <Badge tone={toneMap[status]} className={compact ? 'px-2 py-0.5' : undefined}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.chart }} />
      {meta.label}
    </Badge>
  )
}

const avatarPalette = [
  'bg-brand-100 text-brand-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-sky-100 text-sky-800',
  'bg-teal-100 text-teal-800',
]

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarPalette.length
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-20 w-20 text-2xl',
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-white/90 shadow-sm shadow-navy-950/10',
        !src && avatarPalette[index],
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const fieldBase =
  'w-full rounded-xl border border-white/70 bg-white/80 px-3.5 text-sm text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md placeholder:text-slate-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export function Input({ label, error, hint, icon, className, id, ...props }: InputProps) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={inputId} required={props.required}>
          {label}
        </Label>
      )}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          id={inputId}
          className={cn(fieldBase, 'h-11', Boolean(icon) && 'pl-10', error && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100', className)}
          {...props}
        />
      </div>
      {error ? <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p> : hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: { value: string; label: string }[]
}

export function Select({ label, error, options, className, id, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={id || props.name} required={props.required}>
          {label}
        </Label>
      )}
      <select
        id={id || props.name}
        className={cn(fieldBase, 'h-11 appearance-none bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E\')] bg-[position:right_14px_center] bg-no-repeat pr-9', error && 'border-rose-300', className)}
        {...props}
      >
        {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
      </select>
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={id || props.name} required={props.required}>
          {label}
        </Label>
      )}
      <textarea id={id || props.name} className={cn(fieldBase, 'min-h-[88px] py-2.5', error && 'border-rose-300', className)} {...props} />
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Cari...',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldBase, 'h-10 pl-10 pr-9 text-[13px]')}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Hapus pencarian"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
          checked
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 shadow-[0_0_16px_-4px_rgb(var(--brand-500)/0.8)]'
            : 'bg-slate-200 shadow-inner',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-navy-950/55 backdrop-blur-md" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[92vh] w-full animate-scale-in overflow-hidden rounded-t-[26px] border border-white/70 bg-white shadow-2xl backdrop-blur-2xl sm:rounded-[26px]',
          sizes[size],
        )}
      >
        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold tracking-tight text-navy-950">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span>
          Menampilkan <span className="font-semibold text-slate-700">{start}-{end}</span> dari{' '}
          <span className="font-semibold text-slate-700">{total}</span> data
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 focus:outline-none"
            aria-label="Baris per halaman"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / hal
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 text-slate-500 backdrop-blur-sm transition-all hover:border-brand-200 hover:bg-white hover:text-brand-600 hover:shadow-glow-sm disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all',
                p === page
                  ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-sm'
                  : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 text-slate-500 backdrop-blur-sm transition-all hover:border-brand-200 hover:bg-white hover:text-brand-600 hover:shadow-glow-sm disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 shadow-inner-top ring-1 ring-white/70">
        {icon || <Info size={22} />}
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const ToastContext = createContext<ShowToast>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast: ShowToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <XCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-brand-500" />,
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-lift backdrop-blur-xl"
          >
            {icons[toast.type]}
            <p className="flex-1 text-[13px] font-medium leading-snug text-slate-700">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  color = '#10b981',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--brand-100))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700">{children ?? `${Math.round(value)}%`}</span>
    </div>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  title: string
  children?: ReactNode
}) {
  const styles = {
    info: 'border-brand-200 bg-brand-50 text-brand-800 shadow-glow-sm',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  const icons = {
    info: <Info size={17} className="text-brand-500" />,
    warning: <AlertTriangle size={17} className="text-amber-500" />,
    danger: <XCircle size={17} className="text-rose-500" />,
    success: <CheckCircle2 size={17} className="text-emerald-500" />,
  }
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm', styles[tone])}>
      <div className="mt-0.5">{icons[tone]}</div>
      <div>
        <p className="text-xs font-bold">{title}</p>
        {children && <div className="mt-0.5 text-xs leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  )
}
