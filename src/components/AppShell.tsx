import { NavLink, Outlet, Link } from 'react-router-dom'
import { Disc3, Heart, Home, Repeat2, Search, User } from 'lucide-react'
import { Wordmark } from './Logo'
import { cn } from '@/lib/utils'
import { SheetsProvider } from '@/context/SheetsContext'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/collection', label: 'Collection', icon: Disc3 },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/matches', label: 'Matches', icon: Repeat2 },
  { to: '/profile', label: 'Profile', icon: User },
]

export function AppShell() {
  return (
    <SheetsProvider>
      <div className="min-h-dvh">
        {/* Sidebar: tablet + desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[92px] flex-col border-r border-line bg-bg px-3 py-6 md:flex lg:w-[248px] lg:px-4">
          <Link to="/" className="mb-8 flex justify-center px-2 lg:justify-start" aria-label="Badel home">
            <Wordmark className="[&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
          </Link>
          <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main">
            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  'mb-3 flex flex-col items-center gap-1 rounded-2xl border border-line px-2 py-2.5 text-[11px] font-semibold text-mute transition-colors hover:text-ink lg:flex-row lg:gap-3 lg:px-4 lg:text-sm',
                  isActive && 'border-gold/50 text-gold',
                )
              }
            >
              <Search size={20} />
              <span>Search</span>
            </NavLink>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition-colors lg:flex-row lg:gap-3 lg:px-4 lg:text-sm',
                    isActive ? 'bg-raised text-gold' : 'text-mute hover:bg-surface hover:text-ink',
                  )
                }
              >
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/70 bg-bg/85 px-4 backdrop-blur md:hidden">
          <Link to="/" aria-label="Badel home">
            <Wordmark />
          </Link>
          <Link to="/search" className="btn btn-ghost h-10 w-10 rounded-full px-0" aria-label="Search games">
            <Search size={21} />
          </Link>
        </header>

        <main className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 md:ml-[92px] md:px-8 md:pb-16 md:pt-9 lg:ml-[248px] lg:px-12">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Main"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors', isActive ? 'text-gold' : 'text-mute')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </SheetsProvider>
  )
}
