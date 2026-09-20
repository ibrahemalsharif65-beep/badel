import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ErrorNote, Spinner } from '@/components/ui'
import { errorMessage } from '@/lib/utils'
import { AuthLayout } from './AuthLayout'

const COOLDOWN = 45

export default function VerifyEmailPage() {
  const { resendVerification } = useAuth()
  const email = (useLocation().state as { email?: string } | null)?.email
  const [cooldown, setCooldown] = useState(COOLDOWN)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (!email) return <Navigate to="/login" replace />

  const resend = async () => {
    setBusy(true)
    setError(null)
    try {
      await resendVerification(email)
      setSent(true)
      setCooldown(COOLDOWN)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Check your email">
      <div className="card p-5">
        <MailCheck size={28} className="text-gold" aria-hidden />
        <p className="mt-4 text-sm leading-relaxed text-ink/90">
          We sent a verification link to <strong className="break-all">{email}</strong>. Open it on this device to activate your account, then log in.
        </p>
        <p className="mt-3 text-xs text-mute">Can't find it? Check your spam folder.</p>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <button className="btn btn-secondary mt-4 w-full" onClick={resend} disabled={busy || cooldown > 0}>
        {busy ? <Spinner /> : cooldown > 0 ? `Resend email in ${cooldown}s` : sent ? 'Send again' : 'Resend email'}
      </button>
      <p className="mt-6 text-center text-sm text-mute">
        Already verified?{' '}
        <Link to="/login" className="font-semibold text-gold hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
