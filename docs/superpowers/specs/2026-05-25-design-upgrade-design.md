# Design Upgrade — Violet → Medical Blue + Glass

**Status:** draft for review
**Author:** Maayan (with Claude)
**Scope:** `web-app/` only — Android app and backend untouched
**Date:** 2026-05-25

---

## 1. Problem

After three design passes the web app sits on a heavy violet/fuchsia gradient palette with a lavender background (`#F3EEFB`). The owner has two issues with this baseline:

1. **Too much purple, too many gradients.** Almost every hero, CTA, logo chip, and active-nav uses `from-violet-600 to-fuchsia-600`. Reads as a brand-marketing site rather than a clinical tool.
2. **Brand inconsistency.** The favicon (`web-app/public/favicon.svg`) is a violet zigzag that already contains a sky-blue accent (`#47bfff`). The in-app logo is a `PawPrint` icon in a violet→fuchsia gradient chip. Two different identities.

A clean, medical-grade look is desired: **white surfaces, one calm sky-blue, and selective use of glass/translucency**, aligned to the blue already present in the favicon.

## 2. Goals

- Replace the violet/fuchsia palette with a **single sky-blue brand color** drawn from the existing favicon (`#47bfff` family).
- Make the favicon and the in-app paw logo use the **same blue** so the brand is unified.
- Strip purely-decorative gradients; allow glass/translucency (`bg-white/70 backdrop-blur`) only where it adds depth.
- Keep all layouts, copy, i18n, and behavior. **This is a re-skin, not a redesign.**
- Maintain RTL/Hebrew quality (Heebo font stays).

## 3. Non-goals

- No layout changes, no new screens, no component re-architecture.
- No changes to `android-app/` or `backend/`.
- No dark mode (out of scope for this pass).
- No new logo design — we recolor the existing PawPrint chip + favicon.
- No accessibility audit beyond preserving WCAG-AA contrast on text against the new palette.

## 4. Color tokens

These are the canonical tokens. Every page and component pulls from these — no ad-hoc `violet-*` / `fuchsia-*` / `lavender` literals anywhere.

| Token | Hex | Tailwind nearest | Use |
|---|---|---|---|
| `brand` | `#2BA8F5` | `sky-500` | Primary actions, active nav, logo chip, icons |
| `brand-dark` | `#0E86CC` | `sky-600` | Hover/active state on `brand` |
| `brand-deep` | `#0A4E7A` | `sky-900` | Wordmark, large headings on hero |
| `brand-soft` | `#E0F2FE` | `sky-100` | Soft fills (badges, hover backgrounds) |
| `brand-tint` | `#F0F9FF` | `sky-50` | Subtle section backgrounds |
| `ink` | `#0F172A` | `slate-900` | Body text |
| `ink-muted` | `#64748B` | `slate-500` | Secondary text |
| `surface` | `#FFFFFF` | `white` | Cards, sidebar, header |
| `bg` | `#F8FAFC` | `slate-50` | Page background (replaces `#F3EEFB`) |
| `border` | `#E2E8F0` | `slate-200` | Default border |
| `border-strong` | `#CBD5E1` | `slate-300` | Inputs, dividers |
| `success` | `#10B981` | `emerald-500` | Confirmations, vaccinations, "active" badges |
| `warning` | `#F59E0B` | `amber-500` | Overdue reminders, pending status |
| `danger` | `#DC2626` | `red-600` | Cancellations, destructive actions, errors |

### Notes
- `brand` is `#2BA8F5` — slightly deeper than the raw `#47bfff` from the favicon to meet 4.5:1 contrast against white at 14px. The favicon itself can keep `#47bfff` as its accent since favicons aren't text.
- Heebo renders heavier than Latin fonts. Body text uses `#0F172A` (not pure `#000`) so Hebrew doesn't feel harsh.
- No purple, fuchsia, pink, or violet anywhere in the palette. Reds/oranges only as semantic colors (danger/warning).

## 5. Translucency / "glass" usage

Glass is an accent, not the default. Rules:

