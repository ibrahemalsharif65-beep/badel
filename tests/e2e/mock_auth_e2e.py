# Auth-screen checks (signup metadata, verify screen, unverified login, callback states) against a mocked auth API.
# Same setup as mock_e2e.py.
import json, re
from playwright.sync_api import sync_playwright
BASE="http://localhost:5173"; cors={"access-control-allow-origin":"*","access-control-allow-headers":"*","access-control-allow-methods":"*"}
calls=[]
def handle(route, req):
    if req.method=="OPTIONS": return route.fulfill(status=204, headers=cors)
    p=req.url.split("mock.supabase.co")[1]
    calls.append((req.method,p, req.post_data))
    if p.startswith("/rest/v1/rpc/username_available"): return route.fulfill(status=200,headers={**cors,"content-type":"application/json"},body="true")
    if p.startswith("/auth/v1/signup"):
        return route.fulfill(status=200,headers={**cors,"content-type":"application/json"},body=json.dumps({"id":"u1","aud":"authenticated","email":"new@test.eg","identities":[{"id":"i"}],"user_metadata":{"username":"new_player"}}))
    if p.startswith("/auth/v1/resend"): return route.fulfill(status=200,headers={**cors,"content-type":"application/json"},body="{}")
    if p.startswith("/auth/v1/token"):
        return route.fulfill(status=400,headers={**cors,"content-type":"application/json"},body=json.dumps({"error":"invalid_grant","error_description":"Email not confirmed","code":"email_not_confirmed"}))
    return route.fulfill(status=200,headers={**cors,"content-type":"application/json"},body="[]")
ok=True
def check(n,c):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True,device_scale_factor=2)
    ctx.route(re.compile(r"https://mock\.supabase\.co/.*"),handle); ctx.route(re.compile(r"https://fonts\..*"),lambda r,q:r.abort())
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(BASE+"/signup"); pg.wait_for_selector("text=Create your account")
    pg.locator("#username").fill("new_player"); pg.wait_for_selector("text=Username is available.")
    pg.locator("#email").fill("new@test.eg"); pg.locator("#password").fill("longenough1")
    pg.get_by_role("button",name="Create account").click(); pg.wait_for_selector("text=Check your email"); pg.wait_for_timeout(300)
    body=[json.loads(c[2]) for c in calls if c[1].startswith("/auth/v1/signup")][0]
    check("Signup sends username as metadata for the profile trigger", body["data"]["username"]=="new_player")
    check("Signup sends redirect to /auth/callback", "auth%2Fcallback" in [c[1] for c in calls if c[1].startswith("/auth/v1/signup")][0])
    check("Verify screen shows the email address", pg.locator("text=new@test.eg").is_visible())
    check("Resend is on cooldown", pg.get_by_role("button",name=re.compile(r"Resend email in \d+s")).is_visible())
    pg.screenshot(path="/tmp/shots/m_verify.png")
    # login with unverified email
    pg.goto(BASE+"/login"); pg.locator("#email").fill("new@test.eg"); pg.locator("#password").fill("longenough1")
    pg.get_by_role("button",name="Log in").click(); pg.wait_for_selector("text=Please verify your email first")
    check("Login: unverified email → guidance + resend button", pg.get_by_role("button",name="Resend verification email").is_visible())
    pg.get_by_role("button",name="Resend verification email").click(); pg.wait_for_selector("text=Verification email sent")
    check("Login: resend calls auth API", any(c[1].startswith("/auth/v1/resend") for c in calls))
    # callback states
    pg.goto(BASE+"/auth/callback?error=access_denied&error_description=Email+link+is+invalid+or+has+expired"); pg.wait_for_selector("text=That link didn't work")
    check("Callback: URL error surfaced", pg.locator("text=Email link is invalid or has expired").is_visible())
    pg.goto(BASE+"/auth/callback?code=abc"); pg.wait_for_selector("text=Verifying your email"); pg.wait_for_selector("text=Email verified? Log in to continue", timeout=9000)
    check("Callback: cross-browser case guides to log in", pg.locator("text=different browser").is_visible())
    pg.goto(BASE+"/verify-email"); pg.wait_for_selector("text=Welcome back")
    check("Verify page without state redirects to login", pg.url.endswith("/login"))
    b.close()
print("JS errors:", errs or "none"); print("ALL OK" if ok and not errs else "SOME FAILED")
