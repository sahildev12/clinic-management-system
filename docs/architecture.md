# Architecture — single clinic

## Overview

The Clinic Management System is designed for **one physical clinic**. There is no multi-clinic or SaaS tenant switcher in the product UI.

All operational data (patients, appointments, payments, medicines, expenses, messages) belongs to that single clinic. Settings → **Clinic name** is the public-facing identity of the practice.

## Team & roles

| Person | `User.role` | `Provider.providerType` | Login |
|--------|-------------|-------------------------|-------|
| Clinic owner / manager | `ADMIN` | — | `/login` |
| Doctor | `STAFF` | `DOCTOR` | `/doctor/login` |
| Reception / desk staff | `STAFF` | `STAFF` | `/team/login` |

Doctors are not separate clinics. Each doctor has a **specialization** (`Provider.category` / `DoctorCategory` enum), for example:

- General dentistry
- Orthodontics
- Endodontics
- Periodontics
- Pediatric dentistry
- Oral surgery
- Prosthodontics

Staff members get **module access** checkboxes (patients, appointments, finance, etc.). Doctors get a default module set focused on clinical work.

## Data model note

The database includes a `Clinic` row and `clinicId` foreign keys on records. That supports a clean schema and future scaling, but the application assumes **one clinic row** in normal use. Admins do not create or switch clinics in the UI.

## Public website

- Booking: `/appointment`
- Legacy `/book/[slug]` URLs redirect to `/appointment`

## Admin

- **Doctors & team** (`/admin/team`): add doctors with specialization, or staff with module access.
- **Settings** (`/admin/settings`): clinic name, logo, hours, patient reference template.
