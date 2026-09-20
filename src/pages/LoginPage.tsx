import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ErrorNote, Field, Spinner } from '@/components/ui'
import { errorMessage } from '@/lib/utils'
import { PasswordInput } from '@/components/PasswordInput'
import { AuthLayout } from './AuthLayout'

export default function LoginPage() {
  const { signIn, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnverified(false)
    setBusy(true)
    try {
      await signIn({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      const msg = errorMessage(err)
      if (/not confirmed/i.test(msg)) {
        setUnverified(true)
        setError('Please verify your email first. Check your inbox for the link we sent.')
      } else if (/invalid login/i.test(msg)) {
        setError('Email or password is incorrect.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      await resendVerification(email.trim())
      setResent(true)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your collection and wishlist.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        {unverified && (
          <button type="button" className="btn btn-secondary w-full" onClick={resend} disabled={resent || !email}>
            {resent ? 'Verification email sent' : 'Resend verification email'}
          </button>
        )}
        <button type="submit" className="btn btn-primary h-12 w-full text-[15px]" disabled={busy || !email || !password}>
          {busy ? <Spinner /> : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        New to Badel?{' '}
        <Link to="/signup" className="font-semibold text-gold hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