- **Page-level hero greeting cards** (Dashboard owner + vet): `bg-brand-tint ring-1 ring-brand/15` with a single `bg-brand-soft/60 blur-3xl` blob in one corner. Replaces the current `from-violet-200 via-violet-100 to-fuchsia-100` heavy gradient. (Pure glass `bg-white/70` would disappear against the off-white page bg — the hero needs the soft brand tint to anchor the page.)
- **Modal/dialog containers**: `bg-white/95 backdrop-blur-md` on a `bg-slate-900/30 backdrop-blur-sm` scrim.
- **Mobile sidebar overlay**: `bg-slate-900/40 backdrop-blur-sm`.
- **Sidebar itself**: opaque `bg-white` (readability).
- **Stat cards, list items, regular cards**: opaque `bg-white` with `border border-slate-200`. No glass.
- **Active nav item**: solid `bg-brand text-white` (no gradient). Hover non-active: `bg-brand-soft text-brand-dark`.
- **Login/Register page backdrop**: keep the decorative blobs concept but recolor to `bg-brand/20` and `bg-brand/10` (down from violet/fuchsia/pink/purple/rose stacking — five blobs reduced to two).

## 6. Logo unification

The favicon and the in-app logo must be the same identity.

- **Favicon** (`web-app/public/favicon.svg`): replace the violet fills (`#863bff`, `#7e14ff`, `#ede6ff`) with the blue family (`#2BA8F5`, `#0E86CC`, `#E0F2FE`). The existing `#47bfff` accent stays as-is (it's already blue). Shape unchanged.
- **In-app logo chip** (used in `AppLayout.jsx` sidebar header and `Login.jsx` hero): replace `bg-gradient-to-br from-violet-500 to-fuchsia-500` with a solid `bg-brand` chip containing the white `PawPrint` icon. Same dimensions, same icon, only the color changes.
- **Avatar bubble** (sidebar user badge): same recolor — solid `bg-brand` instead of violet→fuchsia gradient.
- **PetCard species badge tints** stay (amber/purple/sky/pink for dog/cat/bird/rabbit) — these are functional differentiators, not brand.

## 7. File-by-file impact

The change is mechanical search/replace plus a few targeted hero/login simplifications.

### 7.1 Tokens & global

- `web-app/src/index.css` — add `@theme` block defining `--color-brand`, `--color-brand-dark`, `--color-brand-deep`, `--color-brand-soft`, `--color-brand-tint`, `--color-bg`, `--color-ink`, `--color-ink-muted`. Tailwind v4 picks these up automatically as `bg-brand`, `text-brand-dark`, etc.
- `web-app/public/favicon.svg` — recolor fills as described in §6.

### 7.2 Layout & navigation

- `web-app/src/components/AppLayout.jsx`
  - Page wrapper: `bg-[#F3EEFB]` → `bg-bg`
  - Logo chip: violet/fuchsia gradient → `bg-brand`
  - Active nav button: `bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md` → `bg-brand text-white`
  - Inactive nav hover: `hover:bg-violet-50 hover:text-violet-700` → `hover:bg-brand-soft hover:text-brand-dark`
  - Avatar bubble: gradient → `bg-brand`
  - Unread badge: `bg-violet-500` → `bg-brand`

- `web-app/src/components/NotificationBell.jsx` — recolor any `violet-*` / `fuchsia-*` to `brand-*`. Unread dot stays `bg-danger` (red) — that's a notification convention.

### 7.3 Pages (re-skin only — no behavior changes)

For each page below: replace `violet-*` → `brand-*` (matching shade depth), `fuchsia-*` → `brand-*`, drop `bg-gradient-to-br from-X to-Y` to a single `bg-brand` (or `bg-brand-soft` for tints), replace decorative blob stacks with at most one soft `brand-soft` blob.

- `Login.jsx` — backdrop blob reduction (5 → 2), tab pill recolor, submit button recolor.
- `Register.jsx` — same as Login.
- `Dashboard.jsx` — hero card simplification; **stat card palette redefined** so the four cards stay visually distinct without relying on violet/fuchsia/pink:
  - Today's appointments: `bg-sky-50 text-sky-700` (brand-aligned, "main metric")
  - Pending consults: `bg-amber-50 text-amber-700` (attention/action-needed)
  - Unread messages: `bg-slate-100 text-slate-700` (neutral count)
  - Total patients: `bg-emerald-50 text-emerald-700` (cumulative/positive)
  Also: search submit button recolor, primary owner action button recolor (gradient → `bg-brand`).
- `PetProfile.jsx` — record-type chip palette: `purple` (xray) → `sky`, `fuchsia` (consultation) → `brand-soft`. Tab and CTA links recolored.
- `OwnerMyPets.jsx`, `OwnerAppointments.jsx`, `BookAppointment.jsx`, `EmergencyVets.jsx` — primary CTAs and links recolored.
- `Schedule.jsx`, `VetScheduleSettings.jsx`, `Consultations.jsx`, `Messages.jsx`, `Settings.jsx` — recolor.

### 7.4 Out of scope (do not touch)

- `web-app/src/context/AuthContext.jsx`
- `web-app/src/api.js`, `i18n/i18n.js`, `utils/petLocale.js`
- `web-app/src/components/LanguageSwitcher.jsx` (already neutral)
- `web-app/public/icons.svg` — unused leftover (Bluesky/Discord/GitHub/X icons from a template). Not in this scope; flag separately for cleanup.

## 8. Migration rules (for the implementer)

These are search/replace rules that should be applied consistently, not creatively:

| Old | New |
|---|---|
| `bg-[#F3EEFB]` | `bg-bg` |
| `text-[#2D1B69]` | `text-brand-deep` |
| `bg-gradient-to-br from-violet-500 to-fuchsia-500` (logo/avatar) | `bg-brand` |
| `bg-gradient-to-br from-violet-600 to-fuchsia-600` (CTAs, active nav) | `bg-brand` |
| `hover:from-violet-700 hover:to-fuchsia-700` | `hover:bg-brand-dark` |
| `bg-gradient-to-br from-violet-200 via-violet-100 to-fuchsia-100` (heroes) | `bg-white/70 backdrop-blur-xl ring-1 ring-brand/10` |
| `text-violet-{500..900}` | `text-brand` / `text-brand-dark` / `text-brand-deep` (match depth) |
| `bg-violet-50` | `bg-brand-soft` |
| `bg-violet-100` | `bg-brand-soft` |
| `border-violet-{100..300}` | `border-brand/20` or `border-slate-200` (border, not brand) |
| `text-fuchsia-*` | `text-brand` (match depth) |
| `bg-fuchsia-*` | `bg-brand` or `bg-brand-soft` |
| `from-fuchsia-* to-pink-*` | `bg-brand-soft` |
| `bg-purple-100` (xray chip etc.) | `bg-sky-100` (functional, not brand) |
| `text-purple-700` (xray chip) | `text-sky-700` |

**Rule of thumb:** if a class was decorative gradient → solid `brand`. If it was a tint background → `brand-soft` or `brand-tint`. If it was a border → keep `slate-200` unless the original explicitly wanted a brand tint.

## 9. Acceptance criteria

- Grep for `violet`, `fuchsia`, `lavender`, `F3EEFB`, `2D1B69` across `web-app/src/` and `web-app/public/` returns **zero matches**. (The cat-species badge in `Dashboard.jsx` currently uses `purple-*` — that is functional, not brand, and stays. `purple` is allowed in the grep; only `violet` / `fuchsia` / the literal lavender hex / the literal deep-violet hex must disappear.)
- No `from-X to-Y` gradient classes remain in any page or layout, except for any deliberate background-image utility usage (there should be none).
- Favicon, in-app logo chip, and sidebar avatar all visibly share the same blue.
- Page background is off-white `#F8FAFC`, not lavender.
- Login/Register page has at most two decorative blobs.
- App renders and all flows still work in both Hebrew (RTL) and English (LTR).
- No console errors on any page after the change.

## 10. Risks & open items

- **Risk:** Some `violet-*` classes carry semantic meaning I haven't identified (e.g., a status that means "scheduled"). The implementer should grep each match and confirm it's brand-coloring before swapping. If semantic, leave it.
- **Risk:** A few `purple`/`fuchsia` chips in `PetProfile.jsx` are functional (record-type differentiation). Spec says swap `purple` (xray) → `sky` and `fuchsia` (consultation) → `brand-soft`. If both end up too close to brand blue, swap consultation to a neutral `slate` chip instead — confirm visually during implementation.
- **Open:** Should the owner Hero's emoji (🐾) stay, or swap to a `PawPrint` icon in `brand-soft` for consistency? Defer to implementation taste — both work.

## 11. Testing

Manual only, per the project's current practice:

1. `cd web-app && npm run dev`, open http://localhost:5173.
2. Login as vet (`vet@test.com` if seeded) — verify dashboard, schedule, messages, consultations, settings, vet-schedule-settings.
3. Login as owner (`owner@test.com / owner123`) — verify home, my pets, pet profile, appointments, book appointment, emergency vets.
4. Toggle Hebrew ↔ English via LanguageSwitcher — verify RTL/LTR layout, no clipping, no overflow.
5. Confirm favicon updated in browser tab.
6. Run `npm run build` — no warnings about unused classes (Tailwind v4 should prune cleanly).
