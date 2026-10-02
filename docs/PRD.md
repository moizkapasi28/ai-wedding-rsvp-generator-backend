# WeddlyAI (AI Wedding RSVP Generator): Product Requirements Document

| | |
|---|---|
| Version | 1.0 |
| Date | 2026-10-01 |
| Status | Describes the product as built on 2026-10-01, plus gaps |
| Product name | WeddlyAI (`frontend: index.html`, landing copy) |
| Production frontend | https://ai-wedding-rsvp-generator.pages.dev |
| Repositories | `ai-wedding-rsvp-generator-frontend` (React + Vite + TanStack Query + shadcn/ui), `ai-wedding-rsvp-generator-backend` (Express + Prisma/PostgreSQL + BullMQ/Redis + Gemini + S3) |

**How to read this document.** This PRD was written after the fact, by reading both codebases. Every requirement describes behaviour that exists in code today. Code is referenced as `frontend: <path>` or `backend: <path>`. Where the document infers intent rather than reading it straight from code, it says "(inferred)". Section 9 lists what is missing, inconsistent or unclear. Those items are open questions, not roadmap commitments.

---

## 1. Problem and vision

### 1.1 Problem

A wedding, especially the multi-ceremony weddings common in South Asia that the product is visibly designed around (Haldi/Mehendi/Sangeet-style events, "Traditional Indian" illustration themes, lehenga/sherwani attire options, ₹ pricing placeholders), is several events with overlapping but different guest lists. Couples typically:

- keep the guest list in a spreadsheet, with a column per ceremony;
- send invitations one by one over WhatsApp, from their own phone;
- collect replies in chat threads and count them by hand for each ceremony;
- chase non-responders manually as the caterer's headcount deadline approaches;
- pay a designer, or use a generic template, for invitation cards.

The result is that nobody knows exactly who is coming to which ceremony, what they eat, or who still needs a nudge.

### 1.2 Vision

The landing page states it as: "Send the invitation. Know exactly who is coming." (`frontend: src/components/landing/HeroSection.tsx`). WeddlyAI gives the couple one place to:

1. model a wedding as a set of events (ceremonies);
2. keep a single guest list where each guest is invited to specific events;
3. give every guest a personal RSVP link per event, sent from the couple's own WhatsApp as a pre-written message;
4. configure what the RSVP page asks (plus-ones, dietary, song request, message), set a deadline, and get reminder prompts;
5. generate an invitation card (and an RSVP header illustration) with AI, or upload their own;
6. watch replies arrive on a live dashboard.

Guests never need an account. The per-event invite token in the link is their only credential.

---

## 2. Target users and personas

| Persona | Description | Access | Key needs |
|---|---|---|---|
| **Host** (couple, or someone planning on their behalf) | Signed-in user. Owns one or more weddings. The data model allows several weddings per user (`backend: prisma/schema.prisma` `User.weddings`), and the UI has a wedding switcher. | Email + password account, verified by email. | Get the guest list in quickly, send invites without a paid messaging API, know per-event headcount, dietary needs and accommodation, chase late replies. |
| **Guest** | Anyone the host invites to one or more events. | No account. Opens `/rsvp/:slug/:token`, where the token belongs to one event invite. | See the invitation and event details (date, time, venue, map), reply in a few taps, change the reply until the deadline. |
| **Planner** (inferred, not a distinct role) | Runs several weddings from one account. Named only on the placeholder pricing section (`frontend: src/components/landing/PricingSection.tsx`). | Same as Host. | Switch between weddings. There are no team or shared-access features. |

There are no admin, co-host or collaborator roles. A wedding belongs to exactly one user (`Wedding.user_id`).

---

## 3. Goals and non-goals

### 3.1 Goals (as evidenced by what is built)

- G1. A host can go from sign-up to sending the first RSVP link in a single session.
- G2. Every (guest, event) pair has its own RSVP link, status and reply, so each ceremony has an accurate count.
- G3. Invitations and reminders go out through the host's personal WhatsApp at zero messaging cost.
- G4. Replies show up on the host dashboard in near real time.
- G5. AI-generated invitation artwork that is good enough to send, with failures explained to the host and credits refunded.
- G6. Guest data is visible only to the owning host; guests see only their own invite.

### 3.2 Deliberate non-goals (verified in code)

| Non-goal | Evidence |
|---|---|
| **No WhatsApp Business API or automated sending.** The system builds `wa.me` click-to-chat links with the message pre-filled; the host presses Send in their own WhatsApp. | `backend: src/lib/whatsapp.ts`, `backend: src/services/guest.service.ts` (`getWhatsAppInvitesService`), comment "The couple sends from their own WhatsApp". |
| **No delivery or read tracking.** "Sent" means "the host clicked the link"; WhatsApp cannot report that Send was pressed. | `backend: src/services/guest.service.ts` ponytail comment on `markInviteSentService`. |
| **No scheduled or automatic reminders.** Reminders are computed on demand and shown to the host as a list to send manually. There is no cron or scheduler. | `backend: src/utils/reminder.util.ts`, `GET /api/guest/invites/reminders`. |
| **No email or SMS to guests.** Email is used only for host account verification and password reset. `Guest.email` is stored but never used for sending. | `backend: src/public/emailTemplates` contains only `email-verification.html` and `forgot-password.html`. |
| **No guest accounts or guest login.** | `backend: src/routes/rsvp.routes.ts`: public routes are authenticated only by the invite token. |
| **No billing or payments.** Pricing tiers on the landing page are placeholders. | `frontend: src/components/landing/PricingSection.tsx` ponytail comment. |
| **No collaboration or multi-user weddings.** | Schema: one `user_id` per wedding. |
| **Not yet built, only advertised as "In development":** QR code attendance and an AI photo gallery. | `frontend: src/components/landing/UpcomingSection.tsx`, FAQ entry. |

---

## 4. Core concepts and glossary

