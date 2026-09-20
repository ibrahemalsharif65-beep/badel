import { useInfiniteQuery, useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import * as api from '@/lib/api'
import type { SearchParams } from '@/lib/api'

const PAGE = 24

function useUserId() {
  const { user } = useAuth()
  return user?.id
}

// ── Reads ───────────────────────────────────────────────────────────────────
export function useGovernorates() {
  return useQuery({ queryKey: ['governorates'], queryFn: api.fetchGovernorates, staleTime: Infinity })
}

export function useProfile() {
  const uid = useUserId()
  return useQuery({ queryKey: ['profile', uid], queryFn: () => api.fetchProfile(uid!), enabled: !!uid })
}

export function useCollection() {
  const uid = useUserId()
  return useQuery({ queryKey: ['collection', uid], queryFn: () => api.fetchCollection(uid!), enabled: !!uid })
}

export function useWishlist() {
  const uid = useUserId()
  return useQuery({ queryKey: ['wishlist', uid], queryFn: () => api.fetchWishlist(uid!), enabled: !!uid })
}

/** How many other players list each of the given games (drives the wishlist status). */
export function useAvailability(gameIds: string[]) {
  const key = [...gameIds].sort().join(',')
  return useQuery({
    queryKey: ['availability', key],
    queryFn: () => api.fetchAvailability(gameIds),
    enabled: gameIds.length > 0,
    staleTime: 30_000,
  })
}

export function useRecentGames() {
  return useQuery({ queryKey: ['games', 'recent'], queryFn: () => api.fetchRecentGames(12) })
}

export function useGame(id: string | undefined) {
  return useQuery({ queryKey: ['game', id], queryFn: () => api.fetchGame(id!), enabled: !!id })
}

export function useListings(gameId: string | undefined) {
  const uid = useUserId()
  return useQuery({
    queryKey: ['listings', gameId, uid],
    queryFn: () => api.fetchListings(gameId!, uid!),
    enabled: !!gameId && !!uid,
  })
}

export function useSearchGames(params: Omit<SearchParams, 'offset' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['search', params.query, [...params.consoles].sort().join(','), params.swap, params.sale],
    queryFn: ({ pageParam }) => api.searchGames({ ...params, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
    placeholderData: keepPreviousData,
  })
}

// ── Writes ──────────────────────────────────────────────────────────────────
export function useSaveCollectionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.saveCollectionItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useSetAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.setAvailability>[1] }) =>
      api.setAvailability(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useDeleteCollectionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCollectionItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useSaveWishlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.saveWishlistItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useDeleteWishlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteWishlistItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useCreateGame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createGame,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games'] })
      qc.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { userId: string; patch: api.ProfilePatch; avatar?: File | null; previousAvatar?: string | null }) =>
      api.updateProfile(v.userId, v.patch, v.avatar, v.previousAvatar),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}
