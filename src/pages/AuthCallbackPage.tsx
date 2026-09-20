import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

/** Landing page for the link in the verification email. supabase-js finishes the sign-in from the URL. */
export default function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  const urlError = (() => {
    const p = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''))
    return p.get('error_description') || p.get('error')
  })()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(t)
  }, [])

  const failed = !!urlError || (!loading && !session && timedOut)

  if (!failed) {
    return (
      <AuthLayout title="Verifying your email…">
        <div className="flex items-center gap-3 text-mute">
          <Spinner /> One moment…
        </div>
      </AuthLayout>
    )
  }

  // A real error in the URL means the link is expired/invalid. Otherwise the most common cause is
  // opening the link in a different browser than the one used to sign up (PKCE can't finish there):
  // the email IS verified, the person just needs to log in.
  return urlError ? (
    <AuthLayout title="That link didn't work">
      <p className="text-sm text-mute">
        {urlError.replace(/\+/g, ' ')}. Log in and we'll offer to send you a fresh verification email.
      </p>
      <Link to="/login" className="btn btn-primary mt-6 w-full">
        Go to log in
      </Link>
    </AuthLayout>
  ) : (
    <AuthLayout title="Email verified? Log in to continue">
      <p className="text-sm text-mute">
        We couldn't sign you in automatically. That happens when the link opens in a different browser or app than the one you signed up in. If your email is verified, just log in. If not, we'll send a new link.
      </p>
      <Link to="/login" className="btn btn-primary mt-6 w-full">
        Go to log in
      </Link>
    </AuthLayout>
  )
}