| Term | Definition | Source |
|---|---|---|
| **Wedding** | Top-level container owned by a user: title, bride name, groom name, date, venue, address, city, optional message, and a `slug` derived from the title (lowercase, non `[a-z0-9]` characters collapsed to `-`). The slug is not unique; it appears in RSVP URLs for readability only. | `backend: prisma/schema.prisma` `Wedding`; `backend: src/services/wedding.service.ts` |
| **Active wedding** | The wedding every in-app page is scoped to. Stored client-side (`activeWeddingIdAtom`, `activeWeddingAtom`, persisted in localStorage). Auto-selected as the first wedding if none is set or the stored one returns 404. Changed with the Wedding Switcher. | `frontend: src/layout/AppLayout.tsx`, `src/store/store.ts` |
| **Event** | One ceremony within a wedding: title, description (up to 250 chars), side (`BRIDE`/`GROOM`/`BOTH`), date, time (`HH:mm`), venue, address, city, optional latitude/longitude. Creating an event also creates its page settings and invite card rows. | `backend: src/services/event.service.ts` `addNewWeddingEventService` |
| **Guest** | A person on the wedding's guest list: name, mobile number (required), optional email, side, group, accommodation flag and address, note. Unique by mobile number within a wedding at creation time (see 5.4). | `backend: prisma/schema.prisma` `Guest` |
| **Side** | Which family the guest belongs to: `BRIDE`, `GROOM`, `BOTH`. Events have their own `EventSide` with the same values. | schema enums `Side`, `EventSide` |
| **Group** | Guest category: `FAMILY`, `FRIEND`, `RELATIVE`, `COLLEAGUE`, `EMPLOYEE`, `VIP`, `OTHER`. | schema enum `Group` |
| **GuestEventInvite** ("invite") | One guest's invitation to one event. Unique per (guest, event). Holds `invite_token` (UUID, globally unique, the guest's credential), `status`, reply fields (`plus_ones`, `dietary`, `song_request`, `message`), `invite_deadline`, `responded_at`, `invite_sent_at`, `first_reminder_sent_at`, `final_reminder_sent_at`. | schema `GuestEventInvite` |
| **RSVP status** | `PENDING` (default, no reply), `ATTENDING`, `MAYBE`, `DECLINED`. Guests can submit only the last three. | schema enum `Status`; `backend: src/validations/rsvp.validation.ts` |
| **Page settings** (`GuestEventInviteFormat`) | Per-event RSVP page configuration: which optional questions are asked (`plus_ones`, `dietary_preference`, `song_request`, `message`), reminder toggles (`first_reminder`, `final_reminder`), `rsvp_deadline`, and the header illustration (`raw_image`, `generated_image`, `illustration_style`, `illustration_theme`, `photo_type`, attire styles). Exactly one per event. Served under `/api/page-setting`. | schema; `backend: src/routes/eventInviteFormat.route.ts` |
| **RSVP deadline** | Set per event on page settings; copied to every invite's `invite_deadline` on save and when invites are created. `invite_deadline` is what the public RSVP endpoint enforces. The UI treats it as the end of the chosen day in the host's timezone. | `backend: src/services/eventInviteFormat.service.ts`; `frontend: src/components/PageSettingMain.tsx` |
| **Dietary** | `VEGAN`, `VEGETARIAN`, `NON_VEGETARAIN` (misspelling is part of the API), `EGGETARIAN`, `LACTOSE_FREE`, `GLUTEN_FREE`, `OTHER`. | schema enum `Dietary`; `frontend: src/constants/index.ts` `DIETARY_OPTIONS` |
| **Accommodation** | Host-entered per guest: `accomodation_required` plus `accomodation_address` (field names misspelled in the API). Shown to the guest on the RSVP page as "Where you're staying" with a directions link. | `frontend: src/pages/Rsvp.tsx` `StayCard` |
| **Reminders** | Two kinds per invite: FIRST (7+ days after the invite was marked sent, no reply yet) and FINAL (within 3 days of the deadline). Each is gated by a page-settings toggle and sent manually via WhatsApp. | `backend: src/utils/reminder.util.ts` |
| **Invite card** (`EventInviteCard`, formerly `AIEventInviteCard`) | The event's invitation image, 9:16. Its `card_source` is `PRESETS` (AI, from design options), `EXAMPLE` (AI, from a reference card the couple likes) or `UPLOAD` (the couple's own finished card). One per event. Tracks generation status, stage, errors and credits charged. | schema `EventInviteCard`; `backend: src/services/inviteCard.service.ts` |
| **Header illustration** | A 1:1 AI illustration of the couple (or bride or groom) generated from an uploaded photo, shown at the top of the RSVP page. | `backend: src/services/eventInviteFormat.service.ts` `generateEventInviteFormatImageService` |
| **AI credits** | Per-user balance (`User.ai_credits`, default 100). An invite card generation costs 10 and a header illustration costs 5. Credits are refunded when a generation finally fails. | `backend: src/services/credits.service.ts` |
| **Guest preview** | Host-side page that shows exactly what a guest sees for a chosen event, and the entry point for sending invites for that event. | `frontend: src/components/GuestPreviewMain.tsx` |

Entity relationships: `User 1-* Wedding 1-* Event`, `Wedding 1-* Guest`, `Guest *-* Event` through `GuestEventInvite`, `Event 1-1 GuestEventInviteFormat`, `Event 1-1 EventInviteCard`. All child rows cascade-delete with their parent.

---

## 5. Feature requirements

### 5.1 Authentication and profile

**User stories**
- As a host, I want to sign up with my email and verify it, so that my account is secured.
- As a host, I want to reset a forgotten password by email.
- As a host, I want to stay signed in across reloads and tabs.
- As a host, I want to edit my name, mobile number and profile picture.

**Functional requirements**
1. Sign-up collects first name, last name, email, mobile number and password (`POST /api/auth/signup`). The frontend enforces names of 3-50 characters, mobile of 10-15 characters, and a password of 8-20 characters containing upper case, lower case, a digit and a special character (`frontend: src/validations/auth.validation.ts`). The backend schema accepts any strings (`backend: src/validations/auth.validation.ts`).
2. Passwords are hashed with bcrypt. A new user starts with `is_email_verified = false` and 100 AI credits.
3. After sign-up, the system emails a verification link (JWT stored in the `Token` table, expiry `JWT_VERIFY_EMAIL_EXPIRATION_MINUTES`). The host lands on `/verification-pending`. Opening `/verify-email` with the token calls `POST /api/auth/verify-email`. A resend endpoint exists (`POST /api/auth/resend-verify-email`).
4. Sign-in (`POST /api/auth/signin`):
   - unknown email or wrong password returns 404 "Invalid email or password";
   - an unverified account returns 403 and sends a fresh verification email;
   - on success, all of the user's existing tokens are deleted before new access and refresh tokens are issued. This means one active session per user (signing in elsewhere ends the previous session when its access token next needs refreshing).
