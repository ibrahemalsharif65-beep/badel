# UI checks against an in-memory MOCK of the Supabase API (no real backend needed).
# Run:  VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=x npm run dev   (in another shell)
#       mkdir -p /tmp/shots && pip install playwright && python3 tests/e2e/mock_e2e.py
import json, re, sys, time, uuid
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
SB = "https://mock.supabase.co"
UID = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"

GOVS = [(1, "Cairo", "القاهرة"), (2, "Giza", "الجيزة"), (3, "Alexandria", "الإسكندرية")]
def gov(i): 
    g = next(x for x in GOVS if x[0] == i); return {"id": g[0], "name_en": g[1], "name_ar": g[2]}

def G(title, plat, ed="Standard", year=2022, cover=None):
    return {"id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{title}{plat}{ed}")), "title": title, "platform": plat,
            "edition": ed, "release_year": year, "cover_url": cover, "search_keywords": []}

GAMES = [
    G("God of War Ragnarök", "ps5"), G("God of War Ragnarök", "ps4"), G("EA Sports FC 25", "ps5", year=2024),
    G("EA Sports FC 25", "xbox_series", year=2024), G("Elden Ring", "ps5"), G("Elden Ring", "xbox_series"),
    G("Marvel's Spider-Man 2", "ps5", year=2023), G("Marvel's Spider-Man", "ps4", "Game of the Year Edition", 2019),
    G("Grand Theft Auto V", "ps4", year=2014), G("Halo Infinite", "xbox_series", year=2021),
    G("Forza Horizon 5", "xbox_series", year=2021), G("The Last of Us Part II", "ps4", year=2020),
    G("Red Dead Redemption 2", "ps4", year=2018), G("Mortal Kombat 1", "ps5", year=2023),
    G("Gran Turismo 7", "ps5"), G("Hogwarts Legacy", "ps5", year=2023),
]
gid = lambda t, p: next(g["id"] for g in GAMES if g["title"] == t and g["platform"] == p)

store = {
    "profile": {"id": UID, "username": "Karim_Gamer", "avatar_path": None, "governorate_id": 1, "city": "Nasr City",
                "bio": "PS5 collector from Cairo. Always hunting for Souls games.", "created_at": "2026-08-14T10:00:00Z"},
    "collection": [], "wishlist": [],
    "others": [  # other players' listings
        {"id": "o1", "user_id": OTHER, "game_id": gid("Elden Ring", "ps5"), "condition": "like_new", "photo_paths": [],
         "available_for_swap": True, "available_for_sale": True, "price_egp": 1100, "notes": "Includes original case", "created_at": "2026-09-01T00:00:00Z"},
        {"id": "o2", "user_id": OTHER, "game_id": gid("Halo Infinite", "xbox_series"), "condition": "good", "photo_paths": [],
         "available_for_swap": True, "available_for_sale": False, "price_egp": None, "notes": None, "created_at": "2026-09-02T00:00:00Z"},
    ],
    "log": [],
}
def add_mine(title, plat, cond, swap, sale, price=None):
    store["collection"].append({"id": str(uuid.uuid4()), "user_id": UID, "game_id": gid(title, plat), "condition": cond,
        "notes": None, "photo_paths": [], "available_for_swap": swap, "available_for_sale": sale, "price_egp": price,
        "created_at": "2026-09-10T00:00:00Z"})
add_mine("God of War Ragnarök", "ps5", "like_new", True, False)
add_mine("Marvel's Spider-Man 2", "ps5", "good", True, True, 1300)
add_mine("Grand Theft Auto V", "ps4", "fair", False, True, 350)
add_mine("Forza Horizon 5", "xbox_series", "new_sealed", False, False)
add_mine("Mortal Kombat 1", "ps5", "good", True, False)
store["wishlist"].append({"id": "w1", "user_id": UID, "game_id": gid("Elden Ring", "ps5"), "preferred_condition": "good", "notes": "Cairo pickup", "created_at": "2026-09-11T00:00:00Z"})
store["wishlist"].append({"id": "w2", "user_id": UID, "game_id": gid("The Last of Us Part II", "ps4"), "preferred_condition": None, "notes": None, "created_at": "2026-09-11T00:00:00Z"})

