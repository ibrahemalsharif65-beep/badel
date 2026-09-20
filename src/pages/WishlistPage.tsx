import { Heart, Plus } from 'lucide-react'
import { useAvailability, useWishlist } from '@/hooks/queries'
import { useSheets } from '@/context/SheetsContext'
import { GameCover } from '@/components/GameCover'
import { ConsoleBadge } from '@/components/Badges'
import { EmptyState, ErrorNote, PageHeader } from '@/components/ui'
import { conditionLabel } from '@/lib/constants'
import { Link } from 'react-router-dom'

export default function WishlistPage() {
  const { openWishlist } = useSheets()
  const { data, isLoading, error } = useWishlist()
  const items = data ?? []
  const { data: availability, isLoading: availabilityLoading } = useAvailability(items.map((i) => i.game_id))

  return (
    <div>
      <PageHeader
        title="Wishlist"
        subtitle={items.length ? `${items.length} ${items.length === 1 ? 'game' : 'games'} you want` : 'The games you want to get'}
        action={
          <button className="btn btn-primary hidden md:inline-flex" onClick={() => openWishlist({ mode: 'add' })}>
            <Plus size={18} strokeWidth={2.6} /> Add game
          </button>
        }
      />

      {error && <ErrorNote>We couldn't load your wishlist. Check your connection and refresh.</ErrorNote>}

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[112px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} />}
          title="Nothing on your wishlist"
          body="Add the games you want. When you find a match they'll be ready to swap for."
          action={
            <button className="btn btn-primary" onClick={() => openWishlist({ mode: 'add' })}>
              <Plus size={18} strokeWidth={2.6} /> Add a game
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => {
            const others = availability?.[item.game_id]?.players ?? 0
            return (
              <li key={item.id}>
                <div className="card flex items-center gap-3.5 p-3 transition-colors hover:border-mute/40">
                  <Link to={`/games/${item.game_id}`} className="shrink-0" aria-label={`View ${item.game.title}`}>
                    <GameCover game={item.game} className="w-[72px]" />
                  </Link>
                  <button type="button" onClick={() => openWishlist({ mode: 'edit', item })} className="min-w-0 flex-1 py-1 text-left">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.game.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5">
                      <ConsoleBadge platform={item.game.platform} />
                      {item.game.edition !== 'Standard' && <span className="truncate text-xs text-mute/80">{item.game.edition}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {availabilityLoading ? (
                        <span className="skeleton h-5 w-28" />
                      ) : others === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mute">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold/70" aria-hidden /> Waiting for a match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
                          {others} {others === 1 ? 'player has' : 'players have'} this
                        </span>
                      )}
                      {item.preferred_condition && (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-mute">
                          {conditionLabel(item.preferred_condition)}+
                        </span>
                      )}
                    </div>
                    {item.notes && <p className="mt-1.5 line-clamp-1 text-xs text-mute/80">{item.notes}</p>}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <button
        onClick={() => openWishlist({ mode: 'add' })}
        aria-label="Add game to wishlist"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-gold-ink shadow-[0_8px_28px_rgba(255,184,74,0.35)] transition-transform active:scale-95 md:hidden"
      >
        <Plus size={28} strokeWidth={2.6} />
      </button>
    </div>
  )
}
