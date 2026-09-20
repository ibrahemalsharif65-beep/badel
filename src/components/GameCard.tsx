import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GameCover } from './GameCover'
import { ConsoleBadge } from './Badges'
import type { Game } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  game: Game
  status?: ReactNode
  /** Navigate on click (renders a link). */
  to?: string
  /** Or run an action on click (renders a button). */
  onClick?: () => void
  className?: string
}

/** Cover-first card used in every grid. Always keyboard-operable. */
export function GameCard({ game, status, to, onClick, className }: Props) {
  const body = (
    <>
      <GameCover
        game={game}
        className="border border-line/60 transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-[0.985]"
      />
      <div className="mt-2.5 min-w-0">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{game.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <ConsoleBadge platform={game.platform} />
          {game.edition !== 'Standard' && <span className="truncate text-xs text-mute/80">{game.edition}</span>}
        </div>
        {status && <div className="mt-1.5">{status}</div>}
      </div>
    </>
  )
  const cls = cn('group block w-full min-w-0 self-start text-left', className)
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}