def game(i): return next(g for g in GAMES if g["id"] == i)
def with_game(rows): return [{**r, "game": game(r["game_id"])} for r in rows]

def search(body):
    q = (body.get("p_query") or "").lower().split()
    cons = body.get("p_consoles") or []
    res = []
    for g in GAMES:
        text = f'{g["title"]} {g["edition"]} {g["platform"]}'.lower().replace("xbox_series", "xbox series xsx").replace("_", " ")
        if any(w not in text for w in q): continue
        if cons and g["platform"] not in cons: continue
        lst = [o for o in store["others"] if o["game_id"] == g["id"]]
        sw = sum(1 for o in lst if o["available_for_swap"]); sa = sum(1 for o in lst if o["available_for_sale"])
        if body.get("p_swap") and not sw: continue
        if body.get("p_sale") and not sa: continue
        res.append({**g, "swap_count": sw, "sale_count": sa})
    for r in res: r["total_count"] = len(res)
    off, lim = body.get("p_offset", 0), body.get("p_limit", 24)
    return res[off:off + lim]

def handle(route, request):
    url = urlparse(request.url); path = url.path; qs = parse_qs(url.query); m = request.method
    body = None
    if request.post_data:
        try: body = json.loads(request.post_data)
        except Exception: body = None
    single = "vnd.pgrst.object" in (request.headers.get("accept") or "")
    cors = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
    def ok(data, status=200):
        route.fulfill(status=status, headers={**cors, "content-type": "application/json"}, body=json.dumps(data))
    if m == "OPTIONS": return route.fulfill(status=204, headers=cors)

    if path.startswith("/storage/v1/object/public/"):
        hue = abs(hash(path)) % 360
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl({hue},40%,35%)"/></svg>'
        return route.fulfill(status=200, headers={**cors, "content-type": "image/svg+xml"}, body=svg)
    if path.startswith("/storage/v1/object/"):
        store["log"].append(("upload", path)); return ok({"Key": path})

    if path == "/rest/v1/governorates": return ok([{"id": a, "name_en": b, "name_ar": c} for a, b, c in GOVS])
    if path == "/rest/v1/profiles":
        if m == "PATCH":
            store["log"].append(("profile_update", body))
            for k in ("username", "governorate_id", "city", "bio"):
                if k in body: store["profile"][k] = body[k]
            return ok(None, 204)
        p = {**store["profile"], "governorate": gov(store["profile"]["governorate_id"]) if store["profile"]["governorate_id"] else None}
        return ok(p if single else [p])
    if path == "/rest/v1/rpc/username_available":
        return ok(body["p_username"].lower() not in ("taken_name", "karim_gamer"))
    if path == "/rest/v1/rpc/search_games": return ok(search(body))
    if path == "/rest/v1/rpc/game_availability":
        out = []
        for i in body["p_game_ids"]:
            lst = [o for o in store["others"] if o["game_id"] == i]
            if lst: out.append({"game_id": i, "swap_count": sum(o["available_for_swap"] for o in lst), "sale_count": sum(o["available_for_sale"] for o in lst), "player_count": len({o["user_id"] for o in lst})})
        return ok(out)
    if path == "/rest/v1/rpc/upsert_game":
        ex = next((g for g in GAMES if g["title"].lower() == body["p_title"].lower() and g["platform"] == body["p_platform"] and g["edition"].lower() == body["p_edition"].lower()), None)
        if not ex:
            ex = G(body["p_title"], body["p_platform"], body["p_edition"], body["p_release_year"], body["p_cover_url"]); GAMES.append(ex)
        return ok(ex)
    if path == "/rest/v1/games":
        idf = qs.get("id", [""])[0]
        if idf.startswith("eq."): 
            g = game(idf[3:]); return ok(g if single else [g])
        return ok(GAMES[:12])
    if path == "/rest/v1/collection_items":
        sel = qs.get("select", [""])[0]
        if m == "GET":
            if "owner:profiles" in sel:
                gidv = qs["game_id"][0][3:]
                rows = [{**o, "owner": {"username": "Mostafa_88", "avatar_path": None, "city": "Maadi", "governorate": {"name_en": "Cairo"}}} for o in store["others"] if o["game_id"] == gidv]
                return ok(rows)
            return ok(with_game(sorted(store["collection"], key=lambda r: r["created_at"], reverse=True)))
        if m == "POST":
            store["log"].append(("collection_insert", body))
            store["collection"].insert(0, {"id": str(uuid.uuid4()), "created_at": "2026-09-20T00:00:00Z", **body}); return ok(None, 201)
        if m == "PATCH":
            iid = qs["id"][0][3:]; store["log"].append(("collection_update", body))
            for r in store["collection"]:
                if r["id"] == iid: r.update(body)
            return ok(None, 204)
        if m == "DELETE":
            iid = qs["id"][0][3:]; store["log"].append(("collection_delete", iid))
            store["collection"] = [r for r in store["collection"] if r["id"] != iid]; return ok(None, 204)
    if path == "/rest/v1/wishlist_items":
        if m == "GET": return ok(with_game(store["wishlist"]))
        if m == "POST":
            store["log"].append(("wishlist_insert", body)); store["wishlist"].insert(0, {"id": str(uuid.uuid4()), "created_at": "2026-09-20T00:00:00Z", **body}); return ok(None, 201)
        if m == "PATCH":
            iid = qs["id"][0][3:]
            for r in store["wishlist"]:
                if r["id"] == iid: r.update(body)
            return ok(None, 204)
        if m == "DELETE":
            iid = qs["id"][0][3:]; store["wishlist"] = [r for r in store["wishlist"] if r["id"] != iid]; return ok(None, 204)
    print("UNHANDLED", m, request.url); return ok([])

