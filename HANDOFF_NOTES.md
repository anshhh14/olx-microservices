# TAGG — Handoff Notes

## Session 4 (this session) — rebrand to Mercato + logo + fonts

1. **Renamed the brand from "TAGG" to "Mercato"** everywhere in the app:
   `Navbar.jsx`, `Login.jsx`, `ChooseRole.jsx`, `Frontpage.jsx`, `index.html`
   (title/meta), root `README.md`, and `frontend/package.json`'s `name`
   field (`mercato-frontend`). No occurrences of "TAGG" left in app source
   — only in these historical handoff-note logs, left as-is since they're
   a record of what happened in earlier sessions.
2. **Inserted the supplied Mercato logo** (`ChatGPT_Image_..._02_27_02_AM.png`)
   into the app:
   - Cropped just the icon mark (bag + "M" + two people negotiating) out
     of the full lockup, chroma-keyed the near-black background to
     transparent, and trimmed it to `frontend/src/assets/logo-mark.png`.
   - Used it as the brand icon next to the wordmark in `Navbar.jsx`, the
     top-left corner of `Login.jsx`, and the top bar of `Frontpage.jsx`.
   - **Filled the previously-empty rotating glass cube** on both `Login.jsx`
     and `Frontpage.jsx` — the front face now shows the logo mark centered
     with a soft glow (`object-contain` inside the glass panel), and the
     "back" face shows a fainter, smaller copy for depth as it spins.
   - Generated `public/favicon.png` from the mark and swapped it in for
     the old abstract `favicon.svg` in `index.html`.
   - Resized a copy of the full lockup (icon + "MERCATO" + tagline) into
     `public/og-image.png` and wired it up as the `og:image` for link
     previews.
   - The Frontpage's second wordmark line now uses the logo's own tagline
     ("Where every price is a conversation") instead of the placeholder
     "MARKETPLACE" — it's a good fit since negotiation/chat is a real
     feature, not just marketing copy.
3. **Improved the display font**: swapped `Archivo Black` (a blocky
   grotesque) for `Playfair Display`, an elegant serif that matches the
   logo's own wordmark styling, set at weight 700 by default via the
   `.font-display` utility in `index.css`. This is the font used for every
   heading, the nav wordmark, price text, and card titles across the app —
   Inter stays as the body/UI sans-serif, IBM Plex Mono is unchanged.
4. Left `frontend/src/assets/logo.png` (the full uncropped lockup) in the
   repo in case a future session wants it for something else (e.g. an
   About page); it isn't imported/bundled anywhere right now so it doesn't
   affect the build.

**Not verified in a real browser** — same standing caveat as every prior
session: no Docker/network in this sandbox, so this hasn't been run
through `npm run dev`/`vite preview` and screenshotted. Read through
carefully for correctness, but a real click-through (desktop + ~390px
mobile, checking the cube's spin animation and the tagline's line-wrap on
narrow screens) should be early on the list next session.

---

# Session 3 — landing page + polish pass

Picked up the open items from Session 2's list below. No Docker/network in
this sandbox either, so anything needing a live build or backend is still
unverified — flagged per item.

1. **New public frontpage added — the app no longer opens straight into
   `/browse`.** Flow is now:
   `/` (Frontpage) → `/login` → `/choose-role` → `/browse` (or straight to
   `/browse`/`/choose-role` if already authenticated — see below).
   - New `frontend/src/pages/Frontpage.jsx`: a full-bleed dark hero modeled
     on the NAYA STUDIO reference screenshot — top bar (Browse link, Sound
     toggle, Menu), a huge two-line "TAGG / MARKETPLACE" wordmark, the same
     rotating glass-cube motif from `Login.jsx` (scaled up), a gradient CTA
     button, and a "Scroll down" indicator that anchors down to a 3-up
     features section (`#frontpage-features`) with a second CTA at the
     bottom.
   - The CTA is context-aware: logged-out → **Get started** (`/login`);
     logged-in without a mode chosen yet → **Choose your mode**
     (`/choose-role`); logged-in with a mode → **Enter marketplace**
     (`/browse`). Same three-state logic RoleGate already used, just
     surfaced as button copy instead of a silent redirect.
   - `App.jsx`: `/` now renders `<Frontpage />` instead of
     `<Navigate to="/browse" />`. Added `/` to `RoleGate`'s `EXEMPT` list so
     a logged-in user with no mode set yet can still land on the frontpage
     without being bounced straight to `/choose-role` — they see the page,
     then choose to click through. The shared `<Navbar />` is now hidden on
     both `/login` and `/` (both render their own header), same pattern
     that already existed for `/login` alone.
   - `Login.jsx`'s logo now links back to `/` (was `/browse`) so the two
     pages chain together instead of skipping back into the app.
   - **Not verified in a real browser** — same caveat as the rest of this
     project in this sandbox (no Docker/network to run `npm install` +
     `vite preview`). Read through carefully for JSX/bracket correctness,
     but a real `npm run dev` + click-through (desktop and ~390px mobile)
     should be the first thing done with this next session, same as the
     items below it never got to.

