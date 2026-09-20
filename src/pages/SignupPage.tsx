import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isUsernameAvailable } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { ErrorNote, Field, Spinner } from '@/components/ui'
import { errorMessage } from '@/lib/utils'
import { PasswordInput } from '@/components/PasswordInput'
import { AuthLayout } from './AuthLayout'

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameState, setNameState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle')
  const debouncedName = useDebounce(username, 400)

  useEffect(() => {
    if (!debouncedName) return setNameState('idle')
    if (!USERNAME_RE.test(debouncedName)) return setNameState('invalid')
    let live = true
    setNameState('checking')
    isUsernameAvailable(debouncedName)
      .then((free) => live && setNameState(free ? 'free' : 'taken'))
      .catch(() => live && setNameState('idle')) // don't block signup if the check itself fails
    return () => {
      live = false
    }
  }, [debouncedName])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!USERNAME_RE.test(username)) return setError('Username must be 3–20 characters: letters, numbers or underscores.')
    if (nameState === 'taken') return setError('That username is already taken.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    try {
      const { needsVerification } = await signUp({ email: email.trim(), password, username })
      if (needsVerification) navigate('/verify-email', { state: { email: email.trim() }, replace: true })
      else navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start listing the games you have and want.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Username" htmlFor="username">
          <div className="relative">
            <input
              id="username"
              className="input pr-10"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby="username-status"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden>
              {nameState === 'checking' && <Spinner className="text-mute" />}
              {nameState === 'free' && <Check size={18} className="text-mint" />}
              {(nameState === 'taken' || nameState === 'invalid') && <X size={18} className="text-danger" />}
            </span>
          </div>
          <p id="username-status" className={`hint ${nameState === 'taken' || nameState === 'invalid' ? '!text-danger' : nameState === 'free' ? '!text-mint' : ''}`}>
            {nameState === 'taken'
              ? 'That username is taken.'
              : nameState === 'invalid'
                ? '3–20 characters: letters, numbers or underscores.'
                : nameState === 'free'
                  ? 'Username is available.'
                  : 'This is how other players will see you.'}
          </p>
        </Field>
        <Field label="Email" htmlFor="email" hint="We'll send a verification link to this address.">
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={setPassword} />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" className="btn btn-primary h-12 w-full text-[15px]" disabled={busy || !username || !email || !password}>
          {busy ? <Spinner /> : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-gold hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
