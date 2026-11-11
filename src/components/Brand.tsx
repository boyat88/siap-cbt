import { cn } from './ui'

export function BrandMark({
  className,
  size = 'md',
  logo,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  logo?: string
}) {
  const dims = { sm: 'h-9 w-9', md: 'h-10 w-10', lg: 'h-12 w-12' }
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
        logo
          ? 'bg-white ring-1 ring-slate-200/80 shadow-lg shadow-navy-950/10'
          : 'bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-lg shadow-brand-950/30',
        dims[size],
        className,
      )}
    >
      {logo ? (
        <img src={logo} alt="Logo aplikasi" className="h-full w-full object-contain p-1" />
      ) : (
        <>
          <svg viewBox="0 0 32 32" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
            <path d="M6 8.5h20M6 15h12M6 21.5h14" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.95" />
            <circle cx="22" cy="21" r="4.4" stroke="white" strokeWidth="2.2" opacity="0.95" />
            <path d="M25.2 24.2L27.5 26.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
          </svg>
          <div className="pointer-events-none absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white/15 blur-[1px]" />
        </>
      )}
    </div>
  )
}

export function Brand({
  dark = false,
  compact = false,
  logo,
}: {
  dark?: boolean
  compact?: boolean
  logo?: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark logo={logo} />
      {!compact && (
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-[17px] font-extrabold tracking-tight drop-shadow', dark ? 'text-white' : 'text-navy-950')}>
              SIAP
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]', dark ? 'bg-white/20 text-white' : 'bg-brand-400/20 text-brand-700')}>
              SMP
            </span>
          </div>
          <p className={cn('truncate text-[10px] font-medium leading-tight drop-shadow', dark ? 'text-white' : 'text-slate-500')}>
            Sistem Informasi Absensi
          </p>
        </div>
      )}
    </div>
  )
}
