import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { AppShell } from '@/components/AppShell'
import { Spinner } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'
import SetupPage from '@/pages/SetupPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import NotFoundPage from '@/pages/NotFoundPage'
import HomePage from '@/pages/HomePage'
import CollectionPage from '@/pages/CollectionPage'
import WishlistPage from '@/pages/WishlistPage'
import MatchesPage from '@/pages/MatchesPage'
import ProfilePage from '@/pages/ProfilePage'

const SearchPage = lazy(() => import('@/pages/SearchPage'))
const GameDetailPage = lazy(() => import('@/pages/GameDetailPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-mute">
      <Spinner className="h-6 w-6" />
    </div>
  )
}

function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

function PublicOnly() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupPage />

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<FullScreenSpinner />}>
              <Routes>
                <Route element={<PublicOnly />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                <Route element={<RequireAuth />}>
                  <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="collection" element={<CollectionPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="matches" element={<MatchesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="games/:id" element={<GameDetailPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