5. Token handling (frontend): the access token lives in memory (`src/store/token.ts`), synced across tabs with `BroadcastChannel`. The refresh token and user are persisted in localStorage. On load, the app exchanges the refresh token for an access token (`POST /api/auth/access-token`) before rendering routes. On a 401 the HTTP client refreshes once and retries; if that fails it dispatches `unauthorized`, which logs the user out (`frontend: src/api/api.service.ts`, `src/router.tsx`).
6. Forgot password (`POST /api/auth/forgot-password`) emails a reset link. `/reset-password` submits the token and new password (`PATCH /api/auth/reset-password`).
7. Logout (`POST /api/auth/logout`) deletes the user's tokens.
8. Profile (`GET/PATCH /api/auth/me`): view email (read-only), member-since and last-updated dates; edit first name, last name, mobile number and profile picture. The picture is cropped client-side (`ImageCropper`) and uploaded to S3 via a presigned URL (`frontend: src/pages/ViewProfile.tsx`).
9. Signed-in users visiting `/` or `/signin` are redirected to `/weddings`. Signed-out users visiting app routes are redirected to `/signin`.

**Acceptance criteria**
- A new account cannot sign in until its email is verified. Each blocked attempt sends a new verification email.
- A reset or verification link that is expired or already used returns 401 "Invalid link or link has expired".
- Reloading any in-app page keeps the user signed in while the refresh token is valid.
- The sidebar shows the remaining AI credits and turns red when fewer than 10 remain (`frontend: src/components/AppSidebar.tsx`).

### 5.2 Weddings

**User stories**
- As a host, I want to create a wedding with the couple's names, date and venue.
- As a host with several weddings, I want to search, filter and switch between them.

**Functional requirements**
1. Create or edit a wedding with: title (3-100 chars), bride name and groom name (1-50), date, venue and address (1-200), city (1-50), optional message (`backend: src/validations/wedding.validation.ts`). Saving the title regenerates the slug.
2. The wedding list (`GET /api/wedding?includeStats=…`) is paginated and supports search, filters `this_week`, `upcoming` and `completed` (combinable), and sorting by `date` or `created_at`, ascending or descending. With stats, each wedding includes:
   - `tag`: "Completed" (date passed), "This Week" (0-7 days away) or "N days later";
   - `totalGuests`, `totalEvents`;
   - `confirmationRate`: the share of the wedding's invites with status `ATTENDING` (inferred from `getGuestsConfirmationStats`).
3. Delete a wedding. This cascades to its events, guests, invites, page settings and cards.
4. Active wedding: `AppLayout` loads the first 20 weddings, auto-selects the first when none is active or the active one is gone (404 only; network errors do not switch), and keeps a fresh copy of the active wedding for the header and dashboard. The `WeddingSwitcher` changes it.
5. Every page except `/weddings` and `/profile` is wrapped in `RequireWedding`. With no wedding, it shows a blocking "Create a Wedding First" dialog that routes to `/weddings`.

**Acceptance criteria**
- A user only ever sees and edits their own weddings. Every wedding endpoint checks `user_id` and returns 404 otherwise.
- After deleting the active wedding, the app selects another one automatically, or shows the "create a wedding" prompt if none remain.

### 5.3 Events

**User stories**
- As a host, I want to add each ceremony with its date, time and venue, and mark whose side is hosting it.
- As a host, I want to see each event's RSVP progress at a glance.

**Functional requirements**
1. Create or edit an event with: title (1-100), description (1-250, required), side, date (`YYYY-MM-DD` or ISO), time (`HH:mm`, 24h), venue, address, city, optional latitude and longitude (`backend: src/validations/event.validations.ts`). When `VITE_GOOGLE_MAPS_API_KEY` is set, the address field uses Google Places autocomplete (`frontend: src/components/custom/AddressAutocomplete.tsx`).
2. Creating an event runs in one transaction that also creates its `GuestEventInviteFormat` (all questions and reminders off, no deadline) and its `EventInviteCard` (status `IDLE`).
3. The event list (`GET /api/event?weddingId=&includeStats=`) is paginated with search, side filter and sort. Per-event stats: total invites, attending, declined, maybe, pending, completion % (replied / total), and a stacked progress bar split into confirmed, maybe, declined and pending percentages (`backend: src/services/event.service.ts` `mapGuestStatsToEvents`).
4. Deleting an event cascades to its invites, page settings and card, then **deletes every guest in the wedding who no longer has any invite** (`deleteGuestsWithNoEvents`).

**Acceptance criteria**
- An event id that belongs to another user returns 400 "Invalid Event or Event Not Found".
- A new event is immediately usable on the RSVP page settings, invite card and guest preview pages without any further setup.

### 5.4 Guests

**User stories**
- As a host, I want to add guests one by one and choose which events each is invited to.
- As a host, I want to import my existing spreadsheet instead of retyping it.
- As a host, I want to filter the list (by event, side, group, sent/not sent) and export it with replies.
- As a host, I want a guest detail page showing every invitation and reply, where I can record a reply given to me in person.

**Functional requirements: manual add and edit**
1. Guest fields: name (1-50), mobile number (required, up to 15 characters, must normalise to at least 8 digits using the same rule as WhatsApp links), optional email (up to 50; blank is stored as null), side, group, accommodation required and address, note, and `eventIds` (at least one) (`backend: src/validations/guest.validations.ts`).
2. All selected events must belong to the same wedding the caller owns.
3. **Deduplication by mobile number:** if a guest with the same `mobile_number` already exists in the wedding, the existing guest is reused and only invites for events they are not yet invited to are added. Other fields on the existing record are not updated (`addNewGuestService`).
4. Each new invite gets a fresh UUID `invite_token` and inherits the event's current `rsvp_deadline`.
5. Editing a guest updates profile fields and reconciles events: invites for newly selected events are created, and invites for deselected events are **deleted, including any reply** (`editWeddingGuestService`).
6. Deleting a guest deletes all their invites.

**Functional requirements: list**
7. `GET /api/guest` is paginated (default 10) with search (Postgres full-text on name and email, substring on mobile), filters `events`, `sides`, `groups`, `inviteSent` (`sent`/`not_sent`), and an optional single `eventId`. The UI shows a data table on wide screens and a card list on narrow ones (`frontend: src/components/guests/`). Page Settings links to `/guests?event=<id>` for a pre-filtered list.

