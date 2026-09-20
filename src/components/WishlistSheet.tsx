import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { CONDITIONS, type ConditionType } from '@/lib/constants'
import type { Game, WishlistItem } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { useDeleteWishlistItem, useSaveWishlistItem, useWishlist } from '@/hooks/queries'
import { errorMessage } from '@/lib/utils'
import { Sheet } from './Sheet'
import { GamePicker } from './GamePicker'
import { GameCover } from './GameCover'
import { ConsoleBadge } from './Badges'
import { ErrorNote, Field, Spinner } from './ui'
import { useToast } from './Toast'

export type WishlistSheetState = { mode: 'add'; game?: Game } | { mode: 'edit'; item: WishlistItem }

export function WishlistSheet({ state, onClose }: { state: WishlistSheetState | null; onClose: () => void }) {
  if (!state) return null
  return <Inner key={state.mode === 'edit' ? state.item.id : (state.game?.id ?? 'new')} state={state} onClose={onClose} />
}

function Inner({ state, onClose }: { state: WishlistSheetState; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const wishlist = useWishlist()
  const save = useSaveWishlistItem()
  const del = useDeleteWishlistItem()
  const editing = state.mode === 'edit' ? state.item : null

  const [game, setGame] = useState<Game | undefined>(editing?.game ?? (state.mode === 'add' ? state.game : undefined))
  const [preferred, setPreferred] = useState<ConditionType | ''>(editing?.preferred_condition ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const already = new Set((wishlist.data ?? []).map((w) => w.game_id))
  const busy = save.isPending || del.isPending

  const submit = async () => {
    if (!game || !user) return
    setError(null)
    try {
      await save.mutateAsync({
        id: editing?.id,
        userId: user.id,
        gameId: game.id,
        preferredCondition: preferred || null,
        notes: notes.trim() || null,
      })
      toast(editing ? 'Wishlist updated' : `${game.title} added to your wishlist`)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const remove = async () => {
    if (!editing) return
    try {
      await del.mutateAsync(editing.id)
      toast('Removed from your wishlist')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const footer = game ? (
    <div className="flex gap-2.5">
      {editing && (
        <button type="button" className="btn btn-danger px-3.5" onClick={remove} disabled={busy} aria-label="Remove from wishlist">
          {del.isPending ? <Spinner /> : <Trash2 size={18} />}
        </button>
      )}
      <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={busy}>
        {save.isPending ? <Spinner /> : editing ? 'Save changes' : 'Add to wishlist'}
      </button>
    </div>
  ) : undefined

  return (
    <Sheet open onClose={onClose} title={!game ? 'Which game do you want?' : editing ? 'Edit wishlist item' : 'Add to wishlist'} footer={footer}>
      {!game ? (
        <GamePicker onSelect={setGame} disabledIds={already} disabledLabel="On your wishlist" />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3">
            <GameCover game={game} compact className="w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold">{game.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5">
                <ConsoleBadge platform={game.platform} />
                <span className="text-xs text-mute/80">{game.edition}</span>
              </div>
            </div>
            {!editing && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGame(undefined)}>
                Change
              </button>
            )}
          </div>

          <Field label="Preferred condition" htmlFor="pref" hint="The lowest condition you'd accept.">
            <select id="pref" className="input" value={preferred} onChange={(e) => setPreferred(e.target.value as ConditionType | '')}>
              <option value="">Any condition</option>
              {CONDITIONS.map((c, i) => (
                <option key={c.value} value={c.value}>
                  {i === 0 ? c.label : `${c.label} or better`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes (optional)" htmlFor="wnotes">
            <textarea
              id="wnotes"
              className="input"
              maxLength={300}
              placeholder="Only the Deluxe edition, can meet in Maadi…"
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
