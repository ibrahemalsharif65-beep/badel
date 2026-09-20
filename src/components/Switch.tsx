import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: ReactNode
  icon?: ReactNode
  accent?: 'gold' | 'mint'
}

/** Labelled toggle row. The whole row is the hit target. */
export function Switch({ checked, onChange, label, description, icon, accent = 'gold' }: Props) {
  const on = accent === 'gold' ? 'bg-gold' : 'bg-mint'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
        checked ? (accent === 'gold' ? 'border-gold/50 bg-gold/[0.06]' : 'border-mint/50 bg-mint/[0.06]') : 'border-line bg-surface',
      )}
    >
      {icon && <span className={cn('shrink-0', checked ? (accent === 'gold' ? 'text-gold' : 'text-mint') : 'text-mute')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-mute">{description}</span>}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? on : 'bg-line')} aria-hidden>
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
