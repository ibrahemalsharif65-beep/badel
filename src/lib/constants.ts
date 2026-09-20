export type ConsoleType = 'ps4' | 'ps5' | 'xbox_one' | 'xbox_series'
export type ConditionType = 'new_sealed' | 'like_new' | 'good' | 'fair' | 'poor'
export type FamilyId = 'playstation' | 'xbox'

export const CONSOLES: Record<ConsoleType, { label: string; family: FamilyId; color: string }> = {
  ps4: { label: 'PS4', family: 'playstation', color: '#5B96FF' },
  ps5: { label: 'PS5', family: 'playstation', color: '#7FB0FF' },
  xbox_one: { label: 'Xbox One', family: 'xbox', color: '#63CC63' },
  xbox_series: { label: 'Xbox Series X|S', family: 'xbox', color: '#8BE08B' },
}
export const CONSOLE_ORDER: ConsoleType[] = ['ps5', 'ps4', 'xbox_series', 'xbox_one']

/** "Platform" filter = console family; "Console" filter = specific console. */
export const FAMILIES: { id: FamilyId; label: string; consoles: ConsoleType[] }[] = [
  { id: 'playstation', label: 'PlayStation', consoles: ['ps5', 'ps4'] },
  { id: 'xbox', label: 'Xbox', consoles: ['xbox_series', 'xbox_one'] },
]

export const CONDITIONS: { value: ConditionType; label: string; hint: string }[] = [
  { value: 'new_sealed', label: 'New, sealed', hint: 'Still in factory wrap' },
  { value: 'like_new', label: 'Like new', hint: 'Flawless disc, case in great shape' },
  { value: 'good', label: 'Good', hint: 'Light wear, plays perfectly' },
  { value: 'fair', label: 'Fair', hint: 'Visible scratches or scuffs, still plays' },
  { value: 'poor', label: 'Poor', hint: 'Heavy wear, may skip' },
]
export const conditionLabel = (c: ConditionType) => CONDITIONS.find((x) => x.value === c)?.label ?? c

export const MAX_PHOTOS = 6
export const BUCKETS = { avatars: 'avatars', collection: 'collection-photos', covers: 'game-covers' } as const
