// Generates supabase/seed.sql from the compact catalogue below.
//   npm run seed:generate
//
// One entry = one game/edition, expanded into one row per platform (the same
// game on PS4 and PS5 are different physical discs, so different rows).
// Cover art is intentionally NOT seeded: upload licensed artwork to the
// `game-covers` bucket (or source it from a games API) and set games.cover_url.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const P4 = 'ps4', P5 = 'ps5', XO = 'xbox_one', XS = 'xbox_series'
const ALL4 = (y) => [[P4, y], [P5, y], [XO, y], [XS, y]]

// [title, edition, [[platform, releaseYear], …], searchKeywords[]]
const CATALOGUE = [
  // ── Sports & racing ───────────────────────────────────────────────────────
  ['EA Sports FC 25', 'Standard', ALL4(2024), ['fc25', 'fifa', 'football', 'soccer', 'فيفا', 'اف سي']],
  ['EA Sports FC 24', 'Standard', ALL4(2023), ['fc24', 'fifa', 'football', 'soccer', 'فيفا', 'اف سي']],
  ['FIFA 23', 'Standard', ALL4(2022), ['fifa23', 'football', 'soccer', 'فيفا']],
  ['FIFA 22', 'Standard', ALL4(2021), ['fifa22', 'football', 'soccer', 'فيفا']],
  ['eFootball PES 2021', 'Standard', [[P4, 2020], [XO, 2020]], ['pes', 'pes21', 'pro evolution soccer', 'football', 'بيس']],
  ['eFootball PES 2020', 'Standard', [[P4, 2019], [XO, 2019]], ['pes', 'pes20', 'pro evolution soccer', 'football', 'بيس']],
  ['NBA 2K24', 'Standard', ALL4(2023), ['2k24', 'basketball', 'nba', 'ان بي ايه']],
  ['UFC 4', 'Standard', [[P4, 2020], [XO, 2020]], ['ufc', 'mma', 'fighting', 'يو اف سي']],
  ['Gran Turismo 7', 'Standard', [[P4, 2022], [P5, 2022]], ['gt7', 'racing', 'cars', 'جران توريزمو']],
  ['Forza Horizon 5', 'Standard', [[XO, 2021], [XS, 2021]], ['fh5', 'racing', 'cars', 'فورزا']],
  ['Forza Horizon 4', 'Standard', [[XO, 2018]], ['fh4', 'racing', 'cars', 'فورزا']],
  ['Need for Speed Unbound', 'Standard', [[P5, 2022], [XS, 2022]], ['nfs', 'racing', 'cars']],

  // ── Shooters & open world ─────────────────────────────────────────────────
  ['Grand Theft Auto V', 'Standard', [[P4, 2014], [XO, 2014], [P5, 2022], [XS, 2022]], ['gta', 'gta5', 'gta v', 'rockstar', 'جي تي اي', 'جراند ثيفت اوتو', 'جتا']],
  ['Red Dead Redemption 2', 'Standard', [[P4, 2018], [XO, 2018]], ['rdr2', 'red dead', 'rockstar', 'western', 'ريد ديد']],
  ['Call of Duty: Modern Warfare III', 'Standard', ALL4(2023), ['cod', 'mw3', 'shooter', 'كول اوف ديوتي', 'كود']],
  ['Call of Duty: Modern Warfare II', 'Standard', ALL4(2022), ['cod', 'mw2', 'shooter', 'كول اوف ديوتي', 'كود']],
  ['Far Cry 6', 'Standard', ALL4(2021), ['fc6', 'shooter', 'فار كراي']],
  ['Battlefield 2042', 'Standard', ALL4(2021), ['bf2042', 'shooter']],
  ['Borderlands 3', 'Standard', [[P4, 2019], [XO, 2019]], ['shooter', 'looter']],
  ['Cyberpunk 2077', 'Standard', [[P4, 2020], [XO, 2020]], ['cp2077', 'rpg', 'cdpr', 'سايبربانك']],
  ['Hitman 3', 'Standard', ALL4(2021), ['stealth', 'agent 47']],
  ['Watch Dogs: Legion', 'Standard', ALL4(2020), ['hacking', 'london']],

  // ── RPG & action-adventure ────────────────────────────────────────────────
  ['Elden Ring', 'Standard', ALL4(2022), ['souls', 'fromsoftware', 'الدن رينج']],
  ['The Witcher 3: Wild Hunt', 'Game of the Year Edition', [[P4, 2016], [XO, 2016]], ['witcher', 'geralt', 'goty', 'cdpr', 'ويتشر']],
  ['Hogwarts Legacy', 'Standard', ALL4(2023), ['harry potter', 'wizard', 'هوجورتس', 'هاري بوتر']],
  ['The Elder Scrolls V: Skyrim', 'Special Edition', [[P4, 2016], [XO, 2016]], ['skyrim', 'bethesda', 'rpg']],
  ['Fallout 4', 'Standard', [[P4, 2015], [XO, 2015]], ['bethesda', 'rpg']],
  ['Diablo IV', 'Standard', ALL4(2023), ['diablo 4', 'blizzard', 'arpg']],
  ['Dying Light 2 Stay Human', 'Standard', ALL4(2022), ['dl2', 'zombie', 'parkour']],
  ['Final Fantasy XVI', 'Standard', [[P5, 2023]], ['ff16', 'jrpg', 'square enix']],
  ['Final Fantasy VII Rebirth', 'Standard', [[P5, 2024]], ['ff7', 'jrpg', 'square enix']],
  ['Kingdom Hearts III', 'Standard', [[P4, 2019], [XO, 2019]], ['kh3', 'disney', 'square enix']],
  ['Persona 5 Royal', 'Standard', [[P4, 2020]], ['p5r', 'jrpg', 'atlus']],
  ['Star Wars Jedi: Survivor', 'Standard', [[P5, 2023], [XS, 2023]], ['jedi', 'star wars', 'respawn']],
  ["Assassin's Creed Mirage", 'Standard', ALL4(2023), ['ac mirage', 'ubisoft', 'اساسنز كريد']],
  ["Assassin's Creed Valhalla", 'Standard', ALL4(2020), ['ac valhalla', 'vikings', 'ubisoft', 'اساسنز كريد']],
  ["Assassin's Creed Odyssey", 'Standard', [[P4, 2018], [XO, 2018]], ['ac odyssey', 'greece', 'ubisoft', 'اساسنز كريد']],

  // ── Horror & fighting ─────────────────────────────────────────────────────
  ['Resident Evil 4 Remake', 'Standard', [[P4, 2023], [P5, 2023], [XS, 2023]], ['re4', 'resident evil 4', 'capcom', 'ريزيدنت ايفل']],
  ['Resident Evil Village', 'Standard', ALL4(2021), ['re8', 'capcom', 'ريزيدنت ايفل']],
  ['Mortal Kombat 1', 'Standard', [[P5, 2023], [XS, 2023]], ['mk1', 'fighting', 'مورتال كومبات']],
  ['Mortal Kombat 11', 'Standard', [[P4, 2019], [XO, 2019]], ['mk11', 'fighting', 'مورتال كومبات']],
  ['Mortal Kombat 11', 'Ultimate', ALL4(2020), ['mk11', 'fighting', 'مورتال كومبات']],
  ['Tekken 8', 'Standard', [[P5, 2024], [XS, 2024]], ['fighting', 'bandai namco', 'تيكن']],
  ['Tekken 7', 'Standard', [[P4, 2017], [XO, 2017]], ['fighting', 'bandai namco', 'تيكن']],
  ['Street Fighter 6', 'Standard', [[P4, 2023], [P5, 2023], [XS, 2023]], ['sf6', 'fighting', 'capcom']],
  ['Dark Souls III', 'Standard', [[P4, 2016], [XO, 2016]], ['ds3', 'souls', 'fromsoftware']],
  ['Sekiro: Shadows Die Twice', 'Standard', [[P4, 2019], [XO, 2019]], ['sekiro', 'souls', 'fromsoftware']],
  ['Monster Hunter: World', 'Standard', [[P4, 2018], [XO, 2018]], ['mhw', 'capcom']],
  ['Devil May Cry 5', 'Standard', [[P4, 2019], [XO, 2019]], ['dmc5', 'capcom']],
  ['Dragon Ball Z: Kakarot', 'Standard', [[P4, 2020], [XO, 2020]], ['dbz', 'dragon ball', 'anime', 'دراغون بول']],

  // ── PlayStation first-party ───────────────────────────────────────────────
  ['God of War', 'Standard', [[P4, 2018]], ['gow', 'kratos', 'santa monica', 'جاد اوف وور']],
  ['God of War Ragnarök', 'Standard', [[P4, 2022], [P5, 2022]], ['gow', 'ragnarok', 'kratos', 'جاد اوف وور']],
  ['The Last of Us Part II', 'Standard', [[P4, 2020]], ['tlou2', 'tlou', 'ellie', 'naughty dog', 'ذا لاست اوف اس']],
  ['The Last of Us Part I', 'Standard', [[P5, 2022]], ['tlou', 'joel', 'naughty dog', 'ذا لاست اوف اس']],
  ['Uncharted 4: A Thief\'s End', 'Standard', [[P4, 2016]], ['uncharted', 'drake', 'naughty dog', 'انشارتد']],
  ['Uncharted: Legacy of Thieves Collection', 'Standard', [[P5, 2022]], ['uncharted', 'drake', 'naughty dog', 'انشارتد']],
  ["Marvel's Spider-Man", 'Standard', [[P4, 2018]], ['spiderman', 'spider man', 'insomniac', 'marvel', 'سبايدر مان', 'سبايدرمان']],
  ["Marvel's Spider-Man", 'Game of the Year Edition', [[P4, 2019]], ['spiderman', 'spider man', 'goty', 'insomniac', 'marvel', 'سبايدر مان', 'سبايدرمان']],
  ["Marvel's Spider-Man: Miles Morales", 'Standard', [[P4, 2020], [P5, 2020]], ['spiderman', 'miles', 'insomniac', 'marvel', 'سبايدر مان']],
  ["Marvel's Spider-Man 2", 'Standard', [[P5, 2023]], ['spiderman', 'insomniac', 'marvel', 'سبايدر مان']],
  ['Horizon Zero Dawn', 'Complete Edition', [[P4, 2017]], ['hzd', 'aloy', 'guerrilla', 'هورايزن']],
  ['Horizon Forbidden West', 'Standard', [[P4, 2022], [P5, 2022]], ['hfw', 'aloy', 'guerrilla', 'هورايزن']],
  ['Ghost of Tsushima', 'Standard', [[P4, 2020]], ['got', 'samurai', 'sucker punch']],
  ["Ghost of Tsushima", "Director's Cut", [[P4, 2021], [P5, 2021]], ['got', 'samurai', 'sucker punch']],
  ['Death Stranding', 'Standard', [[P4, 2019]], ['kojima', 'sam']],
  ['Death Stranding', "Director's Cut", [[P5, 2021]], ['kojima', 'sam']],
  ['Days Gone', 'Standard', [[P4, 2019]], ['zombie', 'bend studio']],
  ['Bloodborne', 'Standard', [[P4, 2015]], ['souls', 'fromsoftware']],
  ["Demon's Souls", 'Standard', [[P5, 2020]], ['souls', 'bluepoint']],
  ['Returnal', 'Standard', [[P5, 2021]], ['roguelike', 'housemarque']],
  ['Ratchet & Clank: Rift Apart', 'Standard', [[P5, 2021]], ['ratchet', 'insomniac']],
  ['Sackboy: A Big Adventure', 'Standard', [[P4, 2020], [P5, 2020]], ['platformer', 'little big planet', 'co-op']],
  ['Astro Bot', 'Standard', [[P5, 2024]], ['platformer', 'team asobi']],
  ['Crash Bandicoot N. Sane Trilogy', 'Standard', [[P4, 2017], [XO, 2018]], ['crash', 'platformer', 'كراش']],

  // ── Xbox first-party & family ─────────────────────────────────────────────
  ['Halo Infinite', 'Standard', [[XO, 2021], [XS, 2021]], ['halo', 'master chief', '343', 'هيلو']],
  ['Halo: The Master Chief Collection', 'Standard', [[XO, 2014]], ['halo', 'master chief', '343', 'هيلو']],
  ['Gears 5', 'Standard', [[XO, 2019]], ['gears of war', 'coalition']],
  ['Sea of Thieves', 'Standard', [[XO, 2018]], ['pirates', 'rare', 'co-op']],
  ['It Takes Two', 'Standard', ALL4(2021), ['co-op', 'ea', 'hazelight']],
  ['Just Dance 2024 Edition', 'Standard', [[P5, 2023], [XS, 2023]], ['just dance', 'dance', 'family', 'جاست دانس']],
]

const esc = (s) => s.replace(/'/g, "''")
const arr = (a) => `array[${a.map((k) => `'${esc(k)}'`).join(', ')}]::text[]`

const rows = []
for (const [title, edition, platforms, keywords] of CATALOGUE) {
  for (const [platform, year] of platforms) {
    rows.push(`  ('${esc(title)}', '${platform}', '${esc(edition)}', ${year}, ${arr(keywords)}, true)`)
  }
}

const sql = `-- =============================================================================
-- Badel — starter game catalogue (GENERATED by scripts/generate-seed.mjs — edit the
-- script, not this file).  ${rows.length} rows across PS4 / PS5 / Xbox One / Xbox Series X|S.
--
-- Safe to re-run: the unique index on (dedupe_key, platform, edition_key)
-- makes every insert a no-op if the game already exists.
-- Cover images are not included — set games.cover_url after uploading artwork.
-- =============================================================================

insert into public.games (title, platform, edition, release_year, search_keywords, is_verified)
values
${rows.join(',\n')}
on conflict do nothing;
`

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed.sql')
writeFileSync(out, sql)
console.log(`Wrote ${rows.length} rows from ${CATALOGUE.length} catalogue entries → ${out}`)
