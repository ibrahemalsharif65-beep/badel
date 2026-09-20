import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/Logo'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <LogoMark className="h-10 w-10 opacity-70" />
      <h1 className="mt-5 text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-sm text-mute">That page doesn't exist, or it moved.</p>
      <Link to="/" className="btn btn-primary mt-6">
        Back home
      </Link>
    </div>
  )
}
