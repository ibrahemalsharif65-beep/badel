import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="#FFB84A" strokeWidth="3" />
      <circle cx="16" cy="16" r="3" fill="#FFB84A" />
      <path d="M3 9h8M29 23h-8" stroke="#EDEFF7" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">Badel</span>
    </span>
  )
}
