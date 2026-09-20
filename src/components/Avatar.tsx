import { BUCKETS } from '@/lib/constants'
import { publicUrl } from '@/lib/images'
import { cn, hashString } from '@/lib/utils'

interface Props {
  username?: string | null
  path?: string | null
  className?: string
}

export function Avatar({ username, path, className }: Props) {
  const url = publicUrl(BUCKETS.avatars, path)
  const name = username || '?'
  const hue = hashString(name) % 360
  return url ? (
    <img src={url} alt={`${name}'s avatar`} className={cn('rounded-full object-cover', className)} />
  ) : (
    <span
      aria-hidden
      className={cn('inline-flex select-none items-center justify-center rounded-full font-display font-bold text-white/90', className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 45% 34%), hsl(${(hue + 40) % 360} 50% 20%))` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