**Functional requirements: Excel import**
8. `GET /api/guest/template/download/:weddingId` returns a styled `.xlsx` template. It requires at least one event (400 otherwise). It contains a "Guest List" sheet with fixed columns (name, mobile, email, side, group, accommodation required/address, note), one column per event (type ✓ to invite), dropdowns for side, group and accommodation, the mobile column formatted as text, and a hidden `_meta` sheet holding the wedding id and column-to-event mapping.
9. `POST /api/guest/template/upload/:weddingId` accepts one file up to 5 MB (multer). The frontend accepts only `.xlsx`/`.xls`. The API writes it to a temp file, enqueues a `parse-excel` job on `guest-import-queue`, and returns `202 { jobId }`.
10. The worker (`parseGuestListTemplateJob`):
    - rejects a template whose `_meta.weddingId` differs from the target wedding ("This template belongs to a different wedding…");
    - reads rows from row 8, skips rows with no name and no mobile, and silently skips repeat mobiles within the file;
    - treats an event cell of `✓`, `true` or `1` as invited;
    - validates each row with the same schema as manual add, then creates guests sequentially through `addNewGuestService` (so the dedup rule in item 3 applies);
    - reports progress from 10% to 100%, and returns `{ totalProcessed, successful, failed, errors: [{ row, error }] }`;
    - deletes the temp file afterwards.
11. The frontend polls `GET /api/guest/import-status/:jobId` every 1.5 s. It gives up with "…queued but nothing is processing it. Is the backend worker running?" after 30 s in `waiting`, and with "taking too long" after 5 minutes. The status endpoint returns 404 for jobs owned by another user.

**Functional requirements: export**
12. `GET /api/guest/export` takes the same filters as the list and returns an `.xlsx` with one sheet per event (name truncated to 31 chars). Columns: guest fields plus invite status ("Not Invited" if none), plus-ones, dietary, song request, message, invite deadline, responded at. If the wedding has no events, it returns a single sheet of guest fields.

**Functional requirements: guest details** (`/guests/:id`, `frontend: src/pages/GuestDetails.tsx`)
13. Shows the guest's facts, accommodation and notes, "N of M replied", and one card per invitation with status, reply details and "Reply by <date>" when unanswered.
14. The host can set the status for any invite from a dropdown (`PUT /api/rsvp/invite/:inviteId`). This path skips the RSVP deadline and emits the same live event as a guest reply.
15. Per invite: "Send on WhatsApp" / "Resend on WhatsApp" (disabled with a hint when the mobile number cannot be normalised) and "Copy RSVP link".

**Acceptance criteria**
- Adding a guest with no event returns a validation error "At least one event must be selected".
- Importing the same template twice does not create duplicate guests (dedup by mobile number), but also does not update changed details for existing guests.
- An import containing invalid rows imports the valid rows and reports each invalid row's number and reason.
- Export reflects the filters currently applied in the UI.

### 5.5 RSVP page settings (per event)

**User stories**
- As a host, I want to choose which optional questions each event's RSVP page asks.
- As a host, I want to set an RSVP deadline and turn reminders on.
- As a host, I want a personalised illustration at the top of the RSVP page.

**Functional requirements** (`/page-settings`, `frontend: src/components/PageSettingMain.tsx` and `PageSettings*.tsx`)
1. An event switcher selects the event. Settings are paginated 5 events at a time (`GET /api/page-setting/pages/:weddingId`), each with guest stats (total, attending, maybe, declined, pending) that link to the filtered guest list.
2. Guest-question toggles: plus-ones, dietary preference, song request, message. All default to off.
3. Reminder toggles: first reminder, final reminder. RSVP deadline date picker. The UI sends the deadline as the end of the chosen day in the host's timezone.
4. Saving (`PATCH /api/page-setting/:id`) updates the format and, when `rsvp_deadline` is part of the payload, rewrites `invite_deadline` on every invite for that event in the same transaction.
5. The header illustration:
   - the host uploads and crops a photo (couple, bride or groom), then picks an illustration style (12 options, e.g. Royal Portrait, Watercolor Dream, Anime Style), an optional theme (Traditional Indian, Modern Minimalist, Watercolor, Royal Heritage), attire styles (13 options, e.g. Lehenga & Sherwani, White Gown & Tuxedo, Hanbok) and an optional style note (`frontend: src/constants/index.ts`);
   - `POST /api/page-setting/generate-image` checks ownership of the photo key, spends 5 credits, calls Gemini synchronously for a 1:1 image, uploads it under the user's S3 prefix and returns its key. On failure, the 5 credits are refunded;
   - the host saves the returned key onto the page settings.
6. A live phone-sized preview shows the RSVP page as configured, before saving.
7. Unsaved-changes marker; switching events warns that edits would be lost. The Save button is disabled when nothing changed.

**Acceptance criteria**
- A question switched off is neither shown to guests nor stored if a client submits it anyway (`backend: src/utils/rsvp.util.ts` `buildRsvpUpdate` ignores disabled fields).
- Changing the deadline immediately changes whether existing links accept replies.
- An image key not owned by the caller is rejected (`assertOwnedImageKeys`).

### 5.6 Sending invites and reminders via WhatsApp

**User stories**
- As a host, I want to send each guest their personal RSVP link on WhatsApp without typing the message.
- As a host, I want to see who I have not sent to yet.
- As a host, I want to know which guests are due a reminder and send it the same way.

**Functional requirements**
1. `GET /api/guest/invites/whatsapp?eventId=` (or `guestId=`) returns, per invite: guest name, event title, status, `invite_sent_at`, `rsvp_url` and `whatsapp_url` (`backend: src/services/guest.service.ts`).
   - `rsvp_url` = `WEB_APP_URL/rsvp/<wedding slug or "invite">/<invite_token>`.
   - `whatsapp_url` = `https://wa.me/<digits>?text=<message>`, or null when the number cannot be normalised.
   - Invite message: "Hi {name}, {bride} & {groom} would love for you to join them for their {event} on {date}, {time} at {venue}. Please RSVP here: {url}". Dates are formatted `en-GB` in UTC.
2. Phone normalisation (`backend: src/lib/whatsapp.ts`): strip non-digits and leading zeros; require at least 8 digits. A number typed without `+` and with 10 digits or fewer gets `WHATSAPP_DEFAULT_COUNTRY_CODE` prepended.
3. Entry points:
   - **Guest Preview → "Send invites"** opens `SendInvitesDialogue` for the selected event, with an Invites tab (progress "X of Y sent", toggle to show already-sent guests, Send/Resend per guest) and a Reminders tab (`frontend: src/components/SendInvitesDialogue.tsx`);
   - **Guest Details** offers per-invite send, resend and copy link.
