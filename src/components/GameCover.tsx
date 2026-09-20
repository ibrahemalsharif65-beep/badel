import { CONSOLES } from '@/lib/constants'
import type { Game } from '@/lib/types'
import { cn, hashString } from '@/lib/utils'

const SMALL_WORDS = new Set(['the', 'of', 'a', 'an', 'and', 'part', 'edition', 'ea', 'sports', 'marvels', 'marvel'])

/** "God of War Ragnarök" → "GWR", "Elden Ring" → "ER", "FIFA 23" → "F23" */
function monogram(title: string) {
  const words = title
    .replace(/['’]s\b/g, '')
    .split(/[^A-Za-z0-9\u0600-\u06FF]+/)
    .filter(Boolean)
  const meaningful = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()))
  const src = meaningful.length ? meaningful : words
  const letters = src.slice(0, 3).map((w) => (/^\d+$/.test(w) ? w.slice(0, 2) : w[0].toUpperCase()))
  return letters.join('').slice(0, 4)
}

interface Props {
  game: Pick<Game, 'title' | 'platform' | 'cover_url'>
  className?: string
  /** Hide the console spine on tiny thumbnails */
  compact?: boolean
}

/**
 * Real artwork when we have it; otherwise a generated "game case" so grids never look empty.
 * Aspect ratio matches a standard Blu-ray case.
 */
export function GameCover({ game, className, compact }: Props) {
  const meta = CONSOLES[game.platform]

  if (game.cover_url) {
    return (
      <div className={cn('relative aspect-[4/5] overflow-hidden rounded-xl bg-raised', className)}>
        <img src={game.cover_url} alt={`${game.title} cover`} loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }

  const h = hashString(game.title) % 360
  const h2 = (h + 48 + (hashString(game.title + game.platform) % 40)) % 360
  const mono = monogram(game.title)

  return (
    <div
      role="img"
      aria-label={`${game.title} (no cover yet)`}
      className={cn('relative aspect-[4/5] overflow-hidden rounded-xl [container-type:inline-size]', className)}
      style={{ background: `linear-gradient(155deg, hsl(${h} 42% 24%) 0%, hsl(${h2} 48% 11%) 100%)` }}
    >
      {!compact && (
        <div
          className="absolute inset-x-0 top-0 flex h-[18px] items-center px-2.5 text-[10px] font-bold leading-none text-black/80"
          style={{ background: meta.color }}
        >
          {meta.label}
        </div>
      )}
      <svg viewBox="0 0 100 100" className="absolute -bottom-[18%] -right-[22%] w-[92%] opacity-[0.16]" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-start px-[9%] pt-[18px]">
        <span
          className="font-display font-extrabold leading-[0.85] text-white/90"
          style={{ fontSize: mono.length > 3 ? 'clamp(20px, 6.5cqw, 44px)' : 'clamp(26px, 9cqw, 60px)', letterSpacing: '-0.04em' }}
        >
          {mono}
        </span>
      </div>
    </div>
  )
}
