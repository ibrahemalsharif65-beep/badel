import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Wordmark } from '@/components/Logo'

const STEPS = ['Have', 'Want', 'Match', 'Swap']

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:block">
        <svg viewBox="0 0 100 100" className="absolute -bottom-32 -right-32 w-[620px] opacity-[0.07]" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#FFB84A" strokeWidth="1.6" />
          <circle cx="50" cy="50" r="31" fill="none" stroke="#fff" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="#FFB84A" strokeWidth="1.6" />
        </svg>
        <div className="relative flex h-full flex-col justify-between p-14">
          <Wordmark />
          <div>
            <h2 className="max-w-md text-6xl font-extrabold leading-[1.02]">Swap games. Play more.</h2>
            <p className="mt-5 max-w-sm text-base text-mute">
              The marketplace for physical PS4, PS5 and Xbox games, built for gamers across Egypt.
            </p>
            <ol className="mt-10 flex items-center gap-3 text-sm font-semibold">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={i < 2 ? 'text-gold' : 'text-mute'}>{s}</span>
                  {i < STEPS.length - 1 && <ArrowRight size={14} className="text-line" aria-hidden />}
                </li>
              ))}
            </ol>
          </div>
          <p className="text-xs text-mute/70">PS4 · PS5 · Xbox One · Xbox Series X|S</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <h1 className="text-[32px] font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-mute">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  )
}
