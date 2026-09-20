import { supabase } from './supabase'
import { BUCKETS, type ConditionType, type ConsoleType } from './constants'
import { removeImages, uploadImage, publicUrl } from './images'
import type {
  Availability,
  CollectionItem,
  Game,
  Governorate,
  Listing,
  Profile,
  SearchResult,
  WishlistItem,
} from './types'

/** Unwrap a PostgREST response or throw. */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error
  return res.data as T
}

// ── Reference data ──────────────────────────────────────────────────────────
export async function fetchGovernorates(): Promise<Governorate[]> {
  return unwrap(await supabase.from('governorates').select('id, name_en, name_ar').order('name_en'))
}

// ── Profile ─────────────────────────────────────────────────────────────────
export async function fetchProfile(userId: string): Promise<Profile> {
  const res = await supabase
    .from('profiles')
    .select('*, governorate:governorates(id, name_en, name_ar)')
    .eq('id', userId)
    .single()
  return unwrap(res) as unknown as Profile
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const res = await supabase.rpc('username_available', { p_username: username })
  return unwrap(res) as boolean
}

export interface ProfilePatch {
  username: string
  governorate_id: number | null
  city: string | null
  bio: string | null
}

export async function updateProfile(userId: string, patch: ProfilePatch, avatarFile?: File | null, previousAvatar?: string | null) {
  let avatar_path: string | undefined
  if (avatarFile) avatar_path = await uploadImage(BUCKETS.avatars, userId, avatarFile, { maxEdge: 512 })

  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, ...(avatar_path ? { avatar_path } : {}) })
    .eq('id', userId)

  if (error) {
    if (avatar_path) await removeImages(BUCKETS.avatars, [avatar_path])
    if (error.code === '23505') throw new Error('That username is already taken.')
    throw error
  }
  if (avatar_path && previousAvatar) await removeImages(BUCKETS.avatars, [previousAvatar])
}

// ── Game catalogue ──────────────────────────────────────────────────────────
export async function fetchRecentGames(limit = 12): Promise<Game[]> {
  const res = await supabase
    .from('games')
    .select('id, title, platform, edition, release_year, cover_url, search_keywords')
    .order('created_at', { ascending: false })
    .order('title')
    .limit(limit)
  return unwrap(res) as Game[]
}

export async function fetchGame(id: string): Promise<Game> {
  const res = await supabase
    .from('games')
    .select('id, title, platform, edition, release_year, cover_url, search_keywords')
    .eq('id', id)
    .single()
  return unwrap(res) as Game
}

export interface SearchParams {
  query: string
  consoles: ConsoleType[]
  swap: boolean
  sale: boolean
  limit?: number
  offset?: number
}

export async function searchGames(p: SearchParams): Promise<SearchResult[]> {
  const res = await supabase.rpc('search_games', {
    p_query: p.query.trim() || null,
    p_consoles: p.consoles.length ? p.consoles : null,
    p_swap: p.swap,
    p_sale: p.sale,
    p_limit: p.limit ?? 24,
    p_offset: p.offset ?? 0,
  })
  return unwrap(res) as SearchResult[]
}

export interface NewGameInput {
  title: string
  platform: ConsoleType
  edition: string
  releaseYear: number | null
  coverFile: File | null
  userId: string
}

/** Create-or-fetch: returns the existing record if the game/platform/edition is already in the catalogue. */
export async function createGame(input: NewGameInput): Promise<Game> {
  let cover_url: string | null = null
  if (input.coverFile) {
    const path = await uploadImage(BUCKETS.covers, input.userId, input.coverFile, { maxEdge: 900 })
    cover_url = publicUrl(BUCKETS.covers, path)
  }
  const res = await supabase.rpc('upsert_game', {
    p_title: input.title,
    p_platform: input.platform,
    p_edition: input.edition || 'Standard',
    p_release_year: input.releaseYear,
    p_cover_url: cover_url,
    p_keywords: [],
  })
  return unwrap(res) as unknown as Game
}

