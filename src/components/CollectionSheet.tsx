import { useState } from 'react'
import { ArrowLeftRight, Banknote, Trash2 } from 'lucide-react'
import { CONDITIONS, type ConditionType } from '@/lib/constants'
import type { CollectionItem, Game } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { useDeleteCollectionItem, useSaveCollectionItem } from '@/hooks/queries'
import { errorMessage } from '@/lib/utils'
import { Sheet } from './Sheet'
import { GamePicker } from './GamePicker'
import { GameCover } from './GameCover'
import { ConsoleBadge } from './Badges'
import { Switch } from './Switch'
import { PhotoPicker } from './PhotoPicker'
import { ErrorNote, Field, Spinner } from './ui'
import { useToast } from './Toast'

export type CollectionSheetState = { mode: 'add'; game?: Game } | { mode: 'edit'; item: CollectionItem }

export function CollectionSheet({ state, onClose }: { state: CollectionSheetState | null; onClose: () => void }) {
  if (!state) return null
  // Keyed so every open starts from a clean form.
  return <Inner key={state.mode === 'edit' ? state.item.id : (state.game?.id ?? 'new')} state={state} onClose={onClose} />
}

function Inner({ state, onClose }: { state: CollectionSheetState; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const save = useSaveCollectionItem()
  const del = useDeleteCollectionItem()
  const editing = state.mode === 'edit' ? state.item : null

  const [game, setGame] = useState<Game | undefined>(editing?.game ?? (state.mode === 'add' ? state.game : undefined))
  const [condition, setCondition] = useState<ConditionType>(editing?.condition ?? 'good')
  const [swap, setSwap] = useState(editing?.available_for_swap ?? true)
  const [sale, setSale] = useState(editing?.available_for_sale ?? false)
  const [price, setPrice] = useState(editing?.price_egp ? String(editing.price_egp) : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [photos, setPhotos] = useState<{ keepPaths: string[]; newFiles: File[] }>({ keepPaths: editing?.photo_paths ?? [], newFiles: [] })
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const busy = save.isPending || del.isPending
  const conditionHint = CONDITIONS.find((c) => c.value === condition)?.hint

  const submit = async () => {
    if (!game || !user) return
    setError(null)
    const priceNum = Number(price)
    if (sale && (!price || !Number.isInteger(priceNum) || priceNum < 1 || priceNum > 500000)) {
      return setError('Enter your asking price in EGP (whole pounds) for a sale listing.')
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        userId: user.id,
        gameId: game.id,
        condition,
        notes: notes.trim() || null,
        availableForSwap: swap,
        availableForSale: sale,
        priceEgp: sale ? priceNum : null,
        keepPaths: photos.keepPaths,
        newFiles: photos.newFiles,
        originalPaths: editing?.photo_paths,
      })
      toast(editing ? 'Changes saved' : `${game.title} added to your collection`)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const remove = async () => {
    if (!editing) return
    try {
      await del.mutateAsync(editing)
      toast('Removed from your collection')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setConfirmDelete(false)
    }
  }

  const footer = !game ? undefined : confirmDelete ? (
    <div className="space-y-2.5">
      <p className="text-sm font-medium">Remove {game.title} from your collection?</p>
      <div className="flex gap-2.5">
        <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmDelete(false)} disabled={busy}>
          Keep it
        </button>
        <button type="button" className="btn btn-danger flex-1" onClick={remove} disabled={busy}>
          {del.isPending ? <Spinner /> : 'Yes, remove'}
        </button>
      </div>
    </div>
  ) : (
    <div className="flex gap-2.5">
      {editing && (
        <button type="button" className="btn btn-danger px-3.5" onClick={() => setConfirmDelete(true)} disabled={busy} aria-label="Delete from collection">
          <Trash2 size={18} />
        </button>
      )}
      <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={busy}>
        {save.isPending ? <Spinner /> : editing ? 'Save changes' : 'Add to collection'}
      </button>
    </div>
  )

  return (
    <Sheet open onClose={onClose} title={!game ? 'Which game do you have?' : editing ? 'Edit game' : 'Add to collection'} footer={footer}>
      {!game ? (
        <GamePicker onSelect={setGame} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3">
            <GameCover game={game} compact className="w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold">{game.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5">
                <ConsoleBadge platform={game.platform} />
                <span className="text-xs text-mute/80">{game.edition}</span>
                {game.release_year && <span className="text-xs text-mute/60">{game.release_year}</span>}
              </div>
            </div>
            {!editing && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGame(undefined)}>
                Change
              </button>
            )}
          </div>

          <Field label="Condition">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Condition">
              {CONDITIONS.map((c) => (
                <button key={c.value} type="button" role="radio" aria-checked={condition === c.value} className="chip" onClick={() => setCondition(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="hint">{conditionHint}</p>
          </Field>

          <div>
            <span className="label">Availability</span>
            <div className="space-y-2.5">
              <Switch
                checked={swap}
                onChange={setSwap}
                label="Open to swaps"
                description="Other players can offer a game in exchange."
                icon={<ArrowLeftRight size={20} />}
              />
              <Switch
                checked={sale}
                onChange={setSale}
                label="For sale"
                description="Set your asking price in EGP."
                icon={<Banknote size={20} />}
                accent="mint"
              />
              {sale && (
                <div>
                  <label className="label" htmlFor="price">
                    Asking price
                  </label>
                  <div className="relative">
                    <input
                      id="price"
                      className="input pr-14"
                      inputMode="numeric"
                      placeholder="e.g. 900"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-mute">EGP</span>
                  </div>
                </div>
              )}
            </div>
            <p className="hint">
              {swap || sale ? 'Visible to other players.' : 'Not listed — only you can see this game.'}
            </p>
          </div>

          <Field label="Photos">
            <PhotoPicker keepPaths={photos.keepPaths} newFiles={photos.newFiles} onChange={setPhotos} />
          </Field>

          <Field label="Notes (optional)" htmlFor="notes">
            <textarea
              id="notes"
              className="input"
              maxLength={500}
              placeholder="Includes DLC code, slight crack on the case…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      )}
    </Sheet>
  )
}
