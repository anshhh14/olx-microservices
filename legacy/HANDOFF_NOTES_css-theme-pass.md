# Handoff Notes — Frontend Restyle ("Midnight Gradient" theme)

## What was done
The TAGG marketplace frontend (`frontend/`) previously used a warm "swing tag"
kraft-paper theme (`styles-fancy.css`, top of file). A new theme block was
**appended to the end of `frontend/styles-fancy.css`** called
`THEME: MIDNIGHT GRADIENT`, inspired by the reference screenshots supplied
(dark cinematic studio sites — near-black navy canvas, soft blue/violet/pink
radial glows, glassy blurred cards, gradient logo + CTA buttons, bold tight
headlines).

This follows the existing pattern already in the file (there was an older
"SaaS-flat" override block before it) — later CSS blocks with the same
selectors win via cascade order, so **no earlier rules were deleted**, just
overridden. This keeps the diff low-risk since `app.js` and `index.html`
structure were left almost untouched.

Changes made:
1. `frontend/styles-fancy.css` — appended ~230 lines redefining:
   - Color tokens (`:root` / `html[data-theme="dark"]`) to the dark navy +
     blue/violet/pink gradient palette (`--grad-a/b/c`, `--accent-gradient`).
   - Ambient background glows (`body` background-image radial gradients).
   - Topbar (frosted glass, gradient logo text), buttons (`.btn-primary`
     gradient CTA), all card types (`.tag-card`, `.auth-card`, `.sell-card`,
     `.detail-card`, `.chat-card`, `.role-card`) → glassy hairline-border
     style with hover glow.
   - Inputs/filter strip, badges/category ribbons, stat cards, chat bubbles,
     toasts, dropzone, radio options, seller-mode accent swap.
   - Added `.grad-word` utility class (gradient text on a `<span>`).
2. `frontend/index.html` — wrapped a few headline words in
   `<span class="grad-word">…</span>` to match the gradient-headline look
   from the reference images (e.g. "Browse **listings**", "Your **cart**").
   ⚠️ One accidental corruption of `id="chatMessages"` was introduced by a
   sloppy find/replace and has been **fixed** — verified div/span tag counts
   balance (55/55, 21/21) and CSS brace count balances (372/372).

## Not done yet / next steps for the next chat
- **Visual QA in an actual browser** — I was not able to verify this
  rendering live (this sandbox has network egress disabled, so a local
  `python -m http.server` + headless screenshot loop kept getting
  `ERR_CONNECTION_REFUSED`/connection refused between tool calls). **First
  thing to do in the next session: serve `frontend/` locally and actually
  look at every view** (choose-role, auth, browse, listing detail, sell
  form, cart, checkout, messages/chat, orders) to catch any contrast issues,
  since this was a CSS-only pass without visual confirmation.
- The reference images had a specific animated glass/3D hero (rotating cube,
  particle backgrounds, scroll-driven motion) — none of that was
  replicated; only the color/material language (dark glass, gradients) was
  applied to the existing functional UI. If the user wants a literal hero
  section like NAYA STUDIO's rotating cube or AY Media Work's hero card,
  that would need new markup/JS (e.g. a CSS/SVG hero) added to
  `tpl-choose-role` or a new landing view — not started.
- Mobile breakpoints (`@media (max-width: 640px)` etc. already in the file)
  were not re-checked against the new theme.
- Consider trimming `styles-fancy.css` — it now has **three stacked theme
  eras** (original swing-tag, SaaS-flat, Midnight Gradient) all still
  present, only the last wins per-selector. Fine functionally, but messy;
  could be flattened into one clean stylesheet later.
- `styles.css` (the original, non-"fancy" stylesheet) was **not** touched —
  confirm `index.html` is loading `styles-fancy.css` (it is, per the
  `<link>` in `<head>`) and decide whether `styles.css` is still needed at
  all.

## Reference images the theme was based on
Provided by the user: dark hero sites with rotating glass cube on a
mountain/lake backdrop ("NAYA STUDIO") and a media-studio site with
gradient headline text, glass hero cards, dark rounded service cards, and a
blog grid with glowing 3D render thumbnails ("AY Media Work"). Aim was the
overall dark/glass/gradient material language, not a literal clone.