def fake_jwt():
    import base64
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
    return f'{b({"alg":"HS256"})}.{b({"sub":UID,"role":"authenticated","exp":4102444800})}.sig'

SESSION = {"access_token": fake_jwt(), "refresh_token": "r", "expires_in": 3600, "expires_at": 4102444800, "token_type": "bearer",
           "user": {"id": UID, "aud": "authenticated", "role": "authenticated", "email": "karim@test.eg", "app_metadata": {}, "user_metadata": {"username": "Karim_Gamer"}, "created_at": "2026-08-14T10:00:00Z"}}

results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra else ""))

def new_ctx(p, w, h, authed=True, mobile=False):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    ctx.route(re.compile(r"https://mock\.supabase\.co/.*"), handle)
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r, q: r.abort())
    if authed:
        ctx.add_init_script(f"localStorage.setItem('sb-mock-auth-token', {json.dumps(json.dumps(SESSION))})")
    return b, ctx

errors = []
with sync_playwright() as p:
    # ───────── Mobile, authenticated ─────────
    b, ctx = new_ctx(p, 390, 844, mobile=True)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text and "net::ERR_FAILED" not in m.text else None)

    page.goto(BASE); page.wait_for_selector("text=Swap games. Play more.")
    page.wait_for_selector("text=My collection"); page.wait_for_timeout(600)
    page.screenshot(path="/tmp/shots/m_home.png")
    check("Home: headline + search placeholder", page.get_by_placeholder("Search games...").is_visible())
    check("Home: bottom nav has 5 tabs", page.locator("nav[aria-label=Main] a").count() >= 5)
    check("Home: have/want counts (5 / 2)", page.locator("text=games you have").locator("xpath=preceding-sibling::p").inner_text() == "5" and page.locator("text=games you want").locator("xpath=preceding-sibling::p").inner_text() == "2")
    check("Home: sections present", all(page.get_by_role("heading", name=n).is_visible() for n in ["My collection", "Wishlist", "Recently added games"]))

    page.get_by_role("link", name="Collection").last.click(); page.wait_for_selector("text=5 games on your shelf"); page.wait_for_timeout(400)
    page.screenshot(path="/tmp/shots/m_collection.png")
    check("Collection: 5 cards", page.locator("main .group").count() == 5)
    check("Collection: shows Swap + Sale pills and price", page.locator("text=EGP 1,300").is_visible() and page.locator("text=Not listed").count() >= 1)
    page.get_by_role("button", name="For sale").click()
    check("Collection: 'For sale' filter → 2", page.locator("main .group").count() == 2)
    page.get_by_role("button", name="All").click()

    # Add a game via the FAB
    page.get_by_role("button", name="Add game").first.click(); page.wait_for_selector("text=Which game do you have?"); page.wait_for_timeout(500)
    page.screenshot(path="/tmp/shots/m_picker.png")
    page.get_by_placeholder("Search games...").last.fill("elden"); page.wait_for_timeout(900)
    check("Picker: search 'elden' → 2 results", page.locator("[role=dialog] ul li button").count() == 2)
    page.locator("[role=dialog] ul li button").first.click(); page.wait_for_selector("text=Add to collection"); page.wait_for_timeout(300)
    page.screenshot(path="/tmp/shots/m_add_form.png")
    # Turn on sale without price → validation
    page.get_by_role("switch", name=re.compile("For sale")).click()
    page.get_by_role("button", name="Add to collection").click(); page.wait_for_timeout(200)
    check("Add form: sale without price blocked", page.locator("text=Enter your asking price").is_visible())
    page.get_by_label("Asking price").fill("950")
    page.get_by_role("radio", name="Like new").click()
    page.screenshot(path="/tmp/shots/m_add_form_sale.png")
    page.get_by_role("button", name="Add to collection").click(); page.wait_for_selector("text=6 games on your shelf")
    ins = [x for x in store["log"] if x[0] == "collection_insert"]
    check("Add: insert payload correct", ins and ins[-1][1]["condition"] == "like_new" and ins[-1][1]["available_for_sale"] is True and ins[-1][1]["price_egp"] == 950 and ins[-1][1]["user_id"] == UID, str(ins[-1][1] if ins else None))
    check("Add: list refreshed to 6", page.locator("main .group").count() == 6)

    # Edit: change availability
    page.locator("main .group").first.click(); page.wait_for_selector("text=Edit game"); page.wait_for_timeout(250)
    page.screenshot(path="/tmp/shots/m_edit.png")
    page.get_by_role("switch", name=re.compile("For sale")).click()  # turn off sale
    page.get_by_role("button", name="Save changes").click(); page.wait_for_selector("text=Changes saved")
    upd = [x for x in store["log"] if x[0] == "collection_update"]
    check("Edit: sale switched off clears price", upd and upd[-1][1]["available_for_sale"] is False and upd[-1][1]["price_egp"] is None, str(upd[-1][1] if upd else None))

    # Delete with confirmation
    page.locator("main .group").first.click(); page.wait_for_selector("text=Edit game")
    page.get_by_role("button", name="Delete from collection").click()
    check("Delete: asks for confirmation", page.locator("text=from your collection?").is_visible())
    page.get_by_role("button", name="Yes, remove").click(); page.wait_for_selector("text=5 games on your shelf")
    check("Delete: row removed", any(x[0] == "collection_delete" for x in store["log"]))

    # Wishlist
    page.get_by_role("link", name="Wishlist").last.click(); page.wait_for_selector("text=2 games you want"); page.wait_for_timeout(500)
    page.screenshot(path="/tmp/shots/m_wishlist.png")
    check("Wishlist: 'Waiting for a match' shown for game nobody has", page.locator("text=Waiting for a match").count() == 1)
    check("Wishlist: availability shown for game others have", page.locator("text=1 player has this").is_visible())
    page.get_by_role("button", name="Add game to wishlist").click(); page.wait_for_selector("text=Which game do you want?")
    page.get_by_placeholder("Search games...").last.fill("elden"); page.wait_for_timeout(800)
    check("Wishlist picker: already-wishlisted game is disabled", page.locator("[role=dialog] ul li button[disabled]").count() == 1)
    page.get_by_placeholder("Search games...").last.fill("hogwarts"); page.wait_for_timeout(800)
    page.locator("[role=dialog] ul li button").first.click(); page.wait_for_selector("text=Add to wishlist")
    page.locator("#pref").select_option("like_new")
    page.screenshot(path="/tmp/shots/m_wish_form.png")
    page.get_by_role("button", name="Add to wishlist").click(); page.wait_for_selector("text=3 games you want")
    wi = [x for x in store["log"] if x[0] == "wishlist_insert"]
    check("Wishlist: insert payload", wi and wi[-1][1]["preferred_condition"] == "like_new" and wi[-1][1]["user_id"] == UID)

    # Search
    page.goto(BASE + "/search"); page.wait_for_selector("text=games"); page.wait_for_timeout(600)
    page.screenshot(path="/tmp/shots/m_search.png")
    page.get_by_role("button", name="Xbox", exact=True).click(); page.wait_for_timeout(700)
    check("Search: 'Xbox' family filter selects both Xbox consoles", page.locator("[aria-label=Platform] [aria-pressed=true]").count() == 3, "Xbox + 2 consoles")
    check("Search: only Xbox games", page.locator("main .group").count() == 4, str(page.locator("main .group").count()))
    page.get_by_role("button", name="Open to swap").click(); page.wait_for_timeout(700)
    check("Search: swap filter → Halo only", page.locator("main .group").count() == 1 and page.locator("main .group p.line-clamp-2").first.inner_text().startswith("Halo"))
    page.get_by_role("button", name="Clear filters").click(); page.wait_for_timeout(300)
    page.get_by_placeholder("Search games...").fill("zzzz"); page.wait_for_timeout(900)
    check("Search: empty state", page.locator("text=No games found").is_visible())
    page.get_by_placeholder("Search games...").fill("elden ps5"); page.wait_for_timeout(900)
    check("Search: URL synced", "q=elden" in page.url)
    page.screenshot(path="/tmp/shots/m_search_results.png")

    # Game detail
    page.locator("main .group").first.click(); page.wait_for_selector("text=Who has it"); page.wait_for_timeout(500)
    page.screenshot(path="/tmp/shots/m_detail.png")
    check("Detail: listing from other player with price", page.locator("text=Mostafa_88").is_visible() and page.locator("text=EGP 1,100").is_visible())
    check("Detail: shows city/governorate only", page.locator("text=Maadi, Cairo").is_visible())
    check("Detail: wishlist state reflected", page.locator("text=On your wishlist").is_visible())

    # Profile
    page.get_by_role("link", name="Profile").last.click(); page.wait_for_selector("text=Completed swaps"); page.wait_for_timeout(300)
    page.screenshot(path="/tmp/shots/m_profile.png")
    check("Profile: fields", all(page.locator(f"text={t}").first.is_visible() for t in ["Karim_Gamer", "Nasr City, Cairo", "Joined August 2026", "Rating", "In collection", "On wishlist"]))
    page.get_by_role("button", name="Edit profile").click(); page.wait_for_selector("text=Save profile"); page.wait_for_timeout(200)
    page.screenshot(path="/tmp/shots/m_profile_edit.png")
    page.locator("#username").fill("taken_name"); page.get_by_role("button", name="Save profile").click(); page.wait_for_timeout(500)
    check("Profile edit: taken username rejected", page.locator("text=That username is already taken").is_visible())
    page.locator("#username").fill("Karim_Pro"); page.locator("#city").fill("Heliopolis"); page.get_by_role("button", name="Save profile").click(); page.wait_for_selector("text=Profile updated")
    check("Profile edit: saved", store["profile"]["username"] == "Karim_Pro" and store["profile"]["city"] == "Heliopolis")

    # Matches
    page.get_by_role("link", name="Matches").last.click(); page.wait_for_selector("text=Matching is coming soon"); page.wait_for_timeout(200)
    page.screenshot(path="/tmp/shots/m_matches.png")
    b.close()

    # ───────── Tablet + desktop ─────────
    for name, w, h in [("tablet", 820, 1180), ("desktop", 1440, 900)]:
        b, ctx = new_ctx(p, w, h)
        page = ctx.new_page(); page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE); page.wait_for_selector("text=My collection"); page.wait_for_timeout(600)
        page.screenshot(path=f"/tmp/shots/{name}_home.png")
        check(f"{name}: sidebar visible, bottom nav hidden", page.locator("aside").is_visible() and not page.locator("nav.fixed.bottom-0").is_visible())
        page.goto(BASE + "/collection"); page.wait_for_selector("text=games on your shelf"); page.wait_for_timeout(400)
        page.screenshot(path=f"/tmp/shots/{name}_collection.png")
        page.goto(BASE + "/wishlist"); page.wait_for_selector("text=games you want"); page.wait_for_timeout(500)
        page.screenshot(path=f"/tmp/shots/{name}_wishlist.png")
        if name == "desktop":
            page.get_by_role("button", name="Add game").first.click(); page.wait_for_selector("text=Which game do you want?"); page.wait_for_timeout(500)
            page.screenshot(path="/tmp/shots/desktop_sheet.png")
            page.keyboard.press("Escape"); page.wait_for_timeout(200)
            check("desktop: Esc closes dialog", page.locator("[role=dialog]").count() == 0)
            page.goto(BASE + "/profile"); page.wait_for_selector("text=Completed swaps"); page.wait_for_timeout(300)
            page.screenshot(path="/tmp/shots/desktop_profile.png")
        b.close()

    # ───────── Unauthenticated ─────────
    b, ctx = new_ctx(p, 390, 844, authed=False, mobile=True)
    page = ctx.new_page(); page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE + "/collection"); page.wait_for_selector("text=Welcome back"); page.wait_for_timeout(300)
    check("Auth guard: protected route → /login", page.url.endswith("/login"))
    page.screenshot(path="/tmp/shots/m_login.png")
    page.get_by_role("link", name="Create an account").click(); page.wait_for_selector("text=Create your account")
    page.locator("#username").fill("taken_name"); page.wait_for_timeout(900)
    check("Signup: live 'taken' username feedback", page.locator("text=That username is taken.").is_visible())
    page.locator("#username").fill("new_player"); page.wait_for_timeout(900)
    check("Signup: live 'available' feedback", page.locator("text=Username is available.").is_visible())
    page.locator("#email").fill("new@test.eg"); page.locator("#password").fill("short")
    page.get_by_role("button", name="Create account").click(); page.wait_for_timeout(200)
    check("Signup: short password blocked", page.locator("text=at least 8 characters").first.is_visible())
    page.screenshot(path="/tmp/shots/m_signup.png")
    b.close()

    b, ctx = new_ctx(p, 1440, 900, authed=False)
    page = ctx.new_page(); page.goto(BASE + "/login"); page.wait_for_selector("text=Welcome back"); page.wait_for_timeout(300)
    page.screenshot(path="/tmp/shots/desktop_login.png"); b.close()

print("\nJS errors:", errors if errors else "none")
fails = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails or errors else 0)
