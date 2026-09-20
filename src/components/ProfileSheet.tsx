import { useMemo, useState } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGovernorates, useProfile, useUpdateProfile } from '@/hooks/queries'
import { isUsernameAvailable } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { Sheet } from './Sheet'
import { Avatar } from './Avatar'
import { ErrorNote, Field, Spinner } from './ui'
import { useToast } from './Toast'

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <Inner onClose={onClose} />
}

function Inner({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data: profile } = useProfile()
  const { data: governorates } = useGovernorates()
  const update = useUpdateProfile()

  const [username, setUsername] = useState(profile?.username ?? '')
  const [governorateId, setGovernorateId] = useState<string>(profile?.governorate_id ? String(profile.governorate_id) : '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const avatarPreview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : null), [avatar])
  if (!profile || !user) return null

  const submit = async () => {
    setError(null)
    const name = username.trim()
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return setError('Username must be 3–20 characters: letters, numbers or underscores.')
    if (governorateId === '' && city.trim()) return setError('Choose your governorate first, then add your city.')

    try {
      if (name.toLowerCase() !== profile.username.toLowerCase()) {
        setChecking(true)
        const free = await isUsernameAvailable(name)
        setChecking(false)
        if (!free) return setError('That username is already taken.')
      }
      await update.mutateAsync({
        userId: user.id,
        patch: {
          username: name,
          governorate_id: governorateId ? Number(governorateId) : null,
          city: city.trim() || null,
          bio: bio.trim() || null,
        },
        avatar,
        previousAvatar: profile.avatar_path,
      })
      toast('Profile updated')
      onClose()
    } catch (e) {
      setChecking(false)
      setError(errorMessage(e))
    }
  }

  const busy = update.isPending || checking

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit profile"
      footer={
        <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? <Spinner /> : 'Save profile'}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            {avatarPreview ? (
              <img src={avatarPreview} alt="New avatar preview" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <Avatar username={username} path={profile.avatar_path} className="h-20 w-20 text-3xl" />
            )}
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-raised text-ink group-hover:border-gold">
              <Camera size={15} />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} aria-label="Change profile photo" />
          </label>
          <p className="text-sm text-mute">Tap the photo to change it.</p>
        </div>

        <Field label="Username" htmlFor="username" hint="3–20 characters. Letters, numbers and underscores.">
          <input id="username" className="input" value={username} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => setUsername(e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Governorate" htmlFor="gov">
            <select id="gov" className="input" value={governorateId} onChange={(e) => setGovernorateId(e.target.value)}>
              <option value="">Select…</option>
              {(governorates ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_en} — {g.name_ar}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City / area" htmlFor="city">
            <input id="city" className="input" value={city} maxLength={60} placeholder="e.g. Nasr City" onChange={(e) => setCity(e.target.value)} />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-mute">Only your governorate and city are shown. Never enter your street address.</p>

        <Field label="Bio" htmlFor="bio">
          <textarea id="bio" className="input" maxLength={240} placeholder="What do you play? Which games are you hunting?" value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="hint text-right">{bio.length}/240</p>
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Sheet>
  )
}
