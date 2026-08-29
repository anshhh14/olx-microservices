# TAGG — React + Tailwind rebuild — Handoff Notes

## Status: functional, builds clean, not yet visually QA'd in a browser.

## What this is
A full React (Vite) + Tailwind v4 rewrite of the original vanilla-JS `frontend/`
from `olx-microservices-swiftmove-theme-updated.zip`, restyled to match the
dark/glass/gradient aesthetic in the reference screenshots (NAYA STUDIO,
AY Media Work): near-black navy canvas, blue→violet→pink radial glows,
glassy blurred cards, gradient logo/CTA/headline text, Archivo Black display
font.

## Run it
```
cd tagg-frontend
npm install
cp .env.example .env   # point at your running backend services
npm run dev
```
Build: `npm run build` (already verified passing).

## Backend wiring
Same 3 services as before (users / listings / chat). Base URLs now come from
Vite env vars instead of the old `config.js`:
- `VITE_USERS_API`, `VITE_LISTINGS_API`, `VITE_CHAT_API` (see `.env.example`).
Defaults match the docker-compose ports if no `.env` is present.

## Structure
- `src/lib/api.js` — fetch wrapper, auth token storage, API base URLs.
- `src/context/` — AuthContext (login/register/logout + buyer/seller mode),
  CartContext (cart + wishlist, localStorage-backed per user id, same keying
  scheme as the original `tagg_cart_<id>` / `tagg_wishlist_<id>`),
  ToastContext.
- `src/components/` — Navbar, ListingCard, RestrictedNotice, `ui.jsx`
  (shared primitives: Button, Input, Field, PageHeader, EmptyState, Spinner,
  StatCard, GradWord).
- `src/pages/` — one file per route, ported 1:1 from the original app.js
  render functions:
  - `Login.jsx` — **standalone route** (`/login`), not a modal — has its own
    hero with a decorative rotating CSS "glass cube" echoing the NAYA STUDIO
    reference image.
  - `ChooseRole.jsx`, `Browse.jsx`, `Sell.jsx`, `MyListings.jsx`,
    `ListingDetail.jsx` (includes the full live chat + buyer offer/
    negotiation system, polls every 4s like the original), `Cart.jsx`
    (cart + save-for-later, negotiated-price aware), `CheckoutDetails.jsx`,
    `CheckoutSuccess.jsx` (Stripe redirect target), `Messages.jsx`,
    `Orders.jsx`.
- `src/App.jsx` — react-router-dom routes + the same "force choose-role
  after login if no mode set yet" gate the original had.
- `src/index.css` — theme tokens + glass/gradient utility classes
  (`.glass`, `.glass-hover`, `.btn-grad`, `.grad-text`, `.tag-hole`,
  `.animate-spin-slow`, etc.)

## Not done yet / next steps
1. **Visual QA in an actual browser** — this was built and confirmed to
   compile (`npm run build` succeeds), but never rendered/screenshotted.
   First thing next session: `npm run dev`, click through every route,
   check mobile breakpoints (nav currently collapses non-essential links
   below `md`, no hamburger menu yet — may want one).
2. No hamburger/mobile nav drawer — on narrow screens the middle nav links
   (`Browse`, `Sell`, etc.) are hidden entirely (`hidden md:flex`). Should
   add a mobile menu.
3. Sold/negotiated-price banner styling on `ListingDetail` could use a pass
   once seen live.
4. Original had a `styles.css` (non-fancy) that was unused — not carried
   over, not needed.
5. Consider adding real backend-agnostic image fallbacks / skeleton loaders
   instead of the plain spinner.
6. `npm run lint` (oxlint) has not been run yet — worth a pass.

## Reference images the theme was based on
Dark cinematic studio sites — NAYA STUDIO (rotating glass cube hero on a
night mountain/lake backdrop) and AY Media Work (gradient headline text,
glass hero cards, dark rounded service cards, blog grid with glowing 3D
render thumbnails). Aim was the overall dark/glass/gradient material
language + a literal rotating-cube hero on the new login page, not a pixel
clone of either site.
