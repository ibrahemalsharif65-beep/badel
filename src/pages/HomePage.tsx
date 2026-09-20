import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Disc3, Heart, Plus, Search } from 'lucide-react'
import { useCollection, useProfile, useRecentGames, useWishlist } from '@/hooks/queries'
import { useSheets } from '@/context/SheetsContext'
import { GameCard } from '@/components/GameCard'
import { ListingPills } from '@/components/Badges'
import { Rail, Section } from '@/components/Section'
import { EmptyState, GridSkeleton } from '@/components/ui'

export default function HomePage() {
  const navigate = useNavigate()
  const { openCollection, openWishlist } = useSheets()
  const { data: profile } = useProfile()
  const collection = useCollection()
  const wishlist = useWishlist()
  const recent = useRecentGames()
  const [q, setQ] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  const have = collection.data ?? []
  const want = wishlist.data ?? []

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-14">
        <div>
          {profile && <p className="mb-2 text-sm font-medium text-mute">Hi {profile.username}</p>}
          <h1 className="text-balance text-[40px] font-extrabold leading-[1.02] md:text-6xl">Swap games. Play more.</h1>

          <form onSubmit={onSearch} className="relative mt-6" role="search">
            <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
            <input
              className="input h-14 rounded-2xl pl-12 text-base"
              placeholder="Search games..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search games"
            />
          </form>
        </div>

        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <Link to="/collection" className="card group p-4 transition-colors hover:border-gold/50">
              <Disc3 size={20} className="text-gold" aria-hidden />
              <p className="mt-3 font-display text-3xl font-extrabold leading-none">{collection.isLoading ? '–' : have.length}</p>
              <p className="mt-1 text-[13px] text-mute">games you have</p>
            </Link>
            <div className="flex items-center text-mute/50" aria-hidden>
              <ArrowLeftRight size={20} />
            </div>
            <Link to="/wishlist" className="card group p-4 transition-colors hover:border-gold/50">
              <Heart size={20} className="text-gold" aria-hidden />
              <p className="mt-3 font-display text-3xl font-extrabold leading-none">{wishlist.isLoading ? '–' : want.length}</p>
              <p className="mt-1 text-[13px] text-mute">games you want</p>
            </Link>
          </div>

          <button type="button" className="btn btn-primary mt-3 h-12 w-full text-[15px]" onClick={() => openCollection({ mode: 'add' })}>
            <Plus size={20} strokeWidth={2.6} /> Add game
          </button>
        </div>
      </div>

      <Section title="My collection" to="/collection">
        {collection.isLoading ? (
          <GridSkeleton count={4} />
        ) : have.length === 0 ? (
          <EmptyState
            icon={<Disc3 size={22} />}
            title="Your shelf is empty"
            body="Add the physical games you own and choose which ones you'd swap or sell."
            action={
              <button className="btn btn-secondary" onClick={() => openCollection({ mode: 'add' })}>
                <Plus size={18} /> Add your first game
              </button>
            }
          />
        ) : (
          <Rail>
            {have.slice(0, 10).map((item) => (
              <GameCard
                key={item.id}
                game={item.game}
                status={<ListingPills swap={item.available_for_swap} sale={item.available_for_sale} />}
                onClick={() => openCollection({ mode: 'edit', item })}
              />
            ))}
          </Rail>
        )}
      </Section>

      <Section title="Wishlist" to="/wishlist">
        {wishlist.isLoading ? (
          <GridSkeleton count={4} />
        ) : want.length === 0 ? (
          <EmptyState
            icon={<Heart size={22} />}
            title="What are you hunting for?"
            body="Add the games you want and they'll be ready when matching launches."
            action={
              <button className="btn btn-secondary" onClick={() => openWishlist({ mode: 'add' })}>
                <Plus size={18} /> Add a wanted game
              </button>
            }
          />
        ) : (
          <Rail>
            {want.slice(0, 10).map((item) => (
              <GameCard key={item.id} game={item.game} onClick={() => openWishlist({ mode: 'edit', item })} />
            ))}
          </Rail>
        )}
      </Section>

      <Section title="Recently added games" to="/search" linkLabel="Browse all">
        {recent.isLoading ? (
          <GridSkeleton count={4} />
        ) : (
          <Rail>
            {(recent.data ?? []).map((g) => (
              <GameCard key={g.id} game={g} to={`/games/${g.id}`} />
            ))}
          </Rail>
        )}
      </Section>
    </div>
  )
}