4. Clicking Send opens WhatsApp in a new tab and calls `POST /api/guest/invites/:inviteId/mark-sent`, which sets `invite_sent_at`.
5. `GET /api/guest/invites/reminders?eventId=` returns invites due a reminder now, following these rules (`backend: src/utils/reminder.util.ts`):
   - only `PENDING` invites that have been marked sent and whose deadline has not passed;
   - FINAL if `final_reminder` is on, a deadline exists, no final reminder has been sent, and the deadline is 3 days away or less;
   - otherwise FIRST if `first_reminder` is on, no first or final reminder has been sent, and 7 days or more have passed since `invite_sent_at`.
   Reminder messages differ for FIRST ("gentle reminder… Please reply by {deadline}") and FINAL ("last reminder: RSVPs… close on {deadline}").
6. Sending a reminder calls `POST /api/guest/invites/:inviteId/mark-reminded` with the kind, which sets the matching timestamp so it drops off the list.
7. When both reminder toggles are off, the Reminders tab says so and points to RSVP Page Settings.

**Acceptance criteria**
- A guest with an invalid number is listed with "No valid mobile number" and a disabled Send button.
- After a host clicks Send, the guest moves out of the default "not sent" view and the Guests page `inviteSent=sent` filter includes them.
- A guest who has replied never appears in the reminders list.

### 5.7 Public RSVP flow (guest-facing)

**User stories**
- As a guest, I want to open my link and see the invitation, event details and location.
- As a guest, I want to reply Attending, Maybe or Can't make it, plus any extra details the couple asked for.
- As a guest, I want to change my reply later.

**Functional requirements** (`/rsvp/:slug/:token`, `frontend: src/pages/Rsvp.tsx`, `src/components/RsvpForm.tsx`; `backend: src/services/rsvp.service.ts`)
1. `GET /api/rsvp/:token` (public, token must be a UUID) returns the guest, the wedding (couple names, slug), and the event with its page-settings format, the guest's current reply, a signed `invite_card_url` (the event's card, generated or uploaded) and a signed `illustration_url`. If signing an image fails, it is omitted rather than failing the page. Internal `wedding_id` is not exposed.
2. An unknown token shows "This invitation link isn't valid". A legacy `/rsvp/:token` link or a stale slug redirects to the canonical `/rsvp/<slug>/<token>`. The token alone identifies the invite, so renaming a wedding does not break old links.
3. Page layout: greeting "Hi {name}, you're invited to celebrate"; the invitation card (9:16) when present; the RSVP form with header illustration, couple names, event title, date, time and place; an event location card with an embedded Google Map and "Get directions"; and a "Where you're staying" card if the host marked accommodation with an address; plus a footer credit linking to the product.
4. The form shows only the questions enabled for that event: dietary (select), plus-ones (stepper, 0-9), song request and message (500 chars max each). Reply buttons: Attending / Maybe / Declined.
5. `PUT /api/rsvp/:token` (rate-limited) saves the status, sets `responded_at`, stores only the enabled optional fields, and publishes a live update. Once `invite_deadline` has passed it returns 409 "RSVPs for this event are closed", and the UI disables the form.
6. Guests can resubmit any number of times before the deadline. The form re-seeds from the saved reply.
7. Each link covers exactly one event. A guest invited to three events receives three links (see open question Q3).

**Acceptance criteria**
- No login, cookie or account is required to view or reply.
- A reply is visible on the host dashboard without a manual refresh (see 5.9).
- Replies after the deadline are rejected by the server even if the UI is bypassed.

### 5.8 Invitation card (AI generation or upload)

**User stories**
- As a host, I want to generate an invitation card for each event from a few design choices.
- As a host, I want to show the AI an invitation I like and have mine made in that style, optionally with our faces.
- As a host who already has a card, I want to upload it and use it everywhere a generated one would appear.

