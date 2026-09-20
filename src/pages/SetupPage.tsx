import { LogoMark } from '@/components/Logo'

export default function SetupPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <LogoMark className="h-10 w-10" />
      <h1 className="mt-5 text-3xl font-extrabold">Connect Supabase to get started</h1>
      <p className="mt-3 text-sm text-mute">The app needs your Supabase project's URL and public (anon) key.</p>
      <ol className="mt-6 space-y-3 text-sm">
        <li className="card p-4">
          Copy <code className="rounded bg-raised px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-raised px-1.5 py-0.5">.env.local</code>
        </li>
        <li className="card p-4">
          Fill in <code className="rounded bg-raised px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-raised px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> from Project Settings → API
        </li>
        <li className="card p-4">
          Run the SQL files in <code className="rounded bg-raised px-1.5 py-0.5">supabase/migrations</code>, then <code className="rounded bg-raised px-1.5 py-0.5">supabase/seed.sql</code>
        </li>
        <li className="card p-4">Restart the dev server</li>
      </ol>
      <p className="mt-6 text-xs text-mute">See README.md for the full walkthrough, including email-verification settings.</p>
    </div>
  )
}
