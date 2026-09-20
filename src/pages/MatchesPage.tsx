import { Link } from 'react-router-dom'
import { Disc3, Heart, Repeat2, Handshake } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import { useCollection, useWishlist } from '@/hooks/queries'

/** Placeholder — real matching ships in a later phase. */
export default function MatchesPage() {
  const have = useCollection().data?.length ?? 0
  const want = useWishlist().data?.length ?? 0

  const steps = [
    { icon: Disc3, title: 'Have', body: 'Games on your shelf that you would swap.' },
    { icon: Heart, title: 'Want', body: 'Games you are hunting for.' },
    { icon: Repeat2, title: 'Match', body: 'We line up players whose Have meets your Want.' },
    { icon: Handshake, title: 'Swap', body: 'Agree the details and trade discs.' },
  ]

  return (
    <div>
      <PageHeader title="Matches" subtitle="Matching is coming soon" />

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className={`card p-5 ${i < 2 ? '' : 'opacity-60'}`}>
            <Icon size={22} className={i < 2 ? 'text-gold' : 'text-mute'} aria-hidden />
            <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
            <p className="mt-1.5 text-sm text-mute">{body}</p>
          </li>
        ))}
      </ol>

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-extrabold">Get ready for your first match</h2>
        <p className="mt-2 max-w-xl text-sm text-mute">
          You have <strong className="text-ink">{have}</strong> {have === 1 ? 'game' : 'games'} on your shelf and{' '}
          <strong className="text-ink">{want}</strong> on your wishlist. The more you add, the more matches you'll find once matching opens.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link to="/collection" className="btn btn-secondary">
            Add to collection
          </Link>
          <Link to="/wishlist" className="btn btn-secondary">
            Add to wishlist
          </Link>
        </div>
      </div>
    </div>
  )
}