export async function fetchAvailability(gameIds: string[]): Promise<Availability> {
  if (!gameIds.length) return {}
  const res = await supabase.rpc('game_availability', { p_game_ids: gameIds })
  const rows = unwrap(res) as { game_id: string; swap_count: number; sale_count: number; player_count: number }[]
  return Object.fromEntries(rows.map((r) => [r.game_id, { swap: r.swap_count, sale: r.sale_count, players: r.player_count }]))
}

export async function fetchListings(gameId: string, currentUserId: string): Promise<Listing[]> {
  const res = await supabase
    .from('collection_items')
    .select(
      'id, user_id, condition, photo_paths, available_for_swap, available_for_sale, price_egp, notes, owner:profiles!collection_items_user_id_fkey(username, avatar_path, city, governorate:governorates(name_en))',
    )
    .eq('game_id', gameId)
    .neq('user_id', currentUserId)
    .or('available_for_swap.eq.true,available_for_sale.eq.true')
    .order('created_at', { ascending: false })
  return unwrap(res) as unknown as Listing[]
}

// ── Collection ──────────────────────────────────────────────────────────────
const GAME_COLS = 'id, title, platform, edition, release_year, cover_url, search_keywords'

export async function fetchCollection(userId: string): Promise<CollectionItem[]> {
  const res = await supabase
    .from('collection_items')
    .select(`*, game:games(${GAME_COLS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return unwrap(res) as unknown as CollectionItem[]
}

export interface CollectionInput {
  id?: string
  userId: string
  gameId: string
  condition: ConditionType
  notes: string | null
  availableForSwap: boolean
  availableForSale: boolean
  priceEgp: number | null
  keepPaths: string[]
  newFiles: File[]
  originalPaths?: string[]
}

export async function saveCollectionItem(input: CollectionInput) {
  const uploaded: string[] = []
  try {
    for (const file of input.newFiles) {
      uploaded.push(await uploadImage(BUCKETS.collection, input.userId, file))
    }
  } catch (e) {
    await removeImages(BUCKETS.collection, uploaded)
    throw e
  }

  const photo_paths = [...input.keepPaths, ...uploaded]
  const row = {
    game_id: input.gameId,
    condition: input.condition,
    notes: input.notes,
    photo_paths,
    available_for_swap: input.availableForSwap,
    available_for_sale: input.availableForSale,
    price_egp: input.availableForSale ? input.priceEgp : null,
  }

  const res = input.id
    ? await supabase.from('collection_items').update(row).eq('id', input.id)
    : await supabase.from('collection_items').insert({ ...row, user_id: input.userId })

  if (res.error) {
    await removeImages(BUCKETS.collection, uploaded)
    throw res.error
  }

  if (input.id && input.originalPaths) {
    await removeImages(
      BUCKETS.collection,
      input.originalPaths.filter((p) => !photo_paths.includes(p)),
    )
  }
}

export async function setAvailability(id: string, patch: { available_for_swap?: boolean; available_for_sale?: boolean; price_egp?: number | null }) {
  const { error } = await supabase.from('collection_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCollectionItem(item: Pick<CollectionItem, 'id' | 'photo_paths'>) {
  const { error } = await supabase.from('collection_items').delete().eq('id', item.id)
  if (error) throw error
  await removeImages(BUCKETS.collection, item.photo_paths)
}

// ── Wishlist ────────────────────────────────────────────────────────────────
export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const res = await supabase
    .from('wishlist_items')
    .select(`*, game:games(${GAME_COLS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return unwrap(res) as unknown as WishlistItem[]
}

export interface WishlistInput {
  id?: string
  userId: string
  gameId: string
  preferredCondition: ConditionType | null
  notes: string | null
}

export async function saveWishlistItem(input: WishlistInput) {
  const row = { preferred_condition: input.preferredCondition, notes: input.notes }
  if (input.id) {
    const { error } = await supabase.from('wishlist_items').update(row).eq('id', input.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('wishlist_items').insert({ ...row, user_id: input.userId, game_id: input.gameId })
  if (error) {
    if (error.code === '23505') throw new Error('This game is already on your wishlist.')
    throw error
  }
}

export async function deleteWishlistItem(id: string) {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id)
  if (error) throw error
}
