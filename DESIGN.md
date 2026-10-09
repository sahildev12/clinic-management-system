# Designers & front-end — Clinic Management System

How to style pages, pick UI components, and keep the admin + public site consistent. Architecture (route → controller → service → view) matches `node_renprints`.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Prisma.

**Visual references** (saved under `public/design-refs/`):

| File | Use for |
|------|---------|
| `landing-hero.png` | Public hero, nav, doctor/stats, teal CTAs |
| `treatments.png` | Featured treatment cards (blue panels + green badges) |
| `testimonials.png` | Dark navy testimonials + person pill selector |
| `admin-appointments.png` | Admin calendar week view, filters, approve modal |
| `admin-patient-profile.png` | Patient detail: queue, timeline, history, cards |

---

## 1. Where things live

| Path | Use for |
|------|--------|
| `src/app/(site)/` | Public clinic website (header + footer layout) |
| `src/app/admin/` | Admin pages (auth shell) |
| `src/components/ui/` | shadcn primitives only |
| `src/components/admin/` | Admin forms, shell, tables helpers |
| `src/components/site/` | Public site chrome + marketing sections |
| `src/controllers/` | Page loaders |
| `src/services/` | Prisma / business logic (no JSX) |
| `src/config/` | Nav and marketing copy |
| `src/app/globals.css` | Brand CSS variables + theme |

---

## 2. Brand tokens

Defined in `globals.css`:

| Token | Value | Use |
|-------|-------|-----|
| `--brand-teal` | `#00C2B2` | Primary CTAs (“Book Online”), accent cards |
| `--brand-teal-dark` | `#00A89A` | CTA hover |
| `--brand-sky` | `#4BA3E3` | Decorative bars, treatment card tops, soft accents |
| `--brand-navy` | `#1B3A6B` | Testimonials / deep sections |
| `--brand-green` | `#22C55E` | Badges (“Popular”, “Valuable”) |
| `--brand-cream` | `#F7F4EE` | Soft section backgrounds |
| `--brand-charcoal` | `#1A1A1A` | Headings / dark buttons |
| Admin content bg | `#F5F7FB` | Soft dashboard canvas |
| Admin sidebar | `#FFFFFF` / icon rail | Light dental admin (target) — current: dark shell migrating |

**Fonts:** Plus Jakarta Sans (body + headings) — bold, friendly dental marketing feel. Avoid default Inter/Roboto stacks.

**Shape language:** Large radii (`rounded-2xl` / `rounded-3xl`) on cards, images, pills, and CTAs. Soft shadows, no harsh borders.

---

## 3. Public site (frontend) — target look

### Hero (`landing-hero.png`)
- Brand name large in nav; black pill “Contact Us”; teal “Book Online”
- One strong headline + short support line + one CTA group
- Full-bleed / edge-dominant photo with diagonal sky-blue graphic bars
- Optional floating cards (quick call, short video) — keep first viewport uncluttered

### Treatments (`treatments.png`)
- Cream/off-white section background
- Eyebrow badge (“Best Seller” + green dot)
- 3 cards: blue upper panel (title + short line + green pill badge) + rounded photo below

### Testimonials (`testimonials.png`)
- Full navy section with soft curved line art
- Pill “Testimonial” label
- Horizontal **person selector pills** (photo + name); active = white pill
- Quote + green icon tile + large rounded photo beside

### Doctor / stats
- Stacked sky + teal stat cards (“25 years”, “+50k patients”)
- Doctor photo with rounded corners
- Bio + teal Book CTA

---

## 4. Admin (backend) — target look

Inspired by `admin-appointments.png` and `admin-patient-profile.png`:

| Area | Direction |
|------|-----------|
| Shell | Light canvas, slim icon sidebar, soft cards |
| Appointments | Week calendar grid + time slots; color blocks per treatment; current-time line |
| Filters | Doctor checkboxes, treatment types, patient queue list |
| Request modal | Approve / Decline; patient detail, diagnose tags, pharmacy chips, schedule tasks |
| Patient profile | Queue list + profile header actions; basic info; appointment timeline; treatment history table; insurance / membership / documents cards |
| Status | Soft pastel badges (Pending yellow, Paid green) |

**Current v1** still uses the dark renprints-style shell. List tables now follow the shared appointments-style system (see §5). Next upgrades: week calendar + patient profile.

---

## 5. Admin tables (application-wide)

All list screens use `src/components/admin/table/`:

| Piece | Role |
|-------|------|
| `AdminTableToolbar` | Date / status / source filters + search + Reset |
| `AdminTableCard` + `AdminDataTable` | White card, thin dividers, soft header |
| `AdminPersonCell` + `AdminAvatar` | Soft-color initials + name + subtitle/ID |
| `AdminStatusPill` | Pending / Confirmed / Completed / Cancelled pills |
| `AdminRowActions` | Square edit + delete icons |
| `AdminTablePagination` | Showing X–Y of Z + pages + rows/page |

---

## 6. UI rules (important)

**Do not use native HTML form controls for UX surfaces:**

| Avoid | Use instead |
|-------|-------------|
| `<input type="date">` / `datetime-local` | `DatePickerField` / `DateTimePickerField` |
| `<select>` | shadcn `Select` (`AppSelect`) |
| Raw primary buttons | shadcn `Button` / `buttonVariants` |
| Browser calendar widgets | Custom week calendar (admin target) |

---

## 7. Shared form components

| Component | Path | Purpose |
|-----------|------|---------|
| `DatePickerField` | `src/components/ui/date-picker-field.tsx` | Date only |
| `DateTimePickerField` | `src/components/ui/date-time-picker-field.tsx` | Date + time |
| `AppSelect` | `src/components/ui/app-select.tsx` | Styled select |

---

## 8. Adding a page

1. Service → controller → view (or thin page for small screens)
2. Prefer Server Components; `"use client"` only for forms / selectors
3. Export `metadata` on the route
4. Match section patterns above — one job per section, large radii, brand teal CTAs

---

## 9. Print

Prescription print view uses `print:hidden` for chrome and `PrintButton`. Clinic header from **Settings**.