2. **Sold / negotiated-price banner on `ListingDetail`** (flagged as
   unchecked in both prior sessions' notes): rebuilt as a `flex flex-wrap`
   row instead of one run-on `<p>` with three inline spans — on narrow
   screens the old version could overflow/wrap mid-price. Negotiated price
   now shows as struck-through original + gradient current price + a small
   pill badge ("Your negotiated price") instead of trailing plain text. The
   "Sold" tag got a small dot + pill treatment to match. Still not seen
   live against real data — same "next session" caveat as above.

3. **Image fallbacks / skeleton loaders** (open item #5 from the React
   handoff): added `ImageWithFallback` to `src/components/ui.jsx` — shows a
   pulsing skeleton while an image loads, fades it in on load, and falls
   back to a small icon + "No photo" / "Couldn't load" state if there's no
   `image_url` or the image 404s. Wired into `ListingCard.jsx` (listing
   grid/cards) and `ListingDetail.jsx` (hero image). Replaces the old
   "photo or plain text div" branching in both places.

### Still open (unchanged from Session 2, carried forward)
- End-to-end QA against a live backend (login, post a listing, chat,
  checkout) has still never been done — no Docker in any session's sandbox
  so far. First thing next session, still: `docker compose up --build`,
  then click through every view — **including the new frontpage flow**
  end to end this time.
- The Dockerfile multi-stage build is logically sound but still not run
  through an actual `docker build`.
- `legacy/frontend-vanilla/` still around for reference; still fine to
  delete once the React app has had real QA.

---

# Session 2 — Merge Handoff Notes

## What this session did
Combined two previously-separate deliverables that both branched off the
same `olx-microservices` project:

1. **`olx-microservices-swiftmove-theme-updated.zip`** — the backend
   (3 microservices + Docker/K8s) plus the *original* vanilla-JS frontend,
   which had a "Midnight Gradient" theme appended via CSS (see that
   session's own notes, archived at
   `legacy/HANDOFF_NOTES_css-theme-pass.md`).
2. **`tagg-frontend-react.zip`** — a full React (Vite) + Tailwind v4 rewrite
   of that same vanilla frontend, restyled to the same Midnight Gradient
   dark/glass/gradient look, built independently in a separate session
   (see `frontend/HANDOFF_NOTES.md`, kept as-is).

### Merge actions taken
- Old vanilla frontend moved to `legacy/frontend-vanilla/` (kept, untouched,
  for reference — not wired into `docker-compose.yaml` or `k8s/` anymore).
- New React app placed at `frontend/` (repo root), replacing the vanilla one
  as *the* frontend service.
- Rewrote `frontend/Dockerfile` from a plain `nginx: COPY . .` (static files)
  into a proper **multi-stage build**: `node:20-alpine` runs `npm ci && npm
  run build`, then the `dist/` output is copied into `nginx:alpine`.
  - Added an nginx SPA-fallback config (`try_files $uri /index.html`) — the
    React app uses `react-router-dom`'s `BrowserRouter`, so without this, a
    hard refresh on any route other than `/` (e.g. `/browse`) 404s. The old
    vanilla app didn't need this. **This was untested in the previous
    sessions and would have broken in production** — worth flagging as the
    single most important fix in this merge.
  - `VITE_*` API base URLs are now Docker build args (`--build-arg
    VITE_USERS_API=...`) instead of an editable `config.js`, since Vite
    inlines `import.meta.env.VITE_*` at build time, not runtime. Defaults
    match `docker-compose.yaml` ports (3001/3002/3003); README's Kubernetes
    section updated with the NodePort (30001/30002/30003) build-arg example.
- Root `README.md` updated: build/run instructions for the frontend section
  and the Kubernetes walkthrough now describe the React build-arg flow
  instead of editing `config.js`.
- `docker-compose.yaml` / `k8s/frontend-*.yaml` needed **no changes** — same
  build context path (`./frontend`), same port mapping (`8080:80` compose,
  `30080` NodePort) — the new Dockerfile is a drop-in replacement.
- Also fixed, inside the React app itself: added the mobile hamburger nav
  that its own handoff notes flagged as missing (nav links were just
  `hidden` below `md` with no way to reach them on mobile at all). New
  slide-down panel with all nav links, cart count, role-switch, and log out.

### Verified this session (in-sandbox, no Docker available here)
- `npm install && npm run build` — clean build, 44 modules, no errors.
- `npx oxlint` — 13 stylistic warnings (data-loading `useEffect` patterns,
  one unused catch binding), 0 errors. Not worth churning for a course
  submission; noted for awareness.
- **Real visual QA**, which both prior sessions' handoff notes explicitly
  flagged as never having been done (one blocked by disabled network
  egress, the other just never got to it): served the production build with
  `vite preview` and screenshotted `/login`, `/choose-role`, and `/browse`
  at both 1440px and 390px widths using Playwright/Chromium. Confirmed:
  - The rotating glass cube hero on `/login` renders as intended.
  - Dark navy/glass/gradient theme, gradient headline words, and gradient
    CTA buttons all render correctly.
  - The app correctly shows a "Could not reach the server" toast on
    `/browse` when no backend is running (expected — no backend was started
    in this sandbox; this is frontend-only QA).
  - The new mobile hamburger menu opens/closes correctly and renders all
    expected links at 390px width.

## Still open (carried over from both prior handoffs, not done this session)
- No backend was actually running in this sandbox (no Docker), so **end-to-end
  QA against real data (login, post a listing, chat, checkout) has still
  never been done** — only the frontend's static/empty-state rendering was
  verified. First thing next session: `docker compose up --build`, then
  click through every view against live data.
- ~~Mobile breakpoints beyond the nav (the sold/negotiated-price banner on
  `ListingDetail`...) still not visually checked live.~~ Restyled in
  Session 3 above (wraps properly now) — still not confirmed live in a
  real browser though.
- `styles-fancy.css` in `legacy/frontend-vanilla/` still has three stacked
  theme eras (swing-tag, SaaS-flat, Midnight Gradient) — moot now that it's
  legacy/unused, but mentioned in case anyone still references that folder.
- Consider deleting `legacy/frontend-vanilla/` entirely once the React
  frontend has had real end-to-end QA and nobody needs the reference.
- The Dockerfile multi-stage build itself is logically sound but was
  **not** tested with an actual `docker build` (no Docker in this sandbox)
  — worth a real build/run pass before relying on it for submission.
