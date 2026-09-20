import { ArrowLeftRight, Banknote } from 'lucide-react'
import { CONSOLES, type ConsoleType } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function ConsoleBadge({ platform, className }: { platform: ConsoleType; className?: string }) {
  const meta = CONSOLES[platform]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-mute', className)}
      title={meta.label}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {meta.label}
    </span>
  )
}

interface PillsProps {
  swap: boolean
  sale: boolean
  className?: string
}

/** Swap / Sale / Not listed — the status shown on collection cards. */
export function ListingPills({ swap, sale, className }: PillsProps) {
  if (!swap && !sale) {
    return <span className={cn('text-xs font-medium text-mute/80', className)}>Not listed</span>
  }
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {swap && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
          <ArrowLeftRight size={11} strokeWidth={2.6} aria-hidden /> Swap
        </span>
      )}
      {sale && (
        <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-semibold text-mint">
          <Banknote size={11} strokeWidth={2.6} aria-hidden /> Sale
        </span>
      )}
    </span>
  )
}
