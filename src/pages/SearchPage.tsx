import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Banknote, Search as SearchIcon, SearchX } from 'lucide-react'
import { CONSOLES, CONSOLE_ORDER, FAMILIES, type ConsoleType } from '@/lib/constants'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchGames } from '@/hooks/queries'
import { GameCard } from '@/components/GameCard'
import { EmptyState, ErrorNote, GridSkeleton, PageHeader, Spinner } from '@/components/ui'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const debounced = useDebounce(text, 300)

  const consoles = (params.get('c')?.split(',').filter((c): c is ConsoleType => c in CONSOLES) ?? []) as ConsoleType[]
  const swap = params.get('swap') === '1'
  const sale = params.get('sale') === '1'

  // Keep the URL in sync so results are shareable and survive a refresh.
  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debounced.trim()) next.set('q', debounced.trim())
        else next.delete('q')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const setFlag = (key: string, on: boolean) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (on) next.set(key, '1')
      else next.delete(key)
      return next
    }, { replace: true })

  const setConsoles = (list: ConsoleType[]) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (list.length) next.set('c', list.join(','))
      else next.delete('c')
      return next
    }, { replace: true })

  const toggleConsole = (c: ConsoleType) => setConsoles(consoles.includes(c) ? consoles.filter((x) => x !== c) : [...consoles, c])
  const toggleFamily = (fam: (typeof FAMILIES)[number]) => {
    const all = fam.consoles.every((c) => consoles.includes(c))
    setConsoles(all ? consoles.filter((c) => !fam.consoles.includes(c)) : Array.from(new Set([...consoles, ...fam.consoles])))
  }

  const query = useSearchGames({ query: debounced, consoles, swap, sale })
  const rows = query.data?.pages.flat() ?? []
  const total = rows[0]?.total_count ?? 0
  const filtersOn = consoles.length > 0 || swap || sale

  return (
    <div>
      <PageHeader title="Search" subtitle="Find any game and see who has it" />

      <div className="relative">
        <SearchIcon size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
        <input
          autoFocus={!params.get('q')}
          className="input h-14 rounded-2xl pl-12 text-base"
          placeholder="Search games..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Search games"
          enterKeyHint="search"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Platform">
          {FAMILIES.map((f) => (
            <button key={f.id} className="chip" aria-pressed={f.consoles.every((c) => consoles.includes(c))} onClick={() => toggleFamily(f)}>
              {f.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
          {CONSOLE_ORDER.map((c) => (
            <button key={c} className="chip" aria-pressed={consoles.includes(c)} onClick={() => toggleConsole(c)}>
              {CONSOLES[c].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Availability">
          <button className="chip" aria-pressed={swap} onClick={() => setFlag('swap', !swap)}>
            <ArrowLeftRight size={14} /> Open to swap
          </button>
          <button className="chip" aria-pressed={sale} onClick={() => setFlag('sale', !sale)}>
            <Banknote size={14} /> For sale
          </button>
          {filtersOn && (
            <button className="btn btn-ghost btn-sm" onClick={() => setParams(debounced.trim() ? { q: debounced.trim() } : {}, { replace: true })}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {query.error && <ErrorNote>Search failed. Check your connection and try again.</ErrorNote>}
        {query.isLoading ? (
          <GridSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<SearchX size={24} />}
            title="No games found"
            body={swap || sale ? 'Nobody is listing a matching game right now. Try removing the availability filters.' : 'Try a different spelling, or remove a console filter.'}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-mute" aria-live="polite">
              {total} {total === 1 ? 'game' : 'games'}
            </p>
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {rows.map((g) => (
                <GameCard
                  key={g.id}
                  game={g}
                  to={`/games/${g.id}`}
                  status={
                    g.swap_count + g.sale_count === 0 ? (
                      <span className="text-xs text-mute/70">No listings yet</span>
                    ) : (
                      <span className="flex flex-wrap gap-x-2.5 text-xs font-semibold">
                        {g.swap_count > 0 && <span className="text-gold">{g.swap_count} to swap</span>}
                        {g.sale_count > 0 && <span className="text-mint">{g.sale_count} for sale</span>}
                      </span>
                    )
                  }
                />
              ))}
            </div>
            {query.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button className="btn btn-secondary" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? <Spinner /> : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