**Functional requirements** (`/invite-card`, `frontend: src/components/InviteCardMain.tsx`; `backend: src/services/inviteCard.service.ts`, `inviteCardGeneration.service.ts`)
1. Per event, three tabs map to `card_source`:
   - **Presets**: design preset, texture, typography pairing, metallic accents, negative space, monogram, text alignment and edge styling are all required (5, 5, 4, 5, 5, 5, 3 and 5 options respectively in `frontend: src/constants/index.ts`);
   - **Example**: a reference image is required. If a couple photo is also uploaded, a photo placement is required: `SWAP_IN_PLACE` (put our faces on the example's figures) or `FRAMED_INSET` (add us as a framed portrait);
   - **Use my own card** (`UPLOAD`): the host uploads a finished image, which is saved as the card with no generation and no credits.
   Shared generation inputs: custom message, additional details, couple photo, illustration style and attire styles (the latter apply only when a new portrait is composed).
2. Uploads are restricted client-side to JPG, PNG or WebP up to 20 MB. HEIC fails server-side as `INVALID_INPUT`. Images go straight to S3 via presigned URLs under `users/<userId>/`.
3. "Save changes" persists the configuration without generating (`PATCH /api/invite-card/:id`).
4. "Generate" (`POST /api/invite-card/generate-invite`, rate-limited to 5 per IP per 15 minutes):
   - returns 409 if a non-stale generation is already running for that card;
   - in one transaction, charges 10 credits (402 "Not enough AI credits" if the balance is short), saves the submitted config and sets status `QUEUED`;
   - enqueues a BullMQ job and returns `202 { inviteCardId, jobId, status }`. If enqueueing fails, the card is marked FAILED and credits are refunded.
5. The worker pipeline (Gemini `gemini-3-pro-image`, 9:16):
   - **DESIGN** produces text-less artwork. It is skipped when the stored `design_fingerprint` (hash of prompt + image keys) still matches, so retries and text-only edits reuse the artwork;
   - **TYPESETTING** writes the couple names, event, date and venue onto the artwork. For Example mode, the reference is passed for typography matching;
   - the card becomes `COMPLETED` only after the final image is saved to `generated_invite_image_url`.
6. Failure handling: every Gemini call has a 120 s abort and retries in-call on `OVERLOADED`. Failures are classified as `OVERLOADED`, `RATE_LIMITED`, `TIMEOUT`, `NO_IMAGE`, `SAFETY_BLOCKED`, `BILLING`, `INVALID_INPUT` or `UNKNOWN`. Retryable codes get up to 3 job attempts (30 s then 90 s backoff). The rest fail immediately. On final failure, credits are refunded exactly once.
7. The page polls `GET /api/invite-card/:id/generation-status` for status, stage, attempt / max attempts, error and error code, and shows a human explanation. A card with no worker heartbeat for 10 minutes is retired as `TIMEOUT` and refunded. A run that started before a page reload is rejoined. A finished run is announced once, not again on later visits.
8. The resulting (or uploaded) card is what the RSVP page and Guest Preview show.

**Acceptance criteria**
- A user never loses credits for a generation that produced no final image.
- Concurrent generate requests cannot push the credit balance below zero (the balance check is inside the `UPDATE … WHERE ai_credits >= cost`).
- Two generate clicks for the same event result in one run; the second gets 409 and follows the first.

### 5.9 Guest preview

**Functional requirements** (`/guest-preview`)
1. Pick an event and see the invitation card, the RSVP form (as configured and saved) and the location card, laid out as the guest sees them.
2. When the event has no card, the page offers a link to the Invite Card page for that event (passed in navigation state), not a stock sample.
3. "Send invites" opens the WhatsApp send dialog for that event (5.6).

### 5.10 Wedding dashboard and live updates

**User stories**
- As a host, I want one page that tells me how many people are coming, who replied recently, and what food to plan for.

**Functional requirements** (`/wedding-dashboard`, `frontend: src/pages/Dashboard.tsx`; `backend: src/services/wedding.service.ts` `getWeddingDashboardService`)
1. Summary stats:
   - total guests and guests added this week;
   - guests needing accommodation;
   - attending and pending invite counts, summed across events;
   - confirmation rate = attending invites / all invites, as a %;
   - responses this week;
   - a countdown to the wedding date.
2. RSVP progress per event (the same stats as 5.3).
3. Recent RSVPs: the latest 10 replies (guest, event, status, plus-ones, time).
4. Charts:
   - daily responses for the last 7 days (buckets in the server's timezone);
   - dietary breakdown of `ATTENDING` invites;
   - guests by side.
5. Live updates: the page opens `GET /api/wedding/:id/live` (Server-Sent Events) using `fetch` with a Bearer header, because EventSource cannot send one. Every saved RSVP, from a guest or from the host, publishes to Redis channel `live-rsvp`. Every API instance fans it out to its SSE listeners. The client invalidates the dashboard query on each `rsvp` event and on every (re)connect. The server sends a heartbeat every 25 s. The client reconnects with exponential backoff (1 s up to 30 s) and shows a live / reconnecting indicator.

**Acceptance criteria**
- A guest reply appears in Recent RSVPs and the counts within seconds, without a reload.
- Losing the connection shows "reconnecting", and on reconnect the dashboard catches up.

### 5.11 Marketing site

1. Public landing page (`/`) with hero, features, ceremonies, guest list, invitations, dashboard, guest experience, programme, specs, pricing, upcoming, FAQ, blog teaser and closing sections (`frontend: src/components/landing/`). The hero and dashboard sections render the app's real components with sample data.
2. Blog at `/blog` and `/blog/:slug`, with posts stored statically in `frontend: src/content/posts.ts`.
3. Link preview tags (Open Graph) in `frontend: index.html`.
4. Maintenance, not-found and error pages.

---

## 6. Key user journeys

### 6.1 Host: from sign-up to tracking RSVPs

| Step | Host action | System behaviour |
|---|---|---|
| 1 | Signs up at `/signup`. | Account created unverified, verification email sent, redirect to `/verification-pending`. |
| 2 | Clicks the email link. | `/verify-email` verifies the token. Host signs in and lands on `/weddings`. |
| 3 | Creates a wedding. | Wedding saved with a slug. It becomes the active wedding automatically. |
| 4 | Adds events (for example Mehendi, Sangeet, Wedding, Reception) on `/events`. | Each event gets its page settings and card rows. |
| 5 | Downloads the Excel template, fills it (✓ per event), uploads it. Or adds guests one by one. | Import runs in the worker. The UI shows progress, then a summary with per-row errors. |
| 6 | On `/page-settings`, per event: turns on questions, sets the deadline, enables reminders, optionally generates a header illustration (5 credits). | Deadline copied to all of that event's invites. |
| 7 | On `/invite-card`, per event: generates a card (10 credits) or uploads their own. | Job queued, page polls until COMPLETED, or FAILED with a reason and refund. |
| 8 | On `/guest-preview`, checks what guests will see, then clicks "Send invites". | Dialog lists every invite with a wa.me link. Each click opens WhatsApp with the message ready and marks the invite sent. |
| 9 | Watches `/wedding-dashboard`. | Replies stream in live. Per-event progress, dietary and side charts update. |
| 10 | A week later, opens the Reminders tab for each event and sends the due reminders. | FIRST reminders after 7 days; FINAL within 3 days of the deadline. |
| 11 | Records replies received in person via Guest Details → status dropdown. | Saved even after the deadline. The dashboard updates live. |
| 12 | Exports the guest list for the caterer or venue. | `.xlsx` with one sheet per event, including replies and dietary. |

### 6.2 Guest: open link and reply

1. Receives a WhatsApp message from the couple's own number containing `…/rsvp/<slug>/<token>`.
2. Opens it on their phone. No login. Sees the greeting, the invitation card, event details, map and, if relevant, where they are staying.
3. Taps Attending, Maybe or Can't make it, after filling any enabled questions (dietary, plus-ones, song, message).
4. The reply is saved and appears on the couple's dashboard live.
5. Can reopen the same link and change the reply until the deadline. After the deadline the form is disabled and the server rejects submissions.
6. Invited to another event? That arrives as a separate message with a separate link.

---

## 7. Non-functional requirements

### 7.1 Performance and background work
- Long operations run outside the request cycle on BullMQ workers in a separate process (`npm run worker`):
  - Excel guest import (`guest-import-queue`);
  - invite card generation (`ai-invite-card-queue`).
  The API returns `202 { jobId }` and the client polls. The Docker image runs Redis, the worker and the API in one container (`backend: start.sh`).
- Gemini calls: 120 s timeout per call, bounded retries, and a heartbeat on every stage so dead workers are detected within 10 minutes.
- Source images are normalised before use (EXIF rotation, longest side 2048 px) (`backend: src/utils/imageNormalize.util.ts`).
- Frontend pages are route-level lazy-loaded (`frontend: src/router.tsx`). Server state is cached with TanStack Query.

### 7.2 Live updates
- SSE with Redis pub/sub, so updates work across multiple API instances and from the worker. Publish failures are logged, never thrown, so a reply is never lost because live delivery failed.
- 25 s heartbeat to survive proxy idle timeouts (Cloudflare 100 s). `X-Accel-Buffering: no`.

### 7.3 Rate limiting (Redis-backed, per IP, 15-minute windows; disabled when `NODE_ENV=local`)

| Limiter | Applies to | Limit |
|---|---|---|
| `globalLimiter` | all `/api/*` | 100 requests |
| `rsvpLimiter` | `PUT /api/rsvp/:token` | 30 submissions |
| `imageGenerationLimiter` | `POST /api/invite-card/generate-invite` | 5 requests |

Source: `backend: src/middlewares/rateLimiter.middleware.ts`. Auth endpoints have no dedicated limiter (see Q9).

### 7.4 Security and privacy of guest data
- All host endpoints require a Bearer JWT. Tokens are also stored server-side, so they can be revoked on logout or sign-in.
- Ownership is enforced in every service or controller. Records outside the caller's scope return 404 or 400, not 403, so ids are not confirmed.
- The guest-facing API exposes only the invited guest's own data for the single event of that token. Nothing about other guests is returned.
- Invite tokens are random UUIDs, unique per invite.
- Images are private in S3. Keys are stored, not URLs. Uploads are forced under `users/<userId>/`. View URLs are issued only for the caller's own keys or keys saved on records they own. The RSVP page receives pre-signed URLs.
- `helmet` security headers, CORS restricted to `WEB_APP_URL`, env vars validated at startup on both backend and frontend.
- Guest PII held: name, mobile, optional email, accommodation address, notes, and replies (including dietary). There is no retention, export-on-request or deletion policy beyond the host deleting guests or weddings (see Q11).

### 7.5 Supported devices and UI
- Responsive web app. Layouts size against content width (container queries). The guest table becomes a card list on narrow screens. The sidebar collapses to an icon rail on tablets. The RSVP page is designed phone-first (guests open it from WhatsApp).
- Dark theme is the default (`ThemeProvider defaultTheme="dark"`), with a theme toggle.
- Accessibility basics are present in the reviewed components (labelled icon buttons, keyboard-operable rows). No formal audit was found.

### 7.6 Observability
- pino logging to the console and `logs/app.log`. Structured `generation.*` log events for AI jobs. Health check `GET /health`. API reference at `/reference` (Scalar, generated OpenAPI).

---

## 8. Success metrics (proposed)

None of these metrics are instrumented today. There is no analytics code in either repo. They are **proposed** for the team to confirm.

| Area | Metric (proposed) | Possible source |
|---|---|---|
| Activation | % of verified sign-ups who create a wedding, at least one event and at least one guest within 24 h | DB timestamps |
| Activation | Median time from sign-up to first invite marked sent | `User.created_at` → first `invite_sent_at` |
| Invite reach | % of invites with `invite_sent_at` set, per wedding | `GuestEventInvite` |
| Guest response | RSVP response rate (non-PENDING / sent) per event, and median time from sent to responded | `invite_sent_at`, `responded_at` |
| Guest response | % of responses arriving after a reminder was marked sent | reminder timestamps vs `responded_at` |
| Import quality | Import success ratio (`successful / totalProcessed`) and the most common row errors | job results |
| AI cards | Generation success rate on first attempt, overall success rate, p50/p95 duration, failure mix by `generation_error_code` | `EventInviteCard` + `generation.*` logs |
| AI cards | % of events whose card is AI-generated vs uploaded vs none | `card_source`, `generated_invite_image_url` |
| Reliability | Live stream reconnects per session; stale-card retirements per day | client logs / `TIMEOUT` codes |
| Retention | Hosts returning to the dashboard 3+ times in the 2 weeks before the wedding date | would need analytics |

---

## 9. Known gaps and open questions

These are observations from the code on 2026-10-01. They are listed as open questions, not commitments.

### 9.1 Product and positioning mismatches
- **Q1. Pricing and limits.** The landing page lists Free (one wedding, up to 50 guests), Wedding (₹1,499) and Planner (₹3,999/month) plans. There is no billing, and no guest or wedding limit is enforced anywhere (`frontend: src/components/landing/PricingSection.tsx` ponytail comment). What are the real plans, and when is checkout needed?
- **Q2. AI credits have no top-up.** Every user gets 100 credits (10 cards, or a mix with 5-credit illustrations). Nothing increments credits except refunds (`backend: src/services/credits.service.ts`). How do users get more? Is the credit model tied to Q1?
- **Q3. One link per event vs "pick the ceremonies".** The FAQ says a guest opens their link and "pick[s] the ceremonies they are coming to" (`frontend: src/components/landing/FaqSection.tsx`). In the product, each link covers exactly one event, and a guest invited to several events gets several messages. Should the copy change, or should there be a per-guest multi-event RSVP page?
- **Q4. "Excel and CSV import".** The FAQ and pricing mention CSV. The importer requires the generated `.xlsx` template with its `_meta` sheet, and the UI accepts only `.xlsx`/`.xls`. Arbitrary spreadsheets and CSV are not supported.
- **Q5. Upcoming features.** QR attendance and the AI photo gallery are advertised as in development (`frontend: src/components/landing/UpcomingSection.tsx`). No code for either exists.

### 9.2 Behaviour that may surprise users (inferred risks)
- **Q6. Deleting an event deletes guests** who are left with no invites (`backend: src/services/event.service.ts` `deleteGuestsWithNoEvents`). Is this intended? The UI should at least warn.
- **Q7. Guest edit without `eventIds` removes all invites.** `PATCH /api/guest/:id` uses a partial schema, but `editWeddingGuestService` treats a missing `eventIds` as `[]` and deletes every invite and reply. The current frontend always sends `eventIds` (inferred). Other clients or future forms could trigger this.
- **Q8. Mobile-number dedup never updates details.** Re-importing a corrected spreadsheet adds new event invites but leaves changed names, emails, etc. untouched. Duplicate mobiles within one file are skipped without an error row.
- **Q9. Auth hardening.**
  - There is no dedicated auth rate limiter; the backend CLAUDE.md mentions an `authLimiter`, but none exists in `rateLimiter.middleware.ts`.
  - Password and email rules are enforced only in the frontend.
  - `forgotPasswordService` destructures an undefined result when the email is unknown, which likely produces a 500 and makes unknown and known emails distinguishable.
  - Sign-up with an email that exists but is unverified attempts a second `create` on a unique column (likely a 500 rather than a resend).
  - Each unverified sign-in attempt sends another email.
- **Q10. Single session per user.** Sign-in deletes all of the user's tokens, so signing in on a second device logs out the first. Is this intended?
- **Q11. Guest data lifecycle.** There is no retention policy, consent notice on the RSVP page, or guest-initiated deletion. Guest mobile numbers and dietary data (potentially sensitive) persist until the host deletes them. What privacy commitments (for example under India's DPDP Act) apply?
- **Q12. Dietary chart counts invites, not people.** A guest attending three events counts three times in the dietary breakdown (`getWeddingDashboardCounts` groups `ATTENDING` invites). Same question for "attending" totals summed across events.
- **Q13. Plus-ones are not in headcounts.** `plus_ones` is stored and exported but not added to attending totals on the dashboard or event stats.

### 9.3 Timezone and expiry edge cases (marked `ponytail:` in code)
- **Q14.** Invite and reminder messages format dates in UTC. Deadlines are end-of-day in the host's browser timezone, so far-west hosts may see the next day (`backend: src/services/guest.service.ts`).
- **Q15.** The dashboard's 7-day window and daily buckets use the server timezone (`backend: src/services/wedding.service.ts`).
- **Q16.** The RSVP page signs images with `AWS_BUCKET_PUT_URL_EXPIRE` (300 s in `.env.example`), so a guest page left open and re-rendered after 5 minutes may lose its images. The frontend similarly assumes signed URLs outlive 5 minutes (`frontend: src/hooks/use-pageSetting.ts`).
- **Q17.** HEIC photos (the iPhone default) are not decodable and fail as `INVALID_INPUT` (`backend: src/utils/imageNormalize.util.ts`). The frontend blocks them up front, but the user has to convert.
- **Q18.** The import poller has fixed timeouts: 30 s waiting, 5 minutes total (`frontend: src/hooks/use-guest.ts`).
- **Q19.** The header illustration generation is synchronous, not queued, and not covered by `imageGenerationLimiter`, unlike card generation. Should it move to the queue or at least be rate-limited?

### 9.4 Dead code, drift and housekeeping
- **Q20.** `backend: src/services/faceSwap.service.ts` is unused (face swapping is now part of the Example pipeline via `photo_placement`). Delete it?
- **Q21.** `GET /api/page-setting/event/:eventId` is marked in code as not used by the client (`backend: src/routes/eventInviteFormat.route.ts`).
- **Q22.** `frontend: src/components/DashboardCard.tsx` and `DASHBOARD_CARD_MENU` (Edit/Copy/Delete) in `src/constants/index.ts` are not rendered anywhere.
- **Q23. Documentation drift.**
  - Frontend CLAUDE.md names `src/routes/index.tsx` (the file no longer exists) and an `ai-invite-card` route (actual mount: `/api/invite-card`).
  - Backend CLAUDE.md names `services/aiInviteCardGeneration.service.ts` (actual: `inviteCardGeneration.service.ts`) and an `authLimiter` (does not exist).
- **Q24.** Guest import jobs are kept in Redis indefinitely (`removeOnComplete: false`, `removeOnFail: false` in `backend: src/queues/guest.queue.ts`), unlike card jobs (24 h).
- **Q25.** `updateProfileService` logs the request payload with `console.log` (`backend: src/services/auth.service.ts`).
- **Q26.** The RSVP page and invite card features are labelled "Beta" in the sidebar (`frontend: src/constants/index.ts`). What is the exit criterion?
- **Q27.** Neither repo has an automated test runner. There are only assert-based self-checks (`backend: src/utils/inviteCardGeneration.check.ts`, `credits.check.ts`; `frontend: src/lib/sse.ts` via `node --test`).

---

## Appendix A. API surface (backend, all under `/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST auth/signup`, `POST auth/signin`, `POST auth/verify-email`, `POST auth/resend-verify-email`, `POST auth/forgot-password`, `PATCH auth/reset-password`, `POST auth/access-token`, `POST auth/logout`, `GET/PATCH auth/me` |
| Weddings | `GET/POST wedding`, `GET/PATCH/DELETE wedding/:id`, `GET wedding/:id/dashboard`, `GET wedding/:id/live` (SSE) |
| Events | `GET/POST event`, `GET/PATCH/DELETE event/:id` |
| Guests | `GET/POST guest`, `GET guest/export`, `GET/PATCH/DELETE guest/:id`, `GET guest/template/download/:weddingId`, `POST guest/template/upload/:weddingId`, `GET guest/import-status/:jobId`, `GET guest/invites/whatsapp`, `POST guest/invites/:inviteId/mark-sent`, `GET guest/invites/reminders`, `POST guest/invites/:inviteId/mark-reminded` |
| Page settings | `GET page-setting/pages/:weddingId`, `GET/PATCH page-setting/:id`, `GET page-setting/event/:eventId` (unused), `POST page-setting/generate-image` |
| Invite cards | `GET invite-card/cards/:weddingId`, `PATCH invite-card/:id`, `POST invite-card/generate-invite`, `GET invite-card/:id/generation-status` |
| Files | `POST general/generate-upload-url`, `POST general/generate-view-url` |
| RSVP | `GET rsvp/:token` (public), `PUT rsvp/:token` (public), `PUT rsvp/invite/:inviteId` (host) |
| Ops | `GET /health`, `/reference` (API docs) |

## Appendix B. Frontend routes

| Route | Access | Page |
|---|---|---|
| `/` | Public (signed-in → `/weddings`) | Landing |
| `/blog`, `/blog/:slug` | Public | Blog |
| `/signin`, `/signup`, `/verify-email`, `/verification-pending`, `/forgot-password`, `/reset-password` | Public | Auth |
| `/rsvp/:slug/:token`, `/rsvp/:token` (legacy redirect) | Public | Guest RSVP |
| `/weddings`, `/profile` | Signed in | Weddings list, profile |
| `/wedding-dashboard`, `/guests`, `/guests/:id`, `/events`, `/page-settings`, `/invite-card`, `/guest-preview` | Signed in + active wedding | Wedding-scoped pages |
| `/maintenance`, `*` | Public | Maintenance, not found |
