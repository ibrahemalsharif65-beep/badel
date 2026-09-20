import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Disc3, Heart, MapPin } from 'lucide-react'
import { useGame, useListings, useWishlist } from '@/hooks/queries'
import { useSheets } from '@/context/SheetsContext'
import { GameCover } from '@/components/GameCover'
import { Avatar } from '@/components/Avatar'
import { ConsoleBadge, ListingPills } from '@/components/Badges'
import { EmptyState, ErrorNote } from '@/components/ui'
import { BUCKETS, conditionLabel } from '@/lib/constants'
import { publicUrl } from '@/lib/images'
import { formatEgp } from '@/lib/utils'

export default function GameDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { openCollection, openWishlist } = useSheets()
  const { data: game, isLoading, error } = useGame(id)
  const listings = useListings(id)
  const wishlist = useWishlist()
  const onWishlist = (wishlist.data ?? []).find((w) => w.game_id === id)

  if (isLoading) return <div className="skeleton h-72" />
  if (error || !game) return <ErrorNote>We couldn't find that game. It may have been removed.</ErrorNote>

  return (
    <div>
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/search'))} className="btn btn-ghost btn-sm -ml-2 mb-3">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 md:grid-cols-[240px_1fr] md:gap-10">
        <div className="mx-auto w-[58%] max-w-[240px] md:mx-0 md:w-full">
          <GameCover game={game} className="border border-line shadow-2xl" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">{game.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ConsoleBadge platform={game.platform} className="text-sm" />
            <span className="text-sm text-mute">{game.edition}</span>
            {game.release_year && <span className="text-sm text-mute/70">{game.release_year}</span>}
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button className="btn btn-primary sm:min-w-[170px]" onClick={() => openCollection({ mode: 'add', game })}>
              <Disc3 size={18} /> I have this
            </button>
            {onWishlist ? (
              <button className="btn btn-secondary sm:min-w-[170px]" onClick={() => openWishlist({ mode: 'edit', item: onWishlist })}>
                <Check size={18} className="text-mint" /> On your wishlist
              </button>
            ) : (
              <button className="btn btn-secondary sm:min-w-[170px]" onClick={() => openWishlist({ mode: 'add', game })}>
                <Heart size={18} /> I want this
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3.5 text-xl font-extrabold md:text-2xl">Who has it</h2>
        {listings.isLoading ? (
          <div className="skeleton h-24" />
        ) : (listings.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Disc3 size={22} />}
            title="Nobody is listing this yet"
            body="Add it to your wishlist to keep track of it while more players join."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {listings.data!.map((l) => {
              const place = [l.owner?.city, l.owner?.governorate?.name_en].filter(Boolean).join(', ')
              return (
                <li key={l.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar username={l.owner?.username} path={l.owner?.avatar_path} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{l.owner?.username ?? 'Player'}</p>
                      {place && (
                        <p className="flex items-center gap-1 text-xs text-mute">
                          <MapPin size={12} aria-hidden /> {place}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{conditionLabel(l.condition)}</p>
                      {l.available_for_sale && l.price_egp && <p className="text-sm font-bold text-mint">{formatEgp(l.price_egp)}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <ListingPills swap={l.available_for_swap} sale={l.available_for_sale} />
                    {l.photo_paths.length > 0 && (
                      <div className="flex -space-x-2">
                        {l.photo_paths.slice(0, 3).map((p) => (
                          <img key={p} src={publicUrl(BUCKETS.collection, p)!} alt="" loading="lazy" className="h-9 w-9 rounded-lg border-2 border-surface object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                  {l.notes && <p className="mt-2.5 text-xs text-mute">{l.notes}</p>}
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-mute">
          Chat and swap requests arrive in a later update. <Link to="/wishlist" className="font-semibold text-gold">Manage your wishlist</Link>
        </p>
      </section>
    </div>
  )
}
