import { useMemo, useState } from 'react'
import { Disc3, Plus } from 'lucide-react'
import { useCollection } from '@/hooks/queries'
import { useSheets } from '@/context/SheetsContext'
import { GameCard } from '@/components/GameCard'
import { ListingPills } from '@/components/Badges'
import { EmptyState, ErrorNote, GridSkeleton, PageHeader } from '@/components/ui'
import { formatEgp } from '@/lib/utils'

type Filter = 'all' | 'swap' | 'sale' | 'unlisted'

export default function CollectionPage() {
  const { openCollection } = useSheets()
  const { data, isLoading, error } = useCollection()
  const [filter, setFilter] = useState<Filter>('all')
  const items = data ?? []

  const counts = useMemo(
    () => ({
      all: items.length,
      swap: items.filter((i) => i.available_for_swap).length,
      sale: items.filter((i) => i.available_for_sale).length,
      unlisted: items.filter((i) => !i.available_for_swap && !i.available_for_sale).length,
    }),
    [items],
  )
  const shown = items.filter((i) =>
    filter === 'all' ? true : filter === 'swap' ? i.available_for_swap : filter === 'sale' ? i.available_for_sale : !i.available_for_swap && !i.available_for_sale,
  )

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'swap', label: 'For swap' },
    { id: 'sale', label: 'For sale' },
    { id: 'unlisted', label: 'Not listed' },
  ]

  return (
    <div>
      <PageHeader
        title="Collection"
        subtitle={items.length ? `${items.length} ${items.length === 1 ? 'game' : 'games'} on your shelf` : 'The physical games you own'}
        action={
          <button className="btn btn-primary hidden md:inline-flex" onClick={() => openCollection({ mode: 'add' })}>
            <Plus size={18} strokeWidth={2.6} /> Add game
          </button>
        }
      />

      {items.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filter collection">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="text-xs opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      )}

      {error && <ErrorNote>We couldn't load your collection. Check your connection and refresh.</ErrorNote>}

      {isLoading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Disc3 size={24} />}
          title="No games yet"
          body="Add the discs you own. Mark the ones you'd swap or sell — the rest stay private."
          action={
            <button className="btn btn-primary" onClick={() => openCollection({ mode: 'add' })}>
              <Plus size={18} strokeWidth={2.6} /> Add your first game
            </button>
          }
        />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-mute">Nothing here yet. Change a game's availability to see it in this list.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {shown.map((item) => (
            <GameCard
              key={item.id}
              game={item.game}
              onClick={() => openCollection({ mode: 'edit', item })}
              status={
                <div className="space-y-1">
                  <ListingPills swap={item.available_for_swap} sale={item.available_for_sale} />
                  {item.available_for_sale && item.price_egp && <p className="text-xs font-semibold text-mint">{formatEgp(item.price_egp)}</p>}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Prominent "+" on phones */}
      <button
        onClick={() => openCollection({ mode: 'add' })}
        aria-label="Add game"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-gold-ink shadow-[0_8px_28px_rgba(255,184,74,0.35)] transition-transform active:scale-95 md:hidden"
      >
        <Plus size={28} strokeWidth={2.6} />
      </button>
    </div>
  )
}
