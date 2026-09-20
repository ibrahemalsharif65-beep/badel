import { useState } from 'react'
import { Plus, Search, Check } from 'lucide-react'
import { CONSOLES, CONSOLE_ORDER, type ConsoleType } from '@/lib/constants'
import type { Game } from '@/lib/types'
import { useDebounce } from '@/hooks/useDebounce'
import { useCreateGame, useSearchGames } from '@/hooks/queries'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, cn } from '@/lib/utils'
import { GameCover } from './GameCover'
import { ConsoleBadge } from './Badges'
import { ErrorNote, Field, Spinner } from './ui'

interface Props {
  onSelect: (game: Game) => void
  /** Games that can't be picked again (e.g. already on the wishlist). */
  disabledIds?: Set<string>
  disabledLabel?: string
}

export function GamePicker({ onSelect, disabledIds, disabledLabel = 'Already added' }: Props) {
  const [query, setQuery] = useState('')
  const [consoles, setConsoles] = useState<ConsoleType[]>([])
  const [adding, setAdding] = useState(false)
  const debounced = useDebounce(query, 250)

  const search = useSearchGames({ query: debounced, consoles, swap: false, sale: false })
  const rows = search.data?.pages[0] ?? []

  const toggle = (c: ConsoleType) => setConsoles((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  if (adding) {
    return <NewGameForm initialTitle={query} initialConsole={consoles[0]} onCancel={() => setAdding(false)} onCreated={onSelect} />
  }

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
        <input
          data-autofocus
          className="input pl-10"
          placeholder="Search games..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search games"
        />
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        {CONSOLE_ORDER.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={consoles.includes(c)} onClick={() => toggle(c)}>
            {CONSOLES[c].label}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5" aria-busy={search.isFetching}>
        {search.isLoading && (
          <li className="flex justify-center py-8 text-mute">
            <Spinner />
          </li>
        )}
        {rows.map((g) => {
          const disabled = disabledIds?.has(g.id)
          return (
            <li key={g.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(g)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-colors',
                  disabled ? 'opacity-50' : 'hover:border-line hover:bg-surface',
                )}
              >
                <GameCover game={g} compact className="w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{g.title}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <ConsoleBadge platform={g.platform} />
                    {g.edition !== 'Standard' && <span className="truncate text-xs text-mute/80">{g.edition}</span>}
                    {g.release_year && <span className="text-xs text-mute/60">{g.release_year}</span>}
                  </span>
                </span>
                {disabled && (
                  <span className="flex items-center gap-1 text-xs font-medium text-mute">
                    <Check size={14} /> {disabledLabel}
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {!search.isLoading && rows.length === 0 && (
          <li className="py-6 text-center text-sm text-mute">
            {debounced ? `No games match "${debounced}".` : 'No games in the catalogue yet.'}
          </li>
        )}
      </ul>

      <button type="button" onClick={() => setAdding(true)} className="btn btn-secondary mt-3 w-full">
        <Plus size={18} /> Can't find it? Add a new game
      </button>
    </div>
  )
}

const EDITION_SUGGESTIONS = ['Standard', 'Deluxe Edition', 'Game of the Year Edition', "Director's Cut", 'Complete Edition', 'Ultimate Edition', 'Gold Edition']

function NewGameForm({
  initialTitle,
  initialConsole,
  onCancel,
  onCreated,
}: {
  initialTitle: string
  initialConsole?: ConsoleType
  onCancel: () => void
  onCreated: (g: Game) => void
}) {
  const { user } = useAuth()
  const create = useCreateGame()
  const [title, setTitle] = useState(initialTitle)
  const [platform, setPlatform] = useState<ConsoleType>(initialConsole ?? 'ps5')
  const [edition, setEdition] = useState('Standard')
  const [year, setYear] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const t = title.trim()
    if (!t) return setError('Enter the game title.')
    const y = year ? Number(year) : null
    if (y !== null && (!Number.isInteger(y) || y < 1990 || y > new Date().getFullYear() + 1)) return setError('Enter a valid release year.')
    try {
      const game = await create.mutateAsync({ title: t, platform, edition: edition.trim() || 'Standard', releaseYear: y, coverFile: cover, userId: user!.id })
      onCreated(game)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mute">
        If this game and edition already exist for that console, we'll use the existing entry — no duplicates.
      </p>
      <Field label="Game title" htmlFor="ng-title">
        <input id="ng-title" data-autofocus className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Console" htmlFor="ng-console">
        <select id="ng-console" className="input" value={platform} onChange={(e) => setPlatform(e.target.value as ConsoleType)}>
          {CONSOLE_ORDER.map((c) => (
            <option key={c} value={c}>
              {CONSOLES[c].label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <Field label="Edition" htmlFor="ng-edition">
          <input id="ng-edition" className="input" list="edition-list" value={edition} maxLength={60} onChange={(e) => setEdition(e.target.value)} />
          <datalist id="edition-list">
            {EDITION_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Year" htmlFor="ng-year">
          <input id="ng-year" className="input" inputMode="numeric" placeholder="2023" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </Field>
      </div>
      <Field label="Cover image (optional)" htmlFor="ng-cover" hint="A front-of-case photo works well.">
        <input
          id="ng-cover"
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-line"
        />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2.5">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel} disabled={create.isPending}>
          Back to search
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={create.isPending}>
          {create.isPending ? <Spinner /> : 'Add game'}
        </button>
      </div>
    </div>
  )
}
