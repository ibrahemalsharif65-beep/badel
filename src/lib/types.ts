import type { ConditionType, ConsoleType } from './constants'

export interface Governorate {
  id: number
  name_en: string
  name_ar: string
}

export interface Profile {
  id: string
  username: string
  avatar_path: string | null
  governorate_id: number | null
  city: string | null
  bio: string | null
  created_at: string
  governorate: Governorate | null
}

export interface Game {
  id: string
  title: string
  platform: ConsoleType
  edition: string
  release_year: number | null
  cover_url: string | null
  search_keywords: string[]
}

export interface CollectionItem {
  id: string
  user_id: string
  game_id: string
  condition: ConditionType
  notes: string | null
  photo_paths: string[]
  available_for_swap: boolean
  available_for_sale: boolean
  price_egp: number | null
  created_at: string
  game: Game
}

export interface WishlistItem {
  id: string
  user_id: string
  game_id: string
  preferred_condition: ConditionType | null
  notes: string | null
  created_at: string
  game: Game
}

export interface SearchResult extends Game {
  swap_count: number
  sale_count: number
  total_count: number
}

export interface Listing {
  id: string
  user_id: string
  condition: ConditionType
  photo_paths: string[]
  available_for_swap: boolean
  available_for_sale: boolean
  price_egp: number | null
  notes: string | null
  owner: {
    username: string
    avatar_path: string | null
    city: string | null
    governorate: { name_en: string } | null
  } | null
}

/** Keyed by game id. Games nobody lists are simply absent. */
export type Availability = Record<string, { swap: number; sale: number; players: number }>
