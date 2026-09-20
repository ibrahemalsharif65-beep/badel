import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CollectionSheet, type CollectionSheetState } from '@/components/CollectionSheet'
import { WishlistSheet, type WishlistSheetState } from '@/components/WishlistSheet'
import { ProfileSheet } from '@/components/ProfileSheet'

interface Sheets {
  openCollection: (s: CollectionSheetState) => void
  openWishlist: (s: WishlistSheetState) => void
  openProfile: () => void
}
const SheetsContext = createContext<Sheets | null>(null)

/** One place that owns the add/edit sheets, so any screen can open them. */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [collection, setCollection] = useState<CollectionSheetState | null>(null)
  const [wishlist, setWishlist] = useState<WishlistSheetState | null>(null)
  const [profile, setProfile] = useState(false)

  const openCollection = useCallback((s: CollectionSheetState) => setCollection(s), [])
  const openWishlist = useCallback((s: WishlistSheetState) => setWishlist(s), [])
  const openProfile = useCallback(() => setProfile(true), [])
  const value = useMemo(() => ({ openCollection, openWishlist, openProfile }), [openCollection, openWishlist, openProfile])

  return (
    <SheetsContext.Provider value={value}>
      {children}
      <CollectionSheet state={collection} onClose={() => setCollection(null)} />
      <WishlistSheet state={wishlist} onClose={() => setWishlist(null)} />
      <ProfileSheet open={profile} onClose={() => setProfile(false)} />
    </SheetsContext.Provider>
  )
}

export function useSheets() {
  const ctx = useContext(SheetsContext)
  if (!ctx) throw new Error('useSheets must be used inside <SheetsProvider>')
  return ctx
}
