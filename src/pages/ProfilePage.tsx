import { useNavigate } from 'react-router-dom'
import { CalendarDays, Disc3, Heart, LogOut, MapPin, Pencil, Repeat2, Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCollection, useProfile, useWishlist } from '@/hooks/queries'
import { useSheets } from '@/context/SheetsContext'
import { Avatar } from '@/components/Avatar'
import { ErrorNote } from '@/components/ui'
import { formatJoined } from '@/lib/utils'

export default function ProfilePage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { openProfile } = useSheets()
  const { data: profile, isLoading, error } = useProfile()
  const collection = useCollection()
  const wishlist = useWishlist()

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (isLoading) return <div className="skeleton h-64" />
  if (error || !profile) return <ErrorNote>We couldn't load your profile. Refresh to try again.</ErrorNote>

  const place = [profile.city, profile.governorate?.name_en].filter(Boolean).join(', ')

  const stats = [
    { label: 'Completed swaps', value: '0', icon: Repeat2, placeholder: true },
    { label: 'Rating', value: '—', icon: Star, placeholder: true },
    { label: 'In collection', value: collection.data?.length ?? '–', icon: Disc3 },
    { label: 'On wishlist', value: wishlist.data?.length ?? '–', icon: Heart },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card flex flex-col items-center p-6 text-center md:flex-row md:items-center md:gap-6 md:text-left">
        <Avatar username={profile.username} path={profile.avatar_path} className="h-24 w-24 shrink-0 text-4xl md:h-28 md:w-28" />
        <div className="mt-4 min-w-0 md:mt-0 md:flex-1">
          <h1 className="truncate text-3xl font-extrabold">{profile.username}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-mute md:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} aria-hidden /> {place || 'Add your governorate'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} aria-hidden /> Joined {formatJoined(profile.created_at)}
            </span>
          </div>
          {profile.bio && <p className="mt-3 max-w-prose text-sm text-ink/90">{profile.bio}</p>}
        </div>
        <button className="btn btn-secondary mt-5 md:mt-0" onClick={openProfile}>
          <Pencil size={16} /> Edit profile
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, placeholder }) => (
          <div key={label} className={`card p-4 ${placeholder ? 'opacity-70' : ''}`}>
            <Icon size={18} className="text-gold" aria-hidden />
            <dd className="mt-3 font-display text-3xl font-extrabold leading-none">{value}</dd>
            <dt className="mt-1.5 text-[13px] text-mute">{label}</dt>
          </div>
        ))}
      </dl>

      <button className="btn btn-secondary mt-6 w-full md:w-auto" onClick={logout}>
        <LogOut size={17} /> Log out
      </button>
    </div>
  )
}
